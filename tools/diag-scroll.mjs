import { chromium } from 'playwright'

const BASE = 'http://127.0.0.1:5180'
const OUT = 'D:/workbuddy_projects/点单小程序/app-android/shots'

const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: Number(process.env.VW || 360), height: Number(process.env.VH || 640) },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true
})
const page = await ctx.newPage()
const errs = []
page.on('pageerror', (e) => errs.push(e.message))

const tap = async (t) => {
  const el = page.getByText(t, { exact: false }).first()
  await el.waitFor({ state: 'attached', timeout: 8000 })
  await el.evaluate((n) => n.click())
  await page.waitForTimeout(750)
}

const results = []
async function audit(label) {
  const r = await page.evaluate(() => {
    const root = document.querySelector('.page-root')
    if (!root) return { error: 'no page-root' }
    const cands = [root, ...root.querySelectorAll('*')]
    const scroller = cands.find((el) => {
      const cs = getComputedStyle(el)
      return /auto|scroll/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 2
    })
    const target = scroller || root
    const maxScroll = target.scrollHeight - target.clientHeight
    target.scrollTop = 9999
    const reached = target.scrollTop
    target.scrollTop = 0
    return {
      cls: root.className,
      scroller: scroller ? scroller.className || '(root)' : 'NONE',
      vp: window.innerHeight,
      clientH: target.clientHeight,
      scrollH: target.scrollHeight,
      maxScroll,
      reached
    }
  })
  const fitsViewport = r.clientH <= r.vp + 2
  const scrollOk = r.maxScroll <= 2 || r.reached >= r.maxScroll - 2
  const good = fitsViewport && scrollOk
  const mark = good ? 'OK  ' : 'FAIL'
  console.log(
    `${mark} ${label.padEnd(10)} 视口${String(r.vp).padStart(4)} 可视${String(r.clientH).padStart(4)} 内容${String(r.scrollH).padStart(4)} 可滚${String(r.maxScroll).padStart(4)}px 实到${String(r.reached).padStart(4)}px  ${r.scroller}`
  )
  results.push({ label, ...r, good })
  return good
}

await page.goto(BASE, { waitUntil: 'networkidle' })
await page.waitForTimeout(700)

await audit('身份选择')

console.log('--- 家人：点菜 → 下单 ---')
await tap('我是家人')
await audit('点菜')

await page.locator('.dish', { hasText: '宫保鸡丁' }).first().click()
await page.waitForTimeout(700)
if (await page.locator('.sheet').count()) {
  for (const t of ['微辣', '加花生']) {
    const opt = page.locator('.sheet .opt', { hasText: t }).first()
    if (await opt.count()) await opt.click()
    await page.waitForTimeout(200)
  }
  await page.locator('.sheet-foot .btn').click()
  await page.waitForTimeout(600)
}
await page.locator('.dish', { hasText: '番茄炒蛋' }).first().click()
await page.waitForTimeout(600)
await page.getByText('去确认').first().click()
await page.waitForTimeout(700)
await page.locator('input[placeholder*="名字"]').first().fill('妈妈')
await audit('确认下单')
await page.getByText('提交点菜').first().click()
await page.waitForTimeout(1200)

// 再补两单，保证「点菜单」列表必然溢出
for (let i = 0; i < 2; i++) {
  await page.locator('.tabbar .tab').nth(0).click()
  await page.waitForTimeout(700)
  await page.locator('.dish', { hasText: '番茄炒蛋' }).first().click()
  await page.waitForTimeout(600)
  await page.getByText('去确认').first().click()
  await page.waitForTimeout(700)
  await page.getByText('提交点菜').first().click()
  await page.waitForTimeout(1000)
}
await audit('我的点单')
await page.screenshot({ path: `${OUT}/diag-my-orders.png` })

console.log('--- 主厨 ---')
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(600)
await tap('我是主厨')
await audit('工作台')
await page.locator('.tabbar .tab').nth(1).click()
await page.waitForTimeout(800)
await audit('点菜单')
await page.screenshot({ path: `${OUT}/diag-order-manage.png` })
await page.locator('.tabbar .tab').nth(2).click()
await page.waitForTimeout(800)
await audit('菜品管理')
await tap('新增菜品')
await audit('菜品编辑')
await page.locator('.ph-back').click()
await page.waitForTimeout(600)
await page.locator('.tabbar .tab').nth(3).click()
await page.waitForTimeout(800)
await audit('家庭信息')
await page.locator('.tabbar .tab').nth(0).click()
await page.waitForTimeout(700)
await tap('分类管理')
await audit('分类管理')
await page.locator('.ph-back').click()
await page.waitForTimeout(600)
await tap('买菜清单')
await audit('买菜清单')

const bad = results.filter((r) => !r.good)
console.log(bad.length ? `\n✗ ${bad.length} 个页面滚动异常` : '\n✓ 全部页面滚动正常')
if (errs.length) console.log('页面错误:', errs.slice(0, 3))
await browser.close()
