<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import DishAvatar from '../components/DishAvatar.vue'
import Stepper from '../components/Stepper.vue'
import EmptyState from '../components/EmptyState.vue'
import OptionSheet from '../components/OptionSheet.vue'
import TableSheet from '../components/TableSheet.vue'
import SubChips from '../components/SubChips.vue'
import { db, dishStats } from '../data/db'
import { navigate } from '../store/router'
import {
  addToCart,
  setCartQty,
  cartCount,
  cartCalories,
  dishQtyInCart,
  decrementDish,
  haptic,
  toast,
  ui
} from '../store/app'
import { mealCategoryByHour, daysAgoText } from '../lib/util'
import { resolveImage } from '../lib/image-store'

const activeCat = ref('')
// '' = 全部；'__none' = 没归到任何二级的菜
const activeSub = ref('')
const keyword = ref('')
const searching = ref(false)
const sheetDish = ref(null)
const lastLuckyId = ref('')
const showTable = ref(false)
// 'default' 按上架顺序 / 'freq' 常点 / 'recent' 最近吃过
const sortMode = ref('default')

const cats = computed(() => [...db.categories].sort((a, b) => a.sort - b.sort))
const availableDishes = computed(() => db.dishes.filter((d) => d.available))

// 当前这一餐的二级分类（加餐没有二级，这一条就整行不出现）
const subs = computed(() => {
  const c = cats.value.find((x) => x.name === activeCat.value)
  if (!c || !Array.isArray(c.subs)) return []
  return [...c.subs].sort((a, b) => a.sort - b.sort)
})

const noneCount = computed(() => {
  if (!subs.value.length) return 0
  return availableDishes.value.filter((d) => d.category === activeCat.value && !d.sub).length
})

// 换一餐就把二级重置，否则会停在上一次的「饮品」上，看起来像没菜
watch(activeCat, () => {
  activeSub.value = ''
})

function inSub(d) {
  if (!activeSub.value) return true
  if (activeSub.value === '__none') return !d.sub
  return d.sub === activeSub.value
}

const list = computed(() => {
  let arr = availableDishes.value
  if (activeCat.value) arr = arr.filter((d) => d.category === activeCat.value)
  arr = arr.filter(inSub)
  const kw = keyword.value.trim()
  if (kw) arr = arr.filter((d) => d.name.includes(kw) || d.description.includes(kw))
  return arr
})

/* ---- 常点 / 最近吃过 ---- */
const stats = computed(() => dishStats())

function statOf(id) {
  return stats.value[id] || null
}

function toggleSort(mode) {
  haptic()
  sortMode.value = sortMode.value === mode ? 'default' : mode
}

const sortedList = computed(() => {
  const arr = list.value.slice()
  if (sortMode.value === 'freq') {
    arr.sort((a, b) => {
      const sa = statOf(a.id)
      const sb = statOf(b.id)
      const qa = sa ? sa.qty : 0
      const qb = sb ? sb.qty : 0
      if (qa !== qb) return qb - qa
      return String(sb ? sb.lastAt : '').localeCompare(String(sa ? sa.lastAt : ''))
    })
  } else if (sortMode.value === 'recent') {
    arr.sort((a, b) => {
      const la = statOf(a.id) ? statOf(a.id).lastAt : ''
      const lb = statOf(b.id) ? statOf(b.id).lastAt : ''
      if (la === lb) return 0
      if (!la) return 1
      if (!lb) return -1
      return lb.localeCompare(la)
    })
  }
  return arr
})

function rowHint(d) {
  const s = statOf(d.id)
  if (!s) return ''
  if (sortMode.value === 'recent') return daysAgoText(s.lastAt) + '吃过'
  if (sortMode.value === 'freq') return '点过 ' + s.qty + ' 次'
  return s.qty >= 3 ? '点过 ' + s.qty + ' 次' : ''
}

/* ---- 今晚这桌 ---- */
const pool = computed(() => {
  let arr = availableDishes.value
  if (activeCat.value) arr = arr.filter((d) => d.category === activeCat.value)
  return arr.filter(inSub)
})

function openTable() {
  if (pool.value.length === 0) {
    toast(activeSub.value ? '这一栏还没有菜' : '菜单还是空的')
    return
  }
  haptic()
  showTable.value = true
}

function onTableOne() {
  showTable.value = false
  lucky()
}

function onTableAdded(n) {
  toast('已加入 ' + n + ' 道菜，去确认吧')
}

const count = computed(() => cartCount())
const calories = computed(() => cartCalories())

onMounted(() => {
  const def = mealCategoryByHour()
  activeCat.value = cats.value.some((c) => c.name === def) ? def : cats.value[0]?.name || ''
})

async function quickAdd(dish) {
  if (dish.options && dish.options.length > 0) {
    sheetDish.value = dish
    return
  }
  haptic()
  const url = dish.imageKey ? await resolveImage(dish.imageKey) : ''
  addToCart(dish, [], url)
  toast('已选「' + dish.name + '」')
}

async function onSheetConfirm({ options, qty }) {
  const dish = sheetDish.value
  sheetDish.value = null
  if (!dish) return
  haptic()
  const url = dish.imageKey ? await resolveImage(dish.imageKey) : ''
  const item = addToCart(dish, options, url)
  if (qty > 1) setCartQty(item.key, qty)
  toast('已选「' + dish.name + '」')
}

async function lucky() {
  const pool = availableDishes.value
  if (pool.length === 0) {
    toast('菜单还是空的')
    return
  }
  if (pool.length === 1) {
    quickAdd(pool[0])
    return
  }
  let pick = pool[Math.floor(Math.random() * pool.length)]
  let guard = 0
  while (pick.id === lastLuckyId.value && guard < 12) {
    pick = pool[Math.floor(Math.random() * pool.length)]
    guard++
  }
  lastLuckyId.value = pick.id
  haptic()
  if (pick.options && pick.options.length > 0) {
    sheetDish.value = pick
  } else {
    const url = pick.imageKey ? await resolveImage(pick.imageKey) : ''
    addToCart(pick, [], url)
    toast('今天就吃「' + pick.name + '」')
  }
}
</script>

<template>
  <div class="page">
    <!-- 玻璃顶栏 -->
    <header class="topbar">
      <div class="tb-row">
        <div class="tb-main">
          <div class="tb-name">{{ db.settings.name || '幸福小馆' }}</div>
          <div class="tb-notice">{{ db.settings.notice || '今天想吃点什么？' }}</div>
        </div>
        <button class="lucky press" @click="openTable">
          <AppIcon name="sparkles" :size="16" :stroke="1.8" />
          <span>今晚这桌</span>
        </button>
      </div>

      <div class="search-row">
        <div class="search" :class="{ on: searching }">
          <AppIcon name="search" :size="16" :stroke="2" />
          <input
            v-model="keyword"
            placeholder="搜菜名"
            @focus="searching = true"
            @blur="searching = false"
          />
          <button v-if="keyword" class="clear" @click="keyword = ''">
            <AppIcon name="close" :size="13" :stroke="2.4" />
          </button>
        </div>
      </div>

      <div class="chips cats" :class="{ 'has-sub': subs.length }">
        <button
          v-for="c in cats"
          :key="c.id"
          class="chip"
          :class="{ on: activeCat === c.name }"
          @click="activeCat = c.name"
        >
          {{ c.name }}
        </button>
      </div>

      <!-- 二级：早餐「饮品 / 餐点」、午晚餐「主食 / 菜品」，加餐没有 -->
      <div v-if="subs.length" class="sub-row">
        <SubChips v-model="activeSub" :subs="subs" :none-count="noneCount" />
      </div>
    </header>

    <!-- 列表 -->
    <div class="scroll list-scroll">
      <div class="page-pad">
        <div v-if="list.length === 0" class="card">
          <EmptyState icon="🍽️" title="这个分类还没有菜" hint="让主厨去「菜品管理」里加几道吧" />
        </div>

        <template v-else>
          <!-- 排序：点一下切换，再点回默认 -->
          <div class="list-bar">
            <span class="lb-count">{{ sortedList.length }} 道菜</span>
            <div class="lb-sorts">
              <button class="sbtn" :class="{ on: sortMode === 'freq' }" @click="toggleSort('freq')">
                常点
              </button>
              <button class="sbtn" :class="{ on: sortMode === 'recent' }" @click="toggleSort('recent')">
                最近
              </button>
            </div>
          </div>

          <div class="dishes">
            <div v-for="d in sortedList" :key="d.id" class="dish card press" @click="quickAdd(d)">
              <DishAvatar :image-key="d.imageKey" :emoji="d.emoji" :size="64" />
              <div class="dish-main">
                <div class="dish-title">
                  <span class="dish-name">{{ d.name }}</span>
                  <span v-if="rowHint(d)" class="stat-hint">{{ rowHint(d) }}</span>
                </div>
                <div v-if="d.description" class="dish-desc">{{ d.description }}</div>
                <div class="dish-meta">
                  <span v-if="d.calories > 0" class="cal">
                    <AppIcon name="fire" :size="11" :stroke="1.9" />{{ d.calories }} 千卡
                  </span>
                  <span v-if="d.options && d.options.length" class="opt-hint">可选规格</span>
                </div>
              </div>
              <div class="dish-act" @click.stop>
                <Stepper
                  v-if="dishQtyInCart(d.id) > 0"
                  :model-value="dishQtyInCart(d.id)"
                  :min="0"
                  @update:model-value="(v) => (v > dishQtyInCart(d.id) ? quickAdd(d) : decrementDish(d.id))"
                />
                <button v-else class="add-btn" @click="quickAdd(d)">
                  <AppIcon name="plus" :size="17" :stroke="2.4" />
                </button>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- 购物车栏 -->
    <Transition name="cart">
      <div v-if="count > 0" class="cartbar-wrap" :class="{ down: ui.dockHidden }">
        <button class="cartbar glass" @click="navigate('checkout')">
          <span class="cb-left">
            <span class="cb-badge">
              <AppIcon name="basket" :size="19" :stroke="1.9" />
              <span class="cb-count mono-num">{{ count }}</span>
            </span>
            <span class="cb-text">
              <span class="cb-title">已选 {{ count }} 份</span>
              <span class="cb-sub">{{ calories > 0 ? calories + ' 千卡' : '点击确认下单' }}</span>
            </span>
          </span>
          <span class="cb-go">去确认</span>
        </button>
      </div>
    </Transition>

    <OptionSheet :dish="sheetDish" @close="sheetDish = null" @confirm="onSheetConfirm" />

    <TableSheet
      :show="showTable"
      :pool="pool"
      :category="activeCat"
      @close="showTable = false"
      @one="onTableOne"
      @added="onTableAdded"
    />
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

/* ---- 顶栏 ---- */
.topbar {
  flex: 0 0 auto;
  padding: calc(var(--safe-top) + 10px) 0 0;
  background: rgba(240, 244, 249, 0.72);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  backdrop-filter: blur(24px) saturate(180%);
  box-shadow: 0 1px 0 rgba(18, 22, 27, 0.05);
  z-index: 30;
}

.tb-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 18px 10px;
}
.tb-main {
  flex: 1;
  min-width: 0;
}
.tb-name {
  font-size: 21px;
  font-weight: 750;
  letter-spacing: -0.5px;
  line-height: 1.2;
}
.tb-notice {
  font-size: 12.5px;
  color: var(--ink-3);
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lucky {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 34px;
  padding: 0 13px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 650;
  color: var(--accent-deep);
  background: rgba(255, 255, 255, 0.88);
  box-shadow: var(--highlight), 0 2px 8px -4px rgba(16, 24, 40, 0.16);
}

.search-row {
  padding: 0 18px 9px;
}
.search {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 13px;
  border-radius: 12px;
  color: var(--ink-3);
  background: rgba(255, 255, 255, 0.82);
  box-shadow: inset 0 0 0 1px rgba(18, 22, 27, 0.05);
  transition: box-shadow 0.2s ease, background 0.2s ease;
}
.search.on {
  background: #fff;
  box-shadow: inset 0 0 0 1.5px var(--accent), 0 0 0 4px rgba(44, 123, 242, 0.08);
}
.search input {
  flex: 1;
  min-width: 0;
  font-size: 14.5px;
}
.search input::placeholder {
  color: var(--ink-4);
}
.clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 19px;
  height: 19px;
  border-radius: 50%;
  color: #fff;
  background: var(--ink-4);
}

.cats {
  padding: 0 18px 11px;
}
/* 下面还有二级分类时，两级靠紧一点，看起来是一组 */
.cats.has-sub {
  padding-bottom: 6px;
}
.sub-row {
  padding: 0 18px 11px;
}

/* ---- 列表 ---- */
.list-scroll {
  padding-bottom: calc(var(--tabbar-h) + 112px + var(--safe-bottom));
}

.list-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 4px 2px 0;
}
.lb-count {
  font-size: 12.5px;
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
}
.lb-sorts {
  display: flex;
  gap: 6px;
}
.sbtn {
  height: 26px;
  padding: 0 11px;
  border-radius: var(--r-pill);
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-3);
  background: rgba(255, 255, 255, 0.7);
  box-shadow: inset 0 0 0 1px rgba(18, 22, 27, 0.04);
  transition: color 0.22s var(--ease-out), background 0.22s var(--ease-out),
    box-shadow 0.22s var(--ease-out);
}
.sbtn.on {
  color: var(--accent-deep);
  background: var(--accent-soft);
  box-shadow: inset 0 0 0 1px rgba(44, 123, 242, 0.24);
}
.sbtn:active {
  transform: scale(0.94);
}

.dishes {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 10px;
}

.dish {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 12px 14px;
}

.dish-main {
  flex: 1;
  min-width: 0;
  padding-right: 4px;
}
.dish-title {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.dish-name {
  min-width: 0;
  font-size: 16px;
  font-weight: 650;
  letter-spacing: -0.2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.stat-hint {
  flex: 0 0 auto;
  padding: 1px 6px;
  border-radius: 5px;
  font-size: 10.5px;
  font-weight: 600;
  color: var(--ink-3);
  background: rgba(18, 22, 27, 0.05);
  font-variant-numeric: tabular-nums;
}
.dish-desc {
  font-size: 12.5px;
  color: var(--ink-3);
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dish-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  height: 16px;
}
.cal {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11.5px;
  font-weight: 550;
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
}
.opt-hint {
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
  padding: 1px 7px;
  border-radius: 5px;
  background: var(--accent-soft);
}

.dish-act {
  flex: 0 0 auto;
}

.add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 999px;
  color: #fff;
  background: linear-gradient(168deg, #4d8df7, var(--accent));
  box-shadow: 0 5px 14px -6px var(--accent-glow);
  transition: transform 0.2s var(--ease-spring);
}
.add-btn:active {
  transform: scale(0.88);
}

/* ---- 购物车栏 ---- */
.cartbar-wrap {
  position: fixed;
  left: 0;
  right: 0;
  bottom: calc(var(--tabbar-h) + var(--safe-bottom) + 17px);
  padding: 0 15px;
  z-index: 55;
  transition: transform 0.34s var(--ease-out);
}
/* dock 收起时，购物车栏降到 dock 原来的位置，底部不会留一片空 */
.cartbar-wrap.down {
  transform: translate3d(0, calc(var(--tabbar-h) + 6px), 0);
}

.cartbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  height: 58px;
  padding: 0 8px 0 10px;
  border-radius: 999px;
  box-shadow: var(--highlight), 0 14px 32px -14px rgba(16, 24, 40, 0.32);
}
.cartbar:active {
  transform: scale(0.985);
}

.cb-left {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
}
.cb-badge {
  position: relative;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  color: #fff;
  background: linear-gradient(168deg, #4d8df7, var(--accent));
  box-shadow: 0 4px 12px -5px var(--accent-glow);
}
.cb-count {
  position: absolute;
  top: -3px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 750;
  line-height: 18px;
  text-align: center;
  color: #fff;
  background: var(--danger);
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.92);
}
.cb-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  text-align: left;
}
.cb-title {
  font-size: 14.5px;
  font-weight: 700;
  letter-spacing: -0.1px;
}
.cb-sub {
  font-size: 11.5px;
  color: var(--ink-3);
}
.cb-go {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  height: 42px;
  padding: 0 20px;
  border-radius: 999px;
  font-size: 14.5px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(168deg, #4d8df7, var(--accent-deep));
  box-shadow: 0 5px 16px -12px var(--accent-glow);
}

.cart-enter-active,
.cart-leave-active {
  transition: opacity 0.24s ease, transform 0.28s var(--ease-spring);
}
.cart-enter-from,
.cart-leave-to {
  opacity: 0;
  transform: translate3d(0, 16px, 0);
}

/* ---- 平板：顶栏与购物车栏跟正文同一列，横屏菜品改双列 ---- */
@media (min-width: 700px) {
  .tb-row,
  .search-row,
  .cats,
  .sub-row {
    width: 100%;
    max-width: var(--content-w);
    margin-inline: auto;
  }
  .tb-row {
    padding-inline: 26px;
  }
  .search-row {
    padding-inline: 26px;
  }
  .cats {
    padding-inline: 26px;
  }
  .sub-row {
    padding-inline: 26px;
  }
  /* 购物车栏底部是整宽的渐变遮罩，收窄的时候两侧要留出同样的边 */
  .cartbar-wrap {
    padding-inline: 26px;
  }
  .cartbar {
    max-width: var(--content-w);
    margin-inline: auto;
  }
  .list-scroll {
    padding-bottom: calc(var(--tabbar-h) + 118px + var(--safe-bottom));
  }
}

@media (min-width: 1000px) {
  /* 横屏一行放两道菜，卡片的横排结构正好撑得住 */
  .dishes {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 11px;
  }
  .dish {
    padding: 12px 13px;
    gap: 12px;
  }
}
</style>
