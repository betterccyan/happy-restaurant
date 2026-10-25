// 平板横竖屏适配的端到端检查：
// 1) 四种视口下逐页截图（平板横屏 1024/1280、平板竖屏 800、手机竖屏 393 作回归）
// 2) 量内容列宽是否居中、有没有横向溢出
// 3) 检查弹层在宽屏上是否收成居中浮层
import { chromium } from 'playwright'
import fs from 'node:fs'

const OUT = 'D:/workbuddy_projects/点单小程序/app-android/shots/111'
fs.mkdirSync(OUT, { recursive: true })

const VIEWS = [
  { name: 'land-1024', w: 1024, h: 768 },
  { name: 'land-1280', w: 1280, h: 800 },
  { name: 'port-800', w: 800, h: 1280 },
  { name: 'phone-393', w: 393, h: 852 }
]

const browser = await chromium.launch()
const errs = []

async function box(page, sel) {
  const el = page.locator(sel).first()
  if (!(await el.count())) return null
  return await el.boundingBox()
}

for (const v of VIEWS) {
  const ctx = await browser.newContext({
    viewport: { width: v.w, height: v.h },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: false
  })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errs.push(v.name + ': ' + e.message))

  const shot = async (n) => page.screenshot({ path: `${OUT}/${v.name}-${n}.png` })
  const measure = async (label, sel) => {
    const b = await box(page, sel)
    if (!b) return console.log(`  ${label}: (无元素)`)
    const left = Math.round(b.x)
    const right = Math.round(v.w - b.x - b.width)
    console.log(`  ${label}: 宽 ${Math.round(b.width)}  左 ${left}  右 ${right}`)
  }

  console.log(`\n[${v.name}] ${v.w}x${v.h}`)
  await page.goto('http://127.0.0.1:5180', { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await shot('1-role')
  await measure('role .wrap', '.wrap')

  await page.getByText('我是主厨').first().click()
  await page.waitForTimeout(900)
  await shot('2-home')
  await measure('home .page-pad', '.page-pad')
  const homeCols = await page
    .locator('.grid')
    .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length)
  console.log('  管理入口列数:', homeCols)

  await page.locator('.tabbar .tab').nth(1).click()
  await page.waitForTimeout(700)
  await shot('3-orders')

  await page.locator('.tabbar .tab').nth(2).click()
  await page.waitForTimeout(700)
  await shot('4-dishes')
  await measure('dishes .page-pad', '.page-pad')

  await page.locator('.tabbar .tab').nth(0).click()
  await page.waitForTimeout(600)
  await page.getByText('分类管理').first().click()
  await page.waitForTimeout(700)
  await shot('5-category')

  await page.locator('.ph-back').click()
  await page.waitForTimeout(600)
  await page.locator('.tabbar .tab').nth(3).click()
  await page.waitForTimeout(700)
  await shot('6-settings')

  // 家人视角：点菜页 + 弹层 + 下单页
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  await page.getByText('我是家人').first().click()
  await page.waitForTimeout(900)
  await shot('7-menu')
  await measure('menu .topbar 行', '.tb-row')
  const menuCols = await page
    .locator('.dishes')
    .evaluate((el) => getComputedStyle(el).display === 'grid' ? getComputedStyle(el).gridTemplateColumns.split(' ').length : 1)
  console.log('  菜品列数:', menuCols)

  await page.getByText('今晚这桌').first().click()
  await page.waitForTimeout(700)
  await shot('8-sheet')
  await measure('table sheet', '.sheet')
  const sheetBottom = await page
    .locator('.sheet')
    .evaluate((el) => Math.round(window.innerHeight - el.getBoundingClientRect().bottom))
  console.log('  sheet 离底:', sheetBottom)
  // 宽屏上 sheet 是居中浮层，点正中间会落在 sheet 上，改点左上角的遮罩
  await page.mouse.click(8, 8)
  await page.waitForTimeout(500)

  await page.locator('.dish').first().click()
  await page.waitForTimeout(600)
  const go = page.getByText('去确认').first()
  if (await go.count()) {
    await go.click()
    await page.waitForTimeout(700)
    await page.getByPlaceholder('写个名字，主厨好知道是谁').fill('妈妈')
    await page.locator('.time-btn').click()
    await page.waitForTimeout(700)
    await shot('9-timesheet')
    await measure('time sheet', '.sheet')
    await page.locator('.sheet-foot .btn').click()
    await page.waitForTimeout(500)
    await shot('10-checkout')
    const dock = await box(page, '.dock')
    console.log('  dock:', dock ? `宽 ${Math.round(dock.width)} 左 ${Math.round(dock.x)}` : '(无)')
  }

  // 横向溢出检查
  const over = await page.evaluate(() => {
    const bad = []
    document.querySelectorAll('body *').forEach((el) => {
      const cs = getComputedStyle(el)
      if (cs.overflowX === 'hidden' || cs.overflowX === 'auto') return
      if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0) {
        bad.push(el.className + ' ' + el.scrollWidth + '>' + el.clientWidth)
      }
    })
    return bad.slice(0, 6)
  })
  console.log('  横向溢出:', over.length ? over : '无')
  await ctx.close()
}

console.log('\n页面报错：', errs.length ? errs : '无')
await browser.close()
