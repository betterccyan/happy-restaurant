// 截图复核：菜品管理的开关与「只看下架」筛选
import { chromium } from 'playwright'

const BASE = process.env.BASE || 'http://127.0.0.1:5180'
const OUT = 'shots'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 360, height: 720 }, deviceScaleFactor: 2 })
page.on('pageerror', (e) => console.log('PAGEERROR', e.message))

await page.goto(BASE, { waitUntil: 'networkidle' })
await page.waitForTimeout(400)
const chef = page.getByText('我是主厨').first()
if (await chef.count()) {
  await chef.click()
  await page.waitForTimeout(900)
}

if (!(await page.locator('.tabbar .tab').first().count())) {
  // 已经以主厨身份进来时，可能在别的页面，先回工作台
  await page.evaluate(() => localStorage.setItem('xfk_role_hint', '1'))
}

const tabs = page.locator('.tabbar .tab')
for (let i = 0; i < (await tabs.count()); i++) {
  if ((await tabs.nth(i).innerText()).replace(/\s/g, '').includes('菜品')) {
    await tabs.nth(i).click()
    break
  }
}
await page.waitForTimeout(900)

// 先把第 3 道菜下架
await page.locator('.row .switch').nth(2).click()
await page.waitForTimeout(500)
await page.screenshot({ path: `${OUT}/shelf-01-off.png` })
console.log('toast:', await page.locator('.toast').innerText())

await page.waitForTimeout(1800)
// 再看「只看下架」
await page.getByText('只看下架').first().click()
await page.waitForTimeout(700)
await page.screenshot({ path: `${OUT}/shelf-02-filter.png` })
console.log('筛选后行数:', await page.locator('.row').count())

// 恢复：把那道菜重新上架
await page.locator('.row .switch').first().click()
await page.waitForTimeout(500)
console.log('toast:', await page.locator('.toast').innerText())
console.log('筛选后剩余行数:', await page.locator('.row').count())
await page.waitForTimeout(400)
await page.screenshot({ path: `${OUT}/shelf-03-empty.png` })

await browser.close()
