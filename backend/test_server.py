import base64
import io
import json
import os
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from pathlib import Path
from unittest.mock import patch
import server
from server import ClientError, image_data, normalize, reserve, analyze

class GatewayTest(unittest.TestCase):
    def setUp(self):
        server.VISION_COOLDOWNS.clear()
        server.VISION_STATUS.update(status='unverified',last_success_at=None)
        self.enterContext(patch.object(server,'MODEL','glm-4v-flash'))
        self.enterContext(patch.object(server,'API_URL','https://open.bigmodel.cn/api/paas/v4/chat/completions'))
        self.enterContext(patch.dict(os.environ,{'VISION_FALLBACK_API_URL':'','VISION_FALLBACK_API_KEY':'','VISION_FALLBACK_MODEL':''}))
    def test_invalid_uploads(self):
        for value in ({}, {'image':'https://example.com/a.jpg'}, {'image':'data:image/jpeg;base64,broken'}, {'image':'data:image/jpeg;base64,'+base64.b64encode(b'not an image'*20).decode()}, {'image':'x','prompt':'override'}):
            with self.assertRaises(ClientError):image_data(value)
    def test_schema_and_box_bounds(self):
        r=normalize(json.dumps({'scene':'water','summary':'可见鱼类。','findings':[{'name':'鱼','explanation':'可见轮廓','box':[-10,900,2000,1200]},{'name':'背景','explanation':'全图','box':[0,0,1000,1000]},{'name':'位置不明','explanation':'不确定','box':[0,0,float('nan'),50]}]}))
        self.assertEqual(r['findings'][0]['box'],[0,90,100,10])
        self.assertIsNone(r['findings'][1]['box'])
        self.assertIsNone(r['findings'][2]['box'])
        self.assertNotIn('confidence',r['findings'][0])
        for value in ('bad','[]','{"summary":"x","findings":0}'):
            with self.assertRaises(ClientError):normalize(value)
    def test_non_water_never_exposes_generated_results(self):
        for scene in ('non_water', 'uncertain'):
            result=normalize(json.dumps({'scene':scene,'summary':'应被丢弃的分析','findings':[{'name':'应被丢弃的目标','explanation':'x','box':[0,0,500,500]}]}))
            self.assertEqual(result['status'],'unsupported')
            self.assertNotIn('summary',result)
            self.assertNotIn('findings',result)
            self.assertIn('水域',result['message'])
        for scene in (None, True, 'water?', 'WATER'):
            with self.assertRaises(ClientError):normalize(json.dumps({'scene':scene,'summary':'x','findings':[]}))
    def test_rate_limits_survive_connections(self):
        with tempfile.TemporaryDirectory() as d, patch.dict(os.environ,{'STATE_DIRECTORY':d,'VISION_API_KEY':'test-only'}):
            for _ in range(20):reserve('test-address')
            with self.assertRaises(ClientError) as e:reserve('test-address')
            self.assertEqual(e.exception.status,429)
            reserve('another-address')
            self.assertNotIn(b'test-address',Path(d,'usage.sqlite3').read_bytes())
    def test_compatible_vision_request_and_result(self):
        class Response:
            def __enter__(self): return self
            def __exit__(self, *args): pass
            def read(self, limit):
                content=json.dumps({'scene':'water','summary':'可见水面。','findings':[{'name':'水面','explanation':'有连续水面。','box':None}]})
                return json.dumps({'choices':[{'message':{'content':content}}]}).encode()
        with patch.dict(os.environ,{'VISION_API_KEY':'test-only'}),patch('urllib.request.urlopen',return_value=Response()) as request:
            result=analyze(b'fixture-image')
            self.assertEqual(result['status'],'ok')
            call=request.call_args
            self.assertLessEqual(call.kwargs['timeout'],12)
            req=call.args[0]
            self.assertEqual(req.get_header('Authorization'),'Bearer test-only')
            self.assertEqual(req.full_url,'https://open.bigmodel.cn/api/paas/v4/chat/completions')
            body=json.loads(req.data)
            self.assertEqual(body['model'],'glm-4v-flash')
            self.assertNotIn('thinking',body)
            self.assertEqual(body['max_tokens'],900)
            image=body['messages'][0]['content'][0]
            self.assertEqual(image['type'],'image_url')
            self.assertTrue(image['image_url']['url'].startswith('data:image/jpeg;base64,'))

    def test_unavailable_does_not_fabricate(self):
        with patch.dict(os.environ,{'VISION_API_KEY':''}):
            with self.assertRaises(ClientError) as e:analyze(b'')
            self.assertEqual(e.exception.status,503)
        with patch.dict(os.environ,{'VISION_API_KEY':'test-only'}),patch('urllib.request.urlopen',side_effect=TimeoutError):
            with self.assertRaises(ClientError) as e:analyze(b'')
            self.assertEqual(e.exception.status,503)

    def test_busy_fallback_keeps_vision_validation_and_uses_its_own_key(self):
        class Response:
            def __enter__(self):return self
            def __exit__(self,*args):pass
            def read(self,limit):
                return json.dumps({'choices':[{'message':{'content':'{"scene":"non_water"}'}}]}).encode()
        error=urllib.error.HTTPError('https://primary.example',429,'busy',{},io.BytesIO(b''))
        settings={'VISION_API_KEY':'primary-secret','VISION_FALLBACK_API_URL':'https://fallback.example/v1/chat/completions',
            'VISION_FALLBACK_API_KEY':'alternate-secret','VISION_FALLBACK_MODEL':'legacy-vision'}
        with patch.dict(os.environ,settings),patch('urllib.request.urlopen',side_effect=[error,Response()]) as transport:
            result=analyze(b'fixture')
        self.assertEqual(result['status'],'unsupported')
        self.assertNotIn('findings',result)
        request=transport.call_args.args[0]
        self.assertEqual(request.get_header('Authorization'),'Bearer alternate-secret')
        self.assertEqual(json.loads(request.data)['model'],'legacy-vision')
        self.assertNotIn('thinking',json.loads(request.data))

    def response(self,content='{"scene":"water","summary":"可见水面","findings":[{"name":"水面","explanation":"连续水面","box":null}]}',finish='stop'):
        class Response:
            def __enter__(self):return self
            def __exit__(self,*args):pass
            def read(self,limit):
                return json.dumps({'choices':[{'finish_reason':finish,'message':{'content':content}}]}).encode()
        return Response()

    def backup(self):
        return patch.dict(os.environ,{'VISION_API_KEY':'primary-secret','VISION_FALLBACK_API_URL':'https://backup.example/v1/chat/completions',
            'VISION_FALLBACK_API_KEY':'alternate-secret','VISION_FALLBACK_MODEL':'glm-4.6v-flash'})

    def test_malformed_and_truncated_outputs_use_a_validated_backup(self):
        for response in [self.response('not json'),self.response(finish='length')]:
            server.VISION_COOLDOWNS.clear()
            with self.backup(),patch('urllib.request.urlopen',side_effect=[response,self.response()]) as transport:
                result=analyze(b'fixture')
            self.assertEqual(result['status'],'ok')
            self.assertEqual(transport.call_count,2)
            self.assertEqual(transport.call_args.args[0].get_header('Authorization'),'Bearer alternate-secret')
            self.assertEqual(json.loads(transport.call_args.args[0].data)['thinking'],{'type':'disabled'})

    def test_invalid_primary_key_recovers_and_cooldown_skips_broken_route(self):
        error=urllib.error.HTTPError('https://primary.example',401,'unauthorized',{},io.BytesIO(b'private-secret'))
        with self.backup(),patch('urllib.request.urlopen',side_effect=[error,self.response(),self.response()]) as transport:
            self.assertEqual(analyze(b'first')['status'],'ok')
            self.assertEqual(analyze(b'second')['status'],'ok')
        self.assertEqual(transport.call_count,3)
        self.assertTrue(all(call.args[0].full_url.startswith('https://backup.example') for call in transport.call_args_list[1:]))

    def test_timeout_can_recover_and_unsupported_never_consults_backup(self):
        with self.backup(),patch('urllib.request.urlopen',side_effect=[TimeoutError(),self.response()]) as transport:
            self.assertEqual(analyze(b'fixture')['status'],'ok')
            self.assertEqual(transport.call_count,2)
        server.VISION_COOLDOWNS.clear()
        with self.backup(),patch('urllib.request.urlopen',return_value=self.response('{"scene":"non_water"}')) as transport:
            self.assertEqual(analyze(b'fixture')['status'],'unsupported')
            self.assertEqual(transport.call_count,1)

    def test_total_budget_prevents_late_second_request(self):
        now=[100.0]
        def late(*args,**kwargs):
            now[0]+=31
            raise TimeoutError()
        with self.backup(),patch('server.time.monotonic',side_effect=lambda:now[0]),patch('urllib.request.urlopen',side_effect=late) as transport:
            with self.assertRaises(ClientError):analyze(b'fixture')
            self.assertEqual(transport.call_count,1)

    def test_reasoning_wrappers_are_removed_and_empty_water_is_rejected(self):
        wrapped='<think>这是思考过程</think><answer>```json\n{"scene":"non_water"}\n```</answer>'
        self.assertEqual(normalize(wrapped)['status'],'unsupported')
        for value in [{'scene':'water','summary':'','findings':[]},{'scene':'water','summary':'水面','findings':[]}]:
            with self.assertRaises(ClientError):normalize(json.dumps(value))

    def test_failed_http_analysis_refunds_only_its_reservation(self):
        with tempfile.TemporaryDirectory() as directory,patch.dict(os.environ,{'STATE_DIRECTORY':directory,'VISION_API_KEY':'fixture'}):
            reserve('other-user')
            httpd=server.http.server.ThreadingHTTPServer(('127.0.0.1',0),server.Handler)
            httpd.preview=True
            worker=threading.Thread(target=httpd.serve_forever,daemon=True);worker.start()
            try:
                body=json.dumps({'image':'data:image/jpeg;base64,'+base64.b64encode(b'\xff\xd8\xff'+b'a'*150+b'\xff\xd9').decode()}).encode()
                request=urllib.request.Request('http://127.0.0.1:'+str(httpd.server_port)+'/api/vision',body,headers={'Content-Type':'application/json'})
                with patch('server.analyze',side_effect=ClientError(503,'暂时繁忙','vision_busy')):
                    with self.assertRaises(urllib.error.HTTPError) as failed:urllib.request.urlopen(request)
                    self.assertEqual(failed.exception.code,503)
                    failed.exception.close()
                import sqlite3
                with sqlite3.connect(Path(directory,'usage.sqlite3')) as db:
                    self.assertEqual(db.execute('SELECT count(*) FROM usage').fetchone()[0],1)
            finally:
                httpd.shutdown();httpd.server_close();worker.join()
if __name__=='__main__':unittest.main()
