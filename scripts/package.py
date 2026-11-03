"""Create a portable source package containing only this independent project."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parent.parent
output = root / 'zhishui-future-source.zip'
with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
    for name in ['README.md', 'DEMO.md', 'SERVER_DEPLOYMENT.md', 'SOURCES.md', 'package.json', '.gitignore']:
        archive.write(root / name, f'zhishui-future/{name}')
    for folder in ['dist', 'scripts', 'deploy', 'sources', 'backend', 'docs']:
        for source in sorted((root / folder).rglob('*')):
            if source.is_file() and not source.name.startswith('__qa') and '__pycache__' not in source.parts and source.suffix != '.pyc' and not source.name.endswith('.env') and '.env.' not in source.name:
                archive.write(source, f'zhishui-future/{source.relative_to(root)}')
print(output)
