<script setup>
import { ref, computed } from 'vue'
import PageHeader from '../components/PageHeader.vue'
import AppIcon from '../components/AppIcon.vue'
import EmptyState from '../components/EmptyState.vue'
import { db, listCategories, createCategory, renameCategory, deleteCategory } from '../data/db'
import { haptic, toast } from '../store/app'
import { ask } from '../store/dialog'

const newName = ref('')
const editingId = ref('')
const editingName = ref('')

const cats = computed(() =>
  listCategories().map((c) => ({
    ...c,
    count: db.dishes.filter((d) => d.category === c.name).length
  }))
)

function add() {
  const n = newName.value.trim()
  if (!n) return
  try {
    createCategory(n)
    newName.value = ''
    haptic()
    toast('已添加「' + n + '」')
  } catch (e) {
    toast(e.message)
  }
}

function startEdit(c) {
  editingId.value = c.id
  editingName.value = c.name
}

function saveEdit() {
  const n = editingName.value.trim()
  if (!n) {
    editingId.value = ''
    return
  }
  try {
    renameCategory(editingId.value, n)
    haptic()
    toast('已改名，菜品跟着走')
  } catch (e) {
    toast(e.message)
  }
  editingId.value = ''
}

async function remove(c) {
  if (c.count > 0) {
    toast('「' + c.name + '」下还有 ' + c.count + ' 道菜')
    return
  }
  const ok = await ask({
    title: '删除分类「' + c.name + '」？',
    message: '这餐下的菜不会被删，但要重新归类。',
    confirmText: '删除',
    danger: true
  })
  if (!ok) return
  try {
    deleteCategory(c.id)
    toast('已删除')
  } catch (e) {
    toast(e.message)
  }
}
</script>

<template>
  <div class="page">
    <PageHeader title="分类管理" subtitle="分类就是餐次，决定菜品归到哪一栏" />

    <div class="scroll">
      <div class="page-pad">
        <div class="add-row">
          <div class="field">
            <AppIcon name="plus" :size="16" :stroke="2.2" class="add-ico" />
            <input v-model="newName" placeholder="新分类名，如 夜宵" maxlength="10" @keyup.enter="add" />
          </div>
          <button class="btn btn-primary btn-sm" :disabled="!newName.trim()" @click="add">添加</button>
        </div>

        <div class="sec-title">
          <div class="h2">现有分类</div>
          <span class="tiny">{{ cats.length }} 个</span>
        </div>

        <div v-if="cats.length === 0" class="card">
          <EmptyState icon="🗂️" title="还没有分类" hint="先加一个「中晚餐」开始吧" />
        </div>

        <div v-else class="list">
          <div v-for="c in cats" :key="c.id" class="row">
            <div v-if="editingId === c.id" class="edit-wrap">
              <input
                v-model="editingName"
                class="edit-input"
                maxlength="10"
                @keyup.enter="saveEdit"
                @blur="saveEdit"
              />
              <button class="mini-ok" @click="saveEdit">好</button>
            </div>

            <template v-else>
              <div class="row-main" @click="startEdit(c)">
                <div class="row-title">{{ c.name }}</div>
                <div class="row-desc">{{ c.count }} 道菜</div>
              </div>
              <button class="mini-act" @click="startEdit(c)">
                <AppIcon name="edit" :size="15" :stroke="1.9" />
              </button>
              <button class="mini-act danger" @click="remove(c)">
                <AppIcon name="trash" :size="15" :stroke="1.9" />
              </button>
            </template>
          </div>
        </div>

        <div class="foot-note">
          改名会自动把该分类下的菜品一起改过去 · 有菜的分类不能删
        </div>
      </div>
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

.add-row {
  display: flex;
  gap: 9px;
  margin-top: 6px;
}
.add-row .field {
  flex: 1;
}
.add-ico {
  color: var(--ink-4);
  flex: 0 0 auto;
}

.edit-wrap {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
}
.edit-input {
  flex: 1;
  min-width: 0;
  height: 38px;
  padding: 0 12px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  background: #fff;
  box-shadow: inset 0 0 0 1.5px var(--accent);
}
.mini-ok {
  flex: 0 0 auto;
  height: 32px;
  padding: 0 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 650;
  color: #fff;
  background: linear-gradient(168deg, #4d8df7, var(--accent));
}

.mini-act {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  color: var(--ink-2);
  background: rgba(18, 22, 27, 0.045);
}
.mini-act.danger {
  color: var(--danger);
  background: var(--danger-soft);
}

.foot-note {
  margin: 18px 4px 0;
  font-size: 11.5px;
  color: var(--ink-4);
  line-height: 1.5;
  text-align: center;
}
</style>
