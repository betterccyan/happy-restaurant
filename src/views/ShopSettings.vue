<script setup>
import { ref, computed, onMounted } from 'vue'
import PageHeader from '../components/PageHeader.vue'
import AppIcon from '../components/AppIcon.vue'
import { db, saveSettings, exportJson, importJson, resetAll } from '../data/db'
import { listSnapshots, getSnapshot, putSnapshot } from '../data/snapshots'
import { resetTo } from '../store/router'
import { haptic, toast } from '../store/app'
import { ask } from '../store/dialog'
import { formatTime } from '../lib/util'

const name = ref(db.settings.name)
const notice = ref(db.settings.notice)
const showRestore = ref(false)
const restoreText = ref('')
const showSnaps = ref(false)
const snaps = ref([])
const snapBusy = ref(false)
const version = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : ''

const dirty = computed(() => name.value !== db.settings.name || notice.value !== db.settings.notice)
const dishCount = computed(() => db.dishes.length)
const orderCount = computed(() => db.orders.length)

function save() {
  saveSettings({ name: name.value.trim() || '幸福小馆', notice: notice.value.trim() })
  haptic()
  toast('已保存')
}

function switchRole() {
  resetTo('role-select')
}

async function copyBackup() {
  try {
    await navigator.clipboard.writeText(exportJson())
    toast('备份已复制到剪贴板')
  } catch {
    toast('复制失败')
  }
}

function doRestore() {
  const text = restoreText.value.trim()
  if (!text) {
    toast('先粘贴备份内容')
    return
  }
  try {
    importJson(text)
    syncFields()
    restoreText.value = ''
    showRestore.value = false
    haptic()
    toast('已恢复备份')
  } catch (e) {
    toast('恢复失败：' + e.message)
  }
}

// 恢复会整体替换 db.settings，页面里的本地副本得跟着刷新，否则输入框还显示旧值
function syncFields() {
  name.value = db.settings.name
  notice.value = db.settings.notice
}

/* ---- 自动备份 ---- */
const SNAP_TAG = { auto: '自动', manual: '手动', 'before-reset': '清空前', 'before-restore': '覆盖前' }
const tagLabel = (tag) => SNAP_TAG[tag] || tag || '备份'
const formatSnapTime = (at) => formatTime(new Date(at).toISOString())
const snapSize = (size) => Math.max(1, Math.round((Number(size) || 0) / 1024)) + ' KB'

async function refreshSnaps() {
  try {
    snaps.value = await listSnapshots()
  } catch {
    snaps.value = []
  }
}

function toggleSnaps() {
  showSnaps.value = !showSnaps.value
  if (showSnaps.value) refreshSnaps()
}

async function manualBackup() {
  try {
    await putSnapshot(JSON.stringify(db), 'manual')
    await refreshSnaps()
    haptic()
    toast('已备份一份')
  } catch (e) {
    toast('备份失败：' + (e.message || '未知错误'))
  }
}

async function restoreSnap(s) {
  if (snapBusy.value) return
  const ok = await ask({
    title: '回到 ' + formatSnapTime(s.at) + ' 的状态？',
    message: '当前的菜品和点单会被这份备份替换。',
    hint: '替换前会自动留一份备份。',
    confirmText: '覆盖',
    danger: true
  })
  if (!ok) return
  snapBusy.value = true
  try {
    const rec = await getSnapshot(s.id)
    if (!rec || !rec.payload) throw new Error('这份备份读不出来')
    importJson(rec.payload)
    syncFields()
    haptic()
    toast('已恢复到 ' + formatSnapTime(s.at))
    await refreshSnaps()
  } catch (e) {
    toast('恢复失败：' + (e.message || '未知错误'))
  } finally {
    snapBusy.value = false
  }
}

async function reset() {
  const ok = await ask({
    title: '恢复成示例数据？',
    message: '现有菜品、点单和家庭信息全部清空。',
    hint: '重置前同样会先留一份备份。',
    confirmText: '清空并重置',
    danger: true
  })
  if (!ok) return
  resetAll()
  haptic()
  resetTo('role-select')
  toast('已重置')
}

onMounted(refreshSnaps)
</script>

<template>
  <div class="page">
    <PageHeader title="家庭信息" :subtitle="dishCount + ' 道菜 · ' + orderCount + ' 张单' " :show-back="false" />

    <div class="scroll has-tabbar">
      <div class="page-pad">
        <!-- 身份卡 -->
        <div class="id-card card anim-rise">
          <div class="id-left">
            <div class="id-emoji">{{ db.profile.role === 'chef' ? '👨‍🍳' : '🧑' }}</div>
            <div>
              <div class="id-role">{{ db.profile.role === 'chef' ? '主厨' : '家庭成员' }}</div>
              <div class="id-sub">{{ db.profile.nickname || '还没设名字' }}</div>
            </div>
          </div>
          <button class="btn btn-ghost btn-sm" @click="switchRole">
            <AppIcon name="swap" :size="14" :stroke="2" />
            切换身份
          </button>
        </div>

        <!-- 家庭信息 -->
        <div class="sec-title"><div class="h2">家的名字</div></div>
        <div class="field">
          <span class="field-label">名称</span>
          <input v-model="name" placeholder="幸福小馆" maxlength="12" />
        </div>

        <div class="sec-title"><div class="h2">公告</div></div>
        <div class="field field-col">
          <textarea v-model="notice" rows="2" placeholder="显示在点菜页顶部的一句话" maxlength="40"></textarea>
          <div class="counter">{{ notice.length }}/40</div>
        </div>

        <button class="btn btn-primary btn-block save-btn" :disabled="!dirty" @click="save">保存</button>

        <!-- 数据 -->
        <div class="sec-title"><div class="h2">数据</div></div>
        <div class="list">
          <button class="row" @click="copyBackup">
            <div class="row-main">
              <div class="row-title">复制备份</div>
              <div class="row-desc">把全部菜品和点菜单导出成文本</div>
            </div>
            <AppIcon name="copy" :size="17" :stroke="1.9" class="row-arrow" />
          </button>
          <button class="row" @click="showRestore = !showRestore">
            <div class="row-main">
              <div class="row-title">从备份恢复</div>
              <div class="row-desc">粘贴之前复制的文本</div>
            </div>
            <AppIcon name="chevronRight" :size="17" :stroke="2" class="row-arrow" />
          </button>
          <button class="row" @click="toggleSnaps">
            <div class="row-main">
              <div class="row-title">自动备份</div>
              <div class="row-desc">每天首次打开留一份，保留最近 7 份</div>
            </div>
            <AppIcon
              name="chevronRight"
              :size="17"
              :stroke="2"
              class="row-arrow"
              :style="{ transform: showSnaps ? 'rotate(90deg)' : 'none' }"
            />
          </button>
          <button class="row" @click="reset">
            <div class="row-main">
              <div class="row-title danger-text">恢复示例数据</div>
              <div class="row-desc">清空当前内容，重置成初始的 14 道菜</div>
            </div>
            <AppIcon name="trash" :size="17" :stroke="1.9" class="row-arrow" />
          </button>
        </div>

        <div v-if="showRestore" class="restore anim-fade">
          <textarea
            v-model="restoreText"
            rows="4"
            placeholder="把备份文本粘贴到这里"
          ></textarea>
          <div class="restore-acts">
            <button class="btn btn-ghost btn-sm" @click="showRestore = false; restoreText = ''">取消</button>
            <button class="btn btn-primary btn-sm" @click="doRestore">恢复</button>
          </div>
        </div>

        <div v-if="showSnaps" class="restore anim-fade">
          <div v-if="snaps.length === 0" class="snap-empty">
            还没有备份。下次打开会自动留一份，也可以现在手动备份。
          </div>
          <div v-else class="snap-list">
            <div v-for="s in snaps" :key="s.id" class="snap">
              <div class="snap-main">
                <div class="snap-line">
                  {{ formatSnapTime(s.at) }}
                  <span class="snap-tag">{{ tagLabel(s.tag) }}</span>
                </div>
                <div class="snap-meta mono-num">{{ snapSize(s.size) }}</div>
              </div>
              <button class="btn btn-soft btn-sm" :disabled="snapBusy" @click="restoreSnap(s)">
                恢复
              </button>
            </div>
          </div>
          <button class="btn btn-ghost btn-sm snap-add" @click="manualBackup">立即备份一份</button>
        </div>

        <!-- 关于 -->
        <div class="about">
          <div class="about-title">幸福小馆 · 家庭点单</div>
          <div class="about-line">数据全部保存在本机，不联网、不上传</div>
          <div class="about-line">设计语言参考 澎湃OS 4 柔光玻璃</div>
          <div class="about-ver">v{{ version }}</div>
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

.id-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 4px;
  padding: 15px 16px;
}
.id-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.id-emoji {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 15px;
  font-size: 25px;
  background: linear-gradient(150deg, #f4f8ff, #e6effc);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.95);
}
.id-role {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.2px;
}
.id-sub {
  font-size: 12.5px;
  color: var(--ink-3);
  margin-top: 2px;
}

.counter {
  text-align: right;
  font-size: 11px;
  color: var(--ink-4);
  margin-top: 4px;
}

.save-btn {
  margin-top: 16px;
}

.danger-text {
  color: var(--danger);
}

.restore {
  margin-top: 11px;
  padding: 13px;
  border-radius: var(--r-md);
  background: rgba(255, 255, 255, 0.85);
  box-shadow: inset 0 0 0 1px rgba(18, 22, 27, 0.06);
}
.restore textarea {
  width: 100%;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.5;
  background: rgba(18, 22, 27, 0.04);
  resize: none;
}
.restore-acts {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
}

.snap-empty {
  padding: 6px 2px 10px;
  font-size: 12.5px;
  line-height: 1.55;
  color: var(--ink-3);
}
.snap-list {
  display: flex;
  flex-direction: column;
}
.snap {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 0;
}
.snap + .snap {
  border-top: 1px solid var(--hairline);
}
.snap-main {
  flex: 1;
  min-width: 0;
}
.snap-line {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--ink-1);
  font-variant-numeric: tabular-nums;
}
.snap-tag {
  padding: 1px 6px;
  border-radius: 5px;
  font-size: 10.5px;
  font-weight: 600;
  color: var(--accent-deep);
  background: var(--accent-soft);
}
.snap-meta {
  margin-top: 2px;
  font-size: 11.5px;
  color: var(--ink-4);
}
.snap-add {
  width: 100%;
  margin-top: 10px;
}

.about {
  margin-top: 30px;
  text-align: center;
}
.about-title {
  font-size: 13.5px;
  font-weight: 650;
  color: var(--ink-2);
}
.about-line {
  margin-top: 5px;
  font-size: 11.5px;
  color: var(--ink-4);
  line-height: 1.5;
}
.about-ver {
  margin-top: 10px;
  font-size: 11px;
  color: var(--ink-4);
  opacity: 0.7;
}

.row {
  width: 100%;
  text-align: left;
  background: none;
}
</style>
