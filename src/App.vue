<script setup>
import { computed, onMounted, onBeforeUnmount, watch } from 'vue'
import TabBar from './components/TabBar.vue'
import { route, back } from './store/router'
import { db, loadInfo, storageState, importJson, autoSnapshot } from './data/db'
import { toastState, toast, ui } from './store/app'
import { latestSnapshot } from './data/snapshots'
import { formatTime } from './lib/util'

import RoleSelect from './views/RoleSelect.vue'
import OwnerHome from './views/OwnerHome.vue'
import DishManage from './views/DishManage.vue'
import DishEdit from './views/DishEdit.vue'
import CategoryManage from './views/CategoryManage.vue'
import OrderManage from './views/OrderManage.vue'
import ShoppingList from './views/ShoppingList.vue'
import ShopSettings from './views/ShopSettings.vue'
import MenuPage from './views/MenuPage.vue'
import Checkout from './views/Checkout.vue'
import MyOrders from './views/MyOrders.vue'

const VIEWS = {
  'role-select': RoleSelect,
  'owner-home': OwnerHome,
  'dish-manage': DishManage,
  'dish-edit': DishEdit,
  'category-manage': CategoryManage,
  'order-manage': OrderManage,
  'shopping-list': ShoppingList,
  'shop-settings': ShopSettings,
  menu: MenuPage,
  checkout: Checkout,
  'my-orders': MyOrders
}

const TAB_PAGES = ['owner-home', 'order-manage', 'dish-manage', 'shop-settings', 'menu', 'my-orders']

const view = computed(() => VIEWS[route.name] || RoleSelect)
const showTab = computed(() => TAB_PAGES.includes(route.name) && !!db.profile.role)

/* 数据安全带：坏数据先从最近一份快照救回来 */
async function recoverIfBroken() {
  if (loadInfo.mode !== 'broken') return
  let snap = null
  try {
    snap = await latestSnapshot()
  } catch {
    snap = null
  }
  if (snap && snap.payload) {
    try {
      importJson(snap.payload)
      toast('数据损坏，已恢复到 ' + formatTime(new Date(snap.at).toISOString()) + ' 的自动备份', 3600)
      return
    } catch {
      /* 快照也坏了，落到下面的提示 */
    }
  }
  toast('数据读取失败，已重置为示例数据', 3200)
}

/* 底部 dock 随滚动收起：向下滚藏起来，向上滚或回到顶部浮出来 */
const tops = new WeakMap()
function onScroll(e) {
  const el = e.target
  if (!el || el.nodeType !== 1) return
  // 只认纵向可滚动的容器，横向的分类 chips 会被这里挡掉
  if (el.scrollHeight <= el.clientHeight + 4) return
  const top = el.scrollTop
  const prev = tops.has(el) ? tops.get(el) : top
  tops.set(el, top)
  if (top <= 6) {
    ui.dockHidden = false
    return
  }
  const dy = top - prev
  if (dy > 6) ui.dockHidden = true
  else if (dy < -6) ui.dockHidden = false
}

watch(
  () => route.key,
  () => {
    ui.dockHidden = false
  }
)

// 存储写失败（配额满）必须让用户看到，否则改动会静默丢失
watch(
  () => storageState.at,
  (at) => {
    if (at) toast(storageState.message, 3000)
  }
)

onMounted(async () => {
  await recoverIfBroken()
  autoSnapshot()

  document.addEventListener('scroll', onScroll, { capture: true, passive: true })

  // 安卓物理返回键 → 应用内路由
  try {
    const { App: CapApp } = await import('@capacitor/app')
    CapApp.addListener('backButton', ({ canGoBack }) => {
      if (back()) return
      CapApp.exitApp()
    })
  } catch {
    window.addEventListener('popstate', () => {
      back()
    })
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('scroll', onScroll, { capture: true })
})
</script>

<template>
  <div class="safe-top" :class="{ 'with-tab': showTab }">
    <Transition name="pg" mode="out-in">
      <component :is="view" :key="route.name" :params="route.params" class="page-root" />
    </Transition>
  </div>

  <TabBar v-if="showTab" />

  <div v-if="toastState.show" class="toast-layer">
    <div class="toast">{{ toastState.text }}</div>
  </div>
</template>

<style>
#app {
  padding-top: var(--safe-top);
}

/* 页面承载容器：必须撑满 #app 的剩余高度并允许收缩，
   否则 flex 子项按内容高度撑开，超出部分被 #app 的 overflow:hidden 裁掉 → 页面无法滚动 */
.safe-top {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.page-root {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
}

/* 页面切换：只动 opacity，避免重绘 */
.pg-enter-active,
.pg-leave-active {
  transition: opacity 0.18s ease;
}
.pg-enter-from,
.pg-leave-to {
  opacity: 0;
}
</style>
