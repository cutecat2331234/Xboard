import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const s = fs.readFileSync(path.join(root, 'legacy-dist/public/theme/Xboard/assets/umi.js'), 'utf8')
const start = s.indexOf('name:"复制订阅链接"')
const end = s.indexOf('].filter', start)
const chunk = s.slice(start, end)

const parts = chunk.split(/\},\{name:/).map((p, i) => (i === 0 ? p : 'name:' + p))
const entries = parts.map((part) => {
  const name = part.match(/name:"([^"]+)"/)?.[1]
  const urlMatch = part.match(/url:"([^"]*)"/) || part.match(/url:`([^`]*)`/)
  const url = urlMatch?.[1]
  const platforms = part.match(/platforms:\[([^\]]+)\]/)?.[1]?.replace(/"/g, '').split(',')
  const hasImg = part.includes('data:image')
  return { name, url, platforms, hasImg }
})

console.log(JSON.stringify(entries, null, 2))
