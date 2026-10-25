<script setup>
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'
import { haptic } from '../store/app'

const props = defineProps({
  modelValue: { type: Number, default: 1 },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 99 },
  size: { type: String, default: 'md' } // md | sm
})
const emit = defineEmits(['update:modelValue'])

const canMinus = computed(() => props.modelValue > props.min)
const canPlus = computed(() => props.modelValue < props.max)

function change(delta) {
  const next = props.modelValue + delta
  if (next < props.min || next > props.max) return
  haptic()
  emit('update:modelValue', next)
}
</script>

<template>
  <div class="stepper" :class="size">
    <button class="s-btn" :disabled="!canMinus" @click.stop="change(-1)">
      <AppIcon name="minus" :size="size === 'sm' ? 13 : 15" :stroke="2.2" />
    </button>
    <span class="s-val mono-num">{{ modelValue }}</span>
    <button class="s-btn plus" :disabled="!canPlus" @click.stop="change(1)">
      <AppIcon name="plus" :size="size === 'sm' ? 13 : 15" :stroke="2.2" />
    </button>
  </div>
</template>

<style scoped>
.stepper {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  border-radius: 999px;
  background: rgba(18, 22, 27, 0.045);
  padding: 3px;
  flex: 0 0 auto;
}

.s-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 27px;
  height: 27px;
  border-radius: 999px;
  color: var(--ink-2);
  background: #fff;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.07);
  transition: transform 0.2s var(--ease-spring), opacity 0.2s ease;
}
.s-btn:active {
  transform: scale(0.88);
}
.s-btn[disabled] {
  opacity: 0.34;
  box-shadow: none;
  background: rgba(255, 255, 255, 0.6);
}
.s-btn.plus {
  color: #fff;
  background: linear-gradient(168deg, #4d8df7, var(--accent));
  box-shadow: 0 3px 10px -4px var(--accent-glow);
}

.s-val {
  min-width: 22px;
  text-align: center;
  font-size: 14.5px;
  font-weight: 650;
}

.sm .s-btn {
  width: 23px;
  height: 23px;
}
.sm .s-val {
  min-width: 18px;
  font-size: 13px;
}
</style>
