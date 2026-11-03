#!/usr/bin/env python3
"""Install a separate static site; validate Nginx and restore the prior route on failure."""
import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tarfile
import time

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--archive', required=True)
parser.add_argument('--sha256', required=True)
parser.add_argument('--snippet', required=True)
parser.add_argument('--version', required=True)
parser.add_argument('--site', choices=['zhishui', 'zhishui-glass'], default='zhishui')
args = parser.parse_args()
if os.geteuid() != 0:
    raise SystemExit('Run as root')
if not args.version or not all(c.isascii() and (c.isalnum() or c in '-_') for c in args.version):
    raise SystemExit('Invalid release version')
payload = Path(args.archive).read_bytes()
if hashlib.sha256(payload).hexdigest() != args.sha256:
    raise SystemExit('Archive checksum mismatch')
new_snippet = Path(args.snippet).read_bytes()
if not new_snippet.startswith(b'# Zhishui standalone static site.'):
    raise SystemExit('Unexpected route snippet')

lock = open('/var/lock/zhishui-deploy.lock', 'w')
fcntl.flock(lock, fcntl.LOCK_EX)
site = args.site
prefix = '/' + site + '/'
base = Path('/var/www') / site
release = base / 'releases' / args.version
current = base / 'current'
backup = Path('/var/backups') / site / args.version
config = Path('/etc/nginx/conf.d/scenic-guide.conf')
snippet = Path('/etc/nginx/snippets') / (site + '-location.conf')
include = '    include /etc/nginx/snippets/' + site + '-location.conf;'
anchor = '    include /etc/nginx/snippets/' + ('ai-odyssey' if site == 'zhishui' else 'zhishui') + '-location.conf;'
if ('location = /' + site + ' {').encode() not in new_snippet or str(base / 'current').encode() not in new_snippet:
    raise SystemExit('Route snippet does not match the selected site')
original_config = config.read_bytes()
text = original_config.decode()
if include not in text:
    if text.count(anchor) != 1:
        raise SystemExit('Expected exactly one existing HTTPS host anchor')
    candidate = text.replace(anchor, anchor + '\n' + include, 1).encode()
else:
    candidate = original_config
original_snippet = snippet.read_bytes() if snippet.exists() else None
if original_snippet and not original_snippet.startswith(b'# Zhishui standalone static site.'):
    raise SystemExit('Existing route is not managed by this installer')
if release.exists() or backup.exists():
    raise SystemExit('Release or backup already exists; preserve it and select a new version')
if current.exists() and not current.is_symlink():
    raise SystemExit('Expected a managed current symlink')
previous = os.readlink(current) if current.is_symlink() else None

def run(*command):
    return subprocess.run(command, check=True, capture_output=True, timeout=30)

def response(path):
    # A graceful reload can briefly accept a fresh TLS connection in an old worker.
    # Retry bounded delivery failures; checksums still have to match exactly.
    for attempt in range(4):
        try:
            return run('curl', '--fail', '--silent', '--show-error', '--max-time', '12',
                       '--header', 'Accept-Encoding: identity', '--resolve',
                       'apsonchian.ltd:443:127.0.0.1', 'https://apsonchian.ltd' + path).stdout
        except subprocess.CalledProcessError:
            if attempt == 3:
                raise
            time.sleep(.3)

run('nginx', '-t')
for path in ['/', '/ai-odyssey/', '/v79/']:
    response(path)

with tarfile.open(args.archive, 'r:gz') as archive:
    members = archive.getmembers()
    if not members or len(members) > 200 or sum(m.size for m in members) > 20 * 1024 * 1024:
        raise SystemExit('Unexpected runtime package size')
    names = set()
    for member in members:
        parts = Path(member.name).parts
        if (not member.isfile() or member.name.startswith('/') or '..' in parts
                or any(p.startswith('.') for p in parts) or member.name in names):
            raise SystemExit('Unsupported archive member')
        names.add(member.name)
    required = {'index.html', 'assets/app.js', 'assets/cinematic.css', 'assets/river-scene.js',
                'assets/style.css', 'assets/vendor/chart.umd.js', 'assets/dm-sans.woff2'}
    if not required.issubset(names):
        raise SystemExit('Incomplete runtime')
    release.mkdir(parents=True, mode=0o755)
    for member in members:
        destination = release / member.name
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(archive.extractfile(member).read())
for directory in [base, base / 'releases', release]:
    directory.chmod(0o755)
for path in release.rglob('*'):
    path.chmod(0o755 if path.is_dir() else 0o644)
hashes = {str(p.relative_to(release)): hashlib.sha256(p.read_bytes()).hexdigest()
          for p in release.rglob('*') if p.is_file()}
backup.mkdir(parents=True, mode=0o700)
(backup / 'nginx.conf').write_bytes(original_config)
if original_snippet is not None:
    (backup / 'zhishui-location.conf').write_bytes(original_snippet)
(backup / 'previous.json').write_text(json.dumps({'previous_release': previous,
    'archive_sha256': args.sha256, 'runtime_files': hashes}, indent=2))

def point(target):
    temporary = base / ('.current-' + args.version)
    if temporary.is_symlink():
        temporary.unlink()
    temporary.symlink_to(target)
    os.replace(temporary, current)

try:
    snippet.write_bytes(new_snippet)
    snippet.chmod(0o644)
    point(release)
    config.write_bytes(candidate)
    run('nginx', '-t')
    run('systemctl', 'reload', 'nginx')
    expected_html = (release / 'index.html').read_bytes()
    head, tail = expected_html.split(b'</head>', 1)
    for attempt in range(20):
        try:
            html = response(prefix)
            # Preserve the server's existing HTML analytics injection, if present.
            if html.startswith(head) and html.endswith(b'</head>' + tail):
                break
        except subprocess.CalledProcessError:
            pass
        time.sleep(.3)
    else:
        raise RuntimeError('Published HTML verification failed')
    for name, digest in hashes.items():
        if name != 'index.html' and hashlib.sha256(response(prefix + name)).hexdigest() != digest:
            raise RuntimeError('Published runtime checksum mismatch: ' + name)
    for path in ['/', '/ai-odyssey/', '/v79/'] + (['/zhishui/'] if site == 'zhishui-glass' else []):
        response(path)
    vision_health = json.loads(response(prefix + 'api/vision/health'))
    if not vision_health.get('ready'):
        raise RuntimeError('Image gateway is not ready')
    health = json.loads(response('/ai-odyssey/api/health'))
    if health.get('database', {}).get('status') != 'ready':
        raise RuntimeError('Existing workshop health is not ready')
    run('systemctl', 'is-active', 'nginx')
except Exception:
    config.write_bytes(original_config)
    if original_snippet is None:
        if snippet.exists():
            snippet.unlink()
    else:
        snippet.write_bytes(original_snippet)
    if previous:
        point(previous)
    elif current.is_symlink():
        current.unlink()
    run('nginx', '-t')
    run('systemctl', 'reload', 'nginx')
    raise

print(json.dumps({'status': 'deployed', 'url': 'https://apsonchian.ltd' + prefix, 'site': site,
    'release': str(release), 'backup': str(backup), 'sha256': args.sha256,
    'verified_files': len(hashes), 'nginx': 'active', 'existing_sites': 'healthy'}, ensure_ascii=False))
