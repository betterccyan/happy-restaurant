<script setup>
import { ref, computed, nextTick } from 'vue'
import PageHeader from '../components/PageHeader.vue'
import AppIcon from '../components/AppIcon.vue'
import EmptyState from '../components/EmptyState.vue'
import {
  db,
  listCategories,
  createCategory,
  renameCategory,
  deleteCategory,
  createSub,
  renameSub,
  deleteSub
} from '../data/db'
import { haptic, toast } from '../store/app'
import { ask } from '../store/dialog'

const newName = ref('')
const editingId = ref('')
const editingName = ref('')

// 二级的编辑态：{ catId, subId }，subId 为空表示正在新增
const subEdit = ref(null)
const subName = ref('')
// 二级输入框在 v-for 里，用 ref 字符串会收成数组，所以手动接一下
let subInputEl = null
function setSubInput(el) {
  subInputEl = el
}

const cats = computed(() =>
  listCategories().map((c) => {
    const subs = [...(c.subs || [])].sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name))
    return {
      ...c,
      count: db.dishes.filter((d) => d.category === c.name).length,
      subs: subs.map((s) => ({
        ...s,
        count: db.dishes.filter((d) => d.category === c.name && d.sub === s.name).length
      })),
      // 没归到任何二级的菜，删二级时提醒用
      loose: db.dishes.filter((d) => d.category === c.name && !d.sub).length
    }
  })
)

function add() {
  const n = newName.value.trim()
  if (!n) return
  try {
    createCategory(n)
    newName.value = ''
    haptic()
    toast('已添加「' + n + '」，可以再给它加二级')
  } catch (e) {
    toast(e.message)
  }
}

/* --------- 一级 --------- */
function startEdit(c) {
  subEdit.value = null
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
    message: c.subs.length
      ? '这餐下的 ' + c.subs.length + ' 个二级分类会一起删掉，菜不会删但要重新归类。'
      : '这餐下的菜不会被删，但要重新归类。',
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

/* --------- 二级 --------- */
async function openSub(c, s) {
  editingId.value = ''
  subEdit.value = { catId: c.id, subId: s ? s.id : '' }
  subName.value = s ? s.name : ''
  await nextTick()
  subInputEl?.focus()
  subInputEl?.select()
}

function saveSub() {
  const e = subEdit.value
  if (!e) return
  const n = subName.value.trim()
  if (!n) {
    subEdit.value = null
    return
  }
  try {
    if (e.subId) {
      renameSub(e.catId, e.subId, n)
      haptic()
      toast('改名完成，菜品跟着走')
    } else {
      createSub(e.catId, n)
      haptic()
      toast('已添加「' + n + '」')
    }
  } catch (err) {
    toast(err.message)
  }
  subEdit.value = null
}

// 失焦不立刻保存：否则点「删除」时 blur 先把编辑态关掉，按钮就点不到了
function onSubBlur() {
  setTimeout(() => {
    if (subEdit.value) saveSub()
  }, 140)
}

async function removeSub(c) {
  const id = subEdit.value?.subId
  const s = c.subs.find((x) => x.id === id)
  subEdit.value = null
  if (!s) return
  const ok = await ask({
    title: '删除二级分类「' + s.name + '」？',
    message: s.count
      ? '这 ' + s.count + ' 道菜不会删，会落到「其他」里。'
      : '这一栏还没有菜。',
    confirmText: '删除',
    danger: true
  })
  if (!ok) return
  deleteSub(c.id, s.id)
  haptic()
  toast('已删除')
}
</script>

<template>
  <div class="page">
    <PageHeader title="分类管理" subtitle="一级是餐次，二级是这一餐里的细分" />

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

        <div v-else class="cat-list">
          <div v-for="c in cats" :key="c.id" class="card cat">
            <!-- 一级 -->
            <div class="cat-head">
              <template v-if="editingId === c.id">
                <input
                  v-model="editingName"
                  class="edit-input"
                  maxlength="10"
                  @keyup.enter="saveEdit"
                  @blur="saveEdit"
                />
                <button class="mini-ok" @click="saveEdit">好</button>
              </template>

              <template v-else>
                <div class="cat-name">{{ c.name }}</div>
                <span class="cat-count">{{ c.count }} 道菜</span>
                <button class="mini-act" @click="startEdit(c)">
                  <AppIcon name="edit" :size="15" :stroke="1.9" />
                </button>
                <button class="mini-act danger" @click="remove(c)">
                  <AppIcon name="trash" :size="15" :stroke="1.9" />
                </button>
              </template>
            </div>

            <!-- 二级 -->
            <div class="cat-subs">
              <span class="sub-label">二级</span>
              <button
                v-for="s in c.subs"
                :key="s.id"
                class="sub-chip"
                :class="{ on: subEdit && subEdit.subId === s.id }"
                @click="openSub(c, s)"
              >
                {{ s.name }}<span class="sc-num">{{ s.count }}</span>
              </button>
              <span v-if="!c.subs.length" class="sub-none">不分二级</span>
              <button class="sub-add" @click="openSub(c, null)">
                <AppIcon name="plus" :size="13" :stroke="2.6" />
              </button>
            </div>

            <div v-if="subEdit && subEdit.catId === c.id" class="sub-edit">
              <input
                :ref="setSubInput"
                v-model="subName"
                class="edit-input"
                maxlength="10"
                :placeholder="subEdit.subId ? '二级名' : '二级名，如 饮品'"
                @keyup.enter="saveSub"
                @blur="onSubBlur"
              />
              <button class="mini-ok" @click="saveSub">好</button>
              <button v-if="subEdit.subId" class="mini-act danger" @click="removeSub(c)">
                <AppIcon name="trash" :size="15" :stroke="1.9" />
              </button>
            </div>
          </div>
        </div>

        <div class="foot-note">
          点二级可以改名 · 删二级不会删菜，菜会落到「其他」里 · 有菜的一级分类不能删
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

/* ---- 一级 ---- */
.cat-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.cat {
  padding: 13px 14px;
}
.cat-head {
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 34px;
}
.cat-name {
  flex: 1;
  min-width: 0;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cat-count {
  flex: 0 0 auto;
  font-size: 12px;
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
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
  height: 34px;
  padding: 0 11px;
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

/* ---- 二级 ---- */
.cat-subs {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(18, 22, 27, 0.055);
  overflow-x: auto;
  scrollbar-width: none;
}
.cat-subs::-webkit-scrollbar {
  display: none;
}
.sub-label {
  flex: 0 0 auto;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--ink-4);
  letter-spacing: 0.2px;
}
.sub-chip {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 27px;
  padding: 0 10px;
  border-radius: var(--r-pill);
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink-2);
  background: rgba(18, 22, 27, 0.045);
  transition: color 0.2s var(--ease-out), background 0.2s var(--ease-out),
    box-shadow 0.2s var(--ease-out);
}
.sub-chip.on {
  color: var(--accent-deep);
  background: var(--accent-soft);
  box-shadow: inset 0 0 0 1px rgba(44, 123, 242, 0.3);
}
.sc-num {
  font-size: 10.5px;
  font-weight: 700;
  color: var(--ink-4);
  font-variant-numeric: tabular-nums;
}
.sub-chip.on .sc-num {
  color: var(--accent);
}
.sub-none {
  flex: 0 0 auto;
  font-size: 12px;
  color: var(--ink-4);
}
.sub-add {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 27px;
  height: 27px;
  border-radius: 999px;
  color: var(--accent);
  background: var(--accent-soft);
}

.sub-edit {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  margin-top: 9px;
}

.foot-note {
  margin: 18px 4px 0;
  font-size: 11.5px;
  color: var(--ink-4);
  line-height: 1.5;
  text-align: center;
}
</style>
