<script setup>
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'
import { route, navigate, resetTo } from '../store/router'
import { db } from '../data/db'
import { haptic } from '../store/app'

const isChef = computed(() => db.profile.role === 'chef')
const pendingCount = computed(() => db.orders.filter((o) => o.status === 'pending').length)

const tabs = computed(() =>
  isChef.value
    ? [
        { name: 'owner-home', icon: 'home', label: '工作台' },
        { name: 'order-manage', icon: 'receipt', label: '点菜单', badge: pendingCount.value },
        { name: 'dish-manage', icon: 'book', label: '菜品' },
        { name: 'shop-settings', icon: 'settings', label: '家庭' }
      ]
    : [
        { name: 'menu', icon: 'basket', label: '点菜' },
        { name: 'my-orders', icon: 'clock', label: '我的点单' }
      ]
)

function go(tab) {
  if (route.name === tab.name) return
  haptic()
  resetTo(tab.name)
}
</script>

<template>
  <nav class="tabbar-wrap">
    <div class="tabbar glass">
      <button
        v-for="tab in tabs"
        :key="tab.name"
        class="tab"
        :class="{ on: route.name === tab.name }"
        @click="go(tab)"
      >
        <span class="tab-inner">
          <span class="icon-wrap">
            <AppIcon :name="tab.icon" :size="21" :stroke="route.name === tab.name ? 2 : 1.65" />
            <span v-if="tab.badge" class="badge">{{ tab.badge > 9 ? '9+' : tab.badge }}</span>
          </span>
          <span class="tab-label">{{ tab.label }}</span>
        </span>
      </button>
    </div>
  </nav>
</template>

<style scoped>
.tabbar-wrap {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 0 15px calc(9px + var(--safe-bottom));
  z-index: 60;
  pointer-events: none;
}

.tabbar {
  display: flex;
  align-items: stretch;
  height: var(--tabbar-h);
  border-radius: var(--r-pill);
  padding: 6px;
  box-shadow: var(--highlight), 0 14px 34px -16px rgba(16, 24, 40, 0.34);
  pointer-events: auto;
}

.tab {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-pill);
  color: var(--ink-3);
  transition: color 0.24s var(--ease-out), background 0.28s var(--ease-out);
}

.tab.on {
  color: var(--accent);
  background: linear-gradient(168deg, rgba(255, 255, 255, 0.95), rgba(233, 241, 254, 0.92));
  box-shadow: 0 1px 3px rgba(16, 24, 40, 0.05), inset 0 0 0 1px rgba(255, 255, 255, 0.95);
}

.tab-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 3px 0;
}

.icon-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 23px;
}

.tab-label {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.1px;
  line-height: 1;
}

.tab.on .tab-label {
  font-weight: 700;
}

.badge {
  position: absolute;
  top: -4px;
  right: -9px;
  min-width: 15px;
  height: 15px;
  padding: 0 4px;
  border-radius: 999px;
  font-size: 9.5px;
  font-weight: 700;
  line-height: 15px;
  text-align: center;
  color: #fff;
  background: var(--danger);
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.9);
}
</style>
