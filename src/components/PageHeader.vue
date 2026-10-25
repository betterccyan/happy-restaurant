<script setup>
import AppIcon from './AppIcon.vue'
import { back, canGoBack } from '../store/router'

const props = defineProps({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  showBack: { type: Boolean, default: true },
  transparent: { type: Boolean, default: false }
})

function onBack() {
  if (!back()) {
    // 兜底：交给系统
    window.history.back()
  }
}
</script>

<template>
  <header class="ph" :class="{ clear: transparent }">
    <div class="ph-row">
      <button v-if="showBack && canGoBack()" class="ph-back press" @click="onBack">
        <AppIcon name="chevronLeft" :size="21" :stroke="2.1" />
      </button>
      <div class="ph-title">
        <div class="t">{{ title }}</div>
        <div v-if="subtitle" class="st">{{ subtitle }}</div>
      </div>
      <div class="ph-right">
        <slot name="right" />
      </div>
    </div>
  </header>
</template>

<style scoped>
.ph {
  position: sticky;
  top: 0;
  z-index: 40;
  background: rgba(240, 244, 249, 0.78);
  -webkit-backdrop-filter: blur(22px) saturate(170%);
  backdrop-filter: blur(22px) saturate(170%);
  border-bottom: 1px solid rgba(18, 22, 27, 0.05);
}
.ph.clear {
  background: transparent;
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
  border-bottom: none;
}

.ph-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 52px;
  padding: 6px 14px 6px 10px;
}

.ph-back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  border-radius: 999px;
  color: var(--ink-1);
  background: rgba(255, 255, 255, 0.82);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.9), 0 1px 3px rgba(16, 24, 40, 0.06);
}

.ph-title {
  flex: 1;
  min-width: 0;
  padding-left: 2px;
}
.ph-title .t {
  font-size: 17px;
  font-weight: 650;
  letter-spacing: -0.2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ph-title .st {
  font-size: 12px;
  color: var(--ink-3);
  margin-top: 1px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ph-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}

/* 宽屏：标题栏内容跟正文对齐，不会出现标题在左、正文居中的错位 */
@media (min-width: 700px) {
  .ph-row {
    width: 100%;
    max-width: var(--content-w);
    margin-inline: auto;
    min-height: 56px;
    padding: 6px 16px 6px 12px;
  }
}
</style>
