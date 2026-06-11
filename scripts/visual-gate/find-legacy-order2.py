import pathlib
s = pathlib.Path(r'C:\Users\cutec\Projects\Xboard\legacy-dist\public\theme\Xboard\assets\umi.js').read_text(encoding='utf-8', errors='ignore')
idx = s.find('title:e.$t("商品信息")')
if idx < 0:
    idx = s.find('e.$t("商品信息")')
print('idx', idx)
print(s[idx-2500:idx+500])
