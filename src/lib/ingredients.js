// 买菜清单：把点菜单里的菜聚合成食材清单
// 食材以多行文本存储，一行一项：「番茄 2 个」「鸡蛋3个」「生菜」

export function parseLine(line) {
  const raw = String(line || '').trim()
  if (!raw) return null
  const m = raw.match(/^([^\s\d]+)\s*(.*)$/)
  if (!m) return null
  const name = m[1].replace(/[：:、，,。.]+$/, '').trim()
  if (!name) return null
  const amount = (m[2] || '').trim().replace(/^[：:＝=]+/, '').trim()
  return { name, amount }
}

export function parseIngredients(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map(parseLine)
    .filter(Boolean)
}

// dishes: [{ id, name, ingredients }]，orders: [{ items:[{dishId, qty}] }]（调用方已过滤取消）
export function buildShoppingList(dishes, orders) {
  const dishMap = {}
  ;(dishes || []).forEach((d) => {
    dishMap[String(d.id)] = d
  })

  const qtyById = {}
  ;(orders || []).forEach((o) => {
    ;((o && o.items) || []).forEach((it) => {
      const key = String(it.dishId)
      if (!dishMap[key]) return
      qtyById[key] = (qtyById[key] || 0) + (Number(it.qty) || 1)
    })
  })

  const groups = {}
  const missing = []
  let dishCount = 0

  Object.keys(qtyById).forEach((id) => {
    const dish = dishMap[id]
    dishCount += 1
    const items = parseIngredients(dish.ingredients)
    if (items.length === 0) {
      missing.push(dish.name)
      return
    }
    const qty = qtyById[id]
    items.forEach((it) => {
      const g = groups[it.name] || (groups[it.name] = { name: it.name, amounts: [], sources: [], totalQty: 0 })
      const label = it.amount ? it.amount + (qty > 1 ? '×' + qty : '') : qty > 1 ? '×' + qty : ''
      if (label && g.amounts.indexOf(label) < 0) g.amounts.push(label)
      if (g.sources.indexOf(dish.name) < 0) g.sources.push(dish.name)
      g.totalQty += qty
    })
  })

  const list = Object.keys(groups)
    .sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))
    .map((k) => ({
      name: groups[k].name,
      amountText: groups[k].amounts.length > 0 ? groups[k].amounts.join(' · ') : '适量',
      sourceText: groups[k].sources.join('、'),
      qty: groups[k].totalQty
    }))

  return { list, missing, dishCount }
}

export function toPlainText(list, dateText) {
  const lines = ['🛒 买菜清单' + (dateText ? '（' + dateText + '）' : '')]
  ;(list || []).forEach((it) => {
    const amount = it.amountText && it.amountText !== '适量' ? ' ' + it.amountText.split(' · ').join(' + ') : ''
    lines.push('· ' + it.name + amount)
  })
  return lines.join('\n')
}
