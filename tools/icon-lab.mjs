import { chromium } from 'playwright'
import fs from 'node:fs'

const OUT = 'D:/workbuddy_projects/点单小程序/app-android/icon-lab'
fs.mkdirSync(OUT, { recursive: true })

const DEFS = `
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="0.25" y2="1">
    <stop offset="0" stop-color="#5B98FA"/>
    <stop offset="0.46" stop-color="#2C7BF2"/>
    <stop offset="1" stop-color="#1657C4"/>
  </linearGradient>
  <radialGradient id="glow" cx="0.22" cy="0.08" r="0.75">
    <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.34"/>
    <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
  </radialGradient>
  <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
    <feGaussianBlur stdDeviation="3"/>
  </filter>
</defs>`

const bgRect = `
  <rect x="0" y="0" width="160" height="160" rx="38" fill="url(#bg)"/>
  <rect x="0" y="0" width="160" height="160" rx="38" fill="url(#glow)"/>
  <rect x="0.75" y="0.75" width="158.5" height="158.5" rx="37.3" fill="none"
        stroke="#FFFFFF" stroke-opacity="0.30" stroke-width="1.5"/>`

// A 热饭碗：白碗 + 碗内暖橙汤面 + 两道蒸汽
const A = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  ${DEFS}${bgRect}
  <g opacity="0.94">
    <path d="M67 79 C 60 68, 74 58, 67 45" stroke="#FFFFFF" stroke-width="7.5"
          stroke-linecap="round" fill="none"/>
    <path d="M93 79 C 86 68, 100 58, 93 45" stroke="#FFFFFF" stroke-width="7.5"
          stroke-linecap="round" fill="none"/>
  </g>
  <path d="M36 99 A 44 44 0 0 0 124 99 Z" fill="#FFFFFF"/>
  <ellipse cx="80" cy="99" rx="44" ry="12.5" fill="none" stroke="#FFFFFF" stroke-width="7"/>
  <ellipse cx="80" cy="99" rx="31" ry="7.6" fill="#FFB169"/>
</svg>`

// B 心蒸汽：白碗 + 一颗心形热气（呼应「幸福」）
const B = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  ${DEFS}${bgRect}
  <path d="M80 84 C 80 84, 56 68, 56 54 C 56 45, 65 41, 71 46 C 75 49, 80 53, 80 53
           C 80 53, 85 49, 89 46 C 95 41, 104 45, 104 54 C 104 68, 80 84, 80 84 Z"
        fill="#FFFFFF"/>
  <path d="M36 99 A 44 44 0 0 0 124 99 Z" fill="#FFFFFF"/>
  <ellipse cx="80" cy="99" rx="44" ry="12.5" fill="none" stroke="#FFFFFF" stroke-width="7"/>
</svg>`

// C 碗筷：筷子从碗后斜出，最中式的「吃饭」符号
const C = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  ${DEFS}${bgRect}
  <g stroke="#FFFFFF" stroke-width="7" stroke-linecap="round">
    <line x1="84" y1="104" x2="112" y2="30"/>
    <line x1="99" y1="110" x2="127" y2="36"/>
  </g>
  <path d="M36 99 A 44 44 0 0 0 124 99 Z" fill="#FFFFFF"/>
  <ellipse cx="80" cy="99" rx="44" ry="12.5" fill="none" stroke="#FFFFFF" stroke-width="7"/>
</svg>`

const CANDS = [
  { id: 'A', name: '热饭碗', svg: A },
  { id: 'B', name: '心蒸汽', svg: B },
  { id: 'C', name: '碗筷', svg: C }
]

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1400, height: 700 }, deviceScaleFactor: 2 })

const cell = (c) => `
  <div class="col">
    <div class="big">${c.svg.replace('viewBox="0 0 160 160"', 'viewBox="0 0 160 160" width="320" height="320"')}</div>
    <div class="row-sm">
      ${[24, 48, 72].map((s) => `<div class="sm">${c.svg.replace('viewBox="0 0 160 160"', `viewBox="0 0 160 160" width="${s}" height="${s}"`)}</div>`).join('')}
    </div>
    <div class="label">${c.id} · ${c.name}</div>
  </div>`

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  body{margin:0;background:#F4F7FC;font-family:"Microsoft YaHei",system-ui;display:flex;gap:24px;padding:28px}
  .col{display:flex;flex-direction:column;align-items:center;gap:14px}
  .big{filter:drop-shadow(0 10px 26px rgba(22,87,196,.28))}
  .row-sm{display:flex;align-items:flex-end;gap:14px;height:80px}
  .sm{display:flex;align-items:center;justify-content:center}
  .label{font-size:15px;color:#33415C;font-weight:600}
</style></head><body>${CANDS.map(cell).join('')}</body></html>`

await page.setContent(html, { waitUntil: 'load' })
await page.waitForTimeout(500)
await page.screenshot({ path: `${OUT}/candidates.png`, fullPage: true })

// 单个 512 导出，供后续做 mipmap
for (const c of CANDS) {
  const html1 = `<!doctype html><html><head><style>body{margin:0;background:transparent}</style></head>
    <body>${c.svg.replace('viewBox="0 0 160 160"', 'viewBox="0 0 160 160" width="512" height="512"')}</body></html>`
  await page.setContent(html1, { waitUntil: 'load' })
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${OUT}/${c.id}-512.png`, omitBackground: true })
}

await browser.close()
console.log('渲染完成 → icon-lab/candidates.png')
