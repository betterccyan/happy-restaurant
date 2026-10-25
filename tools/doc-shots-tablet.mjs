// README 用的平板截图：1024×768 横屏，等 toast 消失再截，避免遮住内容
import { chromium } from 'playwright'
import fs from 'node:fs'

const OUT = 'D:/workbuddy_projects/点单小程序/app-android/docs/screenshots'
fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: 1024, height: 768 },
  deviceScaleFactor: 2,
  hasTouch: true
})
const page = await ctx.newPage()
await page.goto('http://127.0.0.1:5180', { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(700)

// 家人：点菜页
await page.getByText('我是家人').first().click()
await page.waitForTimeout(3200)
await page.screenshot({ path: `${OUT}/08-tablet-menu.png` })

// 主厨：工作台
await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('xfk_db_v1'))
  d.profile = { role: 'chef', nickname: '' }
  localStorage.setItem('xfk_db_v1', JSON.stringify(d))
})
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(700)
await page.getByText('我是主厨').first().click()
await page.waitForTimeout(3200)
await page.screenshot({ path: `${OUT}/09-tablet-home.png` })

await page.locator('.tabbar .tab').nth(2).click()
await page.waitForTimeout(900)
await page.screenshot({ path: `${OUT}/10-tablet-dishes.png` })

await browser.close()
console.log('done')
