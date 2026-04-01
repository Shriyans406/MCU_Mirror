import urllib.request
import json
req = urllib.request.Request('http://127.0.0.1:8000/ask_ai', method='POST', headers={'Content-Type': 'application/json'}, data=json.dumps({'message': 'hello'}).encode())
response = urllib.request.urlopen(req).read().decode('utf-8')
with open('debug_output.txt', 'w', encoding='utf-8') as f:
    f.write(response)
