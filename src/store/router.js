import { reactive, markRaw } from 'vue'

// 极简 hash 路由：避免引入 vue-router，WebView 里更稳
export const route = reactive({
  name: 'role-select',
  params: {},
  // 用于页面进出动画
  key: 0,
  direction: 'forward'
})

const stack = []

export function navigate(name, params = {}, opts = {}) {
  if (opts.replace) {
    stack[stack.length - 1] = { name, params }
  } else {
    stack.push({ name, params })
  }
  route.name = name
  route.params = params
  route.direction = 'forward'
  route.key += 1
}

export function back() {
  if (stack.length > 1) {
    stack.pop()
    const prev = stack[stack.length - 1]
    route.name = prev.name
    route.params = prev.params
    route.direction = 'back'
    route.key += 1
    return true
  }
  return false
}

export function replace(name, params = {}) {
  navigate(name, params, { replace: true })
}

export function resetTo(name, params = {}) {
  stack.length = 0
  stack.push({ name, params })
  route.name = name
  route.params = params
  route.direction = 'forward'
  route.key += 1
}

export function canGoBack() {
  return stack.length > 1
}

// 安卓返回键
export function bindBackButton(handler) {
  window.addEventListener('popstate', () => {
    if (!handler()) return true
    return false
  })
  // 拦截物理返回，交给应用内路由
  history.pushState({ app: true }, '')
  window.addEventListener('popstate', () => {
    history.pushState({ app: true }, '')
    if (!handler()) {
      // 已到根页面，交还给系统
      // Capacitor App 插件会退出应用
    }
  })
}

export { markRaw }
