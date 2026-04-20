import urllib.request
import base64
import os
import json

def load_env():
    with open('.env', 'r') as f:
        for line in f:
            if '=' in line and not line.startswith('#'):
                k, v = line.strip().split('=', 1)
                os.environ[k] = v.strip("'\"")

load_env()
user = os.environ.get('VITE_MAGAZORD_USER')
pwd = os.environ.get('VITE_MAGAZORD_PASS')
base = os.environ.get('VITE_MAGAZORD_BASE_URL')

url = f"{base}/api/v2/site/pedido/0012604710252"
auth_str = f"{user}:{pwd}"
b64_auth = base64.b64encode(auth_str.encode('utf-8')).decode('ascii')

req = urllib.request.Request(url)
req.add_header('Authorization', f'Basic {b64_auth}')
req.add_header('Accept', 'application/json')

try:
    with urllib.request.urlopen(req) as response:
        text = response.read().decode('utf-8')
        try:
            data = json.loads(text)
            d = data.get('data', data)
            def find_nf(obj, path=''):
                if isinstance(obj, dict):
                    for k, v in obj.items():
                        if any(x in k.lower() for x in ['nota', 'nf', 'fiscal']):
                            print(f"{path}.{k} = {str(v)[:150]}")
                        find_nf(v, path + '.' + k if path else k)
                elif isinstance(obj, list):
                    for i, item in enumerate(obj[:3]):
                        find_nf(item, path + f'[{i}]')
            
            find_nf(d)
            if 'arrayPedidoNota' in d:
                print('arrayPedidoNota:', json.dumps(d['arrayPedidoNota'], indent=2))
        except Exception as e:
            print("Parse err:", e)
except Exception as e:
    print("HTTP err:", e)
