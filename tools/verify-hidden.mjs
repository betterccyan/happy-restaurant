// 验证「下架的菜，家人端看不到」
import { chromium } from 'playwright'

const BASE = 'http://127.0.0.1:5180'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 })
p.on('pageerror', (e) => console.log('PAGEERROR', e.message))

await p.goto(BASE, { waitUntil: 'networkidle' })
await p.waitForTimeout(400)

// 主厨：下架「青椒土豆丝」
const chef = p.getByText('我是主厨').first()
if (await chef.count()) {
  await chef.click()
  await p.waitForTimeout(800)
}
const tabs = p.locator('.tabbar .tab')
for (let i = 0; i < (await tabs.count()); i++) {
  if ((await tabs.nth(i).innerText()).replace(/\s/g, '').includes('菜品')) {
    await tabs.nth(i).click()
    break
  }
}
await p.waitForTimeout(800)

const rows = p.locator('.row')
const n = await rows.count()
for (let i = 0; i < n; i++) {
  const t = await rows.nth(i).innerText()
  if (t.includes('青椒土豆丝')) {
    await rows.nth(i).locator('.switch').click()
    await p.waitForTimeout(500)
    break
  }
}
const off = await p.evaluate(() =>
  JSON.parse(localStorage.getItem('xfk_db_v1')).dishes.filter((d) => !d.available).map((d) => d.name)
)
console.log('已下架：', off)

// 切到家人
await p.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('xfk_db_v1'))
  d.profile.role = 'member'
  localStorage.setItem('xfk_db_v1', JSON.stringify(d))
})
await p.reload({ waitUntil: 'networkidle' })
await p.waitForTimeout(1200)

const member = p.getByText('我是家人').first()
if (await member.count()) {
  await member.click()
  await p.waitForTimeout(900)
}
const body = await p.locator('body').innerText()
console.log('家人菜单里还有「青椒土豆丝」吗：', body.includes('青椒土豆丝') ? '有（错误）' : '没有（正确）')
console.log('家人菜单里还有「宫保鸡丁」吗：', body.includes('宫保鸡丁') ? '有（正确）' : '没有（错误）')
await p.screenshot({ path: 'shots/shelf-04-member.png' })

// 复位：恢复上架，身份回主厨
await p.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('xfk_db_v1'))
  d.dishes = d.dishes.map((x) => ({ ...x, available: true }))
  d.profile.role = 'owner'
  localStorage.setItem('xfk_db_v1', JSON.stringify(d))
})
await b.close()
