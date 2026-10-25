// 二级分类的端到端验证：
// 1) 老数据（没有 subs / sub 字段）升级后能不能自动归类，并且结果落盘
// 2) 点菜页 / 菜品管理页的二级筛选
// 3) 编辑菜品：选一级才出二级，加餐不出现
// 4) 分类管理：改二级名、加二级、删二级
import { chromium } from 'playwright'
import fs from 'node:fs'

const OUT = 'D:/workbuddy_projects/点单小程序/app-android/shots/110'
fs.mkdirSync(OUT, { recursive: true })

const OLD = {
  v: 1,
  profile: { role: 'owner', nickname: '超超' },
  settings: { name: '幸福小馆', notice: '今天想吃点什么？' },
  categories: [
    { id: 'c1', name: '早餐', sort: 0 },
    { id: 'c2', name: '中晚餐', sort: 1 },
    { id: 'c3', name: '加餐', sort: 2 }
  ],
  dishes: [
    { id: 'd1', name: '豆浆', category: '早餐', emoji: '🥛', calories: 120, ingredients: '黄豆 60 克' },
    { id: 'd2', name: '小笼包', category: '早餐', emoji: '🥟', calories: 320, ingredients: '面粉 300 克' },
    { id: 'd3', name: '牛奶', category: '早餐', emoji: '🥛', calories: 130, ingredients: '牛奶 250 毫升' },
    { id: 'd4', name: '米饭', category: '中晚餐', emoji: '🍚', calories: 230, ingredients: '大米 1 杯' },
    { id: 'd5', name: '番茄炒蛋', category: '中晚餐', emoji: '🍅', calories: 180, ingredients: '番茄 2 个' },
    { id: 'd6', name: '牛肉面', category: '中晚餐', emoji: '🍜', calories: 480, ingredients: '面条 200 克' },
    { id: 'd7', name: '酸奶', category: '加餐', emoji: '🥗', calories: 120, ingredients: '酸奶 1 杯' }
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

/* ---------- 1. 老数据升级 ---------- */
await page.goto('http://127.0.0.1:5180', { waitUntil: 'networkidle' })
await page.evaluate((d) => localStorage.setItem('xfk_db_v1', JSON.stringify(d)), OLD)
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(700)
const after = await page.evaluate(() => JSON.parse(localStorage.getItem('xfk_db_v1')))

console.log('\n[1] 老数据升级')
const subOf = (name) => (after.dishes.find((d) => d.name === name) || {}).sub
const subsOfCat = (name) => (after.categories.find((c) => c.name === name) || {}).subs || []
console.log(
  '  一级：',
  after.categories.map((c) => c.name + '[' + c.subs.map((s) => s.name).join('/') + ']').join('  ')
)
console.log(
  '  归类：',
  after.dishes.map((d) => d.name + '→' + (d.sub || '·')).join('  ')
)
ok('早餐有了 饮品/餐点', subsOfCat('早餐').map((s) => s.name).join() === '饮品,餐点')
ok('中晚餐有了 主食/菜品', subsOfCat('中晚餐').map((s) => s.name).join() === '主食,菜品')
ok('加餐没有二级', subsOfCat('加餐').length === 0)
ok('豆浆 → 饮品', subOf('豆浆') === '饮品')
ok('牛奶 → 饮品', subOf('牛奶') === '饮品')
ok('小笼包 → 餐点', subOf('小笼包') === '餐点')
ok('米饭 → 主食', subOf('米饭') === '主食')
ok('牛肉面 → 主食', subOf('牛肉面') === '主食')
ok('番茄炒蛋 → 菜品', subOf('番茄炒蛋') === '菜品')
ok('酸奶仍是空的', !subOf('酸奶'))
ok('升级结果已落盘（subsSeeded）', after.subsSeeded === true)

/* ---------- 2. 点菜页二级筛选 ---------- */
console.log('\n[2] 点菜页')
const family = page.getByText('我是家人').first()
if (await family.count()) {
  await family.click()
  await page.waitForTimeout(800)
}
await page.locator('.tabbar .tab').nth(0).click()
await page.waitForTimeout(600)

await page.locator('.cats .chip', { hasText: '早餐' }).click()
await page.waitForTimeout(400)
let chips = await page.locator('.subs .schip').evaluateAll((els) => els.map((e) => e.innerText.trim()))
console.log('  早餐二级：', chips.join(' | '))
ok('早餐二级条出现 全部/饮品/餐点', chips.join('|').indexOf('全部|饮品|餐点') === 0)
await page.screenshot({ path: `${OUT}/1-menu-breakfast.png` })

await page.locator('.subs .schip', { hasText: '饮品' }).click()
await page.waitForTimeout(400)
let names = await page.locator('.dish-name').evaluateAll((els) => els.map((e) => e.innerText.trim()))
console.log('  点「饮品」后：', names.join(' / '))
ok('只剩喝的', names.length === 2 && names.includes('豆浆') && names.includes('牛奶'))
await page.screenshot({ path: `${OUT}/2-menu-drink.png` })

await page.locator('.cats .chip', { hasText: '中晚餐' }).click()
await page.waitForTimeout(400)
chips = await page.locator('.subs .schip').evaluateAll((els) => els.map((e) => e.innerText.trim()))
console.log('  中晚餐二级：', chips.join(' | '))
ok('换餐后二级回到「全部」', await page.locator('.subs .schip.on').innerText() === '全部')
ok('中晚餐二级是 主食/菜品', chips.join('|') === '全部|主食|菜品')

await page.locator('.cats .chip', { hasText: '加餐' }).click()
await page.waitForTimeout(400)
ok('加餐没有二级条', (await page.locator('.subs').count()) === 0)
await page.screenshot({ path: `${OUT}/3-menu-snack.png` })

/* ---------- 3. 菜品管理筛选 ---------- */
console.log('\n[3] 菜品管理')
// 换成主厨身份（家人只有两个 tab）。启动总是先到选身份页，所以重新走一遍
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(800)
await page.getByText('我是主厨').first().click()
await page.waitForTimeout(1000)
await page.locator('.tabbar .tab').nth(2).click()
await page.waitForTimeout(700)
await page.locator('.cats .chip', { hasText: '早餐' }).click()
await page.waitForTimeout(400)
ok('菜品管理也有二级条', (await page.locator('.subs .schip').count()) === 3)
await page.locator('.subs .schip', { hasText: '饮品' }).click()
await page.waitForTimeout(400)
const rows = await page.locator('.row-title').evaluateAll((els) => els.map((e) => e.innerText.trim()))
ok('筛出 2 道饮品', rows.length === 2)
const desc = await page.locator('.row-desc').first().innerText()
console.log('  描述行：', desc.split('\n')[0].trim())
ok('描述行带二级', desc.includes('早餐 · 饮品'))
await page.screenshot({ path: `${OUT}/4-dishmanage.png` })

/* ---------- 4. 编辑菜品 ---------- */
console.log('\n[4] 编辑菜品')
await page.locator('.row').first().click()
await page.waitForTimeout(800)
let sm = await page.locator('.sub-pick .chip').evaluateAll((els) => els.map((e) => e.innerText.trim()))
console.log('  二级选项：', sm.join(' | '))
ok('编辑页出现 不分/饮品/餐点', sm.join('|') === '不分|饮品|餐点')
ok('当前选中「饮品」', (await page.locator('.sub-pick .chip.on').innerText()) === '饮品')
await page.screenshot({ path: `${OUT}/5-dishedit.png` })

// 切到加餐，二级应该整行消失
await page.locator('.chip', { hasText: '加餐' }).first().click()
await page.waitForTimeout(400)
ok('切到加餐后二级消失', (await page.locator('.sub-pick').count()) === 0)
// 切回中晚餐，二级出现且不残留
await page.locator('.chip', { hasText: '中晚餐' }).first().click()
await page.waitForTimeout(400)
ok('切到中晚餐后二级换成主食/菜品', (await page.locator('.sub-pick .chip').evaluateAll((e) => e.map((x) => x.innerText.trim()))).join('|') === '不分|主食|菜品')
ok('换一级后不残留旧二级', (await page.locator('.sub-pick .chip.on').innerText()) === '不分')

await page.locator('.ph-back').click()
await page.waitForTimeout(600)

/* ---------- 5. 分类管理 ---------- */
console.log('\n[5] 分类管理')
// 路由是内存态的，只能从工作台点进去
await page.locator('.tabbar .tab').nth(0).click()
await page.waitForTimeout(700)
await page.getByText('分类管理').first().click()
await page.waitForTimeout(800)
const subChips = await page.locator('.cat .sub-chip').evaluateAll((els) => els.map((e) => e.innerText.trim()))
console.log('  二级 chip：', subChips.join(' | '))
ok('三个分类的二级都列出来了', subChips.length === 4)
await page.screenshot({ path: `${OUT}/6-category.png` })

// 改二级名：豆浆所属的「饮品」→「喝的」
await page.locator('.cat', { hasText: '早餐' }).locator('.sub-chip', { hasText: '饮品' }).click()
await page.waitForTimeout(400)
await page.locator('.sub-edit input').fill('喝的')
await page.locator('.sub-edit .mini-ok').click()
await page.waitForTimeout(600)
const renamed = await page.evaluate(() => JSON.parse(localStorage.getItem('xfk_db_v1')))
ok('二级改名成功', (renamed.categories.find((c) => c.name === '早餐').subs.map((s) => s.name)).includes('喝的'))
ok('菜品跟着改二级', renamed.dishes.filter((d) => d.sub === '喝的').length === 2)

// 加一个二级
await page.locator('.cat', { hasText: '加餐' }).locator('.sub-add').click()
await page.waitForTimeout(400)
await page.locator('.sub-edit input').fill('甜点')
await page.locator('.sub-edit .mini-ok').click()
await page.waitForTimeout(600)
const added = await page.evaluate(() => JSON.parse(localStorage.getItem('xfk_db_v1')))
ok('给加餐加了二级', added.categories.find((c) => c.name === '加餐').subs.length === 1)
await page.screenshot({ path: `${OUT}/7-category-edited.png` })

// 删掉刚加的
await page.locator('.cat', { hasText: '加餐' }).locator('.sub-chip', { hasText: '甜点' }).click()
await page.waitForTimeout(400)
await page.locator('.sub-edit .mini-act').click()
await page.waitForTimeout(500)
await page.locator('.dbtn', { hasText: '删除' }).click()
await page.waitForTimeout(600)
const removed = await page.evaluate(() => JSON.parse(localStorage.getItem('xfk_db_v1')))
ok('删二级成功', removed.categories.find((c) => c.name === '加餐').subs.length === 0)

console.log('\n页面报错：', errs.length ? errs : '无')
await browser.close()
