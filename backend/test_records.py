import http.client
import json
import os
from pathlib import Path
import sqlite3
import tempfile
import threading
import unittest
from unittest.mock import patch

from server import Handler, http

AT = '2026-11-05T04:30:00.000Z'
REPORT = {'id': 'report-1', 'type': 'inspection', 'station': 7, 'status': 'pending',
          'title': '玄武湖观察', 'at': AT, 'mode': 'demo', 'scene': '玄武湖',
          'observations': [{'name': '水面', 'explanation': '可见水面', 'box': [1, 5, 20, 30]}],
          'needsReview': True}
WATER = {'id': 'water-1', 'type': 'water', 'station': 0, 'status': 'pending',
         'title': '三汊河口', 'at': AT, 'identity': 'test:0', 'level': 10, 'severity': 2}
POLLUTION = {'id': 'run:1:enter', 'run': 'run', 'reach': 'outer-qinhuai', 'reachName': '外秦淮河',
             'kind': 'enter', 'point': 1, 'minute': 60, 'threshold': 1, 'at': AT,
             'params': {'source': 10, 'mass': 300, 'velocity': .4, 'dispersion': 8,
                        'area': 180, 'halfLife': 6, 'threshold': 1}}
EXPERIENCE = {'version': 3, 'state': {'step': 2, 'chosen': 0, 'found': False, 'recorded': True,
              'rain': 60, 'capacity': 6, 'area': 1, 'duration': 60, 'trials': [], 'runs': [],
              'photo': 'xuanwu', 'note': '水面有反光', 'notes': {'xuanwu': '水面有反光'},
              'checks': {'xuanwu': ['reflection']}}}


class RecordsAPI(unittest.TestCase):
    def setUp(self):
        self.directory = self.enterContext(tempfile.TemporaryDirectory())
        self.enterContext(patch.dict(os.environ, {'STATE_DIRECTORY': self.directory}))
        self.server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        self.server.preview = True
        self.origin = f'http://127.0.0.1:{self.server.server_port}'
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.addCleanup(self.close)

    def close(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()

    def call(self, method='GET', cookie=None, body=None, origin=None):
        headers = {}
        if cookie:
            headers['Cookie'] = cookie
        if body is not None:
            headers.update({'Content-Type': 'application/json', 'Origin': origin or self.origin})
        connection = http.client.HTTPConnection('127.0.0.1', self.server.server_port, timeout=5)
        try:
            connection.request(method, '/api/records', body=json.dumps(body) if body is not None else None,
                               headers=headers)
            response = connection.getresponse()
            cookie_header = response.getheader('Set-Cookie', '')
            return response.status, json.loads(response.read()), cookie_header
        finally:
            connection.close()

    def new_workspace(self):
        status, body, header = self.call()
        self.assertEqual(status, 200)
        self.assertEqual(body['collections'], {})
        self.assertEqual(len(body['workspace']), 64)
        self.assertIn('HttpOnly; SameSite=Strict', header)
        return header.split(';', 1)[0]

    def test_all_domains_persist_and_remain_private(self):
        owner = self.new_workspace()
        other = self.new_workspace()
        cases = {'ledger': {'version': 1, 'records': [REPORT, WATER]},
                 'pollution': {'version': 1, 'records': [POLLUTION]}, 'experience': EXPERIENCE}
        for domain, snapshot in cases.items():
            status, body, _ = self.call('PUT', owner, {'domain': domain, 'revision': 0, 'snapshot': snapshot})
            self.assertEqual((status, body), (200, {'revision': 1}))
        status, body, _ = self.call(cookie=owner)
        self.assertEqual(status, 200)
        self.assertEqual(set(body['collections']), set(cases))
        self.assertEqual(body['collections']['experience']['snapshot']['state']['note'], '水面有反光')
        self.assertEqual(self.call(cookie=other)[1]['collections'], {})
        with sqlite3.connect(Path(self.directory, 'teaching.sqlite3')) as db:
            self.assertEqual(db.execute('SELECT count(*) FROM record_entries').fetchone()[0], 4)
            digest = db.execute('SELECT owner_hash FROM record_collections').fetchone()[0]
            self.assertEqual(len(digest), 64)
            self.assertNotIn(digest, owner)

    def test_retry_and_conflict_preserve_server_version(self):
        owner = self.new_workspace()
        payload = {'domain': 'ledger', 'revision': 0, 'snapshot': {'version': 1, 'records': [REPORT]}}
        self.assertEqual(self.call('PUT', owner, payload)[0], 200)
        self.assertEqual(self.call('PUT', owner, payload)[1], {'revision': 1})
        cleared = {**payload, 'snapshot': {'version': 1, 'records': []}}
        self.assertEqual(self.call('PUT', owner, cleared)[0], 409)
        self.assertEqual(self.call('PUT', owner, {**cleared, 'revision': 1})[1], {'revision': 2})
        self.assertEqual(self.call(cookie=owner)[1]['collections']['ledger']['snapshot']['records'], [])

    def test_invalid_origin_session_and_payload(self):
        owner = self.new_workspace()
        payload = {'domain': 'ledger', 'revision': 0, 'snapshot': {'version': 1, 'records': [REPORT]}}
        self.assertEqual(self.call('PUT', None, payload)[0], 401)
        self.assertEqual(self.call('PUT', owner, payload, origin='https://example.invalid')[0], 403)
        invalid = {**REPORT, 'station': 99}
        self.assertEqual(self.call('PUT', owner, {**payload, 'snapshot': {'version': 1, 'records': [invalid]}})[0], 400)
        self.assertEqual(self.call(cookie=owner)[1]['collections'], {})
