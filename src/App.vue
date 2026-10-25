<script setup>
import { computed, onMounted, defineAsyncComponent } from 'vue'
import TabBar from './components/TabBar.vue'
import { route, back } from './store/router'
import { db } from './data/db'
import { toastState } from './store/app'

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

onMounted(async () => {
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

.page-root {
  display: flex;
  flex-direction: column;
  height: 100%;
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
