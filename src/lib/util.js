// 通用工具函数
export const ORDER_STATUS = {
  pending: { text: '待做', tone: 'warn' },
  accepted: { text: '准备中', tone: 'info' },
  making: { text: '烹饪中', tone: 'doing' },
  done: { text: '已上桌', tone: 'ok' },
  cancelled: { text: '已取消', tone: 'off' }
}

export function statusInfo(status) {
  return ORDER_STATUS[status] || { text: status || '未知', tone: 'off' }
}

export function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n) => (n < 10 ? '0' + n : '' + n)
  return pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes())
}

export function formatClock(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n) => (n < 10 ? '0' + n : '' + n)
  return pad(d.getHours()) + ':' + pad(d.getMinutes())
}

export function todayKey(d = new Date()) {
  const pad = (n) => (n < 10 ? '0' + n : '' + n)
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
}

export function isToday(iso) {
  if (!iso) return false
  const d = new Date(iso)
  if (isNaN(d.getTime())) return false
  return todayKey(d) === todayKey()
}

// 相对天数：今天 / 昨天 / N 天前 / 具体日期
export function daysAgoText(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const start = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((start(new Date()) - start(d)) / 86400000)
  if (diff <= 0) return '今天'
  if (diff === 1) return '昨天'
  if (diff < 7) return diff + ' 天前'
  if (diff < 30) return Math.floor(diff / 7) + ' 周前'
  return Math.floor(diff / 30) + ' 个月前'
}

export function todayText() {
  const d = new Date()
  const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()]
  return d.getMonth() + 1 + '月' + d.getDate() + '日 ' + week
}

export function greeting() {
  const h = new Date().getHours()
  if (h < 5) return '夜深了'
  if (h < 9) return '早上好'
  if (h < 11) return '上午好'
  if (h < 14) return '中午好'
  if (h < 17) return '下午好'
  if (h < 19) return '傍晚好'
  return '晚上好'
}

// 当前时段默认餐次
export function mealCategoryByHour() {
  const h = new Date().getHours()
  if (h >= 5 && h < 10) return '早餐'
  if (h >= 10 && h < 21) return '中晚餐'
  return '加餐'
}

export function uid(prefix = 'id') {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

// 订单合计热量
export function orderCalories(items) {
  return (items || []).reduce((s, it) => s + (Number(it.calories) || 0) * (Number(it.qty) || 1), 0)
}

export function orderQty(items) {
  return (items || []).reduce((s, it) => s + (Number(it.qty) || 1), 0)
}
