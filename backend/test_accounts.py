import http.client
import json
from contextlib import closing
import unittest
import auth
import records
import test_records
from test_records import REPORT, POLLUTION, EXPERIENCE


class Accounts(test_records.RecordsAPI):
    def api(self, route, body=None, cookie=None, workspace=None):
        conn = http.client.HTTPConnection('127.0.0.1', self.server.server_port, timeout=5)
        headers = {'Origin': self.origin, 'Content-Type': 'application/json'}
        if cookie:
            headers['Cookie'] = cookie
        if workspace:
            headers['X-Workspace-ID'] = workspace
        try:
            conn.request('POST', '/api/'+route, json.dumps(body or {}), headers)
            response = conn.getresponse()
            return response.status, json.loads(response.read()), response.getheaders()
        finally:
            conn.close()

    def register(self, name):
        status, _, headers = self.api('auth/register', {'username': name, 'password': 'test-password-2026'})
        self.assertEqual(status, 200)
        return next(value.split(';')[0] for key,value in headers if key.lower() == 'set-cookie')

    def test_account_isolation_logout_and_expiry(self):
        first, second = self.register('alice'), self.register('bob')
        payload = {'domain': 'ledger', 'revision': 0, 'snapshot': {'version':1,'records':[REPORT]}}
        self.assertEqual(self.call('PUT', first, payload)[0], 200)
        self.assertEqual(self.call(cookie=second)[1]['collections'], {})
        owner = self.call(cookie=first)[1]['workspace']
        self.assertEqual(self.api('records/import', {}, second, owner)[0], 409)
        self.assertEqual(self.api('auth/logout', cookie=first)[0], 200)
        self.assertEqual(self.call(cookie=first)[0], 401)
        status, _, headers = self.api('auth/login', {'username':'ALICE','password':'test-password-2026'})
        self.assertEqual(status, 200)
        cookie = next(v.split(';')[0] for k,v in headers if k.lower()=='set-cookie')
        self.assertEqual(self.call(cookie=cookie)[1]['workspace'], owner)
        self.assertEqual(self.call(cookie=cookie)[1]['collections']['ledger']['revision'], 1)
        with closing(auth.connect()) as db, db:
            db.execute('UPDATE sessions SET expires=0')
        self.assertEqual(self.call(cookie=cookie)[0], 401)

    def test_atomic_import_conflict_validation_and_roundtrip(self):
        cookie = self.register('backup')
        owner = self.call(cookie=cookie)[1]['workspace']
        backup = {'format':'zhishui-backup','version':1,'collections':{
            'ledger':{'version':1,'records':[REPORT]},
            'pollution':{'version':1,'records':[POLLUTION]},'experience':EXPERIENCE}}
        body = {'backup':backup, 'revisions':dict.fromkeys(records.DOMAINS,0)}
        self.assertEqual(self.api('records/import', body, cookie, owner)[0], 200)
        saved = self.call(cookie=cookie)[1]['collections']
        self.assertEqual(set(saved), set(records.DOMAINS))
        self.assertEqual(self.api('records/import', body, cookie, owner)[0], 409)
        body['revisions'] = dict.fromkeys(records.DOMAINS,1)
        backup['collections']['pollution']['records'][0] = {**POLLUTION, 'kind': []}
        self.assertEqual(self.api('records/import', body, cookie, owner)[0], 400)
        self.assertEqual(self.call(cookie=cookie)[1]['collections'], saved)
        backup['collections'] = {domain: collection['snapshot'] for domain, collection in saved.items()}
        self.assertEqual(self.api('records/import', body, cookie, owner)[0], 200)
        backup['collections'] = dict.fromkeys(records.DOMAINS)
        body['revisions'] = dict.fromkeys(records.DOMAINS,2)
        self.assertEqual(self.api('records/import', body, cookie, owner)[0], 200)
        self.assertEqual(self.call(cookie=cookie)[1]['collections']['ledger']['snapshot']['records'], [])

    def test_auth_validation_and_rate_limit(self):
        self.assertEqual(self.api('auth/register', {'username':'bad','password':'short'})[0],400)
        self.register('valid')
        self.assertEqual(self.api('auth/login', {'username':'valid','password':'wrong-password'})[0],400)
        for _ in range(16):
            self.api('auth/login', {'username':'valid','password':'wrong-password'})
        self.assertEqual(self.api('auth/login', {'username':'valid','password':'test-password-2026'})[0],400)
