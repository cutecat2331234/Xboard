import fs from 'node:fs'
const s = fs.readFileSync('legacy-dist/public/theme/Xboard/assets/umi.js', 'utf8')
for (const loc of ['ja-JP', 'ko-KR', 'vi-VN', 'zh-TW', 'fa-IR']) {
  const needle = `"./lang/${loc}.json":`
  const i = s.indexOf(needle)
  if (i < 0) continue
  console.log(loc, s.slice(i, i + 120))
}
