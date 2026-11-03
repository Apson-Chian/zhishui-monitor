"""Verify public HTTPS delivery against the exact local static runtime."""
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

root = Path(__file__).resolve().parent.parent
base = 'https://apsonchian.ltd/zhishui/'

def get(url):
    request = Request(url, headers={'Accept-Encoding': 'identity', 'User-Agent': 'Zhishui-Deployment-Check/1.0'})
    with urlopen(request, timeout=12) as response:
        return response.status, response.read(), response.headers, response.url

def verify(path):
    name = path.relative_to(root / 'dist').as_posix()
    status, body, headers, _ = get(base + name)
    expected = path.read_bytes()
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

paths = sorted(p for p in (root / 'dist').rglob('*') if p.is_file())
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
for endpoint in ['/', '/ai-odyssey/', '/v79/']:
    old_sites[endpoint] = get('https://apsonchian.ltd' + endpoint)[0]
report = {'status': 'verified', 'url': base, 'runtime': checks,
          'canonical_redirect': 'passed', 'missing_asset_404': 'passed', 'existing_sites': old_sites}
(root / 'qa/server-deployment.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(report, ensure_ascii=False))
