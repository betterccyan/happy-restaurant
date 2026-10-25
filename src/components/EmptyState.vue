<script setup>
defineProps({
  icon: { type: String, default: '🍽️' },
  title: { type: String, default: '' },
  hint: { type: String, default: '' }
})
</script>

<template>
  <div class="empty anim-pop">
    <div class="empty-icon">{{ icon }}</div>
    <div class="empty-text">{{ title }}</div>
    <div v-if="hint" class="empty-hint">{{ hint }}</div>
    <slot />
  </div>
</template>
