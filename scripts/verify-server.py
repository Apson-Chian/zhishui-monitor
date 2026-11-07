"""Verify public HTTPS delivery against the exact local static runtime."""
from concurrent.futures import ThreadPoolExecutor
import argparse
import hashlib
import json
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

root = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument('--base-url', choices=['https://apsonchian.ltd/zhishui/', 'https://apsonchian.ltd/zhishui-glass/',
                                          'https://apsonchian.ltd/zhishui-liquid/'], default='https://apsonchian.ltd/zhishui/')
base = parser.parse_args().base_url

network_retries = []
def get(url):
    request = Request(url, headers={'Accept-Encoding': 'identity', 'User-Agent': 'Zhishui-Deployment-Check/1.0'})
    for attempt in range(3):
        try:
            with urlopen(request, timeout=20) as response:
                return response.status, response.read(), response.headers, response.url
        except HTTPError:
            raise
        except (TimeoutError, URLError, ConnectionError):
            if attempt == 2:
                raise
            network_retries.append({'url': url, 'attempt': attempt + 1})
            time.sleep(.25)

def verify(entry):
    name, expected = entry
    status, body, headers, _ = get(base + name)
    if name == 'index.html':
        head, tail = expected.split(b'</head>', 1)
        assert body.startswith(head) and body.endswith(b'</head>' + tail), 'HTML mismatch'
    else:
        assert hashlib.sha256(body).digest() == hashlib.sha256(expected).digest(), name + ' checksum mismatch'
    if name.endswith('.js'):
        assert 'javascript' in headers.get_content_type(), name + ' MIME mismatch'
    if name.endswith('.css'):
        assert headers.get_content_type() == 'text/css', name + ' MIME mismatch'
    assert 'no-cache' in headers.get('Cache-Control', ''), name + ' cache mismatch'
    return {'path': name, 'status': status, 'bytes': len(body)}

paths = [(p.relative_to(root / 'dist').as_posix(), p.read_bytes()) for p in sorted((root / 'dist').rglob('*')) if p.is_file()]
with ThreadPoolExecutor(max_workers=4) as executor:
    checks = list(executor.map(verify, paths))
status, body, _, final_url = get(base.rstrip('/'))
assert status == 200 and final_url == base, 'Missing canonical slash redirect'
try:
    get(base + 'assets/does-not-exist.js')
    raise AssertionError('Missing asset must not return HTML or a successful response')
except HTTPError as error:
    assert error.code == 404
old_sites = {}
old_paths = ['/', '/ai-odyssey/', '/v79/']
if '/zhishui-liquid/' in base:
    old_paths.extend(['/zhishui/', '/zhishui-glass/'])
for endpoint in old_paths:
    old_sites[endpoint] = get('https://apsonchian.ltd' + endpoint)[0]
report = {'status': 'verified', 'url': base, 'runtime': checks,
          'network_retries': network_retries, 'canonical_redirect': 'passed', 'missing_asset_404': 'passed', 'existing_sites': old_sites}
site = base.rstrip('/').rsplit('/', 1)[-1]
suffix = site.removeprefix('zhishui')
(root / f'qa/server-deployment{suffix}.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(report, ensure_ascii=False))
