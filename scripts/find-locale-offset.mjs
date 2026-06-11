import fs from 'node:fs'
const s = fs.readFileSync('legacy-dist/public/theme/Xboard/assets/umi.js', 'utf8')
for (const loc of ['ja-JP', 'ko-KR', 'zh-TW', 'vi-VN', 'fa-IR', 'zh-CN', 'en-US']) {
  let idx = -1
  let count = 0
  while ((idx = s.indexOf(loc, idx + 1)) >= 0 && count < 3) {
    console.log(loc, idx, JSON.stringify(s.slice(idx - 20, idx + 40)))
    count++
  }
}
