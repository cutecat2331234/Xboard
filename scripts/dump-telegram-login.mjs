import fs from 'node:fs'
const s = fs.readFileSync('legacy-dist/public/theme/Xboard/assets/umi.js', 'utf8')
const p = s.indexOf('telegram-login-container')
console.log('container', p)
if (p > 0) console.log(s.slice(p - 500, p + 800))
const p2 = s.indexOf('telegramLogin')
console.log('api', p2, s.slice(p2 - 100, p2 + 200))
