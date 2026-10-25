<script setup>
import { ref, computed, watch } from 'vue'
import AppIcon from './AppIcon.vue'
import DishAvatar from './DishAvatar.vue'
import { preferredOptions } from '../data/db'
import { addToCart, haptic, toast } from '../store/app'
import { resolveImage } from '../lib/image-store'
import { defaultOptions, optionsText } from '../lib/options'

const props = defineProps({
  show: { type: Boolean, default: false },
  pool: { type: Array, default: () => [] },
  category: { type: String, default: '' }
})
const emit = defineEmits(['close', 'one', 'added'])

const count = ref(3)
const picks = ref([])
const adding = ref(false)

const maxCount = computed(() => Math.min(5, props.pool.length))
const totalCal = computed(() => picks.value.reduce((s, d) => s + (Number(d.calories) || 0), 0))

function shuffle(list) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function roll(n = count.value) {
  const pool = props.pool
  if (!pool.length) {
    picks.value = []
    return
  }
  const want = Math.max(1, Math.min(n, pool.length))
  picks.value = shuffle(pool).slice(0, want)
}

function reroll() {
  haptic()
  roll()
}

// 单道换：只从没被选中的菜里换，换完不会跟别的位置撞
function swapOne(index) {
  const used = new Set(picks.value.map((d) => d.id))
  const rest = props.pool.filter((d) => !used.has(d.id))
  if (!rest.length) {
    toast('没有别的菜可换了')
    return
  }
  haptic()
  const next = picks.value.slice()
  next[index] = rest[Math.floor(Math.random() * rest.length)]
  picks.value = next
}

// 这道菜上次点的规格，没有历史就退回第一个选项
function optHint(dish) {
  const last = preferredOptions(dish.id)
  if (last.length) return '上次：' + optionsText(last)
  return ''
}

// 副标题按可用宽度拼：分类已经写在弹窗标题里时就不再重复，免得窄屏被裁
function metaParts(dish) {
  const parts = []
  if (!props.category) parts.push(dish.category)
  if (dish.calories > 0) parts.push(dish.calories + ' 千卡')
  const hint = optHint(dish)
  if (hint) parts.push(hint)
  return parts
}

async function addAll() {
  if (adding.value || !picks.value.length) return
  adding.value = true
  try {
    let n = 0
    for (const dish of picks.value) {
      const chosen = preferredOptions(dish.id)
      const use = chosen.length ? chosen : defaultOptions(dish.options)
      const url = dish.imageKey ? await resolveImage(dish.imageKey) : ''
      addToCart(dish, use, url)
      n += 1
    }
    haptic()
    emit('added', n)
    emit('close')
  } finally {
    adding.value = false
  }
}

watch(
  () => props.show,
  (v) => {
    if (!v) return
    count.value = Math.max(1, Math.min(3, props.pool.length))
    roll(count.value)
  }
)

watch(count, (n) => {
  if (props.show) roll(n)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="mask" @click="emit('close')"></div>
    <div v-if="show" class="sheet">
      <div class="sheet-grabber"></div>

      <div class="sheet-head">
        <div class="head-main">
          <div class="h2">今晚这桌</div>
          <div class="tiny">
            {{ category ? '从「' + category + '」里挑' : '从全部菜里挑' }} · 不满意就换
          </div>
        </div>
        <button class="close" @click="emit('close')">
          <AppIcon name="close" :size="18" :stroke="2" />
        </button>
      </div>

      <div class="sheet-body">
        <div class="count-row">
          <span class="cr-label">几道菜</span>
          <div class="seg">
            <button
              v-for="n in maxCount"
              :key="n"
              class="seg-btn"
              :class="{ on: count === n }"
              @click="count = n"
            >
              {{ n }}
            </button>
          </div>
        </div>

        <div v-if="picks.length" class="picks">
          <div v-for="(d, i) in picks" :key="d.id" class="pick">
            <DishAvatar :image-key="d.imageKey" :emoji="d.emoji" :size="44" />
            <div class="pick-main">
              <div class="pick-name">{{ d.name }}</div>
              <div class="pick-meta">
                <template v-for="(part, pi) in metaParts(d)" :key="pi">
                  <span v-if="pi" class="dot"></span>
                  <span class="mpart">{{ part }}</span>
                </template>
              </div>
            </div>
            <button class="swap" @click="swapOne(i)">
              <AppIcon name="refresh" :size="13" :stroke="2" />
              换
            </button>
          </div>
        </div>

        <div v-else class="none">这道菜的分类里还没有可选的菜</div>

        <button class="reroll" @click="reroll">
          <AppIcon name="refresh" :size="15" :stroke="2" />
          换一换
        </button>
      </div>

      <div class="sheet-foot foot2">
        <button class="btn btn-ghost" @click="emit('one')">随便来一道</button>
        <button class="btn btn-primary" :disabled="!picks.length || adding" @click="addAll">
          就吃这桌<template v-if="totalCal > 0"> · {{ totalCal }} 千卡</template>
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.head-main {
  flex: 1;
  min-width: 0;
}
.close {
  flex: 0 0 auto;
  width: 30px;
  height: 30px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-3);
  background: rgba(18, 22, 27, 0.05);
}

.count-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 2px 0 14px;
}
.cr-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink-2);
}
.seg {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border-radius: var(--r-pill);
  background: rgba(18, 22, 27, 0.05);
}
.seg-btn {
  width: 34px;
  height: 30px;
  border-radius: var(--r-pill);
  font-size: 14px;
  font-weight: 600;
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
  transition: background 0.24s var(--ease-out), color 0.24s var(--ease-out),
    box-shadow 0.24s var(--ease-out);
}
.seg-btn.on {
  color: var(--accent-deep);
  background: #fff;
  box-shadow: 0 1px 3px rgba(16, 24, 40, 0.1), inset 0 0 0 1px rgba(44, 123, 242, 0.16);
}

.picks {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.pick {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--r-md);
  background: rgba(255, 255, 255, 0.78);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.9), 0 1px 2px rgba(16, 24, 40, 0.03);
  animation: pop 0.3s var(--ease-spring) both;
}
.pick-main {
  flex: 1;
  min-width: 0;
}
.pick-name {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.1px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pick-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 3px;
  font-size: 11.5px;
  color: var(--ink-3);
  overflow: hidden;
  white-space: nowrap;
}
.mpart:last-child {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dot {
  width: 2px;
  height: 2px;
  border-radius: 50%;
  background: var(--ink-4);
  flex: 0 0 auto;
}
.swap {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 30px;
  padding: 0 11px;
  border-radius: var(--r-pill);
  font-size: 12.5px;
  font-weight: 600;
  color: var(--accent);
  background: var(--accent-soft);
  transition: transform 0.2s var(--ease-spring);
}
.swap:active {
  transform: scale(0.93);
}

.none {
  padding: 22px 0;
  text-align: center;
  font-size: 13px;
  color: var(--ink-3);
}

.reroll {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  height: 42px;
  margin-top: 12px;
  border-radius: var(--r-md);
  font-size: 14px;
  font-weight: 600;
  color: var(--ink-2);
  background: rgba(18, 22, 27, 0.045);
  transition: transform 0.2s var(--ease-spring), background 0.2s ease;
}
.reroll:active {
  transform: scale(0.98);
  background: rgba(18, 22, 27, 0.075);
}

.foot2 {
  display: flex;
  gap: 10px;
}
.foot2 .btn {
  flex: 1;
  min-width: 0;
  padding: 0 12px;
  font-size: 15px;
}
.foot2 .btn-primary {
  flex: 1.5;
}
</style>
