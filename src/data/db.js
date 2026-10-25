import { reactive, watch } from 'vue'
import { SEED_CATEGORIES, SEED_DISHES } from './seed'
import { normalizeOptions } from '../lib/options'
import { putSnapshot, autoSnapshotToday } from './snapshots'

const KEY = 'xfk_db_v1'
const BROKEN_KEY = 'xfk_db_broken'
// 只在「字段含义变了、必须改写数据」时才加 1。单纯加字段不需要动它：
// normalize() 会给老数据补齐新字段，版本号一变就重置的老逻辑才是数据丢失的主因。
const DB_VERSION = 1

// 本次载入的结果，App.vue 据此提示（'fresh' 首次 / 'ok' / 'migrated' / 'broken'）
export const loadInfo = reactive({ mode: 'ok', note: '', at: Date.now() })
// 写入状态：配额满 / 隐私模式等导致存不进去时，界面必须告诉用户
export const storageState = reactive({ errors: 0, message: '', at: 0 })

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v)

function nextId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

function seed() {
  return {
    v: 1,
    // 本机档案：只记「这台设备当前是谁在用」
    profile: { role: '', nickname: '' },
    settings: { name: '幸福小馆', notice: '今天想吃点什么？' },
    categories: SEED_CATEGORIES.map((name, i) => ({ id: nextId(), name, sort: i })),
    dishes: SEED_DISHES.map((d, i) => ({
      id: nextId(),
      ...d,
      options: normalizeOptions(d.options),
      available: true,
      imageKey: '',
      createdAt: new Date(Date.now() - (SEED_DISHES.length - i) * 60000).toISOString()
    })),
    orders: [],
    checked: {},
    lastMemberName: ''
  }
}

// 补齐字段（老数据缺什么补什么，未知字段原样保留，绝不整体重写）
function normalize(input, from) {
  const d = input
  d.profile = Object.assign({ role: '', nickname: '' }, isObj(d.profile) ? d.profile : {})
  d.settings = Object.assign(
    { name: '幸福小馆', notice: '今天想吃点什么？' },
    isObj(d.settings) ? d.settings : {}
  )
  if (!Array.isArray(d.categories)) d.categories = []
  if (!Array.isArray(d.dishes)) d.dishes = []
  if (!Array.isArray(d.orders)) d.orders = []
  d.checked = isObj(d.checked) ? d.checked : {}
  if (typeof d.lastMemberName !== 'string') d.lastMemberName = ''

  const len = d.dishes.length
  d.dishes = d.dishes.filter(isObj).map((dish, i) => ({
    ...dish,
    id: dish.id || nextId(),
    name: String(dish.name || '未命名').slice(0, 20),
    category: dish.category || d.categories[0]?.name || '中晚餐',
    emoji: dish.emoji || '🍽️',
    description: String(dish.description || '').slice(0, 40),
    calories: Math.max(0, Math.round(Number(dish.calories) || 0)),
    ingredients: String(dish.ingredients || ''),
    options: normalizeOptions(dish.options),
    available: dish.available !== false,
    imageKey: dish.imageKey || '',
    createdAt: dish.createdAt || new Date(Date.now() - (len - i) * 60000).toISOString()
  }))
  // 数据来自更新版本的 App 时，不要把版本号改小
  d.v = Math.max(Number(from) || 0, DB_VERSION)
  return d
}

// 坏数据先留档再覆盖——用户还有机会从「备份」里找回，也能人工导出排查
function stashBroken(raw) {
  try {
    localStorage.setItem(BROKEN_KEY, JSON.stringify({ at: Date.now(), raw: String(raw).slice(0, 400000) }))
  } catch {
    /* 存不下就算了，至少内存里还有原串 */
  }
}

function load() {
  let raw = ''
  try {
    raw = localStorage.getItem(KEY) || ''
  } catch {
    raw = ''
  }
  if (!raw) {
    loadInfo.mode = 'fresh'
    return seed()
  }

  let data = null
  try {
    data = JSON.parse(raw)
  } catch (e) {
    stashBroken(raw)
    loadInfo.mode = 'broken'
    loadInfo.note = '数据文件解析失败'
    return seed()
  }

  const from = Number(data && data.v) || 0
  const noShape =
    !isObj(data) ||
    // v 缺失且菜和分类都没有：基本可以断定不是我们的数据
    (from === 0 &&
      !(Array.isArray(data.dishes) && data.dishes.length) &&
      !(Array.isArray(data.categories) && data.categories.length))
  if (noShape) {
    stashBroken(raw)
    loadInfo.mode = 'broken'
    loadInfo.note = '数据结构不完整'
    return seed()
  }

  const d = normalize(data, from)
  if (from && from !== DB_VERSION) {
    if (from > DB_VERSION) {
      // 数据比 App 新（降级安装过），按原样保留，只是补齐字段
      loadInfo.mode = 'ok'
      loadInfo.note = '数据版本 v' + from + ' 高于 App（v' + DB_VERSION + '），已按原样保留'
    } else {
      loadInfo.mode = 'migrated'
      loadInfo.note = 'v' + from + ' → v' + DB_VERSION
    }
  } else {
    loadInfo.mode = 'ok'
  }
  return d
}

export const db = reactive(load())

const isQuotaError = (e) =>
  !!e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22 || e.code === 1014)

let timer = null
let lastNotified = 0
function persist() {
  clearTimeout(timer)
  timer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(db))
      if (storageState.errors) {
        storageState.errors = 0
        storageState.message = ''
      }
    } catch (e) {
      storageState.errors += 1
      storageState.message = isQuotaError(e)
        ? '本机存储已满，刚才的改动没存上'
        : '保存失败：' + (e.message || '未知错误')
      // 15 秒内只提醒一次，否则输入一个字就弹一次
      if (Date.now() - lastNotified > 15000) {
        lastNotified = Date.now()
        storageState.at = Date.now()
      }
      console.warn('本地存储写入失败', e)
    }
  }, 60)
}

watch(db, persist, { deep: true })

/* ---------------- 身份 ---------------- */
export function setRole(role) {
  db.profile.role = role
}
export function setNickname(name) {
  db.profile.nickname = String(name || '').trim().slice(0, 12)
}
export function resetProfile() {
  db.profile = { role: '', nickname: '' }
}

/* ---------------- 家庭信息 ---------------- */
export function saveSettings(patch) {
  Object.assign(db.settings, patch)
}

/* ---------------- 分类 ---------------- */
export function listCategories() {
  return [...db.categories].sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name))
}

export function createCategory(name) {
  const n = String(name || '').trim().slice(0, 10)
  if (!n) throw new Error('分类名不能为空')
  if (db.categories.some((c) => c.name === n)) throw new Error('分类已存在')
  const maxSort = db.categories.reduce((m, c) => Math.max(m, c.sort), 0)
  const item = { id: nextId(), name: n, sort: maxSort + 1 }
  db.categories.push(item)
  return item
}

export function renameCategory(id, name) {
  const n = String(name || '').trim().slice(0, 10)
  if (!n) throw new Error('分类名不能为空')
  if (db.categories.some((c) => c.name === n && c.id !== id)) throw new Error('分类已存在')
  const cat = db.categories.find((c) => c.id === id)
  if (!cat) throw new Error('分类不存在')
  const old = cat.name
  cat.name = n
  // 同步菜品上的分类字符串
  db.dishes.forEach((d) => {
    if (d.category === old) d.category = n
  })
  return cat
}

export function deleteCategory(id) {
  const cat = db.categories.find((c) => c.id === id)
  if (!cat) return
  const used = db.dishes.filter((d) => d.category === cat.name).length
  if (used > 0) throw new Error('「' + cat.name + '」下还有 ' + used + ' 道菜，先移走再删')
  db.categories = db.categories.filter((c) => c.id !== id)
}

/* ---------------- 菜品 ---------------- */
export function listDishes() {
  return [...db.dishes].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
}

export function getDish(id) {
  return db.dishes.find((d) => d.id === id) || null
}

export function createDish(payload) {
  const dish = {
    id: nextId(),
    name: String(payload.name || '').trim().slice(0, 20),
    category: payload.category || db.categories[0]?.name || '中晚餐',
    emoji: payload.emoji || '🍽️',
    description: String(payload.description || '').slice(0, 40),
    calories: Math.max(0, Math.round(Number(payload.calories) || 0)),
    ingredients: String(payload.ingredients || ''),
    options: normalizeOptions(payload.options),
    available: payload.available !== false,
    imageKey: payload.imageKey || '',
    createdAt: new Date().toISOString()
  }
  if (!dish.name) throw new Error('菜名不能为空')
  db.dishes.push(dish)
  return dish
}

export function updateDish(id, payload) {
  const dish = getDish(id)
  if (!dish) throw new Error('菜品不存在')
  Object.assign(dish, {
    name: String(payload.name || dish.name).trim().slice(0, 20),
    category: payload.category || dish.category,
    emoji: payload.emoji || dish.emoji,
    description: String(payload.description || '').slice(0, 40),
    calories: Math.max(0, Math.round(Number(payload.calories) || 0)),
    ingredients: payload.ingredients !== undefined ? String(payload.ingredients) : dish.ingredients,
    options: payload.options !== undefined ? normalizeOptions(payload.options) : dish.options,
    available: payload.available !== false,
    imageKey: payload.imageKey || ''
  })
  return dish
}

export function toggleDishAvailable(id) {
  const dish = getDish(id)
  if (!dish) return
  dish.available = !dish.available
  return dish
}

export function deleteDish(id) {
  db.dishes = db.dishes.filter((d) => d.id !== id)
}

/* ---------------- 点菜单 ---------------- */
export function listOrders() {
  return [...db.orders].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export function createOrder({ items, memberName, remark, expectTime }) {
  if (!items || items.length === 0) throw new Error('还没选菜')
  const now = new Date().toISOString()
  const order = {
    id: nextId(),
    memberName: String(memberName || '').trim().slice(0, 12) || '家人',
    items: items.map((it) => ({
      dishId: it.id || it.dishId,
      name: it.name,
      qty: it.qty,
      emoji: it.emoji || '🍽️',
      calories: it.calories || 0,
      imageKey: it.imageKey || '',
      options: normalizeOptions(it.options)
    })),
    status: 'pending',
    remark: String(remark || '').slice(0, 60),
    expectTime: String(expectTime || ''),
    createdAt: now,
    updatedAt: now
  }
  db.orders.push(order)
  db.lastMemberName = order.memberName
  return order
}

export function updateOrderStatus(id, status) {
  const order = db.orders.find((o) => o.id === id)
  if (!order) return
  order.status = status
  order.updatedAt = new Date().toISOString()
  return order
}

export function deleteOrder(id) {
  db.orders = db.orders.filter((o) => o.id !== id)
}

/* ---------------- 买菜清单勾选 ---------------- */
export function getChecked(day) {
  return db.checked[day] || {}
}
export function toggleChecked(day, name) {
  if (!db.checked[day]) db.checked[day] = {}
  const map = db.checked[day]
  if (map[name]) delete map[name]
  else map[name] = true
}

/* ---------------- 点单偏好：常点 / 最近吃过 ---------------- */
// dishId -> { qty 总份数, times 点过几次, lastAt 最近一次时间 }
// 已取消的单不计入，否则手滑取消也会污染「常点」
export function dishStats() {
  const map = {}
  for (const o of db.orders) {
    if (!o || o.status === 'cancelled') continue
    for (const it of o.items || []) {
      const key = it.dishId || it.id
      if (!key) continue
      const s = map[key] || (map[key] = { qty: 0, times: 0, lastAt: '' })
      s.qty += Number(it.qty) || 1
      s.times += 1
      if (!s.lastAt || String(o.createdAt) > s.lastAt) s.lastAt = String(o.createdAt || '')
    }
  }
  return map
}

// 这道菜上次点的规格——「今晚这桌」按它自动套用，比「默认第一个选项」靠谱得多
export function preferredOptions(dishId) {
  if (!dishId) return []
  const orders = db.orders
    .filter((o) => o && o.status !== 'cancelled')
    .slice()
    .sort((a, b) => (String(a.createdAt) < String(b.createdAt) ? 1 : -1))
  for (const o of orders) {
    for (const it of o.items || []) {
      if ((it.dishId || it.id) === dishId && Array.isArray(it.options) && it.options.length) {
        return normalizeOptions(it.options)
      }
    }
  }
  return []
}

/* ---------------- 备份 / 恢复 ---------------- */
export function exportJson() {
  return JSON.stringify(db, null, 2)
}

// 覆盖前先留一份快照，误点「恢复」不至于把当前数据也搭进去
function snapshotHere(tag) {
  putSnapshot(JSON.stringify(db), tag).catch((e) => console.warn('快照失败', e))
}

export function importJson(text) {
  const data = JSON.parse(text)
  if (!isObj(data)) throw new Error('文件格式不对')
  if (!Array.isArray(data.dishes) && !Array.isArray(data.orders) && !Array.isArray(data.categories)) {
    throw new Error('里面没有菜品或点菜单')
  }
  snapshotHere('before-restore')
  Object.assign(db, normalize(data, Number(data.v) || 0))
}

// 每天第一份自动快照，供误操作后回退
export async function autoSnapshot() {
  try {
    await autoSnapshotToday(JSON.stringify(db))
  } catch (e) {
    console.warn('自动备份失败', e)
  }
}

export function resetAll() {
  snapshotHere('before-reset')
  Object.assign(db, seed())
}
