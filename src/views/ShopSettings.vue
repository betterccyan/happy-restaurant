<script setup>
import { ref, computed } from 'vue'
import PageHeader from '../components/PageHeader.vue'
import AppIcon from '../components/AppIcon.vue'
import { db, saveSettings, exportJson, importJson, resetAll } from '../data/db'
import { resetTo } from '../store/router'
import { haptic, toast } from '../store/app'

const name = ref(db.settings.name)
const notice = ref(db.settings.notice)
const showRestore = ref(false)
const restoreText = ref('')

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
    restoreText.value = ''
    showRestore.value = false
    haptic()
    toast('已恢复备份')
  } catch (e) {
    toast('恢复失败：' + e.message)
  }
}

function reset() {
  if (!window.confirm('恢复示例数据？现有的菜品和点菜单会被清空。')) return
  resetAll()
  haptic()
  resetTo('role-select')
  toast('已重置')
}
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

        <!-- 关于 -->
        <div class="about">
          <div class="about-title">幸福小馆 · 家庭点单</div>
          <div class="about-line">数据全部保存在本机，不联网、不上传</div>
          <div class="about-line">设计语言参考 澎湃OS 4 柔光玻璃</div>
          <div class="about-ver">v1.0.0</div>
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
