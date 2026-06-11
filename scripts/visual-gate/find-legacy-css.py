import pathlib, re
s = pathlib.Path(r'C:\Users\cutec\Projects\Xboard\legacy-dist\public\theme\Xboard\assets\umi.js').read_text(encoding='utf-8', errors='ignore')
# find scoped style block near fX component
idx = s.find('fX=te(')
print('fX at', idx)
# search for data-v scope near order detail - look for uG{
for cls in ['uG{', 'UG{', 'VG{', 'qG{', 'KG{', 'dG{', 'yG{', 'dX{', 'pX{', 'hX{']:
    i = s.find(cls)
    if i >= 0:
        print('---', cls, '---')
        print(s[i:i+200])
