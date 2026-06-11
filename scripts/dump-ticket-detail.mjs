import fs from 'node:fs'
const s = fs.readFileSync('legacy-dist/public/theme/Xboard/assets/umi.js', 'utf8')
const p = s.indexOf('FY=Object.freeze')
console.log(s.slice(p - 2800, p + 200))
