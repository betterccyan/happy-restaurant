// 强对比场景验证：让深色/彩色内容正好停在 dock 后面
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

// 家庭成员视角
const guest = page.getByText('我是家人').first()
if (await guest.count()) {
  await guest.click()
  await page.waitForTimeout(1200)
} else {
  console.log('未找到身份选择，当前页可能是已选身份')
}

async function dockShot(name) {
  await page.waitForTimeout(700)
  const hidden = await page.locator('.tabbar-wrap.hide').count()
  const box = await page.locator('.tabbar').boundingBox()
  if (!box) return console.log('no dock box')
  const y = Math.max(0, box.y - 120)
  await page.screenshot({
    path: `${OUT}/${name}.png`,
    clip: { x: 0, y, width: 393, height: Math.min(852 - y, 220) }
  })
  console.log('shot', name, 'hidden=', !!hidden)
}

// 设置滚动容器位置（一次 scrollTo 只发一个 scroll 事件，dy=0 不会触发隐藏）
async function scrollToY(y) {
  await page.evaluate((target) => {
    const els = [...document.querySelectorAll('*')]
    let best = null
    for (const el of els) {
      if (el.scrollHeight > el.clientHeight + 4 && el.clientHeight > 300) {
        if (!best || el.clientHeight > best.clientHeight) best = el
      }
    }
    if (best) best.scrollTop = target
    else window.scrollTo(0, target)
  }, y)
}

await dockShot('g-menu-top')
await scrollToY(240)
await dockShot('h-menu-mid-240')
await scrollToY(420)
await dockShot('i-menu-mid-420')

// 再等一会儿看是否会因一次 scroll 事件被误收起
await page.waitForTimeout(600)
await dockShot('j-stable')

const winScroll = await page.evaluate(() => {
  const els = [...document.querySelectorAll('*')].filter(
    (e) => e.scrollHeight > e.clientHeight + 4
  )
  return els.map((e) => ({ cls: e.className?.toString?.().slice(0, 30), top: e.scrollTop }))
})
console.log(JSON.stringify(winScroll))
await browser.close()
