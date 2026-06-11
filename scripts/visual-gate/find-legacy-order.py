import pathlib
s = pathlib.Path(r'C:\Users\cutec\Projects\Xboard\legacy-dist\public\theme\Xboard\assets\umi.js').read_text(encoding='utf-8', errors='ignore')
for kw in ['closeOrder', 'color:"#db4619"', 'totalTitle', 'payment-item', 'summary-panel', 'UG,[', 'fX=']:
    i = s.find(kw)
    print(kw, i)
idx = s.find('color:"#db4619"')
if idx < 0:
    idx = s.find("color:'#db4619'")
if idx >= 0:
    print('--- snippet ---')
    print(s[idx - 300 : idx + 4000])
