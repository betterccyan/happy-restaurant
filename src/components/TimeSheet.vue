<script setup>
import { ref, computed, onMounted, nextTick, onBeforeUnmount } from 'vue'
import AppIcon from './AppIcon.vue'
import { haptic } from '../store/app'

const props = defineProps({
  value: { type: String, default: '' }
})
const emit = defineEmits(['close', 'pick', 'clear'])

const ITEM_H = 38
const MIN_STEP = 5

const hourEl = ref(null)
const minEl = ref(null)
const hour = ref(12)
const min = ref(0)

const hours = Array.from({ length: 24 }, (_, i) => i)
const mins = Array.from({ length: 60 / MIN_STEP }, (_, i) => i * MIN_STEP)

function pad(n) {
  return String(n).padStart(2, '0')
}

function nowPlus(mins) {
  const d = new Date(Date.now() + mins * 60000)
  // 分钟向上取整到 5 的倍数，避免出现 18:07 这种「盯着时间做」的怪值
  const m = Math.ceil(d.getMinutes() / MIN_STEP) * MIN_STEP
  return { h: (d.getHours() + (m >= 60 ? 1 : 0)) % 24, m: m % 60 }
}

function parse(v) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(v || '').trim())
  if (!m) return null
  const h = Math.min(23, Math.max(0, Number(m[1])))
  const mi = Math.min(59, Math.max(0, Number(m[2])))
  return { h, m: mi }
}

function setWheels(t) {
  hour.value = t.h
  min.value = Math.min(55, Math.round(t.m / MIN_STEP) * MIN_STEP)
  nextTick(() => {
    // 直接定位，不要平滑滚动：打开面板时不该看见轮子在飞
    if (hourEl.value) hourEl.value.scrollTop = t.h * ITEM_H
    if (minEl.value) minEl.value.scrollTop = (min.value / MIN_STEP) * ITEM_H
  })
}

const timeText = computed(() => pad(hour.value) + ':' + pad(min.value))

const dayText = computed(() => {
  const d = new Date()
  const wk = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()]
  return '今天 ' + (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日 · ' + wk
})

/* ---- 滚轮：跟着 scroll 实时算，停下后由 scroll-snap 自己吸附 ---- */
let settleTimer = null
let lastTick = 0

// 滚动过程中 scroll 事件几十个连着来，每次都震会把手震麻，这里限到 ~70ms 一次
function tickHaptic() {
  const now = Date.now()
  if (now - lastTick < 70) return
  lastTick = now
  haptic()
}

function onWheelScroll(which) {
  const el = which === 'h' ? hourEl.value : minEl.value
  if (!el) return
  const idx = Math.max(0, Math.round(el.scrollTop / ITEM_H))
  if (which === 'h') {
    const v = Math.min(hours.length - 1, idx)
    if (v !== hour.value) {
      hour.value = v
      tickHaptic()
    }
  } else {
    const v = Math.min(mins.length - 1, idx) * MIN_STEP
    if (v !== min.value) {
      min.value = v
      tickHaptic()
    }
  }
  clearTimeout(settleTimer)
  settleTimer = setTimeout(() => {
    const max = which === 'h' ? hours.length - 1 : mins.length - 1
    const i = Math.min(max, Math.max(0, Math.round(el.scrollTop / ITEM_H)))
    if (Math.abs(el.scrollTop - i * ITEM_H) > 1) {
      el.scrollTo({ top: i * ITEM_H, behavior: 'smooth' })
    }
  }, 160)
}

/* ---- 快捷时间 ---- */
function quick(mins) {
  haptic()
  setWheels(nowPlus(mins))
}

function confirm() {
  haptic()
  emit('pick', timeText.value)
}

onMounted(() => {
  setWheels(parse(props.value) || nowPlus(30))
})

onBeforeUnmount(() => clearTimeout(settleTimer))
</script>

<template>
  <Teleport to="body">
    <div class="mask" @click="emit('close')"></div>
    <div class="sheet time-sheet">
      <div class="sheet-grabber"></div>

      <div class="sheet-head">
        <div>
          <div class="h3">期望几点开饭</div>
          <div class="sheet-sub">{{ dayText }}</div>
        </div>
        <button class="x-btn" @click="emit('close')">
          <AppIcon name="close" :size="17" :stroke="2.1" />
        </button>
      </div>

      <div class="sheet-body">
        <!-- 快捷：家庭场景最常用的就是「一会儿」「一小时后」 -->
        <div class="quick-row">
          <button class="q-chip" @click="quick(30)">30 分钟后</button>
          <button class="q-chip" @click="quick(60)">1 小时后</button>
          <button class="q-chip" @click="quick(120)">2 小时后</button>
          <button class="q-chip ghost" @click="emit('clear')">尽快</button>
        </div>

        <!-- 时 / 分 滚轮 -->
        <div class="wheel-box">
          <div class="wheel-band"></div>

          <div class="wheel-col">
            <div ref="hourEl" class="wheel" @scroll.passive="onWheelScroll('h')">
              <div class="wheel-pad"></div>
              <div
                v-for="h in hours"
                :key="h"
                class="wheel-item"
                :class="{ on: h === hour }"
              >
                {{ pad(h) }}
              </div>
              <div class="wheel-pad"></div>
            </div>
            <div class="wheel-unit">时</div>
          </div>

          <div class="wheel-colon">:</div>

          <div class="wheel-col">
            <div ref="minEl" class="wheel" @scroll.passive="onWheelScroll('m')">
              <div class="wheel-pad"></div>
              <div
                v-for="m in mins"
                :key="m"
                class="wheel-item"
                :class="{ on: m === min }"
              >
                {{ pad(m) }}
              </div>
              <div class="wheel-pad"></div>
            </div>
            <div class="wheel-unit">分</div>
          </div>
        </div>
      </div>

      <div class="sheet-foot">
        <button class="btn btn-primary btn-block" @click="confirm">
          就定 {{ timeText }} 开饭
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.time-sheet {
  max-height: 78vh;
}

.sheet-sub {
  margin-top: 3px;
  font-size: 12px;
  color: var(--ink-4);
}

.x-btn {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  color: var(--ink-3);
  background: rgba(18, 22, 27, 0.05);
}

/* ---- 快捷 ---- */
.quick-row {
  display: flex;
  gap: 8px;
  padding: 4px 0 16px;
}
.q-chip {
  flex: 1 1 0;
  min-width: 0;
  height: 36px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  color: var(--accent-deep);
  background: var(--accent-soft);
  transition: transform 0.18s var(--ease-spring);
}
.q-chip:active {
  transform: scale(0.95);
}
.q-chip.ghost {
  color: var(--ink-2);
  background: rgba(18, 22, 27, 0.055);
}

/* ---- 滚轮 ---- */
.wheel-box {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0;
}

/* 中间那一条：告诉用户「停在这里的才是选中值」 */
.wheel-band {
  position: absolute;
  left: 50%;
  top: 95px;
  width: 198px;
  height: 38px;
  transform: translate(-50%, -50%);
  border-radius: 12px;
  background: rgba(44, 123, 242, 0.07);
  box-shadow: inset 0 0 0 1px rgba(44, 123, 242, 0.14);
  pointer-events: none;
}

.wheel-col {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.wheel {
  position: relative;
  width: 92px;
  height: 190px;
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  -webkit-mask-image: linear-gradient(180deg, transparent 0, #000 20%, #000 80%, transparent 100%);
  mask-image: linear-gradient(180deg, transparent 0, #000 20%, #000 80%, transparent 100%);
}
.wheel::-webkit-scrollbar {
  display: none;
}
.wheel-pad {
  height: 76px;
}
.wheel-item {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 38px;
  scroll-snap-align: center;
  font-size: 17px;
  font-weight: 500;
  color: var(--ink-4);
  font-variant-numeric: tabular-nums;
  transition: color 0.18s ease, font-size 0.18s ease, font-weight 0.18s ease;
}
.wheel-item.on {
  font-size: 21px;
  font-weight: 700;
  color: var(--ink-1);
  letter-spacing: 0.5px;
}

.wheel-colon {
  font-size: 20px;
  font-weight: 700;
  color: var(--ink-3);
  /* 抵消下面「时 / 分」标签的高度，让冒号跟数字居中对齐 */
  margin-bottom: 16px;
}

.wheel-unit {
  margin-top: 2px;
  font-size: 11.5px;
  font-weight: 500;
  color: var(--ink-4);
  letter-spacing: 1px;
}
</style>
