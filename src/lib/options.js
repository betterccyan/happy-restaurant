// 菜品选项（规格）：归一化、摘要、购物车键
// 结构：{ name, multi, required, choices: [{ label, price }] }
const MAX_GROUPS = 6
const MAX_CHOICES = 12

const toNum = (v, f) => {
  const n = Number(v)
  return isFinite(n) && n >= 0 ? n : f || 0
}

function normalizeChoice(choice) {
  const label = String((choice && choice.label) || '').trim().slice(0, 12)
  if (!label) return null
  return { label, price: Math.round(toNum(choice && choice.price, 0) * 100) / 100 }
}

function normalizeGroup(group) {
  const name = String((group && group.name) || '').trim().slice(0, 10)
  const choices = []
  ;((group && group.choices) || []).forEach((c) => {
    if (choices.length >= MAX_CHOICES) return
    const nc = normalizeChoice(c)
    if (nc) choices.push(nc)
  })
  if (choices.length === 0) return null
  return {
    name: name || '选项',
    multi: !!(group && group.multi),
    required: !!(group && group.required),
    choices
  }
}

export function normalizeOptions(raw) {
  let list = raw
  if (typeof list === 'string') {
    try {
      list = JSON.parse(list)
    } catch {
      list = []
    }
  }
  if (!Array.isArray(list)) return []
  const out = []
  list.forEach((g) => {
    if (out.length >= MAX_GROUPS) return
    const ng = normalizeGroup(g)
    if (ng) out.push(ng)
  })
  return out
}

// 已选选项摘要，如「中辣 / 加卤蛋」
export function optionsText(options) {
  const parts = []
  normalizeOptions(options).forEach((g) => g.choices.forEach((c) => parts.push(c.label)))
  return parts.join(' / ')
}

// 购物车唯一键：同菜不同规格是不同条目
export function cartKey(dishId, options) {
  const parts = []
  normalizeOptions(options).forEach((g) => {
    parts.push(g.name + ':' + g.choices.map((c) => c.label).join(','))
  })
  return String(dishId) + '|' + parts.join(';')
}

// 从弹窗选中态收集最终选项
export function collectSelected(groups) {
  return normalizeOptions(
    (groups || []).map((g) => ({
      name: g.name,
      multi: g.multi,
      required: g.required,
      choices: (g.choices || []).filter((c) => c.selected).map((c) => ({ label: c.label, price: c.price }))
    }))
  )
}

// 必选组是否都选了
export function missingRequired(groups) {
  return (groups || []).filter(
    (g) => g.required && !(g.choices || []).some((c) => c.selected)
  ).length > 0
}

// 批量套规格时的兜底（今晚这桌）：单选组取第一个选项，多选组留空
export function defaultOptions(options) {
  return normalizeOptions(
    normalizeOptions(options)
      .filter((g) => !g.multi && g.choices.length)
      .map((g) => ({
        name: g.name,
        multi: false,
        required: g.required,
        choices: [g.choices[0]]
      }))
  )
}

export { MAX_GROUPS, MAX_CHOICES }
