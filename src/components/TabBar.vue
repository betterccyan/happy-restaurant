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
    <div class="tabbar" :data-n="tabs.length">
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
/* 悬浮 dock：固定宽度居中、离底边 11px，内容从底部透出；
   两侧留白由 wrap 的 pointer-events:none 点透到下层 */
.tabbar-wrap {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  padding: 0 16px calc(11px + var(--safe-bottom));
  z-index: 60;
  pointer-events: none;
}

.tabbar {
  display: flex;
  align-items: stretch;
  gap: 2px;
  width: 100%;
  max-width: 342px;
  height: var(--tabbar-h);
  border-radius: var(--r-pill);
  padding: 5px;
  background: rgba(255, 255, 255, 0.74);
  -webkit-backdrop-filter: blur(38px) saturate(200%);
  backdrop-filter: blur(38px) saturate(200%);
  box-shadow: var(--highlight), 0 12px 30px -14px rgba(16, 24, 40, 0.3);
  pointer-events: auto;
}

.tab {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-pill);
  color: var(--ink-3);
  transition: color 0.24s var(--ease-out);
}

/* 高亮落在 .tab-inner 上：小胶囊包住图标+文字，四周留出呼吸空间 */
.tab-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 64px;
  padding: 4px 13px;
  border-radius: var(--r-pill);
  transition: background 0.28s var(--ease-out), box-shadow 0.28s var(--ease-out);
}

.tab.on {
  color: var(--accent);
}

/* tab 少时格子宽，高亮也跟着放宽，避免变成竖向椭圆 */
.tabbar[data-n='2'] .tab-inner {
  min-width: 88px;
}

.tabbar[data-n='3'] .tab-inner {
  min-width: 74px;
}

.tab.on .tab-inner {
  background: linear-gradient(180deg, rgba(44, 123, 242, 0.14), rgba(44, 123, 242, 0.09));
  box-shadow: inset 0 0 0 0.5px rgba(44, 123, 242, 0.16);
}

.tab:active .icon-wrap {
  transform: scale(0.9);
}

.icon-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 23px;
  transition: transform 0.3s var(--ease-out);
}

.tab.on .icon-wrap {
  transform: translateY(-0.5px) scale(1.04);
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
