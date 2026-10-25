<script setup>
import { ref, computed } from 'vue'
import PageHeader from '../components/PageHeader.vue'
import AppIcon from '../components/AppIcon.vue'
import EmptyState from '../components/EmptyState.vue'
import { db, getChecked, toggleChecked } from '../data/db'
import { haptic, toast } from '../store/app'
import { buildShoppingList, toPlainText } from '../lib/ingredients'
import { isToday, todayKey } from '../lib/util'

const day = todayKey()
const checked = computed(() => getChecked(day))

const todaysOrders = computed(() => db.orders.filter((o) => isToday(o.createdAt) && o.status !== 'cancelled'))

const result = computed(() => buildShoppingList(db.dishes, todaysOrders.value))
const list = computed(() => result.value.list)
const missing = computed(() => result.value.missing)

const doneCount = computed(() => list.value.filter((it) => checked.value[it.name]).length)
const progress = computed(() =>
  list.value.length === 0 ? 0 : Math.round((doneCount.value / list.value.length) * 100)
)

function tap(name) {
  haptic()
  toggleChecked(day, name)
}

async function copyText() {
  const text = toPlainText(list.value, day)
  try {
    await navigator.clipboard.writeText(text)
    toast('清单已复制，去发家庭群')
  } catch {
    // 降级
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    try {
      document.execCommand('copy')
      toast('清单已复制')
    } catch {
      toast('复制失败，请手动选择')
    }
    document.body.removeChild(ta)
  }
}
</script>

<template>
  <div class="page">
    <PageHeader title="买菜清单" :subtitle="todaysOrders.length + ' 单 · ' + result.dishCount + ' 道菜'" />

    <div class="scroll">
      <div class="page-pad">
        <div v-if="list.length === 0" class="card">
          <EmptyState
            icon="🛒"
            title="今天还没人点菜"
            hint="家人点完菜，要买的食材会自动汇总到这里"
          />
        </div>

        <template v-else>
          <!-- 进度 -->
          <div class="prog-card card anim-rise">
            <div class="prog-top">
              <div>
                <div class="prog-label">采购进度</div>
                <div class="prog-val">
                  <span class="mono-num">{{ doneCount }}</span>
                  <span class="prog-total"> / {{ list.length }}</span>
                </div>
              </div>
              <div class="prog-ring">
                <svg width="46" height="46" viewBox="0 0 46 46">
                  <circle cx="23" cy="23" r="19" fill="none" stroke="rgba(18,22,27,0.07)" stroke-width="4" />
                  <circle
                    cx="23"
                    cy="23"
                    r="19"
                    fill="none"
                    stroke="url(#g1)"
                    stroke-width="4"
                    stroke-linecap="round"
                    :stroke-dasharray="2 * Math.PI * 19"
                    :stroke-dashoffset="2 * Math.PI * 19 * (1 - progress / 100)"
                    transform="rotate(-90 23 23)"
                    style="transition: stroke-dashoffset 0.5s cubic-bezier(0.32, 0.72, 0, 1)"
                  />
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stop-color="#6aa5fa" />
                      <stop offset="100%" stop-color="#2c7bf2" />
                    </linearGradient>
                  </defs>
                </svg>
                <span class="ring-num">{{ progress }}%</span>
              </div>
            </div>
          </div>

          <!-- 清单 -->
          <div class="sec-title">
            <div class="h2">要买的东西</div>
            <button class="link" @click="copyText">
              <AppIcon name="copy" :size="13" :stroke="2" />
              复制
            </button>
          </div>

          <div class="list">
            <button
              v-for="it in list"
              :key="it.name"
              class="srow"
              :class="{ done: checked[it.name] }"
              @click="tap(it.name)"
            >
              <span class="cbox" :class="{ on: checked[it.name] }">
                <AppIcon v-if="checked[it.name]" name="check" :size="12" :stroke="3" />
              </span>
              <span class="s-main">
                <span class="s-name">{{ it.name }}</span>
                <span class="s-src">{{ it.sourceText }}</span>
              </span>
              <span class="s-amount">{{ it.amountText }}</span>
            </button>
          </div>

          <!-- 缺食材提示 -->
          <div v-if="missing.length" class="missing card">
            <div class="m-title">
              <AppIcon name="fire" :size="14" :stroke="1.9" />
              这些菜还没录食材
            </div>
            <div class="m-list">{{ missing.join('、') }}</div>
            <div class="m-hint">去「菜品管理」补上，清单才会完整</div>
          </div>

          <div class="foot-note">
            清单按今日未取消的点菜单聚合 · 用量单位不同不做数值相加
          </div>
        </template>
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

.prog-card {
  margin-top: 4px;
  padding: 17px 18px;
}
.prog-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}
.prog-label {
  font-size: 12.5px;
  font-weight: 550;
  color: var(--ink-3);
}
.prog-val {
  margin-top: 4px;
  font-size: 27px;
  font-weight: 750;
  letter-spacing: -0.8px;
  color: var(--ink-1);
  line-height: 1.1;
}
.prog-total {
  font-size: 15px;
  font-weight: 600;
  color: var(--ink-4);
}
.prog-ring {
  position: relative;
  flex: 0 0 auto;
  width: 46px;
  height: 46px;
}
.ring-num {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: var(--accent-deep);
  font-variant-numeric: tabular-nums;
}

.link {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
}

.srow {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px 16px;
  position: relative;
  text-align: left;
  transition: background 0.18s ease;
}
.srow + .srow::before {
  content: '';
  position: absolute;
  top: 0;
  left: 16px;
  right: 16px;
  height: 1px;
  background: var(--hairline);
}
.srow:active {
  background: rgba(18, 22, 27, 0.035);
}

.cbox {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 8px;
  color: #fff;
  background: rgba(18, 22, 27, 0.055);
  box-shadow: inset 0 0 0 1.4px rgba(18, 22, 27, 0.1);
  transition: background 0.22s var(--ease-out), box-shadow 0.22s ease, transform 0.2s var(--ease-spring);
}
.cbox.on {
  background: linear-gradient(168deg, #5c98f8, var(--accent));
  box-shadow: none;
  transform: scale(1.04);
}

.s-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.s-name {
  font-size: 15.5px;
  font-weight: 600;
  letter-spacing: -0.1px;
  transition: color 0.2s ease;
}
.s-src {
  font-size: 11.5px;
  color: var(--ink-4);
  margin-top: 1px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.s-amount {
  flex: 0 0 auto;
  font-size: 13.5px;
  font-weight: 650;
  color: var(--accent-deep);
  font-variant-numeric: tabular-nums;
}

.srow.done .s-name {
  color: var(--ink-4);
  text-decoration: line-through;
  text-decoration-color: rgba(18, 22, 27, 0.2);
}
.srow.done .s-amount {
  color: var(--ink-4);
}

.missing {
  margin-top: 13px;
  padding: 15px 16px;
  background: rgba(253, 241, 225, 0.72);
  box-shadow: inset 0 0 0 1px rgba(232, 140, 31, 0.16);
}
.m-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13.5px;
  font-weight: 700;
  color: #a9630d;
}
.m-list {
  margin-top: 7px;
  font-size: 13.5px;
  color: var(--ink-2);
  line-height: 1.5;
}
.m-hint {
  margin-top: 5px;
  font-size: 11.5px;
  color: #b07a3a;
}

.foot-note {
  margin: 18px 4px 0;
  font-size: 11.5px;
  color: var(--ink-4);
  line-height: 1.5;
  text-align: center;
}
</style>
