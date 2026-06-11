import fs from 'node:fs'
const s = fs.readFileSync('legacy-dist/public/theme/Xboard/assets/umi.js', 'utf8')
const p = s.indexOf('复制订阅链接')
console.log(s.slice(p - 200, p + 3500))
