<script setup>
import { ref, computed } from 'vue'
import PageHeader from '../components/PageHeader.vue'
import AppIcon from '../components/AppIcon.vue'
import DishAvatar from '../components/DishAvatar.vue'
import EmptyState from '../components/EmptyState.vue'
import { db, updateOrderStatus, deleteOrder } from '../data/db'
import { haptic, toast } from '../store/app'
import { ask } from '../store/dialog'
import { statusInfo, formatTime, isToday, orderCalories, orderQty } from '../lib/util'
import { navigate } from '../store/router'

const filter = ref('pending')

const FILTERS = [
  { key: 'pending', label: '待做' },
  { key: 'accepted', label: '准备中' },
  { key: 'making', label: '烹饪中' },
  { key: 'done', label: '已上桌' },
  { key: 'all', label: '全部' }
]

const counts = computed(() => {
  const c = { pending: 0, accepted: 0, making: 0, done: 0, cancelled: 0 }
  db.orders.forEach((o) => {
    if (c[o.status] !== undefined) c[o.status] += 1
  })
  return c
})

const list = computed(() => {
  const all = [...db.orders].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  if (filter.value === 'all') return all.filter((o) => o.status !== 'cancelled')
  return all.filter((o) => o.status === filter.value)
})

const nextAction = (status) =>
  ({ pending: { to: 'accepted', label: '开始做' }, accepted: { to: 'making', label: '开始烹饪' }, making: { to: 'done', label: '上桌' } }[status] || null)

function advance(order) {
  const act = nextAction(order.status)
  if (!act) return
  haptic()
  updateOrderStatus(order.id, act.to)
  toast(statusInfo(act.to).text)
}

function drop(order) {
  haptic()
  updateOrderStatus(order.id, 'cancelled')
  toast('已取消这一单')
}

async function remove(order) {
  const ok = await ask({
    title: '从记录里删掉这一单？',
    message: '这一单的菜品和份数都会一起消失。',
    confirmText: '删除',
    danger: true
  })
  if (!ok) return
  deleteOrder(order.id)
  toast('已删除')
}

function goShopping() {
  navigate('shopping-list')
}
</script>

<template>
  <div class="page">
    <PageHeader title="点菜单" :subtitle="counts.pending + ' 单待做 · ' + counts.making + ' 单在锅里'" :show-back="false">
      <template #right>
        <button class="shopping-btn press" @click="goShopping">
          <AppIcon name="basket" :size="17" :stroke="1.9" />
        </button>
      </template>
    </PageHeader>

    <div class="filters">
      <div class="chips">
        <button
          v-for="f in FILTERS"
          :key="f.key"
          class="chip"
          :class="{ on: filter === f.key }"
          @click="filter = f.key"
        >
          {{ f.label }}
          <span v-if="f.key !== 'all' && counts[f.key]" class="chip-num">{{ counts[f.key] }}</span>
        </button>
      </div>
    </div>

    <div class="scroll has-tabbar">
      <div class="page-pad">
        <div v-if="list.length === 0" class="card">
          <EmptyState
            icon="📋"
            :title="'没有' + (FILTERS.find((f) => f.key === filter)?.label || '') + '的单'"
            hint="家人点菜后会实时出现在这里"
          />
        </div>

        <div v-else class="cards">
          <div v-for="o in list" :key="o.id" class="ocard card anim-rise">
            <div class="ohead">
              <div class="ohead-left">
                <span class="oname">{{ o.memberName }}</span>
                <span class="dot"></span>
                <span class="otime">{{ isToday(o.createdAt) ? formatTime(o.createdAt).split(' ')[1] : formatTime(o.createdAt) }}</span>
              </div>
              <span class="pill" :class="'pill-' + statusInfo(o.status).tone">
                {{ statusInfo(o.status).text }}
              </span>
            </div>

            <div v-if="o.expectTime" class="expect-row">
              <AppIcon name="clock" :size="13" :stroke="1.9" />
              希望 {{ o.expectTime }} 开饭
            </div>

            <div class="oitems">
              <div v-for="(it, i) in o.items" :key="i" class="oitem">
                <DishAvatar :image-key="it.imageKey" :emoji="it.emoji" :size="36" />
                <div class="oitem-main">
                  <div class="oitem-name">{{ it.name }}</div>
                  <div v-if="it.options && it.options.length" class="oitem-opt">
                    {{ it.options.map((g) => g.choices.map((c) => c.label).join('/')).join(' · ') }}
                  </div>
                </div>
                <span class="oitem-qty mono-num">×{{ it.qty }}</span>
              </div>
            </div>

            <div v-if="o.remark" class="remark">
              <span class="remark-tag">备注</span>{{ o.remark }}
            </div>

            <div class="ofoot">
              <span class="osum">
                {{ orderQty(o.items) }} 份
                <template v-if="orderCalories(o.items) > 0"> · {{ orderCalories(o.items) }} 千卡</template>
              </span>
              <div class="oacts">
                <button v-if="o.status === 'pending'" class="btn btn-ghost btn-sm" @click="drop(o)">
                  不做了
                </button>
                <button v-if="o.status === 'cancelled'" class="btn btn-ghost btn-sm" @click="remove(o)">
                  删除
                </button>
                <button
                  v-if="nextAction(o.status)"
                  class="btn btn-primary btn-sm"
                  @click="advance(o)"
                >
                  {{ nextAction(o.status).label }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.shopping-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 999px;
  color: var(--accent-deep);
  background: rgba(255, 255, 255, 0.88);
  box-shadow: var(--highlight), 0 2px 8px -4px rgba(16, 24, 40, 0.16);
}

.filters {
  padding: 11px 18px 11px;
  flex: 0 0 auto;
}
.chip-num {
  margin-left: 4px;
  font-size: 10.5px;
  font-weight: 700;
  opacity: 0.8;
}

.cards {
  display: flex;
  flex-direction: column;
  gap: 11px;
  padding-top: 2px;
}

.ocard {
  padding: 15px 16px 14px;
}

.ohead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}
.ohead-left {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}
.oname {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.2px;
}
.dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--ink-4);
}
.otime {
  font-size: 12px;
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
}

.expect-row {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 12px;
  padding: 5px 10px;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 600;
  color: #a9630d;
  background: var(--warn-soft);
}

.oitems {
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.oitem {
  display: flex;
  align-items: center;
  gap: 10px;
}
.oitem-main {
  flex: 1;
  min-width: 0;
}
.oitem-name {
  font-size: 14.5px;
  font-weight: 550;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.oitem-opt {
  font-size: 11.5px;
  color: var(--ink-3);
  margin-top: 1px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.oitem-qty {
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

.ofoot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 13px;
  padding-top: 12px;
  border-top: 1px solid var(--hairline);
}
.osum {
  font-size: 12.5px;
  color: var(--ink-3);
  font-weight: 550;
  font-variant-numeric: tabular-nums;
}
.oacts {
  display: flex;
  gap: 7px;
}

/* ---- 平板：筛选条跟正文对齐，横屏单据两列 ---- */
@media (min-width: 700px) {
  .filters {
    width: 100%;
    max-width: var(--content-w);
    margin-inline: auto;
    padding-inline: 26px;
  }
}

@media (min-width: 1000px) {
  .cards {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
}
</style>
