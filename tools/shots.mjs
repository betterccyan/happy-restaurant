import { chromium } from 'playwright'
import fs from 'node:fs'

const OUT = 'D:/workbuddy_projects/点单小程序/app-android/shots'
fs.mkdirSync(OUT, { recursive: true })

const BASE = 'http://127.0.0.1:5181'

const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: 393, height: 852 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36'
})

const page = await ctx.newPage()
const errors = []
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))

async function shot(name, wait = 700) {
  await page.waitForTimeout(wait)
  await page.screenshot({ path: `${OUT}/${name}.png` })
  console.log('shot', name)
}

let step = 0
const clickText = async (t) => {
  step++
  console.log('  step', step, '->', t)
  const el = page.getByText(t, { exact: false }).first()
  await el.waitFor({ state: 'attached', timeout: 8000 })
  await el.evaluate((n) => n.click())
}

await page.goto(BASE, { waitUntil: 'networkidle' })
await shot('01-role-select', 1200)

await clickText('我是主厨')
await shot('02-owner-home', 1100)

await page.locator('.tabbar .tab').nth(2).click()
await shot('03-dish-manage', 900)

await page.getByText('新增菜品').first().click()
await shot('04-dish-edit', 900)
await page.locator('.ph-back').click()
await shot('05-back-to-dish-manage', 800)

await page.locator('.tabbar .tab').nth(1).click()
await shot('06-order-manage', 900)

await page.locator('.tabbar .tab').nth(0).click()
await page.waitForTimeout(600)
await clickText('分类管理')
await shot('07-category-manage', 900)

await page.locator('.ph-back').click()
await page.waitForTimeout(500)
await clickText('买菜清单')
await shot('08-shopping-list-empty', 900)

await page.locator('.ph-back').click()
await page.waitForTimeout(500)
await page.locator('.tabbar .tab').nth(3).click()
await shot('09-shop-settings', 900)

await page.getByText('切换身份').first().click()
await page.waitForTimeout(900)
await clickText('我是家人')
await shot('10-menu', 1300)

// 有规格的菜 → 弹窗
await page.locator('.dish', { hasText: '宫保鸡丁' }).first().click()
await shot('11-option-sheet', 1000)
await page.locator('.sheet .opt', { hasText: '微辣' }).first().click()
await page.waitForTimeout(300)
await page.locator('.sheet .opt', { hasText: '加花生' }).first().click()
await page.waitForTimeout(300)
await page.locator('.sheet-foot .btn').click()
await page.waitForTimeout(800)

await page.locator('.dish', { hasText: '番茄炒蛋' }).first().click()
await page.waitForTimeout(800)
await shot('12-menu-with-cart', 700)

await page.getByText('去确认').first().click()
await shot('13-checkout', 900)

await page.locator('input[placeholder*="名字"]').first().fill('妈妈')
await page.waitForTimeout(200)
await page.getByText('提交点菜').first().click()
await shot('14-my-orders-submitted', 1300)

// 回主厨
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(600)
await clickText('我是主厨')
await shot('15-chef-home-with-order', 1300)

await page.locator('.tabbar .tab').nth(1).click()
await shot('16-order-manage-pending', 900)

await page.locator('.tabbar .tab').nth(0).click()
await page.waitForTimeout(600)
await clickText('买菜清单')
await shot('17-shopping-list', 1100)

console.log('\n--- console errors ---')
console.log(errors.length ? errors.join('\n') : 'none')

await browser.close()
