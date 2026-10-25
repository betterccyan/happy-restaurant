// 二级分类：早餐分「饮品 / 餐点」，午晚餐分「主食 / 菜品」，加餐不分。
//
// 为什么叫这两个名字（用户原话是「喝的 / 吃的」和「主食 / 菜」）：
//   · 早餐那边没有「菜」这个对立面，只分「饮品」和「其余所有要吃的」，
//     「餐点」比「主食」更准——粥、包子、煎蛋都不算主食但都要吃。
//   · 午晚餐有明确的主食/菜对立，用「菜品」是菜单上的标准说法。
// 两个名字都能在「分类管理」里改，改名后菜品会跟着走。
export const SUB_PRESETS = {
  早餐: ['饮品', '餐点'],
  中晚餐: ['主食', '菜品'],
  加餐: []
}

// 判断用的是词表而不是「含粉/含饭」这种宽规则：
// 「蒜蓉粉丝蒸扇贝」有「粉」但它是菜，「蛋炒饭」有「饭」才是主食。
const DRINK_RE =
  /(牛奶|豆浆|豆奶|咖啡|拿铁|美式|摩卡|奶茶|果汁|果茶|柠檬水|蜂蜜水|酸梅汤|酸奶|米浆|可可|豆花|豆腐脑)/
const STAPLE_RE =
  /(米饭|粥|炒饭|盖饭|煲仔饭|饭团|手抓饭|面条|拉面|拌面|炒面|汤面|牛肉面|米线|米粉|炒粉|河粉|凉皮|酸辣粉|饺子|馄饨|包子|馒头|花卷|烧饼|煎饼|手抓饼|葱油饼|油条|年糕|吐司|面包|烧麦|汤圆|披萨|意面|三明治|汉堡|红薯粉)/

export function isDrink(name) {
  return DRINK_RE.test(String(name || ''))
}

export function isStaple(name) {
  return STAPLE_RE.test(String(name || ''))
}

/**
 * 猜一道菜该归哪个二级。
 * 只在老数据首次升级时跑一次（db.subsSeeded），所以按预设名匹配就够了；
 * 猜不出来就返回空串，界面会把它归到「其他」，不会让菜消失。
 */
export function guessSub(name, categoryName, subNames) {
  const subs = Array.isArray(subNames) ? subNames : []
  if (!subs.length || categoryName === '加餐') return ''
  const n = String(name || '')

  if (subs.includes('饮品') && isDrink(n)) return '饮品'
  if (subs.includes('主食') && isStaple(n)) return '主食'
  if (subs.includes('餐点')) return '餐点'
  if (subs.includes('菜品')) return '菜品'
  return ''
}
