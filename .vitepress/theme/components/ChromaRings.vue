<script setup>
import { ref, computed } from 'vue'

// 时间节点数据 - 可在此增删
const timelineNodes = ref([
  { year: 2020, label: '建站', hue: 80, detail: 'Organxy Lab 建立' },
  { year: 2021, label: '探索', hue: 130, detail: '站点初步建设' },
  { year: 2022, label: '创作起点', hue: 180, detail: '2022.07.02 开始创作', highlight: true },
  { year: 2023, label: '成长', hue: 220, detail: '内容积累期' },
  { year: 2024, label: '扩展', hue: 270, detail: '项目与笔记丰富' },
  { year: 2025, label: '沉淀', hue: 310, detail: '持续创作' },
  { year: 2026, label: '此刻', hue: 350, detail: '4周年 & 6周年', highlight: true },
])

const activeNode = ref(null)

function toggleNode(node) {
  activeNode.value = activeNode.value === node ? null : node
}

function addNode() {
  const last = timelineNodes.value[timelineNodes.value.length - 1]
  timelineNodes.value.push({
    year: last ? last.year + 1 : 2027,
    label: '新节点',
    hue: last ? (last.hue + 40) % 360 : 30,
    detail: '编辑此描述',
    highlight: false
  })
}

function removeNode(index) {
  if (timelineNodes.value.length > 2) {
    timelineNodes.value.splice(index, 1)
  }
}
</script>

<template>
  <div class="rings-page">
    <div class="rings-bg">
      <svg viewBox="0 0 600 600" class="rings-svg">
        <defs>
          <radialGradient id="centerGlow">
            <stop offset="0%" stop-color="rgba(165, 204, 22, 0.08)" />
            <stop offset="100%" stop-color="rgba(165, 204, 22, 0)" />
          </radialGradient>
        </defs>
        <circle cx="300" cy="300" r="20" fill="url(#centerGlow)" />

        <g v-for="(node, i) in timelineNodes" :key="node.year">
          <circle
            cx="300" cy="300"
            :r="50 + i * 38"
            fill="none"
            :stroke="`hsla(${node.hue}, 55%, 50%, ${node.highlight ? 0.45 : 0.15 + i * 0.04})`"
            :stroke-width="node.highlight ? 3.5 : 2"
            @click="toggleNode(node)"
            style="cursor: pointer; transition: stroke-width 0.3s;"
          />
          <text
            :x="300 + (50 + i * 38) * Math.cos(-Math.PI / 2)"
            :y="300 + (50 + i * 38) * Math.sin(-Math.PI / 2) - 12"
            text-anchor="middle"
            :fill="`hsla(${node.hue}, 45%, 60%, ${node.highlight ? 1 : 0.4})`"
            :font-size="node.highlight ? 13 : 10"
            :font-weight="node.highlight ? 600 : 400"
            class="ring-year"
          >{{ node.year }}</text>
        </g>
      </svg>
    </div>

    <div class="rings-content">
      <div class="section-label">
        <span class="label-line"></span>
        <span class="label-text">时间轴</span>
        <span class="label-line"></span>
      </div>

      <h2 class="section-title">色相年轮</h2>

      <div class="nodes-list">
        <div
          v-for="(node, index) in timelineNodes"
          :key="node.year"
          class="node-item"
          :class="{ 'is-active': activeNode === node, 'is-highlight': node.highlight }"
          @click="toggleNode(node)"
        >
          <span
            class="node-dot"
            :style="{ backgroundColor: `hsl(${node.hue}, 55%, 55%)` }"
          ></span>
          <span class="node-year">{{ node.year }}</span>
          <span class="node-label">{{ node.label }}</span>
          <span v-if="activeNode === node" class="node-detail">{{ node.detail }}</span>
          <button
            v-if="timelineNodes.length > 2"
            class="node-remove"
            @click.stop="removeNode(index)"
          >&times;</button>
        </div>

        <button class="add-btn" @click="addNode">
          <span>+ 添加节点</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rings-page {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  background: linear-gradient(180deg, #08080c 0%, #0c0c14 50%, #08080c 100%);
  overflow: hidden;
}

.rings-bg {
  position: absolute;
  bottom: -10%;
  right: -10%;
  width: 70%;
  max-width: 500px;
  opacity: 0.6;
  pointer-events: none;
}

.rings-svg {
  width: 100%;
  height: auto;
}

.ring-year {
  font-family: 'Inter', system-ui, sans-serif;
  letter-spacing: 0.05em;
}

.rings-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 440px;
}

.section-label {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.label-line {
  width: 28px;
  height: 1px;
  background: rgba(165, 204, 22, 0.25);
}

.label-text {
  font-size: 0.7rem;
  letter-spacing: 0.2em;
  color: rgba(165, 204, 22, 0.4);
  text-transform: uppercase;
}

.section-title {
  font-size: clamp(1.4rem, 3vw, 2rem);
  font-weight: 300;
  letter-spacing: 0.3em;
  color: rgba(255, 255, 255, 0.5);
  margin: 0 0 32px;
}

.nodes-list {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 55vh;
  overflow-y: auto;
}

.node-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.015);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  flex-wrap: wrap;
}

.node-item:hover {
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(255, 255, 255, 0.08);
}

.node-item.is-active {
  background: rgba(165, 204, 22, 0.035);
  border-color: rgba(165, 204, 22, 0.12);
}

.node-item.is-highlight {
  border-color: rgba(165, 204, 22, 0.15);
}

.node-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.node-year {
  font-size: 0.8rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.4);
  min-width: 36px;
  font-variant-numeric: tabular-nums;
}

.node-label {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
}

.node-detail {
  width: 100%;
  margin-top: 2px;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.3);
  padding-left: 18px;
}

.node-remove {
  margin-left: auto;
  background: none;
  border: none;
  color: rgba(255, 100, 100, 0.3);
  font-size: 1.1rem;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  opacity: 0;
  transition: all 0.2s;
}

.node-item:hover .node-remove {
  opacity: 1;
}

.node-remove:hover {
  color: rgba(255, 100, 100, 0.6);
  background: rgba(255, 100, 100, 0.08);
}

.add-btn {
  width: 100%;
  padding: 10px;
  background: rgba(255, 255, 255, 0.015);
  border: 1px dashed rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.25);
  cursor: pointer;
  transition: all 0.3s;
  font-size: 0.8rem;
  letter-spacing: 0.05em;
}

.add-btn:hover {
  background: rgba(165, 204, 22, 0.035);
  border-color: rgba(165, 204, 22, 0.15);
  color: rgba(165, 204, 22, 0.45);
}
</style>