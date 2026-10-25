<script setup>
import { ref, computed, onMounted } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import DishAvatar from '../components/DishAvatar.vue'
import EmptyState from '../components/EmptyState.vue'
import { db, updateOrderStatus, setNickname } from '../data/db'
import { navigate, resetTo } from '../store/router'
import { reorderItems, haptic, toast } from '../store/app'
import { statusInfo, formatTime, isToday, orderCalories, orderQty } from '../lib/util'

const params = defineProps({ params: { type: Object, default: () => ({}) } })

const filter = ref('active')
const highlightId = ref(params.params?.highlight || '')

const orders = computed(() => {
  const all = [...db.orders].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  if (filter.value === 'active') return all.filter((o) => ['pending', 'accepted', 'making'].includes(o.status))
  if (filter.value === 'done') return all.filter((o) => o.status === 'done')
  return all
})

const activeCount = computed(
  () => db.orders.filter((o) => ['pending', 'accepted', 'making'].includes(o.status)).length
)

const name = ref(db.lastMemberName || db.profile.nickname || '')
const editingName = ref(!name.value)

function saveName() {
  const n = name.value.trim()
  if (!n) return
  setNickname(n)
  db.lastMemberName = n
  editingName.value = false
  toast('已记住，下次默认用这个名字')
}

function cancel(order) {
  haptic()
  updateOrderStatus(order.id, 'cancelled')
  toast('已取消')
}

function again(order) {
  reorderItems(order.items)
  haptic()
  toast('已加回已选')
  navigate('checkout')
}

function progressPercent(status) {
  return { pending: 8, accepted: 40, making: 72, done: 100, cancelled: 0 }[status] || 0
}

function switchRole() {
  resetTo('role-select')
}

onMounted(() => {
  setTimeout(() => {
    highlightId.value = ''
  }, 2400)
})
</script>

<template>
  <div class="page">
    <header class="head">
      <div class="head-top">
        <h1 class="h1">我的点单</h1>
        <button class="switch-role" @click="switchRole">
          <AppIcon name="swap" :size="14" :stroke="2" />
          切换身份
        </button>
      </div>
      <div class="name-row" v-if="!editingName">
        <span class="name-chip" @click="editingName = true">
          <AppIcon name="user" :size="13" :stroke="2" />
          {{ name || '未设名字' }}
          <AppIcon name="edit" :size="12" :stroke="2" class="edit-ico" />
        </span>
      </div>
      <div class="name-row" v-else>
        <div class="name-input">
          <input v-model="name" placeholder="你的名字" maxlength="12" @keyup.enter="saveName" />
        </div>
        <button class="btn btn-primary btn-sm" @click="saveName">记住</button>
      </div>

      <div class="chips tabs">
        <button class="chip" :class="{ on: filter === 'active' }" @click="filter = 'active'">
          进行中{{ activeCount ? ' ' + activeCount : '' }}
        </button>
        <button class="chip" :class="{ on: filter === 'done' }" @click="filter = 'done'">已上桌</button>
        <button class="chip" :class="{ on: filter === 'all' }" @click="filter = 'all'">全部</button>
      </div>
    </header>

    <div class="scroll has-tabbar">
      <div class="page-pad">
        <div v-if="orders.length === 0" class="card">
          <EmptyState
            icon="🥢"
            :title="filter === 'active' ? '没有正在做的单' : '还没有点过菜'"
            hint="去点菜页挑几道，主厨就会收到"
          >
            <button class="btn btn-primary btn-sm" @click="navigate('menu')">去点菜</button>
          </EmptyState>
        </div>

        <div v-else class="cards">
          <div
            v-for="o in orders"
            :key="o.id"
            class="ocard card anim-rise"
            :class="{ lit: highlightId === o.id }"
          >
            <div class="ohead">
              <div class="ohead-left">
                <span class="otime">{{ isToday(o.createdAt) ? '今天 ' + formatTime(o.createdAt).split(' ')[1] : formatTime(o.createdAt) }}</span>
                <span class="odot"></span>
                <span class="oname">{{ o.memberName }}</span>
              </div>
              <span class="pill" :class="'pill-' + statusInfo(o.status).tone">
                {{ statusInfo(o.status).text }}
              </span>
            </div>

            <!-- 进度 -->
            <div v-if="o.status !== 'cancelled'" class="progress">
              <div class="pbar">
                <div class="pfill" :style="{ width: progressPercent(o.status) + '%' }"></div>
              </div>
              <div class="psteps">
                <span :class="{ done: progressPercent(o.status) >= 8 }">待做</span>
                <span :class="{ done: progressPercent(o.status) >= 40 }">准备中</span>
                <span :class="{ done: progressPercent(o.status) >= 72 }">烹饪中</span>
                <span :class="{ done: progressPercent(o.status) >= 100 }">已上桌</span>
              </div>
            </div>

            <div class="oitems">
              <div v-for="(it, i) in o.items" :key="i" class="oitem">
                <DishAvatar :image-key="it.imageKey" :emoji="it.emoji" :size="32" />
                <span class="oitem-name">{{ it.name }}</span>
                <span v-if="it.options && it.options.length" class="oitem-opt">
                  {{ it.options.map((g) => g.choices.map((c) => c.label).join('/')).join(' · ') }}
                </span>
                <span class="oitem-qty mono-num">×{{ it.qty }}</span>
              </div>
            </div>

            <div v-if="o.expectTime || o.remark" class="oextra">
              <span v-if="o.expectTime" class="ex-item">
                <AppIcon name="clock" :size="12" :stroke="1.9" />{{ o.expectTime }} 开饭
              </span>
              <span v-if="o.remark" class="ex-item remark">备注：{{ o.remark }}</span>
            </div>

            <div class="ofoot">
              <span class="osum">
                {{ orderQty(o.items) }} 份
                <template v-if="orderCalories(o.items) > 0"> · {{ orderCalories(o.items) }} 千卡</template>
              </span>
              <div class="oacts">
                <button
                  v-if="o.status === 'pending'"
                  class="btn btn-danger btn-sm"
                  @click="cancel(o)"
                >
                  取消
                </button>
                <button v-if="o.status === 'done'" class="btn btn-soft btn-sm" @click="again(o)">
                  再来一份
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

.head {
  flex: 0 0 auto;
  padding: calc(var(--safe-top) + 16px) 20px 0;
}

.head-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.switch-role {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--accent-deep);
  background: rgba(255, 255, 255, 0.84);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.95), 0 1px 3px rgba(16, 24, 40, 0.05);
}
.switch-role:active {
  transform: scale(0.95);
}

.name-row {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: 11px;
}
.name-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-2);
  background: rgba(255, 255, 255, 0.82);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.9);
}
.edit-ico {
  color: var(--ink-4);
}
.name-input {
  flex: 1;
  display: flex;
  align-items: center;
  height: 36px;
  padding: 0 13px;
  border-radius: 12px;
  background: #fff;
  box-shadow: inset 0 0 0 1.5px var(--accent);
}
.name-input input {
  flex: 1;
  min-width: 0;
  font-size: 14.5px;
}

.tabs {
  margin-top: 12px;
  padding-bottom: 12px;
}

.cards {
  display: flex;
  flex-direction: column;
  gap: 11px;
  padding-top: 4px;
}

.ocard {
  padding: 15px 16px 14px;
  transition: box-shadow 0.4s ease;
}
.ocard.lit {
  box-shadow: 0 0 0 2px rgba(44, 123, 242, 0.4), var(--shadow-card), var(--highlight);
}

.ohead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}
.ohead-left {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}
.otime {
  font-size: 12.5px;
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
}
.odot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--ink-4);
}
.oname {
  font-size: 13.5px;
  font-weight: 650;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.progress {
  margin-bottom: 13px;
}
.pbar {
  height: 4px;
  border-radius: 999px;
  background: rgba(18, 22, 27, 0.06);
  overflow: hidden;
}
.pfill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #6aa5fa, var(--accent));
  transition: width 0.5s var(--ease-spring);
}
.psteps {
  display: flex;
  justify-content: space-between;
  margin-top: 7px;
  font-size: 10.5px;
  color: var(--ink-4);
  font-weight: 550;
}
.psteps span.done {
  color: var(--accent);
  font-weight: 650;
}

.oitems {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.oitem {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}
.oitem-name {
  font-size: 14.5px;
  font-weight: 550;
  flex: 0 0 auto;
}
.oitem-opt {
  flex: 1;
  min-width: 0;
  font-size: 11.5px;
  color: var(--ink-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.oitem-qty {
  flex: 0 0 auto;
  font-size: 13px;
  font-weight: 650;
  color: var(--ink-2);
  margin-left: auto;
}

.oextra {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 11px;
}
.ex-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 9px;
  border-radius: 8px;
  font-size: 11.5px;
  font-weight: 550;
  color: var(--ink-2);
  background: rgba(18, 22, 27, 0.045);
}
.ex-item.remark {
  color: #a9630d;
  background: var(--warn-soft);
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

/* ---- 平板：头部跟正文同一列，横屏单据两列 ---- */
@media (min-width: 700px) {
  .head {
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
