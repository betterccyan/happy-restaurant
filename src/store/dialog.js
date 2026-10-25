import { reactive } from 'vue'

/**
 * 全局确认弹窗。window.confirm 在 WebView 里是系统原生对话框
 * （英文 CANCEL / OK、灰底、直角），与 App 的圆角卡片风格完全不是一套东西，
 * 所以这里用应用内弹层替代。
 *
 *   if (!(await ask({ title: '删除「红烧肉」？', danger: true, confirmText: '删除' }))) return
 */
export const dialogState = reactive({
  show: false,
  title: '',
  message: '',
  hint: '',
  confirmText: '确定',
  cancelText: '取消',
  danger: false
})

let resolver = null

export function ask(opts = {}) {
  // 同一时刻只允许一个弹窗：上一次没结束的直接当作取消，避免 Promise 悬空
  if (resolver) {
    resolver(false)
    resolver = null
  }
  dialogState.title = opts.title || '确认操作'
  dialogState.message = opts.message || ''
  dialogState.hint = opts.hint || ''
  dialogState.confirmText = opts.confirmText || (opts.danger ? '删除' : '确定')
  dialogState.cancelText = opts.cancelText || '取消'
  dialogState.danger = !!opts.danger
  dialogState.show = true
  return new Promise((resolve) => {
    resolver = resolve
  })
}

export function settleDialog(ok) {
  dialogState.show = false
  const r = resolver
  resolver = null
  if (r) r(!!ok)
}
