import { chromium } from 'playwright'
import fs from 'node:fs'

const OUT = 'D:/workbuddy_projects/点单小程序/app-android/icon-lab'
fs.mkdirSync(OUT, { recursive: true })

const DEFS = `
<defs>
  <linearGradient id="bg" x1="0.05" y1="0" x2="0.55" y2="1">
    <stop offset="0" stop-color="#5F9BFA"/>
    <stop offset="0.45" stop-color="#2C7BF2"/>
    <stop offset="1" stop-color="#1657C4"/>
  </linearGradient>
  <radialGradient id="glow" cx="0.2" cy="0.05" r="0.8">
    <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.38"/>
    <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="soup" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#FFC078"/>
    <stop offset="1" stop-color="#F79A45"/>
  </linearGradient>
  <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.16"/>
    <stop offset="0.55" stop-color="#FFFFFF" stop-opacity="0"/>
  </linearGradient>
</defs>`

const bgRect = `
  <rect x="0" y="0" width="160" height="160" rx="38" fill="url(#bg)"/>
  <path d="M0 38 A38 38 0 0 1 38 0 H122 L0 122 Z" fill="url(#sheen)"/>
  <rect x="0" y="0" width="160" height="160" rx="38" fill="url(#glow)"/>
  <rect x="0.75" y="0.75" width="158.5" height="158.5" rx="37.3" fill="none"
        stroke="#FFFFFF" stroke-opacity="0.28" stroke-width="1.5"/>`

// 收口碗身：上宽下窄，圆底
const BOWL = `
  <path d="M33 99 C 33 128, 52 141, 80 141 C 108 141, 127 128, 127 99 Z" fill="#FFFFFF"/>
  <ellipse cx="80" cy="99" rx="47" ry="12" fill="none" stroke="#FFFFFF" stroke-width="6"/>`

const BOWL_WITH_SOUP = `
  <path d="M33 99 C 33 128, 52 141, 80 141 C 108 141, 127 128, 127 99 Z" fill="#FFFFFF"/>
  <ellipse cx="80" cy="100.5" rx="38" ry="8.4" fill="url(#soup)"/>
  <ellipse cx="80" cy="99" rx="47" ry="12" fill="none" stroke="#FFFFFF" stroke-width="6"/>`

// A 热饭碗 v2：碗 + 暖橙汤面 + 两道错落蒸汽
const A = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  ${DEFS}${bgRect}
  <g stroke="#FFFFFF" stroke-linecap="round" fill="none" opacity="0.95">
    <path d="M64 74 C 55 62, 73 53, 64 39" stroke-width="8.5"/>
    <path d="M97 70 C 88 59, 104 50, 96 38" stroke-width="8.5"/>
  </g>
  ${BOWL_WITH_SOUP}
</svg>`

// B 心蒸汽 v2：碗口升起一颗心，两侧细热气
const B = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  ${DEFS}${bgRect}
  <g stroke="#FFFFFF" stroke-linecap="round" fill="none" opacity="0.85">
    <path d="M62 80 C 55 70, 61 62, 57 54" stroke-width="6"/>
    <path d="M98 80 C 105 70, 99 62, 103 54" stroke-width="6"/>
  </g>
  <path d="M80 82 C 80 82, 57 66, 57 52 C 57 43, 66 39, 72 44 C 75 47, 80 51, 80 51
           C 80 51, 84 47, 88 44 C 94 39, 103 43, 103 52 C 103 66, 80 82, 80 82 Z"
        fill="#FFFFFF"/>
  ${BOWL}
</svg>`

// C 碗筷 v2：筷子从碗后斜出，末端刚好压在碗口
const C = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  ${DEFS}${bgRect}
  <g stroke="#FFFFFF" stroke-width="6.5" stroke-linecap="round">
    <line x1="73" y1="100" x2="99" y2="30"/>
    <line x1="88" y1="104" x2="114" y2="34"/>
  </g>
  ${BOWL}
</svg>`

const CANDS = [
  { id: 'A', name: '热饭碗', svg: A },
  { id: 'B', name: '心蒸汽', svg: B },
  { id: 'C', name: '碗筷', svg: C }
]

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1400, height: 760 }, deviceScaleFactor: 2 })

const cell = (c) => `
  <div class="col">
    <div class="big">${c.svg.replace('viewBox="0 0 160 160"', 'viewBox="0 0 160 160" width="320" height="320"')}</div>
    <div class="row-sm">
      ${[24, 48, 72, 96].map((s) => `<div class="sm">${c.svg.replace('viewBox="0 0 160 160"', `viewBox="0 0 160 160" width="${s}" height="${s}"`)}</div>`).join('')}
    </div>
    <div class="label">${c.id} · ${c.name}</div>
  </div>`

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  body{margin:0;background:#F4F7FC;font-family:"Microsoft YaHei",system-ui;display:flex;gap:22px;padding:26px}
  .col{display:flex;flex-direction:column;align-items:center;gap:14px}
  .big{filter:drop-shadow(0 10px 26px rgba(22,87,196,.26))}
  .row-sm{display:flex;align-items:flex-end;gap:12px;height:100px}
  .sm{display:flex;align-items:center;justify-content:center}
  .label{font-size:15px;color:#33415C;font-weight:600}
</style></head><body>${CANDS.map(cell).join('')}</body></html>`

await page.setContent(html, { waitUntil: 'load' })
await page.waitForTimeout(400)
await page.screenshot({ path: `${OUT}/v2.png`, fullPage: true })

for (const c of CANDS) {
  const html1 = `<!doctype html><html><head><style>body{margin:0;background:transparent}</style></head>
    <body>${c.svg.replace('viewBox="0 0 160 160"', 'viewBox="0 0 160 160" width="512" height="512"')}</body></html>`
  await page.setContent(html1, { waitUntil: 'load' })
  await page.waitForTimeout(150)
  await page.screenshot({ path: `${OUT}/v2-${c.id}.png`, omitBackground: true })
}

await browser.close()
console.log('ok')
