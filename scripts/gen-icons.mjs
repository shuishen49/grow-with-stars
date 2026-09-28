// ⚠️ 注意：public/icons 现在用的是「金色勋章 + 五角星」的 Logo 图（紫色徽章 + 金色勋章），
// 源文件是 public/icons/logo-1024.png，各尺寸由它缩放而来。
// 再跑一次 `npm run gen:icons` 会把 Logo 覆盖回这个脚本画的「紫方块 + 白星」旧图标！
// 要换 Logo 请改 logo-1024.png 后重新缩放，不要直接跑这个脚本。
//
// 原始用途：生成 PWA 图标（无第三方依赖，纯像素绘制 + PNG 编码）
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'

const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const out = Buffer.alloc(8 + data.length + 4)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, 'ascii')
  data.copy(out, 8)
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length)
  return out
}

function encodePNG(width, height, pixels) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0 // filter: none
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function roundedRectSDF(x, y, cx, cy, hw, hh, r) {
  const qx = Math.abs(x - cx) - (hw - r)
  const qy = Math.abs(y - cy) - (hh - r)
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r
}

function starPolygon(cx, cy, R, innerRatio) {
  const pts = []
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5
    const r = i % 2 === 0 ? R : R * innerRatio
    pts.push([cx + r * Math.cos(ang), cy + r * Math.sin(ang)])
  }
  return pts
}

function pointInPoly(pts, x, y) {
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]
    const [xj, yj] = pts[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

function render(size) {
  const S = 4
  const N = size * S
  const px = Buffer.alloc(N * N * 4)
  const star = starPolygon(N / 2, N * 0.48, N * 0.3, 0.45)
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const cx = x + 0.5
      const cy = y + 0.5
      const i = (y * N + x) * 4
      const d = roundedRectSDF(cx, cy, N / 2, N / 2, N / 2 - 1, N / 2 - 1, N * 0.22)
      if (d > 0) {
        px[i + 3] = 0
        continue
      }
      const t = cy / N
      let r = Math.round(99 + (139 - 99) * t)
      let g = Math.round(102 + (92 - 102) * t)
      let b = Math.round(241 + (246 - 241) * t)
      if (pointInPoly(star, cx, cy)) {
        r = 255
        g = 255
        b = 255
      }
      px[i] = r
      px[i + 1] = g
      px[i + 2] = b
      px[i + 3] = 255
    }
  }
  const out = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      for (let dy = 0; dy < S; dy++) {
        for (let dx = 0; dx < S; dx++) {
          const i = ((y * S + dy) * N + (x * S + dx)) * 4
          const al = px[i + 3]
          r += px[i] * al
          g += px[i + 1] * al
          b += px[i + 2] * al
          a += al
        }
      }
      const o = (y * size + x) * 4
      if (a > 0) {
        out[o] = Math.round(r / a)
        out[o + 1] = Math.round(g / a)
        out[o + 2] = Math.round(b / a)
      }
      out[o + 3] = Math.round(a / (S * S))
    }
  }
  return encodePNG(size, size, out)
}

mkdirSync(new URL('../public/icons/', import.meta.url), { recursive: true })
for (const [name, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
]) {
  writeFileSync(new URL('../public/icons/' + name, import.meta.url), render(size))
  console.log('generated', name)
}
