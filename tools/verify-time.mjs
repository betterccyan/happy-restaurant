// 验证自定义时间选择器：打开 → 快捷 → 滚轮 → 确认 → 清除
import { chromium } from 'playwright'
import fs from 'node:fs'

const OUT = 'D:/workbuddy_projects/点单小程序/app-android/shots/109'
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
const errs = []
page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message))
page.on('console', (m) => {
  if (m.type() === 'error') errs.push('CONSOLE ' + m.text())
})

await page.goto(BASE, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(800)

await page.getByText('我是家人').first().click()
await page.waitForTimeout(900)

async function addDish(name) {
  await page.locator('.dish', { hasText: name }).first().click()
  await page.waitForTimeout(700)
  const confirm = page.locator('.sheet-foot .btn')
  if (await confirm.count()) {
    const groups = page.locator('.sheet .group')
    for (let i = 0; i < (await groups.count()); i++) {
      const opt = groups.nth(i).locator('.opt').first()
      if (await opt.count()) await opt.click()
      await page.waitForTimeout(150)
    }
    await confirm.click()
    await page.waitForTimeout(600)
  }
}
await addDish('番茄炒蛋')
await page.getByText('去确认').first().click()
await page.waitForTimeout(700)
await page.getByPlaceholder('写个名字，主厨好知道是谁').fill('妈妈')
await page.waitForTimeout(300)

// 打开时间面板
const timeBtn = page.locator('.time-btn')
console.log('打开前按钮文字 =', (await timeBtn.innerText()).trim())
await timeBtn.click()
await page.waitForTimeout(700)
console.log('sheet 出现 =', await page.locator('.time-sheet').count())
console.log('滚轮初始 =', await page.locator('.wheel-item.on').first().innerText(), '/',
  await page.locator('.wheel-item.on').nth(1).innerText())
console.log('按钮文案 =', (await page.locator('.sheet-foot .btn').innerText()).trim())
await page.screenshot({ path: `${OUT}/1-sheet.png` })

// 快捷：1 小时后
await page.getByText('1 小时后').first().click()
await page.waitForTimeout(500)
console.log('快捷后 =', await page.locator('.wheel-item.on').first().innerText(), '/',
  await page.locator('.wheel-item.on').nth(1).innerText())
await page.screenshot({ path: `${OUT}/2-quick.png` })

// 滚轮：小时列往上滚 3 格
const hourWheel = page.locator('.wheel').first()
const before = await hourWheel.evaluate((el) => el.scrollTop)
await hourWheel.evaluate((el) => {
  el.scrollTop = el.scrollTop + 38 * 3
})
await page.waitForTimeout(500)
const after = await hourWheel.evaluate((el) => el.scrollTop)
console.log('滚轮 scrollTop', before, '→', after, '| 当前小时 =',
  await page.locator('.wheel-item.on').first().innerText())
await page.screenshot({ path: `${OUT}/3-wheel.png` })

// 确认
const picked = (await page.locator('.sheet-foot .btn').innerText()).trim()
await page.locator('.sheet-foot .btn').click()
await page.waitForTimeout(700)
console.log('确认文案 =', picked)
console.log('卡片显示 =', (await page.locator('.time-btn').innerText()).trim())
console.log('sheet 已关 =', (await page.locator('.time-sheet').count()) === 0)
await page.screenshot({ path: `${OUT}/4-picked.png` })

// 清除
await page.locator('.time-clear').click()
await page.waitForTimeout(500)
console.log('清除后 =', (await page.locator('.time-btn').innerText()).trim())

// 再次打开应记住上次选择（空 → 默认现在+30）
await page.locator('.time-btn').click()
await page.waitForTimeout(600)
console.log('重开 =', await page.locator('.wheel-item.on').first().innerText(), '/',
  await page.locator('.wheel-item.on').nth(1).innerText())
// 「尽快」直接清空并关闭
await page.locator('.q-chip.ghost').first().click()
await page.waitForTimeout(500)
console.log('点尽快后 sheet 已关 =', (await page.locator('.time-sheet').count()) === 0,
  '| 按钮 =', (await page.locator('.time-btn').innerText()).trim())

console.log('错误:', errs.length ? errs : '无')
await browser.close()
