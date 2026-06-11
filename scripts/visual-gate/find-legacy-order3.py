import pathlib, re
s = pathlib.Path(r'C:\Users\cutec\Projects\Xboard\legacy-dist\public\theme\Xboard\assets\umi.js').read_text(encoding='utf-8', errors='ignore')
# scoped CSS often in style tag at beginning
for pat in [r'\.uG\[', r'uG\{', r'232e3c', r'35,46,60', r'border-primary', r'\.aG', r'aG\{']:
    m = re.search(pat, s)
    print(pat, m.start() if m else None)
    if m and '232' in pat or (m and 'uG' in pat):
        print(s[m.start():m.start()+300])
