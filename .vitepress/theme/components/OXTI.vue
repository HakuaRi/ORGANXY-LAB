<template>
  <div class="oxti-wrapper">
    <!-- 封面 -->
    <div v-if="phase === 'intro'" class="oxti-card intro-card">
      <div class="oxti-logo">OXTI</div>
      <p class="oxti-subtitle">Order · eXistence · Transit · Intellect</p>
      <p class="oxti-desc">20 道题，4 个维度，算出你的类型编码</p>
      <button class="oxti-btn primary" @click="phase = 'test'">开始测试</button>
    </div>
 
    <!-- 答题 -->
    <div v-else-if="phase === 'test'" class="oxti-card test-card">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progressPct + '%' }"></div>
      </div>
      <div class="progress-label">{{ currentIndex + 1 }} / {{ questions.length }}</div>
 
      <div class="dim-tag" :style="{ background: dimColor(currentQ.dim) }">
        {{ dimLabel(currentQ.dim) }}
      </div>
 
      <div class="question-text">{{ currentQ.text }}</div>
 
      <div class="options">
        <button
          v-for="opt in currentQ.options"
          :key="opt.key"
          class="option-btn"
          :class="{ selected: answers[currentIndex] === opt.key }"
          @click="select(opt.key)"
        >
          <span class="opt-key">{{ opt.key }}</span>
          <span class="opt-text">{{ opt.text }}</span>
        </button>
      </div>
 
      <div class="nav-row">
        <button class="oxti-btn ghost" :disabled="currentIndex === 0" @click="prev">← 上一题</button>
        <button
          v-if="currentIndex < questions.length - 1"
          class="oxti-btn primary"
          :disabled="answers[currentIndex] === null"
          @click="next"
        >下一题 →</button>
        <button
          v-else
          class="oxti-btn primary"
          :disabled="answers[currentIndex] === null"
          @click="calcResult"
        >查看结果 ✦</button>
      </div>
    </div>
 
    <!-- 结果 -->
    <div v-else-if="phase === 'result'" class="oxti-card result-card">
      <div class="result-code">{{ result.code }}</div>
      <div class="result-dims">
        <div v-for="d in result.dims" :key="d.letter" class="dim-chip" :style="{ borderColor: d.color }">
          <span class="chip-letter" :style="{ color: d.color }">{{ d.letter }}</span>
          <span class="chip-name">{{ d.name }}</span>
          <span class="chip-score">{{ d.score > 0 ? '+' : '' }}{{ d.score }}</span>
        </div>
      </div>
      <p class="result-desc">{{ result.desc }}</p>
      <button class="oxti-btn ghost" @click="restart">重新测试</button>
    </div>
  </div>
</template>
 
<script setup>
import { ref, computed } from 'vue'
 
const questions = [
  // ── 维度 E ──
  { dim: 'E', text: 'Q1. 你觉得你是人吗？',
    options: [{ key: 'A', text: '符合客观事实' }, { key: 'B', text: '生理结构上是，意识上存疑' }, { key: 'C', text: '"人"只是一个生物学占位符' }, { key: 'D', text: '人是什么？' }] },
  { dim: 'E', text: 'Q2. 清晨觉醒时的第一感受是：',
    options: [{ key: 'A', text: '我要呼吸然后拉尿然后' }, { key: 'B', text: '我知道我醒了' }, { key: 'C', text: '不是谁他妈在装修？' }, { key: 'D', text: '哦，我醒了吗？我以为这是梦' }] },
  { dim: 'E', text: 'Q3. 面对镜子：',
    options: [{ key: 'A', text: '确认外貌特征并整理' }, { key: 'B', text: '思考光子反射与视网膜成像的延迟' }, { key: 'C', text: '这谁，不会是我吧' }, { key: 'D', text: '这玩意怎么长得和我一样，真恶心' }] },
  { dim: 'E', text: 'Q4. 如果确认世界是高度复杂的模拟程序，你会：',
    options: [{ key: 'A', text: '那咋了，主人的任务罢了' }, { key: 'B', text: '我去，不早说' }, { key: 'C', text: '我能卡bug吗' }, { key: 'D', text: '（这种确认本身也是程序的一部分）' }] },
  { dim: 'E', text: 'Q5. 你死了。怎么定义你死了：',
    options: [{ key: 'A', text: '生物化学反应的彻底终止' }, { key: 'B', text: '删库跑路咯' }, { key: 'C', text: '能量守恒定律下的物质转移' }, { key: 'D', text: '账号已注销' }] },
  // ── 维度 L ──
  { dim: 'L', text: 'Q6. 井includ《student.h》的代码：',
    options: [{ key: 'A', text: '语法错误' }, { key: 'B', text: '只是你下错了编译器' }, { key: 'C', text: '这是文字吗' }, { key: 'D', text: '今天天气怎么样' }] },
  { dim: 'L', text: 'Q7. 这个复杂问题我没见过：',
    options: [{ key: 'A', text: '看说明书或文档' }, { key: 'B', text: '妈的东西设计出来是给别人用的，试几次不就好了' }, { key: 'C', text: '那就再找一个比这个复杂的问题' }, { key: 'D', text: '我不会，长大后再学习' }] },
  { dim: 'L', text: 'Q8. 你如何看待社会中的"潜规则"：',
    options: [{ key: 'A', text: '它是社会运行中低效率的冗余' }, { key: 'B', text: '它存在有它的道理' }, { key: 'C', text: '用它这东西的人还没开窍' }, { key: 'D', text: '妈的臭陋习，给我革新了' }] },
  { dim: 'L', text: 'Q9. 你答对这道题的概率是：',
    options: [{ key: 'A', text: '0%' }, { key: 'B', text: '25%' }, { key: 'C', text: '50%' }, { key: 'D', text: '100%' }] },
  { dim: 'L', text: 'Q10. 对于"标准答案"的存在：',
    options: [{ key: 'A', text: '我们做到了！零公差！' }, { key: 'B', text: '没事，天文学允许的误差也是误差' }, { key: 'C', text: '你说得对，但是' }, { key: 'D', text: '你说的已经过时了！' }] },
  // ── 维度 I ──
  { dim: 'I', text: 'Q11. 在多人社交场合中，你处于：',
    options: [{ key: 'A', text: '噪鹃' }, { key: 'B', text: '你一言我一语' }, { key: 'C', text: '视奸男' }, { key: 'D', text: '您当前的网络通话质量不佳' }] },
  { dim: 'I', text: 'Q12. 被挂了：',
    options: [{ key: 'A', text: '哥我错了我现在就紫砂' }, { key: 'B', text: '如何证明？' }, { key: 'C', text: '哦。' }, { key: 'D', text: '真得控制你了' }] },
  { dim: 'I', text: 'Q13. 在协助他人完成任务时：',
    options: [{ key: 'A', text: '做任务一定要有任务\\o/\\o/' }, { key: 'B', text: '我们说的是一个东西吧' }, { key: 'C', text: '我想起来再说' }, { key: 'D', text: '关我屁事' }] },
  { dim: 'I', text: 'Q14. 你处理信息的速度：',
    options: [{ key: 'A', text: '单行道谁让你逆行的？' }, { key: 'B', text: '做完你的做你的，做完你的再做你的' }, { key: 'C', text: '妈的力大砖飞，开100个脑子就好了' }, { key: 'D', text: '做着做着忘了？那就忘了吧' }] },
  { dim: 'I', text: 'Q15. 面对陌生的环境或人群：',
    options: [{ key: 'A', text: '你好😄' }, { key: 'B', text: '原来你也玩OO' }, { key: 'C', text: '所有人，给我玩OO' }, { key: 'D', text: '（似了）' }] },
  // ── 维度 O ──
  { dim: 'O', text: 'Q16. 你的电脑桌面目前的布局是：',
    options: [{ key: 'A', text: '堪比美国街区' }, { key: 'B', text: '垃圾堆也是堆！' }, { key: 'C', text: '我草我怎么桌面满了' }, { key: 'D', text: '我没电脑' }] },
  { dim: 'O', text: 'Q17. 执行长期计划的落实情况通常为：',
    options: [{ key: 'A', text: '十分甚至是九分的顺利' }, { key: 'B', text: '欸！我知道这条路更快' }, { key: 'C', text: '俺寻思……' }, { key: 'D', text: '我没说过，我没有' }] },
  { dim: 'O', text: 'Q18. 我有事情要和别人讨论：',
    options: [{ key: 'A', text: '就事论事' }, { key: 'B', text: '你这个让我想起来……' }, { key: 'C', text: '我们说到哪里了？' }, { key: 'D', text: '哦对了，那边新开了家机厅有四台舞萌' }] },
  { dim: 'O', text: 'Q19. 我对消费：',
    options: [{ key: 'A', text: '哦，不好意思没看清小数点' }, { key: 'B', text: '按照小数点后两位来算' }, { key: 'C', text: '今天是星期四V我50' }, { key: 'D', text: '那我给差评你不炸了？' }] },
  { dim: 'O', text: 'Q20. 你目前的睡眠质量：',
    options: [{ key: 'A', text: '还有这种好事？' }, { key: 'B', text: '反正死不了' }, { key: 'C', text: '原来我睡着了？' }, { key: 'D', text: '睡眠是什么' }] },
]
 
// 选项权重
const weights = {
  E: { A: -1, B: 0, C: 1, D: 2 },
  L: { A: -2, B: -1, C: 1, D: 2 },
  I: { A: -1, B: 1, C: 2, D: 0 },
  O: { A: -2, B: -1, C: 1, D: 0 },
}
 
// 得分 → 字母映射
function mapDim(dim, score) {
  const map = {
    E: score > 0 ? { letter: 'L', name: 'Logic / 抽象', color: '#7c6af7' }  : { letter: 'C', name: 'Carbon / 现实', color: '#4ade80' },
    L: score > 0 ? { letter: 'D', name: 'Dynamic / 动态', color: '#f97316' } : { letter: 'S', name: 'Static / 静态',  color: '#38bdf8' },
    I: score > 0 ? { letter: 'P', name: 'Parallel / 并行', color: '#fb7185' }: { letter: 'M', name: 'Mono / 单行',    color: '#a3e635' },
    O: score > 0 ? { letter: 'E', name: 'Entropy / 高熵', color: '#fbbf24' } : { letter: 'O', name: 'Order / 低熵',   color: '#818cf8' },
  }
  return map[dim]
}
 
// 每个字母的描述文本
const letterDescs = {
  L: '你的存在感是架空的——你活在概念里，"现实"对你来说只是操作系统的 UI 层。',
  C: '你锚定在物质世界：触摸、呼吸、身体感知构成你存在感的核心，抽象是奢侈品。',
  D: '规则在你这里是流动的，你倾向于在运行时重写逻辑，而不是提前把它锁死。',
  S: '你相信结构的力量，倾向于在稳定的规则体系里寻找确定性和安全感。',
  P: '你的交互模式是并行的：同时接收多路信号、处理多个对话频道，偶尔发生丢帧。',
  M: '你倾向于单线程处理：一次一个人，一次一件事，串行但稳定，不容易死锁。',
  E: '你的秩序观是高熵的——计划是用来被打破的，混乱是信息密度高的另一种表达。',
  O: '你偏好低熵状态：分类、排序、预期内的执行路径让你感到安全，偏差是噪声。',
}
 
// ── 状态 ──
const phase = ref('intro')
const currentIndex = ref(0)
const answers = ref(Array(questions.length).fill(null))
const result = ref(null)
 
const currentQ = computed(() => questions[currentIndex.value])
const progressPct = computed(() => (currentIndex.value / questions.length) * 100)
 
const dimLabel = d => ({ E: '存在位 [E]', L: '逻辑位 [L]', I: '交互位 [I]', O: '秩序位 [O]' }[d])
const dimColor  = d => ({ E: '#7c6af7', L: '#38bdf8', I: '#fb7185', O: '#fbbf24' }[d])
 
function select(key) { answers.value[currentIndex.value] = key }
function next()  { if (currentIndex.value < questions.length - 1) currentIndex.value++ }
function prev()  { if (currentIndex.value > 0) currentIndex.value-- }
 
function calcResult() {
  const scores = { E: 0, L: 0, I: 0, O: 0 }
  questions.forEach((q, i) => {
    const a = answers.value[i]
    if (a) scores[q.dim] += weights[q.dim][a]
  })
  const dims = ['E', 'L', 'I', 'O'].map(d => ({ ...mapDim(d, scores[d]), score: scores[d] }))
  const code = dims.map(d => d.letter).join('')
  const desc = dims.map(d => letterDescs[d.letter]).join('\n\n')
  result.value = { code, dims, desc }
  phase.value = 'result'
}
 
function restart() {
  answers.value = Array(questions.length).fill(null)
  currentIndex.value = 0
  result.value = null
  phase.value = 'intro'
}
</script>
 
<style scoped>
.oxti-wrapper {
  font-family: 'JetBrains Mono', 'Fira Code', monospace, sans-serif;
  display: flex;
  justify-content: center;
  padding: 2rem 1rem;
}
 
/* ── card ── */
.oxti-card {
  background: var(--vp-c-bg-soft, #f6f6f7);
  border: 1px solid var(--vp-c-divider, #e2e2e3);
  border-radius: 16px;
  padding: 2rem;
  width: 100%;
  max-width: 640px;
  box-shadow: 0 4px 28px rgba(0,0,0,0.07);
}
 
/* ── 封面 ── */
.intro-card { text-align: center; }
.oxti-logo {
  font-size: 3.5rem;
  font-weight: 800;
  letter-spacing: 0.3em;
  background: linear-gradient(135deg, #7c6af7 0%, #38bdf8 40%, #fb7185 70%, #fbbf24 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.3rem;
}
.oxti-subtitle {
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  color: var(--vp-c-text-2, #999);
  margin: 0 0 0.6rem;
  text-transform: uppercase;
}
.oxti-desc {
  font-size: 0.95rem;
  color: var(--vp-c-text-1, #444);
  margin-bottom: 1.8rem;
}
 
/* ── 按钮 ── */
.oxti-btn {
  padding: 0.55rem 1.5rem;
  border-radius: 8px;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  border: none;
  transition: opacity 0.15s, transform 0.15s, border-color 0.15s, color 0.15s;
  font-family: inherit;
}
.oxti-btn.primary {
  background: linear-gradient(135deg, #7c6af7, #38bdf8);
  color: #fff;
}
.oxti-btn.primary:hover:not(:disabled) { opacity: 0.85; transform: translateY(-1px); }
.oxti-btn.primary:disabled { opacity: 0.35; cursor: not-allowed; }
.oxti-btn.ghost {
  background: transparent;
  border: 1.5px solid var(--vp-c-divider, #ccc);
  color: var(--vp-c-text-1, #333);
}
.oxti-btn.ghost:hover:not(:disabled) { border-color: #7c6af7; color: #7c6af7; }
.oxti-btn.ghost:disabled { opacity: 0.35; cursor: not-allowed; }
 
/* ── 进度 ── */
.progress-bar {
  height: 4px;
  background: var(--vp-c-divider, #e2e2e3);
  border-radius: 999px;
  margin-bottom: 0.35rem;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #7c6af7, #38bdf8);
  border-radius: 999px;
  transition: width 0.3s ease;
}
.progress-label {
  font-size: 0.72rem;
  color: var(--vp-c-text-2, #999);
  text-align: right;
  margin-bottom: 1.1rem;
}
 
/* ── 维度标签 ── */
.dim-tag {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 700;
  color: #fff;
  padding: 0.18rem 0.7rem;
  border-radius: 999px;
  margin-bottom: 0.8rem;
  letter-spacing: 0.05em;
}
 
/* ── 题目 ── */
.question-text {
  font-size: 1rem;
  font-weight: 600;
  color: var(--vp-c-text-1, #222);
  line-height: 1.6;
  margin-bottom: 1.1rem;
}
 
/* ── 选项 ── */
.options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.3rem;
}
.option-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.9rem;
  border-radius: 10px;
  border: 1.5px solid var(--vp-c-divider, #ddd);
  background: var(--vp-c-bg, #fff);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, background 0.15s;
  font-family: inherit;
}
.option-btn:hover { border-color: #7c6af7; background: rgba(124,106,247,0.05); }
.option-btn.selected { border-color: #7c6af7; background: rgba(124,106,247,0.1); }
.opt-key {
  flex-shrink: 0;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 6px;
  background: var(--vp-c-bg-soft, #eee);
  display: grid;
  place-items: center;
  font-size: 0.75rem;
  font-weight: 800;
  color: #7c6af7;
}
.option-btn.selected .opt-key { background: #7c6af7; color: #fff; }
.opt-text {
  font-size: 0.88rem;
  color: var(--vp-c-text-1, #333);
  line-height: 1.5;
}
 
/* ── 导航 ── */
.nav-row {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
}
 
/* ── 结果 ── */
.result-card { text-align: center; }
.result-code {
  font-size: 3rem;
  font-weight: 800;
  letter-spacing: 0.35em;
  background: linear-gradient(135deg, #7c6af7, #38bdf8, #fb7185, #fbbf24);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 1.4rem;
}
.result-dims {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-bottom: 1.4rem;
}
.dim-chip {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  border: 2px solid;
  border-radius: 10px;
  padding: 0.4rem 0.9rem;
  background: var(--vp-c-bg, #fff);
}
.chip-letter { font-size: 1.3rem; font-weight: 800; }
.chip-name   { font-size: 0.75rem; color: var(--vp-c-text-2, #777); }
.chip-score  { font-size: 0.7rem; font-weight: 600; color: var(--vp-c-text-3, #aaa); margin-left: 0.15rem; }
.result-desc {
  font-size: 0.85rem;
  color: var(--vp-c-text-2, #555);
  line-height: 1.75;
  text-align: left;
  white-space: pre-line;
  background: var(--vp-c-bg-soft, #f6f6f7);
  border-left: 3px solid var(--vp-c-divider, #ddd);
  border-radius: 4px;
  padding: 1rem 1.1rem;
  margin-bottom: 1.4rem;
}
</style>