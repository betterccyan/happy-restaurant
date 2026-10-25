<script setup>
import { ref, computed } from 'vue'
import PageHeader from '../components/PageHeader.vue'
import AppIcon from '../components/AppIcon.vue'
import DishAvatar from '../components/DishAvatar.vue'
import EmptyState from '../components/EmptyState.vue'
import { db, toggleDishAvailable } from '../data/db'
import { navigate } from '../store/router'
import { haptic, toast } from '../store/app'

const keyword = ref('')
const cat = ref('')
const onlyHidden = ref(false)

const cats = computed(() => [...db.categories].sort((a, b) => a.sort - b.sort))

const list = computed(() => {
  let arr = [...db.dishes].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
  if (cat.value) arr = arr.filter((d) => d.category === cat.value)
  if (onlyHidden.value) arr = arr.filter((d) => !d.available)
  const kw = keyword.value.trim()
  if (kw) arr = arr.filter((d) => d.name.includes(kw))
  return arr
})

const hiddenCount = computed(() => db.dishes.filter((d) => !d.available).length)

function toggle(dish) {
  haptic()
  toggleDishAvailable(dish.id)
  // dish.available 此时已是切换后的新值，提示语要跟着新状态说
  toast(dish.available ? '已上架，家人能看到' : '已下架，家人看不到')
}

function create() {
  navigate('dish-edit', { id: '' })
}

function edit(dish) {
  navigate('dish-edit', { id: dish.id })
}
</script>

<template>
  <div class="page">
    <PageHeader title="菜品管理" :subtitle="db.dishes.length + ' 道菜 · ' + hiddenCount + ' 道已下架'" :show-back="false">
      <template #right>
        <button class="add-top press" @click="create">
          <AppIcon name="plus" :size="18" :stroke="2.4" />
        </button>
      </template>
    </PageHeader>

    <div class="bar">
      <div class="search">
        <AppIcon name="search" :size="16" :stroke="2" />
        <input v-model="keyword" placeholder="搜菜名" />
        <button v-if="keyword" class="clear" @click="keyword = ''">
          <AppIcon name="close" :size="12" :stroke="2.4" />
        </button>
      </div>
      <button class="filter-btn" :class="{ on: onlyHidden }" @click="onlyHidden = !onlyHidden">
        <AppIcon name="eyeOff" :size="16" :stroke="1.9" />
        只看下架
      </button>
    </div>

    <div class="cats">
      <div class="chips">
        <button class="chip" :class="{ on: cat === '' }" @click="cat = ''">全部</button>
        <button
          v-for="c in cats"
          :key="c.id"
          class="chip"
          :class="{ on: cat === c.name }"
          @click="cat = c.name"
        >
          {{ c.name }}
        </button>
      </div>
    </div>

    <div class="scroll has-tabbar">
      <div class="page-pad">
        <div v-if="list.length === 0" class="card">
          <EmptyState
            :icon="onlyHidden ? '✅' : '📖'"
            :title="onlyHidden ? '没有下架的菜' : '没有匹配的菜品'"
            :hint="onlyHidden ? '所有菜都在正常售卖，家人都能看到' : '换个关键词，或者点右上角加一道新菜'"
          >
            <button v-if="onlyHidden" class="btn btn-sm" @click="onlyHidden = false">看全部菜品</button>
            <button v-else class="btn btn-primary btn-sm" @click="create">新增菜品</button>
          </EmptyState>
        </div>

        <div v-else class="list">
          <div v-for="d in list" :key="d.id" class="row" @click="edit(d)">
            <DishAvatar :image-key="d.imageKey" :emoji="d.emoji" :size="48" />
            <div class="row-main">
              <div class="row-title" :class="{ off: !d.available }">{{ d.name }}</div>
              <div class="row-desc">
                {{ d.category }}
                <template v-if="d.calories > 0"> · {{ d.calories }} 千卡</template>
                <template v-if="d.ingredients"> · {{ d.ingredients.split('\n').filter(Boolean).length }} 种食材</template>
              </div>
            </div>
            <button class="switch" :class="{ on: d.available }" @click.stop="toggle(d)">
              <span class="knob"></span>
            </button>
            <AppIcon name="chevronRight" :size="17" :stroke="2" class="row-arrow" />
          </div>
        </div>
      </div>
    </div>

    <div class="fab-wrap">
      <button class="fab press" @click="create">
        <AppIcon name="plus" :size="19" :stroke="2.4" />
        <span>新增菜品</span>
      </button>
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

.add-top {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 999px;
  color: #fff;
  background: linear-gradient(168deg, #4d8df7, var(--accent));
  box-shadow: 0 5px 14px -6px var(--accent-glow);
}

.bar {
  display: flex;
  gap: 9px;
  padding: 11px 18px 0;
}
.search {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 13px;
  border-radius: 12px;
  color: var(--ink-3);
  background: rgba(255, 255, 255, 0.85);
  box-shadow: inset 0 0 0 1px rgba(18, 22, 27, 0.05);
}
.search input {
  flex: 1;
  min-width: 0;
  font-size: 14.5px;
}
.clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  color: #fff;
  background: var(--ink-4);
}

.filter-btn {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 38px;
  padding: 0 12px;
  border-radius: 12px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink-2);
  background: rgba(255, 255, 255, 0.85);
  box-shadow: inset 0 0 0 1px rgba(18, 22, 27, 0.05);
  transition: color 0.2s ease, background 0.2s ease;
}
.filter-btn.on {
  color: var(--accent-deep);
  background: var(--accent-soft);
  box-shadow: inset 0 0 0 1px rgba(44, 123, 242, 0.3);
}

.cats {
  padding: 10px 18px 11px;
}

.row-title.off {
  color: var(--ink-3);
  text-decoration: line-through;
  text-decoration-color: rgba(18, 22, 27, 0.22);
}

/* 这一页一行要塞下「开关 + 箭头」，360dp 屏上正文会被挤掉 6px，
   收一收间距把描述行让出来 */
.row {
  gap: 10px;
  padding-right: 13px;
}

.switch {
  flex: 0 0 auto;
  position: relative;
  width: 44px;
  height: 27px;
  border-radius: 999px;
  background: rgba(18, 22, 27, 0.13);
  transition: background 0.28s var(--ease-out);
}
.switch.on {
  background: linear-gradient(168deg, #5c98f8, var(--accent));
}
.knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 21px;
  height: 21px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(16, 24, 40, 0.24);
  transition: transform 0.28s var(--ease-spring);
}
.switch.on .knob {
  transform: translateX(17px);
}

.fab-wrap {
  position: fixed;
  left: 0;
  right: 0;
  bottom: calc(var(--tabbar-h) + var(--safe-bottom) + 17px);
  display: flex;
  justify-content: center;
  z-index: 55;
  pointer-events: none;
}
.fab {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 46px;
  padding: 0 22px;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 650;
  color: #fff;
  background: linear-gradient(168deg, #4d8df7, var(--accent-deep));
  box-shadow: 0 10px 26px -12px rgba(26, 95, 208, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.26);
}

/* 给 fab 留空间 */
.has-tabbar {
  padding-bottom: calc(var(--tabbar-h) + 100px + var(--safe-bottom));
}
</style>
