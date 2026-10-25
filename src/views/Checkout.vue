<script setup>
import { ref, computed, onMounted } from 'vue'
import PageHeader from '../components/PageHeader.vue'
import AppIcon from '../components/AppIcon.vue'
import DishAvatar from '../components/DishAvatar.vue'
import Stepper from '../components/Stepper.vue'
import TimeSheet from '../components/TimeSheet.vue'
import { db, createOrder } from '../data/db'
import { cart, setCartQty, removeFromCart, clearCart, haptic, toast, cartCount, cartCalories } from '../store/app'
import { back, resetTo } from '../store/router'

const memberName = ref(db.lastMemberName || db.profile.nickname || '')
const remark = ref('')
const expectTime = ref('')
const showTime = ref(false)
const submitting = ref(false)

const count = computed(() => cartCount())
const calories = computed(() => cartCalories())

onMounted(() => {
  if (cart.items.length === 0) {
    toast('还没选菜')
  }
})

const canSubmit = computed(() => cart.items.length > 0 && memberName.value.trim().length > 0)

function onPickTime(v) {
  expectTime.value = v
  showTime.value = false
  haptic()
}

function onClearTime() {
  expectTime.value = ''
  showTime.value = false
  toast('改成尽快开饭')
}

function submit() {
  if (!canSubmit.value || submitting.value) return
  submitting.value = true
  try {
    const order = createOrder({
      items: cart.items.map((it) => ({ ...it })),
      memberName: memberName.value,
      remark: remark.value,
      expectTime: expectTime.value
    })
    clearCart()
    haptic()
    toast('点菜已提交，等着开饭吧')
    resetTo('my-orders', { highlight: order.id })
  } catch (e) {
    toast(e.message || '提交失败')
    submitting.value = false
  }
}
</script>

<template>
  <div class="page">
    <PageHeader title="确认点菜" :subtitle="count + ' 份 · ' + (calories > 0 ? calories + ' 千卡' : '热量未标')" />

    <div class="scroll has-dock">
      <div class="page-pad">
        <!-- 点菜人 -->
        <div class="sec-title">
          <div class="h2">谁点的</div>
        </div>
        <div class="field">
          <span class="field-label">点菜人</span>
          <input v-model="memberName" placeholder="写个名字，主厨好知道是谁" maxlength="12" />
        </div>

        <!-- 已选 -->
        <div class="sec-title">
          <div class="h2">已选</div>
          <button v-if="cart.items.length" class="link" @click="clearCart(); toast('已清空')">清空</button>
        </div>

        <div v-if="cart.items.length === 0" class="card empty-mini">
          <div class="sub">还没选菜，返回菜单挑几道吧</div>
          <button class="btn btn-primary btn-sm" @click="back()">去点菜</button>
        </div>

        <div v-else class="list">
          <div v-for="it in cart.items" :key="it.key" class="citem">
            <DishAvatar :image-url="it.imageUrl" :emoji="it.emoji" :size="46" />
            <div class="citem-main">
              <div class="citem-name">{{ it.name }}</div>
              <div v-if="it.options && it.options.length" class="citem-opt">
                {{ it.options.map((g) => g.choices.map((c) => c.label).join('/')).join(' · ') }}
              </div>
              <div v-if="it.calories > 0" class="citem-cal">{{ it.calories }} 千卡 / 份</div>
            </div>
            <Stepper
              :model-value="it.qty"
              :min="0"
              size="sm"
              @update:model-value="(v) => setCartQty(it.key, v)"
            />
          </div>
        </div>

        <!-- 开饭时间 -->
        <div class="sec-title">
          <div class="h2">什么时候吃</div>
        </div>
        <div class="time-card card">
          <div class="time-row">
            <div class="time-main">
              <div class="time-label">
                <AppIcon name="clock" :size="15" :stroke="1.9" />
                期望开饭时间
              </div>
              <div class="time-sub">{{ expectTime ? '主厨会看着时间做' : '不选表示尽快开饭' }}</div>
            </div>
            <div class="time-act">
              <button class="time-btn" :class="{ set: !!expectTime }" @click="showTime = true">
                <span v-if="expectTime" class="time-val mono-num">{{ expectTime }}</span>
                <span v-else class="time-placeholder">选择</span>
                <AppIcon :name="expectTime ? 'edit' : 'chevronRight'" :size="13" :stroke="2.3" />
              </button>
              <button v-if="expectTime" class="time-clear" @click="expectTime = ''">
                <AppIcon name="close" :size="13" :stroke="2.4" />
              </button>
            </div>
          </div>
        </div>

        <!-- 备注 -->
        <div class="sec-title">
          <div class="h2">备注</div>
        </div>
        <div class="field field-col">
          <textarea
            v-model="remark"
            placeholder="少辣、多盛点饭、不要香菜…"
            maxlength="60"
            rows="2"
          ></textarea>
          <div class="counter">{{ remark.length }}/60</div>
        </div>
      </div>
    </div>

    <div class="dock">
      <div class="dock-info">
        <div class="dock-count mono-num">{{ count }} 份</div>
        <div class="dock-cal">{{ calories > 0 ? calories + ' 千卡' : '热量未标' }}</div>
      </div>
      <button class="btn btn-primary" :disabled="!canSubmit" @click="submit">提交点菜</button>
    </div>

    <TimeSheet
      v-if="showTime"
      :value="expectTime"
      @close="showTime = false"
      @pick="onPickTime"
      @clear="onClearTime"
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
.link {
  flex: 0 0 auto;
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
}

.empty-mini {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 22px 16px;
}

.citem {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  position: relative;
}
.citem + .citem::before {
  content: '';
  position: absolute;
  top: 0;
  left: 16px;
  right: 16px;
  height: 1px;
  background: var(--hairline);
}
.citem-main {
  flex: 1;
  min-width: 0;
}
.citem-name {
  font-size: 15px;
  font-weight: 600;
}
.citem-opt {
  font-size: 12px;
  color: var(--ink-3);
  margin-top: 1px;
}
.citem-cal {
  font-size: 11.5px;
  color: var(--ink-4);
  margin-top: 2px;
  font-variant-numeric: tabular-nums;
}

.time-card {
  padding: 15px 16px;
}
.time-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.time-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 600;
}
.time-sub {
  font-size: 12px;
  color: var(--ink-3);
  margin-top: 3px;
}
.time-act {
  display: flex;
  align-items: center;
  gap: 7px;
  flex: 0 0 auto;
}
/* 时间按钮：未选时是描边胶囊，选了之后变成实心的品牌色块 */
.time-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 13px;
  border-radius: var(--r-pill);
  font-size: 15px;
  font-weight: 650;
  color: var(--ink-3);
  background: rgba(18, 22, 27, 0.045);
  box-shadow: inset 0 0 0 1px rgba(18, 22, 27, 0.06);
  transition: transform 0.2s var(--ease-spring), background 0.2s ease, color 0.2s ease;
}
.time-btn:active {
  transform: scale(0.96);
}
.time-btn.set {
  color: var(--accent-deep);
  background: var(--accent-soft);
  box-shadow: inset 0 0 0 1.2px rgba(44, 123, 242, 0.26);
}
.time-val {
  letter-spacing: 0.2px;
}
.time-placeholder {
  font-weight: 600;
}
.time-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  color: var(--ink-3);
  background: rgba(18, 22, 27, 0.06);
  transition: transform 0.18s var(--ease-spring);
}
.time-clear:active {
  transform: scale(0.9);
}

.counter {
  text-align: right;
  font-size: 11px;
  color: var(--ink-4);
  margin-top: 4px;
}

.dock {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 18px calc(12px + var(--safe-bottom));
  background: rgba(251, 252, 254, 0.92);
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  border-top: 1px solid var(--hairline);
  z-index: 50;
}
.dock-info {
  flex: 1;
  min-width: 0;
}
.dock-count {
  font-size: 20px;
  font-weight: 750;
  letter-spacing: -0.5px;
  line-height: 1.15;
}
.dock-cal {
  font-size: 12px;
  color: var(--ink-3);
  margin-top: 1px;
}
.dock .btn {
  flex: 0 0 auto;
  min-width: 148px;
}
</style>
