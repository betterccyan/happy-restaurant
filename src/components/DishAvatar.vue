<script setup>
import { ref, watch, onMounted } from 'vue'
import { resolveImage } from '../lib/image-store'

const props = defineProps({
  imageKey: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  emoji: { type: String, default: '🍽️' },
  size: { type: Number, default: 56 },
  radius: { type: Number, default: 0 }
})

const url = ref(props.imageUrl || '')

async function load() {
  if (props.imageUrl) {
    url.value = props.imageUrl
    return
  }
  url.value = props.imageKey ? await resolveImage(props.imageKey) : ''
}

onMounted(load)
watch(() => [props.imageKey, props.imageUrl], load)
</script>

<template>
  <div
    class="avatar"
    :style="{
      width: size + 'px',
      height: size + 'px',
      borderRadius: radius ? radius + 'px' : Math.round(size * 0.3) + 'px',
      fontSize: Math.round(size * 0.46) + 'px'
    }"
  >
    <img v-if="url" :src="url" alt="" />
    <span v-else class="emo">{{ emoji }}</span>
  </div>
</template>

<style scoped>
.avatar {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: linear-gradient(150deg, #f3f7ff 0%, #e7eefb 100%);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.9);
}
.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.emo {
  line-height: 1;
  filter: saturate(1.05);
}
</style>
