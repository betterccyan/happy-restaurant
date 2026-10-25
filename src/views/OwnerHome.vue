<script setup>
import { computed } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import DishAvatar from '../components/DishAvatar.vue'
import EmptyState from '../components/EmptyState.vue'
import { db, updateOrderStatus } from '../data/db'
import { navigate, resetTo } from '../store/router'
import { haptic, toast } from '../store/app'
import { greeting, todayText, isToday, statusInfo, formatClock, orderQty } from '../lib/util'

const shopName = computed(() => db.settings.name || '幸福小馆')
const pending = computed(() => db.orders.filter((o) => o.status === 'pending'))
const todayOrders = computed(() => db.orders.filter((o) => isToday(o.createdAt) && o.status !== 'cancelled'))
const activeOrders = computed(() =>
  db.orders
    .filter((o) => ['accepted', 'making'].includes(o.status))
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
)

const stats = computed(() => [
  { key: 'pending', value: pending.value.length, label: '待做', tone: 'warn' },
  { key: 'today', value: todayOrders.value.length, label: '今日点菜', tone: 'accent' },
  { key: 'dishes', value: db.dishes.length, label: '家庭菜品', tone: 'plain' }
])

const entries = computed(() => [
  { name: 'dish-manage', icon: 'book', title: '菜品管理', desc: db.dishes.length + ' 道菜', emoji: '📖' },
  { name: 'category-manage', icon: 'edit', title: '分类管理', desc: db.categories.length + ' 个餐次', emoji: '🗂️' },
  { name: 'shopping-list', icon: 'basket', title: '买菜清单', desc: '按今日点菜聚合', emoji: '🛒' },
  { name: 'shop-settings', icon: 'settings', title: '家庭信息', desc: '名称与公告', emoji: '🏠' }
])

function advance(order) {
  haptic()
  const map = { pending: 'accepted', accepted: 'making', making: 'done' }
  const next = map[order.status]
  if (!next) return
  updateOrderStatus(order.id, next)
  toast(statusInfo(next).text)
}

function go(name) {
  navigate(name)
}

function switchRole() {
  resetTo('role-select')
}
</script>

<template>
  <div class="scroll has-tabbar">
    <div class="head">
      <div class="head-row">
        <div>
          <div class="hello">{{ greeting() }}，主厨</div>
          <h1 class="h1 shop">{{ shopName }}</h1>
          <div class="sub">{{ todayText() }}</div>
        </div>
        <button class="avatar-btn press" @click="switchRole">
          <span>👨‍🍳</span>
        </button>
      </div>
    </div>

    <div class="page-pad">
      <!-- 统计 -->
      <div class="stats anim-rise">
        <div v-for="s in stats" :key="s.key" class="stat" :class="'tone-' + s.tone">
          <div class="stat-val mono-num">{{ s.value }}</div>
          <div class="stat-label">{{ s.label }}</div>
        </div>
      </div>

      <!-- 进行中的单 -->
      <div v-if="activeOrders.length" class="sec-title">
        <div class="h2">正在做</div>
        <button class="link" @click="go('order-manage')">全部</button>
      </div>
      <div v-if="activeOrders.length" class="list anim-rise">
        <div
          v-for="o in activeOrders"
          :key="o.id"
          class="row press"
          @click="go('order-manage')"
        >
          <div class="row-main">
            <div class="row-title">
              {{ o.memberName }}
              <span class="pill" :class="'pill-' + statusInfo(o.status).tone">{{ statusInfo(o.status).text }}</span>
            </div>
            <div class="row-desc">
              {{ o.items.map((i) => i.name + '×' + i.qty).join('、') }}
            </div>
          </div>
          <button class="mini-btn" @click.stop="advance(o)">
            {{ o.status === 'accepted' ? '开始烹饪' : '上桌' }}
          </button>
        </div>
      </div>

      <!-- 待做 -->
      <div class="sec-title">
        <div class="h2">待做</div>
        <button class="link" @click="go('order-manage')">点菜单</button>
      </div>

      <div v-if="pending.length === 0" class="card">
        <EmptyState
          icon="🌤️"
          title="暂时没有新点菜"
          hint="家人点完菜会出现在这里，下拉或切到点菜单页刷新"
        />
      </div>

      <div v-else class="orders">
        <div v-for="o in pending" :key="o.id" class="order card anim-rise">
          <div class="order-top">
            <div class="who">
              <span class="who-name">{{ o.memberName }}</span>
              <span v-if="o.expectTime" class="expect">
                <AppIcon name="clock" :size="12" :stroke="1.9" />
                {{ o.expectTime }} 开饭
              </span>
            </div>
            <span class="order-time">{{ formatClock(o.createdAt) }}</span>
          </div>

          <div class="items">
            <div v-for="(it, i) in o.items" :key="i" class="item">
              <DishAvatar :image-key="it.imageKey" :emoji="it.emoji" :size="34" />
              <div class="item-main">
                <div class="item-name">{{ it.name }}</div>
                <div v-if="it.options && it.options.length" class="item-opt">
                  {{ it.options.map((g) => g.choices.map((c) => c.label).join('/')).join(' · ') }}
                </div>
              </div>
              <div class="item-qty mono-num">×{{ it.qty }}</div>
            </div>
          </div>

          <div v-if="o.remark" class="remark">
            <span class="remark-tag">备注</span>{{ o.remark }}
          </div>

          <div class="order-foot">
            <span class="qty-sum">{{ orderQty(o.items) }} 份</span>
            <button class="btn btn-primary btn-sm" @click="advance(o)">开始做</button>
          </div>
        </div>
      </div>

      <!-- 快捷入口 -->
      <div class="sec-title">
        <div class="h2">管理</div>
      </div>
      <div class="grid">
        <button v-for="e in entries" :key="e.name" class="entry press" @click="go(e.name)">
          <span class="entry-emoji">{{ e.emoji }}</span>
          <span class="entry-title">{{ e.title }}</span>
          <span class="entry-desc">{{ e.desc }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.head {
  padding: calc(var(--safe-top) + 18px) 20px 6px;
}
.head-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}
.hello {
  font-size: 13.5px;
  font-weight: 550;
  color: var(--ink-3);
}
.shop {
  margin: 5px 0 3px;
}
.avatar-btn {
  flex: 0 0 auto;
  width: 46px;
  height: 46px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 23px;
  background: linear-gradient(150deg, rgba(255, 255, 255, 0.96), rgba(230, 239, 252, 0.92));
  box-shadow: var(--shadow-card), var(--highlight);
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 9px;
  margin-top: 16px;
}
.stat {
  position: relative;
  overflow: hidden;
  border-radius: var(--r-lg);
  padding: 15px 12px 13px;
  text-align: center;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: var(--shadow-card), var(--highlight);
}
.stat::after {
  content: '';
  position: absolute;
  top: -26px;
  left: 50%;
  width: 84px;
  height: 62px;
  transform: translateX(-50%);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(120, 172, 255, 0.22), rgba(120, 172, 255, 0));
  pointer-events: none;
}
.stat-val {
  position: relative;
  font-size: 25px;
  font-weight: 750;
  letter-spacing: -0.8px;
  line-height: 1.1;
}
.stat-label {
  position: relative;
  margin-top: 4px;
  font-size: 11.5px;
  font-weight: 550;
  color: var(--ink-3);
}
.stat.tone-warn .stat-val {
  color: var(--warn);
}
.stat.tone-accent .stat-val {
  color: var(--accent);
}

.link {
  flex: 0 0 auto;
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
  padding: 2px 0;
}

.orders {
  display: flex;
  flex-direction: column;
  gap: 11px;
}
.order {
  padding: 15px 16px 14px;
}
.order-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 11px;
}
.who {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.who-name {
  font-size: 15.5px;
  font-weight: 700;
  letter-spacing: -0.2px;
}
.expect {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
  color: #a9630d;
  background: var(--warn-soft);
}
.order-time {
  flex: 0 0 auto;
  font-size: 12px;
  color: var(--ink-4);
  font-variant-numeric: tabular-nums;
}

.items {
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.item {
  display: flex;
  align-items: center;
  gap: 10px;
}
.item-main {
  flex: 1;
  min-width: 0;
}
.item-name {
  font-size: 14.5px;
  font-weight: 550;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.item-opt {
  font-size: 11.5px;
  color: var(--ink-3);
  margin-top: 1px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.item-qty {
  flex: 0 0 auto;
  font-size: 14px;
  font-weight: 650;
  color: var(--ink-2);
}

.remark {
  margin-top: 11px;
  padding: 9px 11px;
  border-radius: var(--r-sm);
  font-size: 13px;
  color: var(--ink-2);
  background: rgba(232, 140, 31, 0.08);
  line-height: 1.45;
}
.remark-tag {
  font-size: 10.5px;
  font-weight: 700;
  color: var(--warn);
  margin-right: 6px;
  letter-spacing: 0.4px;
}

.order-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 13px;
  padding-top: 12px;
  border-top: 1px solid var(--hairline);
}
.qty-sum {
  font-size: 12.5px;
  color: var(--ink-3);
  font-weight: 550;
}

.mini-btn {
  flex: 0 0 auto;
  height: 32px;
  padding: 0 13px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 650;
  color: var(--accent-deep);
  background: var(--accent-soft);
}
.mini-btn:active {
  transform: scale(0.94);
}

.pill {
  margin-left: 4px;
  vertical-align: 1px;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.entry {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  padding: 15px 14px 14px;
  border-radius: var(--r-lg);
  text-align: left;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: var(--shadow-card), var(--highlight);
}
.entry-emoji {
  font-size: 22px;
  line-height: 1.2;
  margin-bottom: 5px;
}
.entry-title {
  font-size: 14.5px;
  font-weight: 650;
  letter-spacing: -0.1px;
}
.entry-desc {
  font-size: 11.5px;
  color: var(--ink-3);
}

.anim-rise-late {
  animation: rise 0.46s var(--ease-spring) 0.08s both;
}

/* ---- 平板：头部与正文同一列，横屏时卡片改双列 ---- */
@media (min-width: 700px) {
  .head {
    width: 100%;
    max-width: var(--content-w);
    margin-inline: auto;
    padding-inline: 26px;
  }
  .stat {
    padding: 18px 12px 15px;
  }
  .stat-val {
    font-size: 28px;
  }
}

@media (min-width: 1000px) {
  /* 待做的单横屏两列并排，宽屏下不再一条道拉到底 */
  .orders {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  /* 四个管理入口一行放下 */
  .grid {
    grid-template-columns: repeat(4, 1fr);
  }
  .entry {
    padding: 17px 16px 16px;
  }
}
</style>
