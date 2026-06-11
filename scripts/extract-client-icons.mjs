import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const s = fs.readFileSync(path.join(root, 'legacy-dist/public/theme/Xboard/assets/umi.js'), 'utf8')

const re = /name:"([^"]+)"[^}]*icon:"(data:image\/[^"]+)"/g
const icons = {}
let m
while ((m = re.exec(s))) {
  icons[m[1]] = m[2]
}

const out = path.join(root, 'frontend/user/src/assets/client-icons.json')
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, JSON.stringify(icons, null, 2))
console.log('extracted', Object.keys(icons).length, 'icons:', Object.keys(icons).join(', '))
