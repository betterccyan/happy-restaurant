// 生成 README 用的截图（直接输出到 docs/screenshots/，420px 宽）
// 用法：先 npm run dev，然后 node tools/doc-shots.mjs
import { chromium } from 'playwright'
import fs from 'node:fs'

const BASE = process.env.BASE || 'http://127.0.0.1:5180'
const OUT = 'docs/screenshots'
fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
page.on('pageerror', (e) => console.log('PAGEERROR', e.message))

// 等 toast 消失再拍，画面干净
async function shot(name) {
  await page.waitForTimeout(2200)
  await page.screenshot({ path: `${OUT}/${name}.png` })
  console.log('shot', name)
}

async function clickText(t, opts = {}) {
  const el = page.getByText(t, { exact: false }).first()
  await el.waitFor({ state: 'visible', timeout: 8000 })
  await el.click({ force: true })
  await page.waitForTimeout(500)
}

async function tab(label) {
  const tabs = page.locator('.tabbar .tab')
  for (let i = 0; i < (await tabs.count()); i++) {
    if ((await tabs.nth(i).innerText()).replace(/\s/g, '').includes(label)) {
      await tabs.nth(i).click()
      await page.waitForTimeout(700)
      return
    }
  }
  throw new Error('找不到 tab: ' + label)
}

// —— 干净起步 ——
await page.goto(BASE, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(800)

// 01 身份选择
await shot('01-role-select')

// 02 家人：点菜（加两道，出现购物车栏）
await clickText('我是家人')
await page.waitForTimeout(900)
async function addDish(name) {
  await page.locator('.dish', { hasText: name }).first().click()
  await page.waitForTimeout(800)
  // 有规格的菜会弹底部选规格面板，需要再点一次「加入已选」
  const confirm = page.locator('.sheet-foot .btn')
  if (await confirm.count()) {
    // 必选项没有默认值，每组点第一个
    const groups = page.locator('.sheet .group')
    for (let i = 0; i < (await groups.count()); i++) {
      const opt = groups.nth(i).locator('.opt').first()
      if (await opt.count()) {
        await opt.click()
        await page.waitForTimeout(200)
      }
    }
    await confirm.click()
    await page.waitForTimeout(700)
  }
}

await addDish('番茄炒蛋')
await addDish('宫保鸡丁')
await shot('02-menu')

// 03 确认下单
await clickText('去确认')
await page.waitForTimeout(600)
// 点菜人必填，否则「提交点菜」是禁用态
await page.getByPlaceholder('写个名字，主厨好知道是谁').fill('妈妈')
// 期望时间走应用内的时间面板（原生 type=time 已经去掉）
await page.locator('.time-btn').click()
await page.waitForTimeout(600)
await page.locator('.sheet-foot .btn').click()
await page.waitForTimeout(600)
await shot('03-checkout')
await clickText('提交点菜')
await page.waitForTimeout(1200)

// 切主厨
await clickText('切换身份')
await page.waitForTimeout(600)
await clickText('我是主厨')
await page.waitForTimeout(1200)

// 04 主厨工作台（有待做点单）
await shot('04-owner-home')

// 05 点菜单（订单管理）
await tab('点菜单')
await shot('05-order-manage')

// 06 买菜清单
await tab('工作台')
await clickText('买菜清单')
await shot('06-shopping-list')
await page.locator('.ph-back').click()
await page.waitForTimeout(600)

// 07 菜品管理（下架一道，展示灰态与划掉）
await tab('菜品')
await page.waitForTimeout(600)
await page.locator('.row .switch').nth(2).click()
await page.waitForTimeout(400)
await shot('07-dish-manage')

await browser.close()
console.log('done')
