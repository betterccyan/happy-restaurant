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
  <radialGradient id="glow" cx="0.2" cy="0.04" r="0.82">
    <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.40"/>
    <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="soup" x1="0.1" y1="0" x2="0.5" y2="1">
    <stop offset="0" stop-color="#FFC98A"/>
    <stop offset="1" stop-color="#F28F35"/>
  </linearGradient>
  <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.15"/>
    <stop offset="0.5" stop-color="#FFFFFF" stop-opacity="0"/>
  </linearGradient>
</defs>`

const bgRect = `
  <rect x="0" y="0" width="160" height="160" rx="38" fill="url(#bg)"/>
  <path d="M0 38 A38 38 0 0 1 38 0 H122 L0 122 Z" fill="url(#sheen)"/>
  <rect x="0" y="0" width="160" height="160" rx="38" fill="url(#glow)"/>
  <rect x="0.75" y="0.75" width="158.5" height="158.5" rx="37.3" fill="none"
        stroke="#FFFFFF" stroke-opacity="0.28" stroke-width="1.5"/>`

// 碗：上宽下窄圆底，碗口低一点留出上方空间
const bowlBody = (rx) => `<path d="M${80 - rx} 102 C ${80 - rx} 130, ${80 - rx * 0.62} 142, 80 142 C ${80 + rx * 0.62} 142, ${80 + rx} 130, ${80 + rx} 102 Z" fill="#FFFFFF"/>`

const A = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  ${DEFS}${bgRect}
  <g stroke="#FFFFFF" stroke-linecap="round" fill="none">
    <path d="M69 76 C 60 67, 74 61, 67 50 C 64 45, 66 42, 66 41" stroke-width="9"/>
    <path d="M93 74 C 84 65, 98 59, 91 48 C 88 43, 90 40, 90 39" stroke-width="9"/>
  </g>
  ${bowlBody(45)}
  <ellipse cx="80" cy="103" rx="37.5" ry="8.6" fill="url(#soup)"/>
  <ellipse cx="80" cy="102" rx="45" ry="12" fill="none" stroke="#FFFFFF" stroke-width="6.5"/>
</svg>`

const C = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  ${DEFS}${bgRect}
  <g stroke="#FFFFFF" stroke-width="6.5" stroke-linecap="round">
    <line x1="76" y1="92" x2="98" y2="28"/>
    <line x1="90" y1="95" x2="112" y2="31"/>
  </g>
  ${bowlBody(45)}
  <ellipse cx="80" cy="102" rx="45" ry="12" fill="none" stroke="#FFFFFF" stroke-width="6.5"/>
</svg>`

const CANDS = [
  { id: 'A', name: '热汤碗', svg: A },
  { id: 'C', name: '碗筷', svg: C }
]

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1000, height: 780 }, deviceScaleFactor: 2 })

const cell = (c) => `
  <div class="col">
    <div class="big">${c.svg.replace('viewBox="0 0 160 160"', 'viewBox="0 0 160 160" width="340" height="340"')}</div>
    <div class="row-sm">
      ${[24, 48, 72, 96, 120].map((s) => `<div class="sm">${c.svg.replace('viewBox="0 0 160 160"', `viewBox="0 0 160 160" width="${s}" height="${s}"`)}</div>`).join('')}
    </div>
    <div class="label">${c.id} · ${c.name}</div>
  </div>`

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  body{margin:0;background:#F4F7FC;font-family:"Microsoft YaHei",system-ui;display:flex;gap:40px;padding:30px}
  .col{display:flex;flex-direction:column;align-items:center;gap:16px}
  .big{filter:drop-shadow(0 12px 30px rgba(22,87,196,.26))}
  .row-sm{display:flex;align-items:flex-end;gap:12px;height:126px}
  .sm{display:flex;align-items:center;justify-content:center}
  .label{font-size:15px;color:#33415C;font-weight:600}
</style></head><body>${CANDS.map(cell).join('')}</body></html>`

await page.setContent(html, { waitUntil: 'load' })
await page.waitForTimeout(400)
await page.screenshot({ path: `${OUT}/v3.png`, fullPage: true })

for (const c of CANDS) {
  const html1 = `<!doctype html><html><head><style>body{margin:0;background:transparent}</style></head>
    <body>${c.svg.replace('viewBox="0 0 160 160"', 'viewBox="0 0 160 160" width="512" height="512"')}</body></html>`
  await page.setContent(html1, { waitUntil: 'load' })
  await page.waitForTimeout(150)
  await page.screenshot({ path: `${OUT}/v3-${c.id}.png`, omitBackground: true })
}

await browser.close()
console.log('ok')
