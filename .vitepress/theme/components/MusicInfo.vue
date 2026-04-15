<template>
  <div class="music-info" :class="{ loading }">
    <!-- Classic Ribbon Rank Badge -->
    <div class="rank-ribbon" v-if="rank">
      <span class="rank-text">{{ rank }}</span>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-placeholder">
      <div class="spinner"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-message">
      <p>⚠️ 解析失败</p>
      <button class="retry-btn" @click="load">重试</button>
    </div>

    <!-- Content Area -->
    <div v-else class="content">
      <!-- Left Info -->
      <div class="info">
        <div class="main-meta">
          <h3 class="song-name">{{ song.name }}</h3>
          <p class="artist">{{ song.artist }}</p>
          
          <!-- Personal Stats Data -->
          <div class="stats-grid">
            <div class="stat-item" v-if="playCount">
              <span class="stat-label">本周循环</span>
              <span class="stat-value">{{ playCount }}<small>次</small></span>
            </div>
            <div class="stat-item" v-if="trend !== undefined">
              <span class="stat-label">排名趋势</span>
              <span class="stat-value" :class="getTrendClass(trend)">
                {{ getTrendIcon(trend) }}{{ Math.abs(trend) || '持平' }}
              </span>
            </div>
            <div class="stat-item" v-if="firstListen">
              <span class="stat-label">第一次听</span>
              <span class="stat-value date">{{ firstListen }}</span>
            </div>
          </div>

          <div class="custom-desc" v-if="desc">
            <p>{{ desc }}</p>
          </div>
        </div>

        <div class="footer-actions">
          <a :href="`https://music.163.com/#/song?id=${songId}`" target="_blank" class="play-link">
            <span>在网易云音乐中打开</span>
            <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z"></path></svg>
          </a>
        </div>
      </div>

      <!-- Right Cover -->
      <div class="cover">
        <img :src="song.cover" :alt="song.name" loading="lazy" @error="onImgError" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  url: { type: String, required: true },
  desc: { type: String, default: '' },
  rank: { type: [String, Number], default: null },
  playCount: { type: [String, Number], default: null }, // 本周循环次数
  trend: { type: [Number, String], default: 0 },       // 排名浮动
  firstListen: { type: String, default: '' }           // 第一次听的时间
})

const loading = ref(false)
const error = ref(null)
const songId = ref('')
const song = ref({ name: '', artist: '', cover: '' })

const API_BASE = 'https://api.i-meto.com/meting/api';

function extractSongId(url) {
  if (!url) return null;
  const match = url.match(/(?:song\?id=|song\/|id=)(\d+)/);
  return match ? match[1] : (/^\d+$/.test(url) ? url : null);
}

function getTrendClass(val) {
  const n = Number(val);
  if (n > 0) return 'trend-up';
  if (n < 0) return 'trend-down';
  return 'trend-steady';
}

function getTrendIcon(val) {
  const n = Number(val);
  if (n > 0) return '↑';
  if (n < 0) return '↓';
  return '';
}

async function load() {
  const id = extractSongId(props.url);
  if (!id) {
    error.value = "无效的链接";
    return;
  }
  
  songId.value = id;
  loading.value = true;
  error.value = null;

  try {
    const songRes = await fetch(`${API_BASE}?server=netease&type=song&id=${id}`);
    if (!songRes.ok) throw new Error('API 响应异常');
    
    const songData = await songRes.json();
    const result = Array.isArray(songData) ? songData[0] : songData;

    if (!result) throw new Error('未找到歌曲数据');

    song.value = {
      name: result.name || result.title || '未知歌曲',
      artist: Array.isArray(result.artist) ? result.artist.join(' / ') : (result.artist || result.author || '未知歌手'),
      cover: result.pic || result.cover || ''
    };
  } catch (e) {
    error.value = "无法解析信息";
    console.error(e);
  } finally {
    loading.value = false;
  }
}

function onImgError(e) {
  e.target.src = 'https://p2.music.126.net/UeTuN2mvyviS0W_7p0m7Og==/109951165020545422.jpg';
}

watch(() => props.url, load, { immediate: true });
</script>

<style scoped>
.music-info {
  position: relative;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 32px;
  margin: 32px 0;
  background-color: var(--vp-c-bg-soft);
  transition: all 0.3s ease;
  overflow: hidden; /* 确保切角角标不溢出 */
}

.music-info:hover {
  border-color: var(--vp-c-brand-1);
  background-color: var(--vp-c-bg-alt);
}

/* 经典切角角标 */
.rank-ribbon {
  position: absolute;
  top: 0;
  left: 0;
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, var(--vp-c-brand-1) 50%, transparent 50%);
  z-index: 10;
}

.rank-text {
  position: absolute;
  top: 8px;
  left: 10px;
  color: #fff;
  font-weight: 900;
  font-size: 1.2rem;
  line-height: 1;
  font-family: var(--vp-font-family-mono);
}

.content {
  display: flex;
  gap: 40px;
  align-items: flex-start;
}

.info { 
  flex: 1; 
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.song-name {
  font-size: 1.8rem;
  margin: 0 0 8px 0;
  color: var(--vp-c-text-1);
  font-weight: 800;
  line-height: 1.2;
}

.artist {
  font-size: 1.1rem;
  color: var(--vp-c-brand-1);
  font-weight: 600;
  margin-bottom: 24px;
}

/* 数据看板样式 */
.stats-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20px 32px;
  margin-bottom: 24px;
}

.stat-item {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  font-weight: bold;
  text-transform: uppercase;
  margin-bottom: 4px;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.stat-value.date {
  font-size: 1rem;
  font-family: var(--vp-font-family-mono);
}

.stat-value small {
  font-size: 0.75rem;
  margin-left: 2px;
  font-weight: normal;
  color: var(--vp-c-text-2);
}

.trend-up { color: #f43f5e; }
.trend-down { color: #10b981; }
.trend-steady { color: var(--vp-c-text-3); }

.custom-desc {
  padding: 14px 18px;
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
  color: var(--vp-c-text-2);
  font-style: italic;
  font-size: 0.9rem;
  line-height: 1.6;
  border-left: 3px solid var(--vp-c-brand-3);
}

.footer-actions {
  margin-top: auto;
  padding-top: 24px;
}

.play-link {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: var(--vp-c-text-3);
  text-decoration: none;
  font-weight: 600;
  transition: color 0.2s;
}

.play-link:hover { color: var(--vp-c-brand-1); }

.cover {
  width: 300px; 
  height: 300px; 
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
  flex-shrink: 0;
}

.cover img { 
  width: 100%; 
  height: 100%; 
  object-fit: cover;
}

.loading-placeholder {
  height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--vp-c-divider);
  border-top-color: var(--vp-c-brand-1);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 1100px) {
  .cover { width: 220px; height: 220px; }
  .song-name { font-size: 1.5rem; }
}

@media (max-width: 768px) {
  .content { flex-direction: column-reverse; text-align: center; gap: 24px; }
  .cover { width: 100%; max-width: 260px; margin: 0 auto; }
  .info { align-items: center; }
  .stats-grid { justify-content: center; }
  .rank-ribbon { width: 50px; height: 50px; }
  .rank-text { font-size: 1rem; }
}
</style>