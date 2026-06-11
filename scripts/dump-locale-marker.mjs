import fs from 'node:fs'
const s = fs.readFileSync('legacy-dist/public/theme/Xboard/assets/umi.js', 'utf8')
console.log(s.slice(248700, 248900))
