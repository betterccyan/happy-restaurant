<script setup>
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'
import { route, resetTo } from '../store/router'
import { db } from '../data/db'
import { ui } from '../store/app'

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
  resetTo(tab.name)
}
</script>

<template>
  <nav class="tabbar-wrap" :class="{ hide: ui.dockHidden }">
    <div class="tabbar">
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
  /* 随滚动收起：往下滚藏起来，往上滚浮回来 */
  transition: transform 0.34s var(--ease-out), opacity 0.26s ease;
  will-change: transform, opacity;
}

.tabbar-wrap.hide {
  transform: translate3d(0, calc(100% + 22px), 0);
  opacity: 0;
}

/* 收起时两侧留白也不能挡点击 */
.tabbar-wrap.hide .tabbar {
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
  /* 小米相册式：底色接近实色（约 99%），后面内容基本压死，
     残留的那一点点渗透交给 blur 糊掉，所以既干净又不死板 */
  background-image: linear-gradient(180deg, rgba(253, 254, 255, 0.991), rgba(244, 247, 252, 0.974));
  -webkit-backdrop-filter: blur(30px) saturate(128%);
  backdrop-filter: blur(30px) saturate(128%);
  /* 边缘只留一道高光 + 一条极淡暗线定形，阴影比之前轻，
     否则实色底配上重投影会显得像一块悬浮贴片 */
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.92),
    inset 0 -1px 0 rgba(255, 255, 255, 0.32),
    inset 0 0 0 0.5px rgba(15, 23, 42, 0.08),
    0 4px 14px -9px rgba(16, 24, 40, 0.16), 0 16px 34px -24px rgba(16, 24, 40, 0.24);
  pointer-events: auto;
}

.tab {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-3);
  transition: color 0.26s var(--ease-out);
}

.tab-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 2px 0;
}

.tab.on {
  color: var(--accent);
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
  transition: transform 0.32s var(--ease-out);
}

.tab.on .icon-wrap {
  transform: translateY(-0.5px) scale(1.06);
}

.tab-label {
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: 0.1px;
  line-height: 1;
  transition: font-weight 0.2s var(--ease-out);
}

.tab.on .tab-label {
  font-weight: 600;
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
