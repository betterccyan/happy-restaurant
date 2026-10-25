<script setup>
import { ref, computed, onMounted } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import DishAvatar from '../components/DishAvatar.vue'
import Stepper from '../components/Stepper.vue'
import EmptyState from '../components/EmptyState.vue'
import OptionSheet from '../components/OptionSheet.vue'
import { db } from '../data/db'
import { navigate } from '../store/router'
import {
  addToCart,
  setCartQty,
  cartCount,
  cartCalories,
  dishQtyInCart,
  decrementDish,
  haptic,
  toast
} from '../store/app'
import { mealCategoryByHour } from '../lib/util'
import { resolveImage } from '../lib/image-store'

const activeCat = ref('')
const keyword = ref('')
const searching = ref(false)
const sheetDish = ref(null)
const lastLuckyId = ref('')

const cats = computed(() => [...db.categories].sort((a, b) => a.sort - b.sort))
const availableDishes = computed(() => db.dishes.filter((d) => d.available))

const list = computed(() => {
  let arr = availableDishes.value
  if (activeCat.value) arr = arr.filter((d) => d.category === activeCat.value)
  const kw = keyword.value.trim()
  if (kw) arr = arr.filter((d) => d.name.includes(kw) || d.description.includes(kw))
  return arr
})

const count = computed(() => cartCount())
const calories = computed(() => cartCalories())

const cartPreview = computed(() => {
  // 按加入顺序取名字
  return ''
})

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
        <button class="lucky press" @click="lucky">
          <AppIcon name="sparkles" :size="16" :stroke="1.8" />
          <span>随机</span>
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

      <div class="chips cats">
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
    </header>

    <!-- 列表 -->
    <div class="scroll list-scroll">
      <div class="page-pad">
        <div v-if="list.length === 0" class="card">
          <EmptyState icon="🍽️" title="这个分类还没有菜" hint="让主厨去「菜品管理」里加几道吧" />
        </div>

        <div v-else class="dishes">
          <div v-for="d in list" :key="d.id" class="dish card press" @click="quickAdd(d)">
            <DishAvatar :image-key="d.imageKey" :emoji="d.emoji" :size="64" />
            <div class="dish-main">
              <div class="dish-name">{{ d.name }}</div>
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
      </div>
    </div>

    <!-- 购物车栏 -->
    <Transition name="cart">
      <div v-if="count > 0" class="cartbar-wrap">
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

/* ---- 列表 ---- */
.list-scroll {
  padding-bottom: calc(var(--tabbar-h) + 112px + var(--safe-bottom));
}

.dishes {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 4px;
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
.dish-name {
  font-size: 16px;
  font-weight: 650;
  letter-spacing: -0.2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
</style>
