"""Validate and persist each browser's bounded teaching records."""
from contextlib import closing
from datetime import datetime
import json
import math
import os
from pathlib import Path
import re
import sqlite3
import time

DOMAINS = {'ledger': 1, 'pollution': 1, 'experience': 3}
RETENTION_SECONDS = 180 * 86400
MAX_BODY = 768 * 1024
MAX_COLLECTIONS = 6000
PHOTOS = ('qinhuai', 'yangtze', 'xuanwu')
FEATURES = ('reflection', 'vegetation', 'bank', 'structure')
COVERS = ('hard', 'mixed', 'green')
SCHEMA = Path(__file__).with_name('schema.sql').read_text(encoding='utf-8')


class InvalidRecord(ValueError):
    pass


class Conflict(Exception):
    pass


class CapacityExceeded(Exception):
    pass


def require(condition):
    if not condition:
        raise InvalidRecord('记录格式无效。')


def string(value, max_length, *, required=False):
    require(isinstance(value, str) and len(value) <= max_length and (value or not required))
    return value


def identifier(value, length):
    require(isinstance(value, str) and len(value) <= length and re.fullmatch(r'[A-Za-z0-9:_-]+', value))
    return value


def number(value, minimum, maximum):
    require(type(value) in (int, float) and minimum <= value <= maximum and math.isfinite(value))
    return value


def integer(value, minimum, maximum):
    require(type(value) is int)
    return number(value, minimum, maximum)


def choice(value, choices):
    require(value in choices)
    return value


def boolean(value):
    require(type(value) is bool)
    return value


def timestamp(value):
    string(value, 48, required=True)
    try:
        parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
        require(parsed.tzinfo is not None)
    except ValueError as error:
        raise InvalidRecord('记录时间无效。') from error
    return value


def observation(item):
    require(isinstance(item, dict))
    box = item.get('box')
    if box is not None:
        require(isinstance(box, list) and len(box) == 4)
        box = [number(v, 0, 100) for v in box]
        require(box[0] + box[2] <= 100.02 and box[1] + box[3] <= 100.02)
    return {'name': string(item.get('name'), 50),
            'explanation': string(item.get('explanation'), 400), 'box': box}


def ledger_entry(item):
    require(isinstance(item, dict))
    kind = choice(item.get('type'), ('water', 'inspection', 'scenario'))
    entry = {
        'id': identifier(item.get('id'), 99), 'type': kind,
        'station': None if kind == 'inspection' and item.get('station') is None else integer(item.get('station'), 0, 7),
        'status': choice(item.get('status'), ('pending', 'handled', 'ended', 'noted')),
        'title': string(item.get('title'), 150), 'at': timestamp(item.get('at')),
        'severity': integer(item.get('severity', 0), 0, 3),
    }
    if kind == 'water':
        entry.update(identity=identifier(item.get('identity'), 149), active=boolean(item.get('active', True)),
                     level=number(item.get('level'), -1000, 1000))
    elif kind == 'inspection':
        observations = item.get('observations', [])
        require(isinstance(observations, list) and len(observations) <= 5)
        entry.update(
            mode=choice(item.get('mode', 'cloud'), ('cloud', 'demo')),
            scene=string(item.get('scene', '上传图片'), 255),
            summary=string(item.get('summary', ''), 600),
            observations=[observation(value) for value in observations],
            needsReview=boolean(item.get('needsReview', False)),
            reportAt=timestamp(item.get('reportAt', entry['at'])),
        )
    return entry


def pollution_entry(item):
    require(isinstance(item, dict) and isinstance(item.get('params'), dict))
    limits = {'source': (5, 95), 'mass': (10, 2000), 'velocity': (.1, 1.5),
              'dispersion': (1, 80), 'area': (50, 2000), 'halfLife': (0, 24), 'threshold': (.1, 10)}
    return {
        'id': identifier(item.get('id'), 159), 'run': identifier(item.get('run'), 120),
        'reach': identifier(item.get('reach'), 80), 'reachName': string(item.get('reachName'), 80),
        'kind': choice(item.get('kind'), ('enter', 'exit')), 'point': integer(item.get('point'), 0, 2),
        'minute': number(item.get('minute'), 0, 720), 'threshold': number(item.get('threshold'), .1, 10),
        'params': {key: number(item['params'].get(key), *bounds) for key, bounds in limits.items()},
        'at': timestamp(item.get('at')),
    }


def runoff_inputs(value):
    require(isinstance(value, dict))
    limits = {'rain': (0, 120), 'capacity': (0, 25), 'area': (.1, 5), 'duration': (15, 120)}
    return {key: number(value.get(key), *bounds) for key, bounds in limits.items()}


def experience_state(value):
    state = runoff_inputs(value)
    runs, trials = value.get('runs'), value.get('trials')
    notes, checks = value.get('notes'), value.get('checks')
    require(isinstance(runs, list) and len(runs) <= 6 and isinstance(trials, list) and len(trials) <= 6)
    require(isinstance(notes, dict) and isinstance(checks, dict))
    flags = {}
    for photo in PHOTOS:
        selected = checks.get(photo, [])
        require(isinstance(selected, list) and len(selected) <= len(FEATURES))
        flags[photo] = [choice(feature, FEATURES) for feature in selected]
    state.update(
        step=integer(value.get('step'), 1, 3), chosen=integer(value.get('chosen'), 0, 7),
        found=boolean(value.get('found')), recorded=boolean(value.get('recorded')),
        photo=choice(value.get('photo'), PHOTOS), note=string(value.get('note', ''), 600),
        notes={photo: string(notes.get(photo, ''), 600) for photo in PHOTOS}, checks=flags,
        trials=[{**runoff_inputs(trial), 'cover': choice(trial.get('cover'), COVERS)} for trial in trials],
        runs=[{**runoff_inputs(run), 'id': integer(run.get('id'), 1, 10**9)} for run in runs],
    )
    return state


def validate(domain, snapshot):
    require(isinstance(snapshot, dict) and type(snapshot.get('version')) is int
            and snapshot['version'] == DOMAINS[domain])
    if domain == 'experience':
        return [('state', experience_state(snapshot.get('state')))]
    values = snapshot.get('records')
    require(isinstance(values, list) and len(values) <= (50 if domain == 'ledger' else 40))
    normalize = ledger_entry if domain == 'ledger' else pollution_entry
    entries = [normalize(value) for value in values]
    require(len({entry['id'] for entry in entries}) == len(entries))
    return [(entry['id'], entry) for entry in entries]


def connect():
    directory = Path(os.environ.get('STATE_DIRECTORY', '/tmp/zhishui-ai'))
    directory.mkdir(mode=0o700, parents=True, exist_ok=True)
    db = sqlite3.connect(directory / 'teaching.sqlite3', timeout=5)
    try:
        db.execute('PRAGMA foreign_keys = ON')
        db.executescript(SCHEMA)
        return db
    except Exception:
        db.close()
        raise


def read(owner):
    now = int(time.time())
    with closing(connect()) as db:
        db.execute('BEGIN')
        collections = db.execute(
            'SELECT domain, revision FROM record_collections WHERE owner_hash = ? AND updated_at >= ?',
            (owner, now - RETENTION_SECONDS),
        ).fetchall()
        result = {}
        for domain, revision in collections:
            values = [json.loads(row[0]) for row in db.execute(
                'SELECT payload FROM record_entries WHERE owner_hash = ? AND domain = ? ORDER BY position',
                (owner, domain),
            )]
            result[domain] = {'revision': revision, 'snapshot': {
                'version': DOMAINS[domain], 'state' if domain == 'experience' else 'records':
                    values[0] if domain == 'experience' else values,
            }}
        return result


def write(owner, domain, expected, snapshot):
    entries = validate(domain, snapshot)
    now = int(time.time())
    with closing(connect()) as db, db:
        db.execute('BEGIN IMMEDIATE')
        db.execute('DELETE FROM record_collections WHERE updated_at < ?', (now - RETENTION_SECONDS,))
        row = db.execute('SELECT revision FROM record_collections WHERE owner_hash = ? AND domain = ?',
                         (owner, domain)).fetchone()
        current = row[0] if row else 0
        if current != expected:
            stored = [json.loads(item[0]) for item in db.execute(
                'SELECT payload FROM record_entries WHERE owner_hash = ? AND domain = ? ORDER BY position',
                (owner, domain),
            )]
            if current and stored == [entry for _, entry in entries]:
                return current
            raise Conflict
        if not row and db.execute('SELECT COUNT(*) FROM record_collections').fetchone()[0] >= MAX_COLLECTIONS:
            raise CapacityExceeded
        revision = current + 1
        db.execute('''INSERT INTO record_collections VALUES (?, ?, ?, ?)
                      ON CONFLICT(owner_hash, domain) DO UPDATE
                      SET revision = excluded.revision, updated_at = excluded.updated_at''',
                   (owner, domain, revision, now))
        db.execute('DELETE FROM record_entries WHERE owner_hash = ? AND domain = ?', (owner, domain))
        db.executemany('INSERT INTO record_entries VALUES (?, ?, ?, ?, ?)', [
            (owner, domain, key, position, json.dumps(entry, ensure_ascii=False, allow_nan=False))
            for position, (key, entry) in enumerate(entries)
        ])
        return revision
