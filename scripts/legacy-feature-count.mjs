import fs from 'node:fs'
const s = fs.readFileSync('legacy-dist/public/theme/Xboard/assets/umi.js', 'utf8')
for (const k of [
  'getQuickLoginUrl',
  'loginWithMailLink',
  'commission_distribution',
  'getActiveSession',
  'gift-card',
  'forgetpassword',
  '/node',
  'telegram_login',
]) {
  let c = 0
  let i = 0
  while ((i = s.indexOf(k, i + 1)) >= 0) c++
  console.log(k, c)
}
