// 二级分类的补充验证：推断带二级、「其他」兜底、删二级后的菜
import { chromium } from 'playwright'
import fs from 'node:fs'

const OUT = 'D:/workbuddy_projects/点单小程序/app-android/shots/110'
fs.mkdirSync(OUT, { recursive: true })

const BASE = {
  v: 1,
  profile: { role: '', nickname: '' },
  settings: { name: '幸福小馆', notice: '今天想吃点什么？' },
  categories: [
    { id: 'c1', name: '早餐', sort: 0, subs: [] },
    { id: 'c2', name: '中晚餐', sort: 1, subs: [] },
    { id: 'c3', name: '加餐', sort: 2, subs: [] }
  ],
  dishes: [
    { id: 'd1', name: '豆浆', category: '早餐', sub: '', emoji: '🥛', calories: 120, ingredients: '黄豆 60 克' },
    { id: 'd2', name: '小笼包', category: '早餐', sub: '', emoji: '🥟', calories: 320, ingredients: '面粉 300 克' },
    { id: 'd3', name: '番茄炒蛋', category: '中晚餐', sub: '', emoji: '🍅', calories: 180, ingredients: '番茄 2 个' }
  ],
  orders: [],
  checked: {},
  lastMemberName: ''
}

const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: 393, height: 852 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true
})
const page = await ctx.newPage()
const errs = []
page.on('pageerror', (e) => errs.push(e.message))
const ok = (label, cond) => console.log((cond ? '  OK  ' : ' FAIL ') + label)

await page.goto('http://127.0.0.1:5180', { waitUntil: 'networkidle' })
await page.evaluate((d) => localStorage.setItem('xfk_db_v1', JSON.stringify(d)), BASE)
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(700)
await page.getByText('我是主厨').first().click()
await page.waitForTimeout(900)

/* ---------- 1. 新建菜品：推断带出二级 ---------- */
console.log('\n[1] 推断带二级')
await page.locator('.tabbar .tab').nth(2).click()
await page.waitForTimeout(600)
await page.getByText('新增菜品').first().click()
await page.waitForTimeout(700)
const nameInput = page.locator('.name-wrap input')
await nameInput.click()
await nameInput.type('豆浆', { delay: 90 })
await page.waitForTimeout(700)
const tag = await page.locator('.guess-tag.cat').innerText().catch(() => '(无)')
console.log('  卡片标签：', tag)
ok('推断卡片显示「早餐 · 饮品」', tag === '早餐 · 饮品')
await page.screenshot({ path: `${OUT}/8-hint-sub.png` })

await page.getByText('填入热量和食材').first().click()
await page.waitForTimeout(600)
const onChip = await page.locator('.sub-pick .chip.on').innerText()
console.log('  填入后二级选中：', onChip)
ok('填入后二级自动选中「饮品」', onChip === '饮品')
await page.screenshot({ path: `${OUT}/9-hint-filled.png` })
await page.locator('.ph-back').click()
await page.waitForTimeout(500)

/* ---------- 2. 未归类的菜落到「其他」 ---------- */
console.log('\n[2] 「其他」兜底')
await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('xfk_db_v1'))
  // 造两道没有二级的中餐
  d.dishes.push({ id: 'x1', name: '神秘小炒', category: '中晚餐', sub: '', emoji: '🍲', calories: 200, ingredients: '青菜 1 把' })
  d.dishes.push({ id: 'x2', name: '妈妈的拿手菜', category: '中晚餐', sub: '', emoji: '🍲', calories: 300, ingredients: '五花肉 300 克' })
  localStorage.setItem('xfk_db_v1', JSON.stringify(d))
})
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(700)
await page.getByText('我是主厨').first().click()
await page.waitForTimeout(900)
await page.locator('.tabbar .tab').nth(2).click()
await page.waitForTimeout(600)
await page.locator('.cats .chip', { hasText: '中晚餐' }).click()
await page.waitForTimeout(400)
const chips = await page.locator('.subs .schip').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, '')))
console.log('  二级条：', chips.join(' | '))
ok('出现「其他 2」', chips.some((c) => c === '其他2'))
await page.screenshot({ path: `${OUT}/10-other-chip.png` })

await page.locator('.subs .schip', { hasText: '其他' }).click()
await page.waitForTimeout(400)
const names = await page.locator('.row-title').evaluateAll((els) => els.map((e) => e.innerText.trim()))
console.log('  其他里：', names.join(' / '))
ok('只筛出没归类的两道', names.length === 2 && names.includes('神秘小炒'))

/* ---------- 3. 删二级之后菜不丢 ---------- */
console.log('\n[3] 删二级后的归属')
await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('xfk_db_v1'))
  // 把中晚餐的「菜品」删掉，番茄炒蛋应该掉回未归类
  const c = d.categories.find((x) => x.name === '中晚餐')
  c.subs = c.subs.filter((s) => s.name !== '菜品')
  d.dishes.forEach((x) => {
    if (x.category === '中晚餐' && x.sub === '菜品') x.sub = ''
  })
  localStorage.setItem('xfk_db_v1', JSON.stringify(d))
})
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(700)
await page.getByText('我是主厨').first().click()
await page.waitForTimeout(900)
await page.locator('.tabbar .tab').nth(2).click()
await page.waitForTimeout(500)
await page.locator('.cats .chip', { hasText: '中晚餐' }).click()
await page.waitForTimeout(400)
const c2 = await page.locator('.subs .schip').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, '')))
console.log('  二级条：', c2.join(' | '))
ok('没归类的菜都进了「其他 3」', c2.includes('其他3'))

console.log('\n页面报错：', errs.length ? errs : '无')
await browser.close()
