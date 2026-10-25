import { reactive, watch } from 'vue'
import { SEED_CATEGORIES, SEED_DISHES } from './seed'
import { normalizeOptions } from '../lib/options'

const KEY = 'xfk_db_v1'

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

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return seed()
    const data = JSON.parse(raw)
    if (!data || data.v !== 1) return seed()
    // 兜底补齐字段
    data.profile = data.profile || { role: '', nickname: '' }
    data.settings = data.settings || { name: '幸福小馆', notice: '' }
    data.categories = data.categories || []
    data.dishes = data.dishes || []
    data.orders = data.orders || []
    data.checked = data.checked || {}
    return data
  } catch {
    return seed()
  }
}

export const db = reactive(load())

let timer = null
function persist() {
  clearTimeout(timer)
  timer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(db))
    } catch (e) {
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

/* ---------------- 备份 / 恢复 ---------------- */
export function exportJson() {
  return JSON.stringify(db, null, 2)
}

export function importJson(text) {
  const data = JSON.parse(text)
  if (!data || typeof data !== 'object') throw new Error('文件格式不对')
  Object.assign(db, {
    v: 1,
    profile: data.profile || { role: '', nickname: '' },
    settings: data.settings || { name: '幸福小馆', notice: '' },
    categories: data.categories || [],
    dishes: data.dishes || [],
    orders: data.orders || [],
    checked: data.checked || {},
    lastMemberName: data.lastMemberName || ''
  })
}

export function resetAll() {
  Object.assign(db, seed())
}
