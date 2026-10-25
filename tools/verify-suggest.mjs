// 验证：菜名联想 + 自动填充 + 应用内确认弹窗
import { chromium } from 'playwright'
import fs from 'node:fs'

const OUT = 'D:/workbuddy_projects/点单小程序/app-android/.tmp-edit'
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
await page.waitForTimeout(700)

const chef = page.getByText('我是主厨').first()
if (await chef.count()) {
  await chef.click()
  await page.waitForTimeout(1100)
}

// 进入菜品 → 新增
await page.locator('.tabbar .tab').nth(2).click()
await page.waitForTimeout(800)
await page.getByText('新增菜品').first().click()
await page.waitForTimeout(800)

const nameInput = page.locator('.name-wrap input')
await nameInput.click()
await nameInput.type('剁椒', { delay: 90 })
await page.waitForTimeout(500)

const sugCount = await page.locator('.sug-item').count()
const sugTexts = await page.locator('.sug-item').evaluateAll((els) =>
  els.map((e) => e.innerText.replace(/\s+/g, ' ').trim())
)
console.log('候选数量', sugCount)
console.log('候选', JSON.stringify(sugTexts))
await page.screenshot({ path: `${OUT}/1-suggest.png` })

// 选第一条
await page.locator('.sug-item').first().click()
await page.waitForTimeout(700)
const picked = await nameInput.inputValue()
console.log('选中后菜名 =', picked)
const hintText = await page.locator('.guess').first().innerText().catch(() => '(无)')
console.log('推断卡片:', hintText.replace(/\s+/g, ' ').slice(0, 90))
await page.screenshot({ path: `${OUT}/2-picked.png` })

// 填入
await page.getByText('填入热量和食材').first().click()
await page.waitForTimeout(500)
const cal = await page.locator('.field.gap input[type=number]').first().inputValue()
const ings = await page.locator('.field-col textarea').first().inputValue()
console.log('热量 =', cal, '| 食材 =', JSON.stringify(ings))
await page.screenshot({ path: `${OUT}/3-filled.png` })

// 再点一次填入 → 应弹应用内确认弹窗
const guessAgain = page.getByText('填入热量和食材').first()
if (await guessAgain.count()) {
  await guessAgain.click()
  await page.waitForTimeout(400)
  const dlg = await page.locator('.dlg').count()
  console.log('二次填入弹窗 =', dlg)
  if (dlg) {
    await page.screenshot({ path: `${OUT}/4-dialog.png` })
    await page.locator('.dbtn.solid').click()
    await page.waitForTimeout(400)
  }
}

// 保存 → 回列表 → 进详情 → 删除，检查确认弹窗
await page.getByText('加入菜单').first().click()
await page.waitForTimeout(900)
await page.screenshot({ path: `${OUT}/5-list.png` })

// 打开刚存的菜
await page.getByText(picked).first().click()
await page.waitForTimeout(800)
const delBtn = page.getByText('删除这道菜').first()
if (await delBtn.count()) {
  await delBtn.click()
  await page.waitForTimeout(500)
  const dlg2 = await page.locator('.dlg').count()
  const dlgTitle = await page.locator('.dlg-title').first().innerText().catch(() => '')
  console.log('删除弹窗 =', dlg2, '| 标题 =', dlgTitle)
  await page.screenshot({ path: `${OUT}/6-del-dialog.png` })
  // 先取消
  await page.locator('.dbtn').first().click()
  await page.waitForTimeout(400)
  console.log('取消后仍在编辑页 =', (await page.locator('.name-wrap').count()) > 0)
  // 再删掉确认
  await delBtn.click()
  await page.waitForTimeout(400)
  await page.locator('.dbtn.solid').click()
  await page.waitForTimeout(900)
  console.log('确认后是否回到列表 =', (await page.locator('.tabbar').count()) > 0)
}

console.log('错误:', errs.length ? errs : '无')
await browser.close()
