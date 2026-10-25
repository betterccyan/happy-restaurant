/**
 * 二级分类筛选条。
 *
 * 视觉上要比一级分类「轻」：一级是白底胶囊 + 选中实心蓝，
 * 二级用小一号的字 + 选中浅蓝底深蓝字，两级摆在一起才不会打架。
 * 传进来的 subs 为空时自己渲染成空，父组件可以直接 v-if 也可以不管。
 */
<script setup>
const props = defineProps({
  subs: { type: Array, default: () => [] },
  modelValue: { type: String, default: '' },
  // 没有二级归属的菜有几道；0 时不显示「其他」
  noneCount: { type: Number, default: 0 }
})
const emit = defineEmits(['update:modelValue'])

// 再点一次已选中的，回到「全部」
function pick(name) {
  emit('update:modelValue', props.modelValue === name ? '' : name)
}
</script>

<template>
  <div v-if="subs.length" class="chips subs">
    <button class="schip" :class="{ on: !modelValue }" @click="pick('')">全部</button>
    <button
      v-for="s in subs"
      :key="s.id"
      class="schip"
      :class="{ on: modelValue === s.name }"
      @click="pick(s.name)"
    >
      {{ s.name }}
    </button>
    <button v-if="noneCount > 0" class="schip other" :class="{ on: modelValue === '__none' }" @click="pick('__none')">
      其他<span class="num">{{ noneCount }}</span>
    </button>
  </div>
</template>

<style scoped>
.chips {
  gap: 6px;
  padding: 2px 0;
}
.schip {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 27px;
  padding: 0 11px;
  border-radius: var(--r-pill);
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink-3);
  background: rgba(255, 255, 255, 0.5);
  box-shadow: inset 0 0 0 1px rgba(18, 22, 27, 0.045);
  transition: color 0.2s var(--ease-out), background 0.2s var(--ease-out),
    box-shadow 0.2s var(--ease-out), transform 0.2s var(--ease-spring);
  white-space: nowrap;
}
.schip:active {
  transform: scale(0.94);
}
.schip.on {
  color: var(--accent-deep);
  background: var(--accent-soft);
  box-shadow: inset 0 0 0 1px rgba(44, 123, 242, 0.26);
}
/* 「其他」是兜底，用虚线边框表示它不是正经分类 */
.schip.other {
  box-shadow: inset 0 0 0 1px rgba(18, 22, 27, 0.045);
  border: 1px dashed rgba(18, 22, 27, 0.16);
  background: transparent;
}
.num {
  font-size: 10.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  opacity: 0.72;
}
</style>
