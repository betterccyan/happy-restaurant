import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import { iconSvg } from './icon-src.mjs'

const ROOT = 'D:/workbuddy_projects/点单小程序/app-android'
const RES = path.join(ROOT, 'android/app/src/main/res')
const SHEET = path.join(ROOT, 'icon-preview')
fs.mkdirSync(SHEET, { recursive: true })

const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 }
const SPLASH = {
  drawable: [320, 480],
  'drawable-port-mdpi': [320, 480],
  'drawable-port-hdpi': [480, 800],
  'drawable-port-xhdpi': [640, 960],
  'drawable-port-xxhdpi': [960, 1440],
  'drawable-port-xxxhdpi': [1280, 1920],
  'drawable-land-mdpi': [480, 320],
  'drawable-land-hdpi': [800, 480],
  'drawable-land-xhdpi': [960, 640],
  'drawable-land-xxhdpi': [1440, 960],
  'drawable-land-xxxhdpi': [1920, 1280]
}
const SPLASH_BG = '#EFF2F7'

const browser = await chromium.launch()

async function render(svg, w, h, out, transparent = true) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })
  const bg = transparent ? 'transparent' : SPLASH_BG
  await page.setContent(
    `<!doctype html><html><head><style>
      html,body{margin:0;padding:0;background:${bg};overflow:hidden}
      svg{display:block}
    </style></head><body>${svg}</body></html>`,
    { waitUntil: 'load' }
  )
  await page.waitForTimeout(60)
  await page.screenshot({ path: out, omitBackground: transparent })
  await page.close()
}

// 1) 传统图标（squircle）+ 圆形版本
for (const [name, mult] of Object.entries(DENSITIES)) {
  const dir = path.join(RES, `mipmap-${name}`)
  fs.mkdirSync(dir, { recursive: true })
  const s = Math.round(48 * mult)
  await render(iconSvg({ bg: true, size: s }), s, s, path.join(dir, 'ic_launcher.png'))
  await render(iconSvg({ bg: true, round: true, size: s }), s, s, path.join(dir, 'ic_launcher_round.png'))

  // 2) 自适应图标前景：108dp，图形缩到安全区（约 58%）
  const fg = Math.round(108 * mult)
  await render(iconSvg({ bg: false, glyphScale: 0.82, size: fg }), fg, fg, path.join(dir, 'ic_launcher_foreground.png'))
  console.log('mipmap-' + name, s + 'px / fg ' + fg + 'px')
}

// 3) 启动图：浅灰底 + 居中图标（占短边 30%）
for (const [folder, [w, h]] of Object.entries(SPLASH)) {
  const dir = path.join(RES, folder)
  fs.mkdirSync(dir, { recursive: true })
  const side = Math.round(Math.min(w, h) * 0.3)
  const html = `<div style="width:${w}px;height:${h}px;display:flex;align-items:center;justify-content:center">
      ${iconSvg({ bg: true, size: side })}
    </div>`
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })
  await page.setContent(
    `<!doctype html><html><head><style>html,body{margin:0;padding:0;background:${SPLASH_BG};overflow:hidden}</style></head>
     <body>${html}</body></html>`,
    { waitUntil: 'load' }
  )
  await page.waitForTimeout(60)
  await page.screenshot({ path: path.join(dir, 'splash.png') })
  await page.close()
  console.log('splash', folder, w + 'x' + h)
}

// 4) 预览图：512 母版 + 蒙版适应性检查
await render(iconSvg({ bg: true, size: 512 }), 512, 512, path.join(SHEET, 'icon-512.png'))

const masks = [
  { label: 'squircle（启动器）', css: 'border-radius:24%', svg: iconSvg({ bg: true, size: 200 }) },
  { label: 'circle（圆形蒙版）', css: 'border-radius:50%', svg: iconSvg({ bg: true, size: 200 }) },
  { label: 'adaptive 前景裁切', css: 'border-radius:24%', svg: iconSvg({ bg: false, glyphScale: 0.82, size: 200 }), bgc: '#2C7BF2' }
]

const page = await browser.newPage({ viewport: { width: 760, height: 300 }, deviceScaleFactor: 2 })
await page.setContent(
  `<!doctype html><html><head><meta charset="utf-8"><style>
    body{margin:0;background:#F4F7FC;font-family:"Microsoft YaHei";display:flex;gap:34px;padding:26px;align-items:flex-start}
    .c{display:flex;flex-direction:column;align-items:center;gap:10px}
    .m{width:200px;height:200px;overflow:hidden;display:flex;align-items:center;justify-content:center}
    .t{font-size:13px;color:#41506B}
    .s{display:flex;gap:10px;align-items:flex-end;height:52px}
  </style></head><body>
  ${masks
    .map(
      (m) => `<div class="c">
      <div class="m" style="background:${m.bgc || 'transparent'};${m.css}">${m.svg}</div>
      <div class="t">${m.label}</div></div>`
    )
    .join('')}
  <div class="c">
    <div class="s">${[24, 32, 48].map((s) => iconSvg({ bg: true, size: s })).join('')}</div>
    <div class="t">24 / 32 / 48px 实拍</div>
  </div>
  </body></html>`,
  { waitUntil: 'load' }
)
await page.waitForTimeout(150)
await page.screenshot({ path: path.join(SHEET, 'masks.png'), fullPage: true })

await browser.close()
console.log('\n完成 → icon-preview/')
