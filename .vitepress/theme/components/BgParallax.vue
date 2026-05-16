<template>
  <div class="parallax-container">
    <div
      v-for="(layer, i) in layers"
      :key="layer.name"
      class="pl"
      :style="{
        backgroundImage: `url(${layer.url})`,
        transform: transforms[i],
      }"
    />
    <!-- 颜色叠加层：用混合模式给图片叠加上主题色 -->
    <div class="color-overlay" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

// ── 图层配置 ──────────────────────────────────
const layers = [
  { name: 'bg',  url: '/bg/Cu/Cu_b.jpg',  scale: 1.08, speed: 2.00 },   // 背景 → 慢（物理视差：远物移动幅度小）
  { name: 'mid', url: '/bg/Cu/Cu_b2.png', scale: 1.03, speed: 1.50 },   // 中景 → 中
  { name: 'fg',  url: '/bg/Cu/Cu_b3.png', scale: 0.97, speed: 0.5 },   // 近景 → 快
]

// ── 状态 ──────────────────────────────────────
const transforms = ref(layers.map(() => ''))
const current = layers.map(() => ({ x: 0, y: 0 }))
const target  = layers.map(() => ({ x: 0, y: 0 }))

let rafId = null

// ── 鼠标追踪 ──────────────────────────────────
function onMouseMove(e) {
  const cx = e.clientX / window.innerWidth  - 0.5   // [-0.5, 0.5]
  const cy = e.clientY / window.innerHeight - 0.5

  layers.forEach((layer, i) => {
    // 可移动的安全范围 = (scale - 1) / 2 × 视口尺寸
    const rangeX = ((layer.scale - 1) / 2) * window.innerWidth
    const rangeY = ((layer.scale - 1) / 2) * window.innerHeight

    // 方向与鼠标相反；乘以 speed 控制该层实际使用多少比例的范围
    target[i].x = -cx * rangeX * layer.speed
    target[i].y = -cy * rangeY * layer.speed
  })
}

// ── 动画循环（Lerp 平滑跟随）────────────────
function tick() {
  layers.forEach((layer, i) => {
    // 用 lerp 让每帧向目标靠近，产生顺滑的「跟随」感
    current[i].x += (target[i].x - current[i].x) * 0.12
    current[i].y += (target[i].y - current[i].y) * 0.12
  })

  transforms.value = layers.map((layer, i) =>
    `translate(${current[i].x}px, ${current[i].y}px) scale(${layer.scale})`
  )

  rafId = requestAnimationFrame(tick)
}

// ── 生命周期 ──────────────────────────────────
onMounted(() => {
  window.addEventListener('mousemove', onMouseMove, { passive: true })
  rafId = requestAnimationFrame(tick)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', onMouseMove)
  if (rafId) cancelAnimationFrame(rafId)
})
</script>

<style scoped>
.parallax-container {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;       /* 不干扰页面点击 */
  overflow: hidden;           /* 裁掉超出视口的图像部分 */
}

.pl {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;

  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;

  will-change: transform;     /* 启 GPU 合成层，避免抖动 */
}

/* ── 颜色叠加层 ────────────────────────────── */
.color-overlay {
  position: absolute;
  inset: 0;


  
  /* 亮色模式：轻微白色半透明，让图片柔和发白 */
  background: rgba(255, 255, 255, 0.61);
  transition: background 0.5s ease;
}

/* 深色模式：深色半透明，让图片沉稳发暗 */
html.dark .color-overlay {
  background: rgba(31, 31, 31, 0.74);
}
</style>

