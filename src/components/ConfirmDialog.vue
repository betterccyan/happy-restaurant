<script setup>
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'
import { dialogState, settleDialog } from '../store/dialog'
import { haptic } from '../store/app'

const icon = computed(() => (dialogState.danger ? 'trash' : 'sparkles'))

function pick(ok) {
  haptic()
  settleDialog(ok)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="dlg">
      <div v-if="dialogState.show" class="dlg-wrap" @click.self="pick(false)">
        <div class="dlg" :class="{ danger: dialogState.danger }" role="alertdialog">
          <div class="dlg-icon">
            <AppIcon :name="icon" :size="21" :stroke="1.8" />
          </div>

          <div class="dlg-title">{{ dialogState.title }}</div>
          <div v-if="dialogState.message" class="dlg-msg">{{ dialogState.message }}</div>
          <div v-if="dialogState.hint" class="dlg-hint">{{ dialogState.hint }}</div>

          <div class="dlg-btns">
            <button class="dbtn" @click="pick(false)">{{ dialogState.cancelText }}</button>
            <button class="dbtn solid" @click="pick(true)">{{ dialogState.confirmText }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dlg-wrap {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 26px;
  background: rgba(16, 20, 26, 0.4);
  -webkit-backdrop-filter: blur(3px);
  backdrop-filter: blur(3px);
}

.dlg {
  width: 100%;
  max-width: 332px;
  padding: 24px 20px 16px;
  border-radius: 22px;
  text-align: center;
  background: #fdfefe;
  box-shadow: 0 26px 60px -24px rgba(16, 24, 40, 0.42),
    inset 0 0 0 0.5px rgba(255, 255, 255, 0.9);
}

/* 危险操作换成红色图标底，普通确认用蓝色，避免「删除」看起来像普通提示 */
.dlg-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  margin: 0 auto 13px;
  border-radius: 50%;
  color: var(--accent);
  background: var(--accent-soft);
  box-shadow: inset 0 0 0 1px rgba(44, 123, 242, 0.14);
}
.dlg.danger .dlg-icon {
  color: var(--danger);
  background: var(--danger-soft);
  box-shadow: inset 0 0 0 1px rgba(229, 72, 77, 0.16);
}

.dlg-title {
  font-size: 16.5px;
  font-weight: 650;
  line-height: 1.38;
  letter-spacing: -0.1px;
  color: var(--ink-1);
}

.dlg-msg {
  margin-top: 7px;
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--ink-3);
}

.dlg-hint {
  margin-top: 9px;
  padding: 8px 11px;
  border-radius: 10px;
  font-size: 12px;
  line-height: 1.45;
  color: var(--ink-3);
  background: rgba(18, 22, 27, 0.045);
}

.dlg-btns {
  display: flex;
  gap: 9px;
  margin-top: 20px;
}

.dbtn {
  flex: 1;
  height: 46px;
  border-radius: 14px;
  font-size: 15.5px;
  font-weight: 600;
  color: var(--ink-2);
  background: rgba(18, 22, 27, 0.055);
  transition: transform 0.2s var(--ease-spring), opacity 0.2s ease;
}
.dbtn:active {
  transform: scale(0.97);
}
.dbtn.solid {
  color: #fff;
  background: linear-gradient(168deg, #4d8df7, var(--accent));
  box-shadow: 0 6px 16px -8px var(--accent-glow);
}
.dlg.danger .dbtn.solid {
  background: linear-gradient(168deg, #f0656a, var(--danger));
  box-shadow: 0 6px 16px -8px rgba(229, 72, 77, 0.34);
}

/* 进出场 */
.dlg-enter-active,
.dlg-leave-active {
  transition: opacity 0.22s ease;
}
.dlg-enter-active .dlg,
.dlg-leave-active .dlg {
  transition: transform 0.28s var(--ease-spring), opacity 0.2s ease;
}
.dlg-enter-from,
.dlg-leave-to {
  opacity: 0;
}
.dlg-enter-from .dlg,
.dlg-leave-to .dlg {
  transform: scale(0.92);
  opacity: 0;
}
</style>
