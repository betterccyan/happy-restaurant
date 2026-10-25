<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import PageHeader from '../components/PageHeader.vue'
import AppIcon from '../components/AppIcon.vue'
import { db, getDish, createDish, updateDish, deleteDish, subsOf } from '../data/db'
import { back } from '../store/router'
import { haptic, toast } from '../store/app'
import { normalizeOptions } from '../lib/options'
import { pickAndCompress, putImage, resolveImage, removeImage } from '../lib/image-store'
import { mealCategoryByHour } from '../lib/util'
import { inferDish, searchDish } from '../data/dish-kb'
import { ask } from '../store/dialog'

const props = defineProps({ params: { type: Object, default: () => ({}) } })

const editingId = props.params?.id || ''
const isEdit = !!editingId

const EMOJIS = [
  '🍽️', '🍅', '🍗', '🥔', '🍖', '🐟', '🥬', '🍲', '🍚', '🥟',
  '🥣', '🍳', '🥛', '🍉', '🥗', '🍜', '🍛', '🥘', '🍤', '🥩',
  '🍕', '🍔', '🥞', '🍰', '🍞', '🥚', '🌽', '🥕', '🍄', '☕'
]

const name = ref('')
const category = ref('')
const sub = ref('')
const emoji = ref('🍽️')
const description = ref('')
const calories = ref(0)
const ingredients = ref('')
const available = ref(true)
const imageKey = ref('')
const previewUrl = ref('')
const groups = ref([])
const saving = ref(false)
const showEmojiPanel = ref(false)

const cats = computed(() => [...db.categories].sort((a, b) => a.sort - b.sort))
// 二级跟着一级走：加餐没有二级，这一行就不出现
const subs = computed(() => subsOf(category.value))
const ingredientCount = computed(() => ingredients.value.split('\n').filter((l) => l.trim()).length)

function pickCat(name) {
  category.value = name
  if (!subsOf(name).some((x) => x.name === sub.value)) sub.value = ''
}

/* --------- 菜名 → 热量 / 食材 推断 --------- */
const hint = ref(null)
// 记住「已经处理过的菜名」：填过、忽略过、或者本来就是正在编辑的这道菜，
// 再出现同一个名字就不弹卡片，免得改别的地方时它反复冒出来。
const hintHandled = ref('')
const hintLines = computed(() => (hint.value ? hint.value.ingredients.split('\n').filter(Boolean) : []))
// 卡片上显示「早餐 · 饮品」这种，二级要校验过才算数
const hintCat = computed(() => {
  const h = hint.value
  if (!h || !h.category) return ''
  const s = h.sub && subsOf(h.category).some((x) => x.name === h.sub) ? h.sub : ''
  return s ? h.category + ' · ' + s : h.category
})
let hintTimer = null

watch(name, (v) => {
  clearTimeout(hintTimer)
  const raw = String(v || '').trim()
  if (raw.length < 2) {
    hint.value = null
    return
  }
  // 边打字边算会一直闪，停下来再识别
  hintTimer = setTimeout(() => {
    hint.value = raw === hintHandled.value ? null : inferDish(raw)
  }, 320)
})

function dismissHint() {
  hintHandled.value = String(name.value || '').trim()
  hint.value = null
}

async function fillHint() {
  const h = hint.value
  if (!h) return
  const hasData = Number(calories.value) > 0 || String(ingredients.value || '').trim()
  if (hasData) {
    const ok = await ask({
      title: '用识别结果覆盖？',
      message: '现在填的热量和食材会被「' + (h.name || '估算结果') + '」的替换掉。',
      hint: h.calories + ' 千卡 · ' + h.ingredients.split('\n').filter(Boolean).length + ' 种食材',
      confirmText: '覆盖'
    })
    if (!ok) return
  }
  calories.value = h.calories
  ingredients.value = h.ingredients
  if (h.emoji) emoji.value = h.emoji
  if (h.category && cats.value.some((c) => c.name === h.category)) {
    category.value = h.category
    if (h.sub && subsOf(h.category).some((x) => x.name === h.sub)) sub.value = h.sub
  }
  hintHandled.value = String(name.value || '').trim()
  hint.value = null
  haptic()
  toast('已填入热量和 ' + h.ingredients.split('\n').filter(Boolean).length + ' 种食材')
}

/* --------- 菜名联想：打几个字就列出菜谱库里的候选 --------- */
const suggestOpen = ref(false)
const suggestItems = ref([])
const suggestIdx = ref(-1)
let typing = false // 中文输入法拼写中，别急着弹候选

function updateSuggest() {
  const k = String(name.value || '').trim()
  if (!k) {
    suggestItems.value = []
    suggestOpen.value = false
    return
  }
  let items = searchDish(k, 6)
  // 只有一个候选且和自己打的一字不差（编辑已有菜品时常见）就别弹，免得挡视线
  if (items.length === 1 && items[0].name === k) items = []
  suggestItems.value = items
  suggestIdx.value = -1
  suggestOpen.value = items.length > 0
}

function onNameInput() {
  if (typing) return
  updateSuggest()
}

function onCompositionStart() {
  typing = true
}

function onCompositionEnd() {
  typing = false
  updateSuggest()
}

function onNameFocus() {
  if (String(name.value || '').trim()) updateSuggest()
}

// 延迟收起：手机上 blur 先于 click 发生，立刻关会点不到候选
function onNameBlur() {
  setTimeout(() => {
    suggestOpen.value = false
  }, 170)
}

function moveSuggest(step) {
  if (!suggestOpen.value) {
    updateSuggest()
    return
  }
  const n = suggestItems.value.length
  if (!n) return
  suggestIdx.value = (suggestIdx.value + step + n) % n
}

function pickSuggest(item) {
  if (!item) return
  name.value = item.name
  suggestItems.value = []
  suggestOpen.value = false
  suggestIdx.value = -1
  hintHandled.value = '' // 选完就让推断卡片正常出来
  haptic()
}

function onNameEnter(e) {
  if (typing) return // 输入法选字时按回车不算选中候选
  if (suggestOpen.value && suggestIdx.value >= 0) {
    e.preventDefault()
    pickSuggest(suggestItems.value[suggestIdx.value])
  }
}

onMounted(async () => {
  if (!isEdit) {
    // 新建时按当前餐次预选分类
    const def = mealCategoryByHour()
    category.value = cats.value.some((c) => c.name === def)
      ? def
      : cats.value[0]?.name || '中晚餐'
    return
  }
  const d = getDish(editingId)
  hintHandled.value = String(d?.name || '').trim()
  if (!d) {
    toast('菜品不存在')
    back()
    return
  }
  name.value = d.name
  category.value = d.category
  sub.value = d.sub || ''
  emoji.value = d.emoji
  description.value = d.description
  calories.value = d.calories
  ingredients.value = d.ingredients
  available.value = d.available
  imageKey.value = d.imageKey || ''
  groups.value = normalizeOptions(d.options).map((g) => ({
    name: g.name,
    multi: g.multi,
    required: g.required,
    choices: g.choices.map((c) => ({ label: c.label, price: 0 })),
    draft: ''
  }))
  if (imageKey.value) previewUrl.value = await resolveImage(imageKey.value)
})

async function onPickImage(e) {
  const file = e.target.files && e.target.files[0]
  e.target.value = ''
  if (!file) return
  try {
    const dataUrl = await pickAndCompress(file)
    const key = 'dish_' + Date.now().toString(36)
    await putImage(key, dataUrl)
    if (imageKey.value) removeImage(imageKey.value)
    imageKey.value = key
    previewUrl.value = dataUrl
    haptic()
    toast('图片已就绪，保存后生效')
  } catch (err) {
    toast(err.message || '图片处理失败')
  }
}

function clearImage() {
  if (imageKey.value) removeImage(imageKey.value)
  imageKey.value = ''
  previewUrl.value = ''
}

/* --------- 选项组编辑 --------- */
function addGroup() {
  if (groups.value.length >= 6) {
    toast('最多 6 组规格')
    return
  }
  groups.value.push({ name: '', multi: false, required: false, choices: [], draft: '' })
}

function removeGroup(gi) {
  groups.value.splice(gi, 1)
}

function addChoice(g) {
  const label = String(g.draft || '').trim().slice(0, 12)
  if (!label) return
  if (g.choices.length >= 12) {
    toast('一组最多 12 个选项')
    return
  }
  if (g.choices.some((c) => c.label === label)) {
    toast('这个选项已经有了')
    return
  }
  g.choices.push({ label, price: 0 })
  g.draft = ''
}

function removeChoice(g, ci) {
  g.choices.splice(ci, 1)
}

/* --------- 保存 --------- */
function save() {
  if (saving.value) return
  const n = name.value.trim()
  if (!n) {
    toast('先给这道菜起个名字')
    return
  }
  const payload = {
    name: n,
    category: category.value,
    sub: sub.value,
    emoji: emoji.value,
    description: description.value.trim(),
    calories: Math.max(0, Number(calories.value) || 0),
    ingredients: ingredients.value,
    available: available.value,
    imageKey: imageKey.value,
    options: groups.value
      .filter((g) => g.choices.length > 0)
      .map((g) => ({
        name: g.name || '选项',
        multi: g.multi,
        required: g.required,
        choices: g.choices.map((c) => ({ label: c.label, price: 0 }))
      }))
  }
  saving.value = true
  try {
    if (isEdit) updateDish(editingId, payload)
    else createDish(payload)
    haptic()
    toast(isEdit ? '已保存' : '菜已加进菜单')
    back()
  } catch (e) {
    toast(e.message || '保存失败')
    saving.value = false
  }
}

async function confirmDelete() {
  if (!isEdit) return
  const ok = await ask({
    title: '删除「' + (name.value || '这道菜') + '」？',
    message: '从菜单里消失，以前点过的记录还在。',
    confirmText: '删除',
    danger: true
  })
  if (!ok) return
  if (imageKey.value) removeImage(imageKey.value)
  deleteDish(editingId)
  toast('已删除')
  back()
}
</script>

<template>
  <div class="page">
    <PageHeader :title="isEdit ? '编辑菜品' : '新增菜品'">
      <template #right>
        <button class="save-top" :disabled="saving" @click="save">保存</button>
      </template>
    </PageHeader>

    <div class="scroll">
      <div class="page-pad">
        <!-- 图片 -->
        <div class="photo-sec">
          <label class="photo" :class="{ has: !!previewUrl }">
            <input type="file" accept="image/*" class="file" @change="onPickImage" />
            <img v-if="previewUrl" :src="previewUrl" alt="" />
            <div v-else class="photo-empty">
              <div class="photo-emoji">{{ emoji }}</div>
              <div class="photo-hint">
                <AppIcon name="image" :size="14" :stroke="1.9" />
                加张实拍图
              </div>
            </div>
          </label>
          <div class="photo-side">
            <button v-if="previewUrl" class="btn btn-ghost btn-sm" @click="clearImage">移除图片</button>
            <button v-else class="btn btn-soft btn-sm" @click="showEmojiPanel = !showEmojiPanel">
              {{ showEmojiPanel ? '收起源图标' : '换个图标' }}
            </button>
            <div class="photo-tip">有实物图就不用管图标</div>
          </div>
        </div>

        <!-- 图标 -->
        <div v-if="showEmojiPanel && !previewUrl" class="emoji-panel anim-fade">
          <button
            v-for="e in EMOJIS"
            :key="e"
            class="emoji-btn"
            :class="{ on: emoji === e }"
            @click="emoji = e"
          >
            {{ e }}
          </button>
        </div>

        <!-- 基本信息 -->
        <div class="sec-title"><div class="h2">基本信息</div></div>

        <div class="name-wrap">
          <div class="field">
            <span class="field-label">菜名</span>
            <input
              v-model="name"
              placeholder="比如 番茄炒蛋"
              maxlength="20"
              autocomplete="off"
              @input="onNameInput"
              @focus="onNameFocus"
              @blur="onNameBlur"
              @compositionstart="onCompositionStart"
              @compositionend="onCompositionEnd"
              @keydown.down.prevent="moveSuggest(1)"
              @keydown.up.prevent="moveSuggest(-1)"
              @keydown.enter="onNameEnter"
            />
          </div>

          <!-- 打几个字就列出菜谱库里的候选，选中即补全 -->
          <Transition name="sug">
            <div v-if="suggestOpen" class="sug">
              <button
                v-for="(s, i) in suggestItems"
                :key="s.name"
                class="sug-item"
                :class="{ on: i === suggestIdx }"
                @mousedown.prevent="pickSuggest(s)"
              >
                <span class="sug-emoji">{{ s.emoji }}</span>
                <span class="sug-name">{{ s.name }}</span>
                <span class="sug-kcal mono-num">{{ s.calories }} 千卡</span>
              </button>
              <div class="sug-foot">选中后自动带出热量与食材</div>
            </div>
          </Transition>
        </div>

        <!-- 根据菜名推断热量与食材 -->
        <div v-if="hint && !suggestOpen" class="guess anim-fade">
          <div class="guess-top">
            <span class="guess-emoji">{{ hint.emoji }}</span>
            <div class="guess-text">
              <div class="guess-line">
                <span class="guess-kcal">{{ hint.calories }} 千卡</span>
                <span v-if="hint.kind === 'compose'" class="guess-tag">估算</span>
                <span v-else class="guess-tag ok">菜谱库</span>
                <span v-if="hintCat" class="guess-tag cat">{{ hintCat }}</span>
              </div>
              <div class="guess-note">{{ hint.note }}</div>
            </div>
            <button class="guess-x" @click="dismissHint">
              <AppIcon name="close" :size="13" :stroke="2.2" />
            </button>
          </div>
          <div class="guess-ings">
            <span v-for="(ing, i) in hintLines" :key="i" class="g-ing">{{ ing }}</span>
          </div>
          <button class="guess-fill" @click="fillHint">
            填入热量和食材
            <AppIcon name="chevronRight" :size="14" :stroke="2.2" />
          </button>
        </div>

        <div class="field gap">
          <span class="field-label">热量</span>
          <input v-model="calories" type="number" inputmode="numeric" placeholder="0" />
          <span class="unit">千卡 / 份</span>
        </div>

        <div class="field gap">
          <span class="field-label">描述</span>
          <input v-model="description" placeholder="一句话，可不填" maxlength="40" />
        </div>

        <!-- 分类 -->
        <div class="sec-title"><div class="h2">归到哪一餐</div></div>
        <div class="chips">
          <button
            v-for="c in cats"
            :key="c.id"
            class="chip"
            :class="{ on: category === c.name }"
            @click="pickCat(c.name)"
          >
            {{ c.name }}
          </button>
        </div>

        <!-- 二级分类：加餐没有，这里自然不出现 -->
        <div v-if="subs.length" class="sub-pick anim-fade">
          <div class="chips">
            <button class="chip sm" :class="{ on: !sub }" @click="sub = ''">不分</button>
            <button
              v-for="s in subs"
              :key="s.id"
              class="chip sm"
              :class="{ on: sub === s.name }"
              @click="sub = s.name"
            >
              {{ s.name }}
            </button>
          </div>
        </div>

        <!-- 食材 -->
        <div class="sec-title">
          <div class="h2">食材</div>
          <span class="tiny">{{ ingredientCount }} 项 · 供买菜清单聚合</span>
        </div>
        <div class="field field-col">
          <textarea
            v-model="ingredients"
            rows="5"
            placeholder="一行一项，例如：&#10;番茄 2 个&#10;鸡蛋 3 个&#10;小葱"
          ></textarea>
        </div>
        <div class="hint-row">写法随意：「番茄 2 个」「鸡蛋3个」「盐」都能识别</div>

        <!-- 规格 -->
        <div class="sec-title">
          <div class="h2">可选规格</div>
          <button class="link" @click="addGroup">+ 加一组</button>
        </div>

        <div v-if="groups.length === 0" class="no-group">
          没有规格的话，家人点一下直接进已选
        </div>

        <div v-for="(g, gi) in groups" :key="gi" class="group-card card">
          <div class="g-head">
            <input v-model="g.name" class="g-name" placeholder="组名，如 辣度" maxlength="10" />
            <button class="g-del" @click="removeGroup(gi)">
              <AppIcon name="trash" :size="15" :stroke="1.9" />
            </button>
          </div>

          <div class="g-toggles">
            <button class="tg" :class="{ on: !g.multi }" @click="g.multi = false">单选</button>
            <button class="tg" :class="{ on: g.multi }" @click="g.multi = true">多选</button>
            <span class="tg-sep"></span>
            <button class="tg" :class="{ on: g.required }" @click="g.required = !g.required">
              {{ g.required ? '必选' : '可不选' }}
            </button>
          </div>

          <div class="choices">
            <span v-for="(c, ci) in g.choices" :key="ci" class="choice">
              {{ c.label }}
              <button class="c-x" @click="removeChoice(g, ci)">
                <AppIcon name="close" :size="10" :stroke="2.6" />
              </button>
            </span>
            <span v-if="g.choices.length === 0" class="choices-empty">还没有选项</span>
          </div>

          <div class="add-choice">
            <input
              v-model="g.draft"
              placeholder="输入后回车添加，如 微辣"
              maxlength="12"
              @keyup.enter="addChoice(g)"
            />
            <button class="ac-btn" @click="addChoice(g)">
              <AppIcon name="plus" :size="14" :stroke="2.4" />
            </button>
          </div>
        </div>

        <!-- 上架 -->
        <div class="sec-title"><div class="h2">显示</div></div>
        <div class="list">
          <div class="row">
            <div class="row-main">
              <div class="row-title">在家人菜单里显示</div>
              <div class="row-desc">关掉后这道菜暂时不下单</div>
            </div>
            <button class="switch" :class="{ on: available }" @click="available = !available">
              <span class="knob"></span>
            </button>
          </div>
        </div>

        <button v-if="isEdit" class="btn btn-danger btn-block del-btn" @click="confirmDelete">
          删除这道菜
        </button>

        <div class="bottom-space"></div>
      </div>
    </div>

    <div class="dock">
      <button class="btn btn-primary btn-block" :disabled="saving" @click="save">
        {{ isEdit ? '保存修改' : '加入菜单' }}
      </button>
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

.save-top {
  height: 34px;
  padding: 0 16px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 650;
  color: #fff;
  background: linear-gradient(168deg, #4d8df7, var(--accent));
  box-shadow: 0 5px 14px -6px var(--accent-glow);
}
.save-top[disabled] {
  opacity: 0.5;
}

/* ---- 照片 ---- */
.photo-sec {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 6px;
}
.photo {
  position: relative;
  flex: 0 0 auto;
  width: 108px;
  height: 108px;
  border-radius: var(--r-lg);
  overflow: hidden;
  background: linear-gradient(150deg, #f5f8ff, #e7eefb);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.95), var(--shadow-card);
  cursor: pointer;
}
.photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.file {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}
.photo-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  height: 100%;
}
.photo-emoji {
  font-size: 36px;
  line-height: 1;
}
.photo-hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11.5px;
  font-weight: 550;
  color: var(--ink-3);
}
.photo-side {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}
.photo-tip {
  font-size: 11.5px;
  color: var(--ink-4);
  line-height: 1.45;
}

.emoji-panel {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 5px;
  margin-top: 12px;
  padding: 11px;
  border-radius: var(--r-md);
  background: rgba(255, 255, 255, 0.78);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.9);
}
.emoji-btn {
  aspect-ratio: 1;
  border-radius: 9px;
  font-size: 19px;
  line-height: 1;
  transition: transform 0.18s var(--ease-spring), background 0.18s ease;
}
.emoji-btn:active {
  transform: scale(0.88);
}
.emoji-btn.on {
  background: var(--accent-soft);
  box-shadow: inset 0 0 0 1.5px rgba(44, 123, 242, 0.4);
}

.field.gap {
  margin-top: 9px;
}

/* ---- 二级分类 ---- */
.sub-pick {
  margin-top: 8px;
}
/* 二级要比一级轻：一级选中是实心蓝，二级只到浅蓝底深蓝字 */
.chip.sm {
  height: 29px;
  padding: 0 13px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink-3);
  background: rgba(255, 255, 255, 0.55);
  box-shadow: inset 0 0 0 1px rgba(18, 22, 27, 0.05);
}
.chip.sm.on {
  color: var(--accent-deep);
  background: var(--accent-soft);
  box-shadow: inset 0 0 0 1px rgba(44, 123, 242, 0.26);
}

/* ---- 菜名联想 ---- */
/* 走文档流而不是绝对定位浮层：输入框下面永远能完整看到候选，
   不会被下方字段压住，键盘弹起时也不会被裁掉半行 */
.sug {
  margin-top: 8px;
  padding: 5px;
  border-radius: var(--r-md);
  background: #fdfefe;
  box-shadow: 0 2px 4px rgba(16, 24, 40, 0.05), 0 14px 30px -18px rgba(16, 24, 40, 0.2),
    inset 0 0 0 1px rgba(15, 23, 42, 0.065);
}
.sug-item {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  height: 42px;
  padding: 0 10px;
  border-radius: 10px;
  text-align: left;
  transition: background 0.16s ease;
}
.sug-item.on {
  background: var(--accent-soft);
}
.sug-emoji {
  flex: 0 0 auto;
  width: 22px;
  text-align: center;
  font-size: 17px;
  line-height: 1;
}
.sug-name {
  flex: 1;
  min-width: 0;
  font-size: 14.5px;
  font-weight: 550;
  color: var(--ink-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sug-item.on .sug-name {
  color: var(--accent-deep);
  font-weight: 650;
}
.sug-kcal {
  flex: 0 0 auto;
  font-size: 12px;
  color: var(--ink-3);
}
.sug-foot {
  margin-top: 3px;
  padding: 7px 10px 5px;
  border-top: 1px solid var(--hairline);
  font-size: 11px;
  color: var(--ink-4);
}

.sug-enter-active,
.sug-leave-active {
  transition: opacity 0.18s ease, transform 0.22s var(--ease-out);
}
.sug-enter-from,
.sug-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

/* ---- 菜名识别卡片 ---- */
.guess {
  margin-top: 10px;
  padding: 12px 13px 11px;
  border-radius: var(--r-md);
  background: linear-gradient(165deg, rgba(255, 255, 255, 0.96), rgba(240, 246, 255, 0.94));
  box-shadow: inset 0 0 0 1px rgba(44, 123, 242, 0.14), 0 8px 20px -14px rgba(16, 24, 40, 0.28);
}
.guess-top {
  display: flex;
  align-items: center;
  gap: 10px;
}
.guess-emoji {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  font-size: 19px;
  line-height: 1;
  background: #fff;
  box-shadow: 0 1px 3px rgba(16, 24, 40, 0.08);
}
.guess-text {
  flex: 1;
  min-width: 0;
}
.guess-line {
  display: flex;
  align-items: center;
  gap: 6px;
}
.guess-kcal {
  font-size: 14px;
  font-weight: 650;
  color: var(--ink-1);
  font-variant-numeric: tabular-nums;
}
.guess-tag {
  padding: 1px 6px;
  border-radius: 5px;
  font-size: 10px;
  font-weight: 600;
  color: var(--ink-3);
  background: rgba(18, 22, 27, 0.06);
}
.guess-tag.ok {
  color: var(--accent-deep);
  background: var(--accent-soft);
}
.guess-tag.cat {
  color: var(--ink-2);
  background: rgba(44, 123, 242, 0.09);
}
.guess-note {
  margin-top: 2px;
  font-size: 11.5px;
  line-height: 1.4;
  color: var(--ink-3);
}
.guess-x {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  color: var(--ink-3);
  background: rgba(18, 22, 27, 0.05);
}
.guess-ings {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}
.g-ing {
  padding: 3px 9px;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 550;
  color: var(--ink-2);
  background: #fff;
  box-shadow: inset 0 0 0 1px rgba(18, 22, 27, 0.06);
}
.guess-fill {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  width: 100%;
  height: 36px;
  margin-top: 10px;
  border-radius: 10px;
  font-size: 13.5px;
  font-weight: 650;
  color: var(--accent);
  background: var(--accent-soft);
  transition: transform 0.18s var(--ease-spring);
}
.guess-fill:active {
  transform: scale(0.975);
}
.unit {
  flex: 0 0 auto;
  font-size: 12.5px;
  color: var(--ink-3);
}

.hint-row {
  margin: 8px 3px 0;
  font-size: 11.5px;
  color: var(--ink-4);
  line-height: 1.45;
}

.link {
  flex: 0 0 auto;
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
}

.no-group {
  padding: 15px 16px;
  border-radius: var(--r-md);
  font-size: 13px;
  color: var(--ink-3);
  background: rgba(255, 255, 255, 0.6);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.85);
}

.group-card {
  margin-bottom: 10px;
  padding: 14px 14px 13px;
}
.g-head {
  display: flex;
  align-items: center;
  gap: 9px;
}
.g-name {
  flex: 1;
  min-width: 0;
  height: 36px;
  padding: 0 11px;
  border-radius: 10px;
  font-size: 14.5px;
  font-weight: 600;
  background: rgba(18, 22, 27, 0.04);
}
.g-del {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 9px;
  color: var(--danger);
  background: var(--danger-soft);
}

.g-toggles {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
}
.tg {
  height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink-2);
  background: rgba(18, 22, 27, 0.05);
  transition: color 0.2s ease, background 0.2s ease;
}
.tg.on {
  color: var(--accent-deep);
  background: var(--accent-soft);
  box-shadow: inset 0 0 0 1.2px rgba(44, 123, 242, 0.34);
}
.tg-sep {
  width: 1px;
  height: 16px;
  background: var(--hairline);
  margin: 0 2px;
}

.choices {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 12px;
}
.choice {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 6px 0 11px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 550;
  color: var(--ink-1);
  background: #fff;
  box-shadow: inset 0 0 0 1px rgba(18, 22, 27, 0.08);
}
.c-x {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 17px;
  height: 17px;
  border-radius: 50%;
  color: var(--ink-3);
  background: rgba(18, 22, 27, 0.06);
}
.choices-empty {
  font-size: 12.5px;
  color: var(--ink-4);
  padding: 5px 0;
}

.add-choice {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 11px;
}
.add-choice input {
  flex: 1;
  min-width: 0;
  height: 36px;
  padding: 0 12px;
  border-radius: 10px;
  font-size: 14px;
  background: rgba(18, 22, 27, 0.04);
}
.add-choice input::placeholder {
  color: var(--ink-4);
  font-size: 13px;
}
.ac-btn {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  color: #fff;
  background: linear-gradient(168deg, #4d8df7, var(--accent));
}

.switch {
  flex: 0 0 auto;
  position: relative;
  width: 44px;
  height: 27px;
  border-radius: 999px;
  background: rgba(18, 22, 27, 0.13);
  transition: background 0.28s var(--ease-out);
}
.switch.on {
  background: linear-gradient(168deg, #5c98f8, var(--accent));
}
.knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 21px;
  height: 21px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(16, 24, 40, 0.24);
  transition: transform 0.28s var(--ease-spring);
}
.switch.on .knob {
  transform: translateX(17px);
}

.del-btn {
  margin-top: 22px;
}

.bottom-space {
  height: calc(74px + var(--safe-bottom));
}

.dock {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 12px 18px calc(12px + var(--safe-bottom));
  background: rgba(251, 252, 254, 0.92);
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  border-top: 1px solid var(--hairline);
  z-index: 50;
}

.scroll {
  padding-bottom: 0;
}

/* ---- 平板：表单列收窄，编辑列窄一些眼睛不用左右扫 ---- */
@media (min-width: 700px) {
  .page {
    --content-w: 780px;
  }
  .dock {
    max-width: var(--content-w);
    margin-inline: auto;
    border-radius: var(--r-lg) var(--r-lg) 0 0;
    border-inline: 1px solid var(--hairline);
    box-shadow: 0 -10px 30px -22px rgba(16, 24, 40, 0.3);
  }
}
</style>
