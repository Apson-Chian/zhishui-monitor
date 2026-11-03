"""Install private gateway with rollback. Credential must already exist outside releases."""
import argparse
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import time
import urllib.request
p=argparse.ArgumentParser()
p.add_argument('--source',required=True);p.add_argument('--unit',required=True);p.add_argument('--version',required=True)
a=p.parse_args()
assert os.geteuid()==0 and re.fullmatch(r'[a-zA-Z0-9-]+',a.version)
assert Path('/etc/zhishui/vision.env').stat().st_mode & 0o077 == 0
root=Path('/opt/zhishui-ai');release=root/'releases'/a.version;current=root/'current'
assert not release.exists()
previous=os.readlink(current) if current.is_symlink() else None
unit=Path('/etc/systemd/system/zhishui-ai.service');previous_unit=unit.read_bytes() if unit.exists() else None
run=lambda *cmd:subprocess.run(cmd,check=True,capture_output=True,timeout=30)
if subprocess.run(['id','-u','zhishui-ai'],capture_output=True).returncode:run('useradd','--system','--no-create-home','--shell','/usr/sbin/nologin','zhishui-ai')
release.mkdir(parents=True)
shutil.copyfile(a.source,release/'server.py');os.chmod(release/'server.py',0o644)
try:
 shutil.copyfile(a.unit,unit);os.chmod(unit,0o644)
 temp=root/'next';temp.unlink(missing_ok=True);temp.symlink_to(release);temp.replace(current)
 run('systemctl','daemon-reload');run('systemctl','enable','--now','zhishui-ai');run('systemctl','restart','zhishui-ai')
 healthy=False
 for _ in range(8):
  try:
   with urllib.request.urlopen('http://127.0.0.1:5192/zhishui/api/vision/health',timeout=2) as r:healthy=json.load(r)['ready']
   if healthy:break
  except Exception:time.sleep(.5)
 assert healthy
 print(json.dumps({'gateway':'ready','version':a.version,'credential':'private-0600','previous':previous}))
except Exception:
 if previous:
  temp=root/'rollback';temp.unlink(missing_ok=True);temp.symlink_to(previous);temp.replace(current)
 if previous_unit is not None:unit.write_bytes(previous_unit)
 run('systemctl','daemon-reload');run('systemctl','restart','zhishui-ai')
 raise
