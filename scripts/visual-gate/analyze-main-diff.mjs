#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'

const route = process.argv[2] || 'dashboard'
const refPng = PNG.sync.read(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'output/analyze', `${route}-ref.png`)))
const cmpPng = PNG.sync.read(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'output/analyze', `${route}-cmp.png`)))
const w = Math.min(refPng.width, cmpPng.width)
const h = Math.min(refPng.height, cmpPng.height)
const x0 = 236
const y0 = 76
const x1 = w
const y1 = h
const cw = x1 - x0
const ch = y1 - y0
const a = new PNG({ width: cw, height: ch })
const b = new PNG({ width: cw, height: ch })
const diff = new PNG({ width: cw, height: ch })
PNG.bitblt(refPng, a, x0, y0, cw, ch, 0, 0)
PNG.bitblt(cmpPng, b, x0, y0, cw, ch, 0, 0)
const n = pixelmatch(a.data, b.data, diff.data, cw, ch, { threshold: 0.15, includeAA: false })
console.log(`${route} main-only diff: ${((n / (cw * ch)) * 100).toFixed(3)}%`)
