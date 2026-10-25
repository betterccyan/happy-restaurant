// 截底部 dock：重点看背景内容是否还透过玻璃
import { chromium } from 'playwright'
import fs from 'node:fs'

const OUT = 'D:/workbuddy_projects/点单小程序/app-android/.tmp-dock'
fs.mkdirSync(OUT, { recursive: true })
const BASE = process.env.BASE || 'http://127.0.0.1:5180'

const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: 393, height: 852 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true
})
const page = await ctx.newPage()
page.on('pageerror', (e) => console.log('PAGEERROR', e.message))

await page.goto(BASE, { waitUntil: 'networkidle' })
await page.waitForTimeout(700)

// dock 区域（含其上 110px 背景）局部截图
async function dockShot(name) {
  await page.waitForTimeout(620)
  const box = await page.locator('.tabbar').boundingBox()
  const y = Math.max(0, box.y - 110)
  await page.screenshot({
    path: `${OUT}/${name}.png`,
    clip: { x: 0, y, width: 393, height: 852 - y }
  })
  console.log('shot', name)
}

const chef = page.getByText('我是主厨').first()
if (await chef.count()) {
  await chef.click()
  await page.waitForTimeout(1100)
}

await dockShot('a-home-top')

// 滚到内容压在 dock 后面
await page.mouse.move(196, 500)
for (let i = 0; i < 6; i++) await page.mouse.wheel(0, 160)
await dockShot('b-home-scrolled')

// 点菜单：有红色/深色数字压在底栏后面
const tabs = page.locator('.tabbar .tab')
await tabs.nth(1).click()
await page.waitForTimeout(900)
await page.mouse.move(196, 500)
for (let i = 0; i < 4; i++) await page.mouse.wheel(0, 160)
await dockShot('c-orders-scrolled')

// 菜品管理
await tabs.nth(2).click()
await page.waitForTimeout(900)
await page.mouse.move(196, 500)
for (let i = 0; i < 5; i++) await page.mouse.wheel(0, 160)
await dockShot('d-dish-scrolled')

// 全屏一张看整体
await page.screenshot({ path: `${OUT}/e-full.png` })

const css = await page.locator('.tabbar').evaluate((el) => {
  const s = getComputedStyle(el)
  return {
    bgImage: s.backgroundImage,
    backdrop: s.backdropFilter || s.webkitBackdropFilter,
    shadow: s.boxShadow
  }
})
console.log(JSON.stringify(css, null, 2))
await browser.close()
