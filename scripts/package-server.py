"""Package only public runtime assets for the user's own Nginx server."""
import hashlib
import json
from pathlib import Path
import tarfile

root = Path(__file__).resolve().parent.parent
output = root / 'zhishui-server.tar.gz'
files = sorted(p for p in (root / 'dist').rglob('*') if p.is_file())
if not files or not (root / 'dist/index.html').is_file():
    raise SystemExit('Missing public runtime')
with tarfile.open(output, 'w:gz') as archive:
    for source in files:
        if source.is_symlink() or source.name.startswith('__qa'):
            raise SystemExit('Unexpected runtime asset')
        archive.add(source, arcname=str(source.relative_to(root / 'dist')), recursive=False)
print(json.dumps({'archive': str(output), 'files': len(files),
                  'sha256': hashlib.sha256(output.read_bytes()).hexdigest()}))
