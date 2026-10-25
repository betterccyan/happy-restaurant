<script setup>
import { ref, computed, watch } from 'vue'
import AppIcon from './AppIcon.vue'
import DishAvatar from './DishAvatar.vue'
import { normalizeOptions, collectSelected, missingRequired } from '../lib/options'
import { haptic } from '../store/app'

const props = defineProps({
  dish: { type: Object, default: null }
})
const emit = defineEmits(['close', 'confirm'])

const groups = ref([])
const qty = ref(1)

watch(
  () => props.dish,
  (dish) => {
    if (!dish) return
    qty.value = 1
    // 单选组默认选项：不自动选中，要求用户明确选择
    groups.value = normalizeOptions(dish.options).map((g) => ({
      ...g,
      choices: g.choices.map((c) => ({ ...c, selected: false }))
    }))
  },
  { immediate: true }
)

const hasOptions = computed(() => groups.value.length > 0)

function toggle(group, choice) {
  haptic()
  if (group.multi) {
    choice.selected = !choice.selected
  } else {
    const willSelect = !choice.selected
    group.choices.forEach((c) => {
      c.selected = false
    })
    choice.selected = willSelect
  }
}

const canConfirm = computed(() => !missingRequired(groups.value))

function confirm() {
  if (!canConfirm.value) return
  emit('confirm', { options: collectSelected(groups.value), qty: qty.value })
}
</script>

<template>
  <Teleport to="body">
    <div v-if="dish" class="mask" @click="emit('close')"></div>
    <div v-if="dish" class="sheet">
    <div class="sheet-grabber"></div>

    <div class="head">
      <DishAvatar :image-key="dish.imageKey" :emoji="dish.emoji" :size="62" />
      <div class="head-main">
        <div class="h3">{{ dish.name }}</div>
        <div v-if="dish.description" class="sub">{{ dish.description }}</div>
        <div v-if="dish.calories > 0" class="cal">
          <AppIcon name="fire" :size="12" :stroke="1.8" />
          <span class="mono-num">{{ dish.calories }}</span> 千卡 / 份
        </div>
      </div>
      <button class="close" @click="emit('close')">
        <AppIcon name="close" :size="18" :stroke="2" />
      </button>
    </div>

    <div class="sheet-body">
      <div v-for="(g, gi) in groups" :key="gi" class="group">
        <div class="group-head">
          <span class="gname">{{ g.name }}</span>
          <span class="gmeta">{{ g.multi ? '可多选' : '单选' }}{{ g.required ? ' · 必选' : '' }}</span>
        </div>
        <div class="opts">
          <button
            v-for="(c, ci) in g.choices"
            :key="ci"
            class="opt"
            :class="{ on: c.selected }"
            @click="toggle(g, c)"
          >
            <AppIcon v-if="c.selected" name="check" :size="12" :stroke="3" />
            {{ c.label }}
          </button>
        </div>
      </div>

      <div class="qty-row">
        <div>
          <div class="h3">份数</div>
          <div class="tiny">同一规格合并计算</div>
        </div>
        <div class="qty-ctrl">
          <button class="qbtn" :disabled="qty <= 1" @click="qty = Math.max(1, qty - 1)">
            <AppIcon name="minus" :size="14" :stroke="2.2" />
          </button>
          <span class="qval mono-num">{{ qty }}</span>
          <button class="qbtn plus" :disabled="qty >= 20" @click="qty = Math.min(20, qty + 1)">
            <AppIcon name="plus" :size="14" :stroke="2.2" />
          </button>
        </div>
      </div>
    </div>

    <div class="sheet-foot">
      <button class="btn btn-primary btn-block" :disabled="!canConfirm" @click="confirm">
        {{ canConfirm ? (hasOptions ? '加入已选' : '加入已选') : '请选择必选项' }}
      </button>
    </div>
    </div>
  </Teleport>
</template>

<style scoped>
.head {
  display: flex;
  align-items: flex-start;
  gap: 13px;
  padding: 6px 20px 14px;
  flex: 0 0 auto;
}
.head-main {
  flex: 1;
  min-width: 0;
  padding-top: 2px;
}
.cal {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  font-size: 12px;
  color: var(--ink-3);
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

.group {
  padding: 4px 0 14px;
}
.group + .group {
  border-top: 1px solid var(--hairline);
  padding-top: 14px;
}
.group-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 10px;
}
.gname {
  font-size: 15px;
  font-weight: 650;
}
.gmeta {
  font-size: 11.5px;
  color: var(--ink-4);
}
.opts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.opt {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 38px;
  padding: 0 15px;
  border-radius: var(--r-pill);
  font-size: 14px;
  font-weight: 550;
  color: var(--ink-2);
  background: rgba(18, 22, 27, 0.045);
  transition: transform 0.2s var(--ease-spring), background 0.2s ease, color 0.2s ease;
}
.opt:active {
  transform: scale(0.95);
}
.opt.on {
  color: var(--accent-deep);
  font-weight: 650;
  background: var(--accent-soft);
  box-shadow: inset 0 0 0 1.5px rgba(44, 123, 242, 0.42);
}

.qty-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 15px 0 6px;
  border-top: 1px solid var(--hairline);
}
.qty-ctrl {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px;
  border-radius: 999px;
  background: rgba(18, 22, 27, 0.05);
}
.qbtn {
  width: 31px;
  height: 31px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-2);
  background: #fff;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.08);
}
.qbtn:active {
  transform: scale(0.9);
}
.qbtn[disabled] {
  opacity: 0.35;
}
.qbtn.plus {
  color: #fff;
  background: linear-gradient(168deg, #4d8df7, var(--accent));
}
.qval {
  min-width: 30px;
  text-align: center;
  font-size: 16px;
  font-weight: 700;
}
</style>
