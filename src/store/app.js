import { reactive, computed } from 'vue'
import { cartKey } from '../lib/options'

/* ---------------- 购物车（内存态，杀进程即清空） ---------------- */
export const cart = reactive({ items: [] })

export function addToCart(dish, options, imageUrl) {
  const key = cartKey(dish.id, options)
  const found = cart.items.find((it) => it.key === key)
  if (found) {
    found.qty += 1
    return found
  }
  const item = {
    key,
    id: dish.id,
    name: dish.name,
    emoji: dish.emoji || '🍽️',
    imageUrl: imageUrl || '',
    calories: dish.calories || 0,
    options: options || [],
    qty: 1
  }
  cart.items.push(item)
  return item
}

export function setCartQty(key, qty) {
  const item = cart.items.find((it) => it.key === key)
  if (!item) return
  const n = Math.max(0, Math.floor(qty))
  if (n === 0) cart.items = cart.items.filter((it) => it.key !== key)
  else item.qty = n
}

export function removeFromCart(key) {
  cart.items = cart.items.filter((it) => it.key !== key)
}

export function cartCount() {
  return cart.items.reduce((s, it) => s + it.qty, 0)
}

export function cartCalories() {
  return cart.items.reduce((s, it) => s + it.calories * it.qty, 0)
}

// 同一道菜在购物车里的总份数（用于菜单列表角标）
export function dishQtyInCart(dishId) {
  return cart.items.filter((it) => it.id === dishId).reduce((s, it) => s + it.qty, 0)
}

export function decrementDish(dishId) {
  for (let i = cart.items.length - 1; i >= 0; i--) {
    if (cart.items[i].id === dishId) {
      const it = cart.items[i]
      if (it.qty > 1) it.qty -= 1
      else cart.items.splice(i, 1)
      return true
    }
  }
  return false
}

export function clearCart() {
  cart.items = []
}

// 「再来一份」：把历史条目回填购物车
export function reorderItems(items) {
  ;(items || []).forEach((it) => {
    const key = cartKey(it.dishId, it.options)
    const found = cart.items.find((c) => c.key === key)
    if (found) found.qty += it.qty || 1
    else {
      cart.items.push({
        key,
        id: it.dishId,
        name: it.name,
        emoji: it.emoji || '🍽️',
        imageUrl: '',
        calories: it.calories || 0,
        options: it.options || [],
        qty: it.qty || 1
      })
    }
  })
}

/* ---------------- Toast ---------------- */
export const toastState = reactive({ text: '', show: false })
let toastTimer = null
export function toast(text, duration = 1800) {
  toastState.text = text
  toastState.show = true
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastState.show = false
  }, duration)
}

/* ---------------- 轻反馈 ---------------- */
export function haptic() {
  if (navigator.vibrate) {
    try {
      navigator.vibrate(8)
    } catch {
      /* ignore */
    }
  }
}

export const cartSummary = computed(() => ({
  count: cartCount(),
  calories: cartCalories()
}))
