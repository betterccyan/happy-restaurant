// 验证「上架/下架」开关：开关状态、提示语、标题计数三者是否一致
import { chromium } from 'playwright'

const BASE = process.env.BASE || 'http://127.0.0.1:5180'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 360, height: 640 } })
page.on('pageerror', (e) => console.log('PAGEERROR', e.message))

await page.goto(BASE, { waitUntil: 'networkidle' })
await page.waitForTimeout(400)
// 若停在身份选择页，选「我是主厨」
const chef = page.getByText('我是主厨').first()
if (await chef.count()) {
  await chef.click()
  await page.waitForTimeout(900)
}
await page.waitForTimeout(600)

// 进「菜品」tab
const tabs = page.locator('.tabbar .tab')
const n = await tabs.count()
for (let i = 0; i < n; i++) {
  const t = (await tabs.nth(i).innerText()).replace(/\s/g, '')
  if (t.includes('菜品')) {
    await tabs.nth(i).click()
    break
  }
}
await page.waitForTimeout(900)

const state = async () => ({
  subtitle: (await page.locator('.ph-title .st').first().innerText().catch(() => '')).trim(),
  toast: (await page.locator('.toast').first().innerText().catch(() => '')).trim(),
  switches: await page.locator('.row .switch').evaluateAll((els) =>
    els.map((e) => (e.classList.contains('on') ? 'ON' : 'OFF'))
  ),
})

const before = await state()
console.log('初始      ', JSON.stringify({ subtitle: before.subtitle, 前三个开关: before.switches.slice(0, 3) }))

// 第 1 次点：第 1 行的开关
await page.locator('.row .switch').first().click()
await page.waitForTimeout(450)
const a = await state()
console.log('点第1次后 ', JSON.stringify({ subtitle: a.subtitle, toast: a.toast, 开关: a.switches[0] }))

// 第 2 次点：同一个
await page.waitForTimeout(1600)
await page.locator('.row .switch').first().click()
await page.waitForTimeout(450)
const b = await state()
console.log('点第2次后 ', JSON.stringify({ subtitle: b.subtitle, toast: b.toast, 开关: b.switches[0] }))

const expect = (s) => (s === 'ON' ? '已上架' : '已下架')
const okA = a.toast.startsWith(expect(a.switches[0]))
const okB = b.toast.startsWith(expect(b.switches[0]))
console.log(`\n判定：第1次 ${okA ? 'PASS' : 'FAIL'}（开关 ${a.switches[0]} → 提示「${a.toast}」）`)
console.log(`      第2次 ${okB ? 'PASS' : 'FAIL'}（开关 ${b.switches[0]} → 提示「${b.toast}」）`)

// 计数自洽性
const hidden = await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('xfk_db_v1'))
  return d.dishes.filter((x) => !x.available).length
})
console.log(`\n数据层已下架数量 = ${hidden}；页面副标题 = ${b.subtitle}`)
console.log(b.subtitle.includes(`${hidden} 道已下架`) ? '计数 PASS' : '计数 FAIL')

await browser.close()
process.exit(okA && okB ? 0 : 1)
