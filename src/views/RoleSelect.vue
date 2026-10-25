<script setup>
import { computed } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import { db, setRole } from '../data/db'
import { resetTo } from '../store/router'
import { haptic, toast } from '../store/app'
import { greeting, todayText } from '../lib/util'

const shopName = computed(() => db.settings.name || '幸福小馆')
const notice = computed(() => db.settings.notice)
const hasProfile = computed(() => !!db.profile.role)

function enter(role) {
  haptic()
  setRole(role)
  toast(role === 'chef' ? '欢迎回家，主厨' : '开饭前先点个菜吧')
  resetTo(role === 'chef' ? 'owner-home' : 'menu')
}
</script>

<template>
  <div class="scroll">
    <div class="wrap">
      <div class="hero anim-rise">
        <div class="hero-glow"></div>
        <div class="hero-bowl">🍲</div>
        <div class="hero-name">{{ shopName }}</div>
        <div class="hero-sub">{{ notice || '今天想吃点什么？' }}</div>
        <div class="hero-meta">
          <span>{{ todayText() }}</span>
          <span class="dot"></span>
          <span>{{ greeting() }}</span>
        </div>
      </div>

      <div class="prompt anim-rise-late">
        <span v-if="hasProfile">上次你以<em>{{ db.profile.role === 'chef' ? '主厨' : '家人' }}</em>身份进入</span>
        <span v-else>选择你的身份</span>
      </div>

      <div class="roles">
        <button class="role anim-rise-late press" @click="enter('chef')">
          <span class="role-emoji">👨‍🍳</span>
          <span class="role-main">
            <span class="role-title">我是主厨</span>
            <span class="role-desc">管菜单 · 处理点菜 · 生成买菜清单</span>
          </span>
          <AppIcon name="chevronRight" :size="19" :stroke="2" class="role-arrow" />
        </button>

        <button class="role anim-rise-late press" @click="enter('member')">
          <span class="role-emoji">🧑</span>
          <span class="role-main">
            <span class="role-title">我是家人</span>
            <span class="role-desc">浏览菜单 · 点菜 · 看做饭进度</span>
          </span>
          <AppIcon name="chevronRight" :size="19" :stroke="2" class="role-arrow" />
        </button>
      </div>

      <div class="foot">
        <AppIcon name="check" :size="13" :stroke="2.4" />
        所有数据保存在这台手机上，无需联网、不用注册
      </div>
    </div>
  </div>
</template>

<style scoped>
.wrap {
  padding: calc(var(--safe-top) + 26px) 20px 34px;
}

.hero {
  position: relative;
  overflow: hidden;
  border-radius: var(--r-xl);
  padding: 34px 22px 26px;
  text-align: center;
  background: linear-gradient(165deg, rgba(255, 255, 255, 0.96) 0%, rgba(238, 244, 253, 0.9) 100%);
  box-shadow: 0 2px 6px rgba(16, 24, 40, 0.04), 0 24px 50px -28px rgba(35, 92, 180, 0.34),
    inset 0 0 0 1px rgba(255, 255, 255, 0.95);
}

.hero-glow {
  position: absolute;
  top: -74px;
  left: 50%;
  width: 250px;
  height: 180px;
  transform: translateX(-50%);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(120, 172, 255, 0.42) 0%, rgba(120, 172, 255, 0) 70%);
  pointer-events: none;
}

.hero-bowl {
  position: relative;
  font-size: 52px;
  line-height: 1;
  filter: drop-shadow(0 10px 18px rgba(35, 92, 180, 0.22));
}

.hero-name {
  position: relative;
  margin-top: 14px;
  font-size: 27px;
  font-weight: 750;
  letter-spacing: -0.6px;
  color: var(--ink-1);
}

.hero-sub {
  position: relative;
  margin-top: 7px;
  font-size: 14px;
  color: var(--ink-2);
  line-height: 1.5;
}

.hero-meta {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 15px;
  padding: 6px 13px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 550;
  color: var(--ink-3);
  background: rgba(255, 255, 255, 0.72);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.9);
}
.dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--ink-4);
}

.prompt {
  margin: 30px 4px 13px;
  font-size: 13.5px;
  font-weight: 550;
  color: var(--ink-3);
}
.prompt em {
  font-style: normal;
  font-weight: 700;
  color: var(--accent);
  margin: 0 2px;
}

.roles {
  display: flex;
  flex-direction: column;
  gap: 11px;
}

.role {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 17px 16px;
  border-radius: var(--r-lg);
  text-align: left;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: var(--shadow-card), var(--highlight);
}
.role:active {
  background: rgba(255, 255, 255, 0.98);
}

.role-emoji {
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

.role-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.role-title {
  font-size: 16.5px;
  font-weight: 650;
  letter-spacing: -0.2px;
}
.role-desc {
  font-size: 12.5px;
  color: var(--ink-3);
  line-height: 1.4;
}
.role-arrow {
  flex: 0 0 auto;
  color: var(--ink-4);
}

.foot {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 30px;
  font-size: 12px;
  color: var(--ink-4);
  line-height: 1.5;
}

.anim-rise-late {
  animation: rise 0.46s var(--ease-spring) 0.07s both;
}

/* ---- 平板：内容列居中，横屏时两个身份并排 ---- */
@media (min-width: 700px) {
  .wrap {
    /* width:100% 不能省：设了 margin-inline:auto 之后，flex 子项不再被拉伸，
       会退化成「内容有多宽就多宽」，卡片宽度跟着文字长度乱跳 */
    width: 100%;
    max-width: var(--content-w);
    margin-inline: auto;
    /* 内容不满一屏时垂直居中；溢出时 auto 边距按 0 处理，不会把顶部裁掉 */
    margin-block: auto;
    padding-inline: 26px;
  }
}

@media (min-width: 1000px) {
  .wrap {
    max-width: 880px;
  }
  .hero {
    padding: 40px 26px 32px;
  }
  .hero-name {
    font-size: 30px;
  }
  .prompt {
    margin: 34px 4px 14px;
  }
  /* 横屏宽度够，两个身份并排，视线一眼扫完 */
  .roles {
    flex-direction: row;
    gap: 13px;
  }
  .role {
    flex: 1 1 0;
    min-width: 0;
    padding: 20px 18px;
  }
}

/* 矮屏（横屏平板 / 分屏）：hero 收紧，别把身份选择挤出首屏 */
@media (max-height: 560px) {
  .hero {
    padding: 24px 22px 20px;
  }
  .hero-bowl {
    font-size: 40px;
  }
  .hero-name {
    margin-top: 10px;
    font-size: 23px;
  }
  .hero-meta {
    margin-top: 11px;
  }
  .prompt {
    margin: 18px 4px 10px;
  }
  .foot {
    margin-top: 18px;
  }
}
</style>
