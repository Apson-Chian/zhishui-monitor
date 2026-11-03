import base64
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from server import ClientError, image_data, normalize, reserve, analyze

class GatewayTest(unittest.TestCase):
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
            self.assertEqual(call.kwargs['timeout'],35)
            req=call.args[0]
            self.assertEqual(req.get_header('Authorization'),'Bearer test-only')
            self.assertTrue(req.full_url.endswith('/v1/chat/completions'))
            body=json.loads(req.data)
            self.assertEqual(body['model'],'dots_webdev_1022')
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
            self.assertEqual(e.exception.status,502)
if __name__=='__main__':unittest.main()
