<template>
  <div v-if="isHome" class="event-card-container">
    <div class="carousel-viewport">
      <div 
        class="carousel-track" 
        :style="{ transform: `translateX(-${currentIndex * 100}%)` }"
      >
        <a 
          v-for="(item, index) in slides" 
          :key="index" 
          :href="item.link" 
          class="slide-item"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img :src="item.img" :alt="item.title" />
          <div class="slide-overlay">
            <span class="slide-title">{{ item.title }}</span>
          </div>
        </a>
      </div>
    </div>
    
    <div class="carousel-dots">
      <span 
        v-for="(_, index) in slides" 
        :key="index" 
        :class="{ active: currentIndex === index }"
        @click="currentIndex = index"
      ></span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useData } from 'vitepress'

const { frontmatter } = useData()
const isHome = computed(() => frontmatter.value.layout === 'home')

// 这里配置你的图片、链接和标题
const slides = ref([
  { img: '/img/event1.jpg', link: '/tools/osu展示', title: 'Rhythm Tool Update' },
  { img: '/pic/img_1.jpg', link: '', title: '这是啥' },
  { img: '/img/event3.jpg', link: '', title: 'GitHub Repo' }
])

const currentIndex = ref(0)
let timer = null

const startAutoPlay = () => {
  timer = setInterval(() => {
    currentIndex.value = (currentIndex.value + 1) % slides.value.length
  }, 3000) // 4秒切换一次
}

onMounted(() => {
  if (isHome.value) startAutoPlay()
})

onUnmounted(() => {
  clearInterval(timer)
})
</script>

<style scoped>
.event-card-container {
  position: fixed;
  bottom: 30px;
  left: 30px;
  width: 280px;
  height: 160px;
  background: #fff;
  border-radius: 12px; /* 圆角矩形 */
  overflow: hidden;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(0, 0, 0, 0.1);
  z-index: 100;
  transition: transform 0.3s ease;
}

.event-card-container:hover {
  transform: translateY(-5px); /* 悬停微动 */
}

.carousel-viewport {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.carousel-track {
  display: flex;
  width: 100%;
  height: 100%;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-item {
  min-width: 100%;
  height: 100%;
  position: relative;
  display: block;
}

.slide-item img {
  width: 100%;
  height: 100%;
  object-fit: cover; /* 保证图片不变形 */
  display: block;
}

/* 渐变遮罩，方便看清标题 */
.slide-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 10px 15px;
  background: linear-gradient(transparent, rgba(0,0,0,0.7));
  color: #fff;
}

.slide-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.carousel-dots {
  position: absolute;
  bottom: 10px;
  right: 15px;
  display: flex;
  gap: 6px;
}

.carousel-dots span {
  width: 6px;
  height: 6px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  cursor: pointer;
}

.carousel-dots span.active {
  background: #fff;
  width: 12px;
  border-radius: 3px;
}
</style>