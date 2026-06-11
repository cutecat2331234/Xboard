import pathlib
s = pathlib.Path(r'C:\Users\cutec\Projects\Xboard\legacy-dist\public\theme\Xboard\assets\umi.js').read_text(encoding='utf-8', errors='ignore')
idx = s.find(',aG,[')
print('aG render', idx)
idx2 = s.find('aG=')
print('aG def count', s.count('aG='))
# find fX component setup - search backwards from aG render for const definitions
start = max(0, idx - 8000)
chunk = s[start:idx+100]
# find class definitions like aG={ or ,aG=
import re
for m in re.finditer(r'([a-zA-Z]{1,3}G)=\{', chunk):
    name = m.group(1)
    pos = m.start()
    print(name, chunk[pos:pos+120])
