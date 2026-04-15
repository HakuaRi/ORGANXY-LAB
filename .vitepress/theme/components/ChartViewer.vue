<script setup>
import { ref } from 'vue'

// ─────────────────────────────────────────────
//  JSZip 动态导入（避免 VitePress SSR 报错）
// ─────────────────────────────────────────────
let _JSZip = null
async function loadJSZip() {
  if (!_JSZip) {
    const mod = await import('jszip')
    _JSZip = mod.default
  }
  return _JSZip
}

// =====================================================================
//  常量（完全对应 chartCore.py）
// =====================================================================
const CANVAS_HEIGHT        = 3072
const VERTICAL_SECTION_COUNT = 16
const MARGIN               = 200
const TRACK_TOTAL_WIDTH    = 240
const TRACK_COUNT          = 4
const UNIT_PADDING_RATIO   = 5 / 8
const TRACK_WIDTH          = TRACK_TOTAL_WIDTH / TRACK_COUNT   // 60
const TRACK_PADDING        = 8

// 配色
const BG_COLOR          = '#121218'
const COLUMN_BG_COLOR   = '#1c1c24'
const LINE_MAIN         = '#5a5a6e'
const LINE_SUB          = '#2d2d37'
const TAP_COLOR         = '#6978a8'
const TAP_COLOR_01      = '#adbde1'
const HOLD_COLOR        = '#bfa5d7'
const BPM_COLOR         = '#ffd200'
const BAR_NUM_COLOR     = '#646982'
const TIME_COLOR        = '#50556e'
const SONG_TITLE_COLOR  = '#ffffff'
const SONG_INFO_COLOR   = '#8c91a0'
const STAT_LABEL_COLOR  = '#646982'
const STAT_VALUE_COLOR  = '#c8cddc'

const V14_4K_X  = [64, 192, 320, 448]
const FIXED_DEN = 768
const FRAC_BASE = 768
const FRAC_TOLERANCE = 4

// =====================================================================
//  节拍分数运算（对应 fraction.py 核心）
// =====================================================================
function fracToAbs([x, y, z]) {
  return x * FRAC_BASE + Math.round((y / z) * FRAC_BASE)
}

function fracProcessBeat([x, y, z]) {
  const absVal  = fracToAbs([x, y, z])
  const nextBeat = (Math.floor(absVal / FRAC_BASE) + 1) * FRAC_BASE
  if (nextBeat - absVal <= FRAC_TOLERANCE) return [x + 1, 0, z]
  if (absVal % FRAC_BASE <= FRAC_TOLERANCE) return [x, 0, z]
  return [x, y, z]
}

function fracDeduplicate(notesProc) {
  const res = []
  for (const n of notesProc) {
    if (!res.length) { res.push(n); continue }
    const lastAbs = fracToAbs(res[res.length - 1].orig)
    const currAbs = fracToAbs(n.orig)
    if (Math.abs(currAbs - lastAbs) <= FRAC_TOLERANCE) continue
    res.push(n)
  }
  return res
}

function fracCalcDelta(a, b) {
  const delta = fracToAbs(b.orig) - fracToAbs(a.orig)
  return { delta, final: delta > FRAC_BASE ? 1 : delta }
}

function fracDeltaToCriterion(delta) {
  const mapping = {
    768: '1',  384: '2',  576: '2.',
    256: '3',  192: '4',  288: '4.',
    128: '6',   96: '8',  144: '8.',
     64: '12',  48: '16',  32: '24',
     24: '32',  16: '68',  12: '64',
  }
  const keys = Object.keys(mapping).map(Number)
  const closest = keys.reduce((a, b) =>
    Math.abs(b - delta) < Math.abs(a - delta) ? b : a
  )
  return mapping[closest]
}

function parseBeat([bar, pos, div]) {
  return bar + pos / div
}

function beatArrayFromFloat(f) {
  const bar = Math.floor(f)
  let num = Math.round((f - bar) * FIXED_DEN)
  if (num >= FIXED_DEN) return [bar + 1, 0, FIXED_DEN]
  return [bar, num, FIXED_DEN]
}

// =====================================================================
//  .osu 解析 + osu→mc 转换
// =====================================================================
function parseOsuSections(content) {
  const sections = {}
  let sec = null, lines = []
  const firstLine = content.split('\n')[0]?.trim() ?? ''
  const osuVersion = firstLine.includes('v14') ? 'v14' : 'v128'

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('//')) continue
    if (line.startsWith('[') && line.endsWith(']')) {
      if (sec) sections[sec] = lines
      sec = line.slice(1, -1); lines = []
    } else if (sec) {
      lines.push(line)
    }
  }
  if (sec) sections[sec] = lines
  sections._version = osuVersion
  return sections
}

function coreOsuToMc(content) {
  const sections = parseOsuSections(content)
  const ver      = sections._version
  const metadata = sections.Metadata  ?? []
  const diffLines = sections.Difficulty ?? []

  let title = 'Unknown', artist = 'Unknown', creator = 'Unknown', version = 'Unknown'
  let columns = 4

  for (const l of metadata) {
    if (l.startsWith('Title:'))   title   = l.split(':').slice(1).join(':').trim()
    if (l.startsWith('Artist:'))  artist  = l.split(':').slice(1).join(':').trim()
    if (l.startsWith('Creator:')) creator = l.split(':').slice(1).join(':').trim()
    if (l.startsWith('Version:')) version = l.split(':').slice(1).join(':').trim()
  }
  for (const l of diffLines) {
    if (l.startsWith('CircleSize:')) columns = parseInt(l.split(':')[1].trim())
  }

  const hitObjects = sections.HitObjects ?? []
  if (!hitObjects.length) return null

  const firstNoteMs = Math.min(
    ...hitObjects.filter(l => l.split(',').length > 2).map(l => parseInt(l.split(',')[2]))
  )

  // 解析红线
  let tps = []
  for (const l of (sections.TimingPoints ?? [])) {
    const p = l.split(',')
    if (p.length < 8) continue
    if (parseInt(p[6]) === 1) {
      tps.push({ offset: parseFloat(p[0]), bpm: 60000 / parseFloat(p[1]) })
    }
  }
  tps.sort((a, b) => a.offset - b.offset)
  if (!tps.length) tps = [{ offset: 0, bpm: 120 }]

  // 对齐校准：让第一个音符 = beat 0
  tps[0] = { offset: firstNoteMs, bpm: tps[0].bpm }

  // 构建 timingMap
  const timingMap = []
  const timeEvents = []
  let currentBeat = 0.0, lastMs = tps[0].offset, lastBpm = tps[0].bpm

  timingMap.push([currentBeat, lastMs, lastBpm])
  timeEvents.push({ beat: beatArrayFromFloat(currentBeat), bpm: lastBpm })

  for (const tp of tps.slice(1)) {
    currentBeat += (tp.offset - lastMs) * lastBpm / 60000.0
    timingMap.push([currentBeat, tp.offset, tp.bpm])
    timeEvents.push({ beat: beatArrayFromFloat(currentBeat), bpm: tp.bpm })
    lastMs = tp.offset; lastBpm = tp.bpm
  }

  function msToBeat(ms) {
    let idx = 0
    for (let i = 0; i < timingMap.length; i++) {
      if (timingMap[i][1] > ms) break
      idx = i
    }
    const [sb, sm, bpm] = timingMap[idx]
    return sb + (ms - sm) * bpm / 60000.0
  }

  // 音符
  const notes = []
  for (const l of hitObjects) {
    const p = l.split(',')
    if (p.length < 5) continue
    const x = parseInt(parseFloat(p[0]))
    const timeMs = parseInt(p[2])
    const objType = parseInt(p[3])

    let col
    if (ver === 'v14' && columns === 4) {
      col = V14_4K_X.indexOf(x)
      if (col < 0) col = 0
    } else {
      col = Math.max(0, Math.min(columns - 1, Math.floor(x * columns / 512)))
    }

    const note = { beat: beatArrayFromFloat(msToBeat(timeMs)), column: col }
    if (objType & 128) {
      note.endbeat = beatArrayFromFloat(msToBeat(parseInt(p[5].split(':')[0])))
    }
    notes.push(note)
  }

  return {
    meta: { creator, version, mode: 0, song: { title, artist, column: columns } },
    time: timeEvents,
    note: notes,
    offset: firstNoteMs,
    timing_map: timingMap,
  }
}

// =====================================================================
//  压缩包内谱面信息提取
// =====================================================================
function getInfoFromString(content, fileType) {
  const info = { version: 'Unknown', creator: 'Unknown', bg: null }
  if (fileType === 'osu') {
    const v = content.match(/^Version:(.*)$/m)
    const c = content.match(/^Creator:(.*)$/m)
    const b = content.match(/\[Events\][\s\S]*?\n0,0,["']?(.*?)["']?,0,0/)
    if (v) info.version  = v[1].trim()
    if (c) info.creator  = c[1].trim()
    if (b) info.bg       = b[1].trim()
  } else {
    try {
      const d = JSON.parse(content)
      info.version = d.meta?.version ?? 'Unknown'
      info.creator = d.meta?.creator ?? 'Unknown'
      info.bg      = d.meta?.background ?? null
    } catch {}
  }
  return info
}

// =====================================================================
//  坐标工具
// =====================================================================
function getUnitXRange(unitIdx, unitW, unitP) {
  const x = MARGIN + unitIdx * (unitW + unitP)
  return [x, x + unitW]
}

function barToPixel(barPos, column, unitW, unitP) {
  const sectionH = (CANVAS_HEIGHT - 2 * MARGIN) / VERTICAL_SECTION_COUNT
  const unitIdx  = Math.floor(barPos / VERTICAL_SECTION_COUNT)
  const innerBar = barPos % VERTICAL_SECTION_COUNT
  const [ux]     = getUnitXRange(unitIdx, unitW, unitP)
  const x        = ux + column * (TRACK_WIDTH + TRACK_PADDING) + 4.5
  const y        = CANVAS_HEIGHT - MARGIN - innerBar * sectionH
  return [x, y, sectionH, unitIdx]
}

function barToTimePrecise(barPos, timingMap, timeEvents, offsetMs) {
  let totalMs = offsetMs ?? 0

  if (timingMap?.length) {
    let [prevBeat, , prevBpm] = timingMap[0]
    if (barPos > prevBeat) {
      let done = false
      for (let i = 1; i < timingMap.length; i++) {
        const [cb, , cbpm] = timingMap[i]
        if (barPos <= cb) {
          totalMs += (barPos - prevBeat) * 60000 / prevBpm
          done = true; break
        }
        totalMs += (cb - prevBeat) * 60000 / prevBpm
        prevBeat = cb; prevBpm = cbpm
      }
      if (!done) totalMs += (barPos - prevBeat) * 60000 / prevBpm
    }
  }

  const s = totalMs / 1000
  const m = Math.floor(s / 60)
  const ss = Math.floor(s % 60)
  const ms = Math.round((s - Math.floor(s)) * 1000)
  return `${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}.${String(ms).padStart(3,'0')}`
}

function getNoteBounds(notes) {
  const vals = [0]
  for (const n of notes) {
    try {
      vals.push(parseBeat(n.beat))
      if (n.endbeat) vals.push(parseBeat(n.endbeat))
    } catch {}
  }
  return [Math.min(...vals), Math.max(...vals)]
}

function normalizeEdgeNotes(notes) {
  for (const n of notes) {
    if (!n.beat) continue
    if (n.beat[2] === FIXED_DEN && n.beat[1] === 767) n.beat = [n.beat[0] + 1, 0, FIXED_DEN]
    if (n.endbeat?.[2] === FIXED_DEN && n.endbeat?.[1] === 767)
      n.endbeat = [n.endbeat[0] + 1, 0, FIXED_DEN]
  }
  return notes
}

// =====================================================================
//  Canvas 绘图函数（逐一对应 Python 版）
// =====================================================================
function drawGrid(ctx, totalUnits, unitW, unitP) {
  const sectionH = (CANVAS_HEIGHT - 2 * MARGIN) / VERTICAL_SECTION_COUNT
  const subdivH  = sectionH / 4

  // 轨道背景
  ctx.fillStyle = COLUMN_BG_COLOR
  for (let u = 0; u < totalUnits; u++) {
    const [x1] = getUnitXRange(u, unitW, unitP)
    ctx.fillRect(x1, MARGIN, TRACK_TOTAL_WIDTH + 30, CANVAS_HEIGHT - 2 * MARGIN)
  }

  // 主拍线
  ctx.strokeStyle = LINE_MAIN; ctx.lineWidth = 1
  for (let i = 0; i <= VERTICAL_SECTION_COUNT; i++) {
    const y = MARGIN + i * sectionH
    for (let u = 0; u < totalUnits; u++) {
      const [x1] = getUnitXRange(u, unitW, unitP)
      ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x1 + 270, y); ctx.stroke()
    }
  }

  // 次拍线
  ctx.strokeStyle = LINE_SUB; ctx.lineWidth = 1
  for (let u = 0; u < totalUnits; u++) {
    const [x1] = getUnitXRange(u, unitW, unitP)
    for (let i = 0; i < VERTICAL_SECTION_COUNT; i++) {
      const base = MARGIN + i * sectionH
      for (let sub = 1; sub < 4; sub++) {
        ctx.beginPath()
        ctx.moveTo(x1, base + sub * subdivH)
        ctx.lineTo(x1 + 270, base + sub * subdivH)
        ctx.stroke()
      }
    }
  }

  // 纵向轨道分隔线
  ctx.strokeStyle = LINE_MAIN; ctx.lineWidth = 3
  for (let u = 0; u < totalUnits; u++) {
    const [x] = getUnitXRange(u, unitW, unitP)
    for (let c = 0; c <= TRACK_COUNT; c++) {
      const cx = x + c * (TRACK_WIDTH + TRACK_PADDING)
      ctx.beginPath(); ctx.moveTo(cx, MARGIN); ctx.lineTo(cx, CANVAS_HEIGHT - MARGIN); ctx.stroke()
    }
  }
}

function drawLeftText(ctx, mcData, unitW, unitP, maxBar) {
  const sectionH  = (CANVAS_HEIGHT - 2 * MARGIN) / VERTICAL_SECTION_COUNT
  const totalUnits = Math.floor(maxBar / VERTICAL_SECTION_COUNT) + 1
  const timingMap  = mcData.timing_map ?? []
  const offset     = mcData.offset ?? 0

  ctx.textBaseline = 'top'

  for (let u = 0; u < totalUnits; u++) {
    const [x] = getUnitXRange(u, unitW, unitP)
    for (let i = 0; i < VERTICAL_SECTION_COUNT; i++) {
      const bn = u * VERTICAL_SECTION_COUNT + i
      const y  = CANVAS_HEIGHT - MARGIN - i * sectionH - 10

      ctx.fillStyle = BAR_NUM_COLOR
      ctx.font = 'bold 20px monospace'
      ctx.fillText(`${bn + 1}`, x - 60, y)

      ctx.fillStyle = TIME_COLOR
      ctx.font = '12px monospace'
      ctx.fillText(barToTimePrecise(bn, timingMap, mcData.time, offset), x - 82, y + 24)
    }
  }

  // BPM 标注
  ctx.textBaseline = 'top'
  ctx.fillStyle = BPM_COLOR
  ctx.font = '14px monospace'
  for (const t of mcData.time) {
    const b = parseBeat(t.beat)
    const [x, y] = barToPixel(b, 0, unitW, unitP)
    ctx.fillText(`${Math.floor(t.bpm)}`, x - 30, y - 10)
  }
}

function drawHold(ctx, col, unit, y1, y2, unitW, unitP) {
  const [ux] = getUnitXRange(unit, unitW, unitP)
  const rx   = ux + col * (TRACK_WIDTH + TRACK_PADDING) + 3
  ctx.fillStyle = HOLD_COLOR
  ctx.fillRect(rx + 3, Math.min(y1, y2), TRACK_WIDTH - 6, Math.abs(y2 - y1))
}

function drawSongInfo(ctx, mcData, bgImg) {
  const meta = mcData.meta ?? {}
  const song = meta.song ?? {}
  const x = MARGIN, y = 72   // CANVAS_HEIGHT-100 上边距 = 3072-100-2900 = 72

  if (bgImg) {
    try {
      const tw = 275, th = 100
      const scale = Math.max(tw / bgImg.naturalWidth, th / bgImg.naturalHeight)
      const dw = bgImg.naturalWidth * scale, dh = bgImg.naturalHeight * scale
      const sl = (dw - tw) / 2 / scale, st = (dh - th) / 2 / scale
      ctx.drawImage(bgImg, sl, st, tw / scale, th / scale, x, y, tw, th)
    } catch (e) { console.warn('bg image failed', e) }
  }

  ctx.textBaseline = 'top'
  ctx.fillStyle = SONG_TITLE_COLOR
  ctx.font = 'bold 48px sans-serif'
  ctx.fillText(`${song.title ?? ''} - ${song.artist ?? ''}`, x + 380, y)

  ctx.fillStyle = SONG_INFO_COLOR
  ctx.font = '32px sans-serif'
  ctx.fillText(`Creator: ${meta.creator ?? ''} | Ver: ${meta.version ?? ''}`, x + 380, y + 60)
}

function drawStatistics(ctx, mcData, maxBar) {
  const notes    = mcData.note ?? []
  const tapCount  = notes.filter(n => !n.endbeat).length
  const holdCount = notes.filter(n => n.endbeat).length
  const firstBpm  = mcData.time?.[0]?.bpm ?? 0
  const duration  = barToTimePrecise(maxBar, mcData.timing_map, mcData.time, mcData.offset ?? 0)

  const bx = 200, by = CANVAS_HEIGHT - 140
  ctx.textBaseline = 'top'

  const row = (label, value, vColor, ox, oy) => {
    ctx.fillStyle = STAT_LABEL_COLOR; ctx.font = '24px monospace'
    ctx.fillText(label, bx + ox, by + oy)
    ctx.fillStyle = vColor;           ctx.font = 'bold 28px monospace'
    ctx.fillText(value, bx + ox + 130, by + oy - 4)
  }

  row('MEASURES:', `${Math.floor(maxBar) + 1}`, STAT_VALUE_COLOR, 0, 0)
  row('LENGTH:',   duration,                     STAT_VALUE_COLOR, 240, 0)
  row('BASE BPM:', `${Math.floor(firstBpm)}`,    BPM_COLOR,       520, 0)
  row('TOTAL:',   `${tapCount + holdCount}`,     STAT_VALUE_COLOR, 0, 50)
  row('TAP:',     `${tapCount}`,                 TAP_COLOR,       240, 50)
  row('HOLD:',    `${holdCount}`,                HOLD_COLOR,      520, 50)
}

// =====================================================================
//  主渲染函数（对应 generate_chart_image）
// =====================================================================
async function generateChartCanvas(mcData, bgImg = null) {
  mcData.note = normalizeEdgeNotes(mcData.note)
  const notes = mcData.note
  const [, maxB] = getNoteBounds(notes)
  const unitW = TRACK_TOTAL_WIDTH
  const unitP = Math.floor(unitW * UNIT_PADDING_RATIO)
  const totalU = Math.floor(maxB / VERTICAL_SECTION_COUNT) + 1
  const canvasW = MARGIN + totalU * (unitW + unitP) + MARGIN

  const canvas = document.createElement('canvas')
  canvas.width  = Math.floor(canvasW)
  canvas.height = CANVAS_HEIGHT
  const ctx = canvas.getContext('2d')

  // 背景
  ctx.fillStyle = BG_COLOR
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  drawGrid(ctx, totalU, unitW, unitP)
  drawLeftText(ctx, mcData, unitW, unitP, maxB)
  drawSongInfo(ctx, mcData, bgImg)
  drawStatistics(ctx, mcData, maxB)

  // ── 预处理：节拍归整 + 去重 ──
  const processedNotes = []
  for (let i = 0; i < notes.length; i++) {
    const n = notes[i]
    if (!('beat' in n) || !('column' in n)) continue
    processedNotes.push({
      orig:     n.beat,
      proc:     fracProcessBeat(n.beat),
      abs:      fracToAbs(n.beat),
      note_obj: n,
    })
  }
  const finalNotes = fracDeduplicate(processedNotes)

  // ── 分音标记 map ──
  const fracDrawMap = new Map()
  for (let i = 0; i < finalNotes.length - 1; i++) {
    const { delta } = fracCalcDelta(finalNotes[i], finalNotes[i + 1])
    fracDrawMap.set(parseBeat(finalNotes[i].orig), fracDeltaToCriterion(delta))
  }
  if (finalNotes.length) {
    const last = finalNotes[finalNotes.length - 1]
    const [, num, den] = last.proc
    fracDrawMap.set(
      parseBeat(last.orig),
      fracDeltaToCriterion(Math.floor((num / den) * 768))
    )
  }

  // ── 绘制音符 ──
  for (const note of notes) {
    if (!('column' in note) || !('beat' in note)) continue
    const col = note.column
    const [x, ys, sh, unit] = barToPixel(parseBeat(note.beat), col, unitW, unitP)
    const nh = sh / 24

    if (!note.endbeat) {
      ctx.fillStyle = (col === 1 || col === 2) ? TAP_COLOR_01 : TAP_COLOR
      ctx.fillRect(x + 3, ys - nh, TRACK_WIDTH - 6, nh)
    } else {
      const [, ye, , eunit] = barToPixel(parseBeat(note.endbeat), col, unitW, unitP)
      const yeAdj = ye - sh / 24

      if (unit === eunit) {
        drawHold(ctx, col, unit, ys, yeAdj, unitW, unitP)
      } else {
        drawHold(ctx, col, unit, MARGIN, ys, unitW, unitP)
        for (let u = unit + 1; u < eunit; u++)
          drawHold(ctx, col, u, MARGIN, CANVAS_HEIGHT - MARGIN, unitW, unitP)
        drawHold(ctx, col, eunit, yeAdj, CANVAS_HEIGHT - MARGIN, unitW, unitP)
      }
    }
  }

  // ── 绘制分音标记 ──
  ctx.textBaseline = 'top'
  ctx.fillStyle = BPM_COLOR
  ctx.font = '14px monospace'
  const drawn = new Set()
  for (const note of finalNotes) {
    const bVal = parseBeat(note.orig)
    if (!drawn.has(bVal) && fracDrawMap.has(bVal) && 'column' in note.note_obj) {
      drawn.add(bVal)
      const [, ys, , unitIdx] = barToPixel(bVal, note.note_obj.column, unitW, unitP)
      const [unitX] = getUnitXRange(unitIdx, unitW, unitP)
      ctx.fillText(fracDrawMap.get(bVal), unitX + 276, ys - 10)
    }
  }

  return canvas
}

// =====================================================================
//  文件处理流程
// =====================================================================
const isDragging    = ref(false)
const isProcessing  = ref(false)
const status        = ref('')
const errorMsg      = ref('')
const resultDataUrl = ref(null)   // 最终生成的图片 data URL
const chartList     = ref([])     // 多谱面时的选择列表
const pendingZip    = ref(null)   // { zip, fileType, allFiles }
const showPicker    = ref(false)

const fileInputRef  = ref(null)

function loadImageEl(src) {
  return new Promise((res, rej) => {
    const img = new Image()
    img.onload = () => res(img)
    img.onerror = rej
    img.src = src
  })
}

async function handleFiles(files) {
  const file = files[0]
  if (!file) return

  errorMsg.value      = ''
  resultDataUrl.value = null
  showPicker.value    = false
  pendingZip.value    = null
  status.value        = '读取文件…'
  isProcessing.value  = true

  try {
    const ext = file.name.split('.').pop().toLowerCase()
    if (['osz', 'mcz', 'zip'].includes(ext)) {
      await handleZip(file)
    } else if (ext === 'osu') {
      const mcData = coreOsuToMc(await file.text())
      if (!mcData) throw new Error('.osu 解析失败')
      await renderChart(mcData, null)
    } else if (ext === 'mc' || ext === 'json') {
      await renderChart(JSON.parse(await file.text()), null)
    } else {
      throw new Error(`不支持的格式：.${ext}`)
    }
  } catch (e) {
    errorMsg.value = e.message
    status.value = ''
  } finally {
    isProcessing.value = false
  }
}

async function handleZip(file) {
  const JSZip  = await loadJSZip()
  const zip    = await JSZip.loadAsync(await file.arrayBuffer())
  const all    = Object.keys(zip.files)
  const ext    = file.name.split('.').pop().toLowerCase()

  let charts, fileType
  if (ext === 'osz') {
    charts   = all.filter(f => f.toLowerCase().endsWith('.osu'))
    fileType = 'osu'
  } else {
    charts   = all.filter(f => f.toLowerCase().endsWith('.mc') && !f.includes('/'))
    if (!charts.length)
      charts = all.filter(f => f.toLowerCase().endsWith('.mc') && f.startsWith('0/'))
    if (!charts.length)
      charts = all.filter(f => f.toLowerCase().endsWith('.osu'))
    fileType = charts.some(f => f.endsWith('.osu')) ? 'osu' : 'mc'
  }

  if (!charts.length) throw new Error('压缩包内未找到谱面文件')

  if (charts.length === 1) {
    await processChartFromZip(zip, charts[0], fileType, all)
  } else {
    status.value = '加载谱面列表…'
    const list = []
    for (const f of charts) {
      const content = await zip.files[f].async('text')
      list.push({ path: f, ...getInfoFromString(content, fileType) })
    }
    chartList.value  = list
    pendingZip.value = { zip, fileType, allFiles: all }
    showPicker.value = true
    status.value     = ''
    isProcessing.value = false
  }
}

async function selectChart(chartPath) {
  showPicker.value   = false
  isProcessing.value = true
  status.value       = '解析谱面…'
  const { zip, fileType, allFiles } = pendingZip.value
  try {
    await processChartFromZip(zip, chartPath, fileType, allFiles)
  } catch (e) {
    errorMsg.value = e.message
  } finally {
    isProcessing.value = false
  }
}

async function processChartFromZip(zip, chartPath, fileType, allFiles) {
  const content = await zip.files[chartPath].async('text')
  const info    = getInfoFromString(content, fileType)

  // 背景图
  let bgImg = null
  if (info.bg) {
    const bgName = info.bg.replace(/\\/g, '/').toLowerCase()
    const bgFile = allFiles.find(f => f.toLowerCase().endsWith(bgName))
    if (bgFile) {
      try {
        const b64  = await zip.files[bgFile].async('base64')
        const mime = /png$/i.test(bgFile) ? 'image/png' : 'image/jpeg'
        bgImg      = await loadImageEl(`data:${mime};base64,${b64}`)
      } catch {}
    }
  }

  const mcData = fileType === 'osu'
    ? coreOsuToMc(content)
    : JSON.parse(content)

  if (!mcData) throw new Error('谱面数据解析失败')
  await renderChart(mcData, bgImg)
}

async function renderChart(mcData, bgImg) {
  status.value = '渲染中，请稍候…'
  await new Promise(r => setTimeout(r, 30))   // 让 spinner 先渲染
  const canvas = await generateChartCanvas(mcData, bgImg)
  resultDataUrl.value = canvas.toDataURL('image/png')
  status.value = '✅ 完成'
}

function downloadPng() {
  if (!resultDataUrl.value) return
  const a = document.createElement('a')
  a.download = `chart-${Date.now()}.png`
  a.href = resultDataUrl.value
  a.click()
}

function reset() {
  resultDataUrl.value = null
  errorMsg.value = ''
  status.value   = ''
  showPicker.value = false
}

// Drag & drop
const onDragOver  = (e) => { e.preventDefault(); isDragging.value = true  }
const onDragLeave = (e) => { e.preventDefault(); isDragging.value = false }
const onDrop      = (e) => {
  e.preventDefault(); isDragging.value = false
  handleFiles(Array.from(e.dataTransfer.files))
}
const onFileChange = (e) => handleFiles(Array.from(e.target.files))
const triggerUpload = () => fileInputRef.value?.click()
</script>

<!-- ══════════════════════ TEMPLATE ══════════════════════ -->
<template>
  <div
    class="cv-root"
    :class="{ 'cv-dragging': isDragging }"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >

    <!-- ① 上传区 -->
    <div
      v-if="!resultDataUrl && !showPicker && !isProcessing"
      class="cv-dropzone"
      @click="triggerUpload"
    >
      <div class="cv-drop-icon">🎵</div>
      <p class="cv-drop-title">{{ isDragging ? '松开以导入谱面' : '点击或拖入谱面文件' }}</p>
      <p class="cv-drop-sub">.osu &nbsp;·&nbsp; .osz &nbsp;·&nbsp; .mc &nbsp;·&nbsp; .mcz &nbsp;·&nbsp; .zip</p>
      <input
        ref="fileInputRef"
        type="file"
        accept=".osu,.osz,.mc,.mcz,.zip,.json"
        hidden
        @change="onFileChange"
      />
    </div>

    <!-- ② 多谱面选择器 -->
    <div v-if="showPicker" class="cv-picker">
      <p class="cv-picker-title">检测到多个谱面，请选择：</p>
      <div
        v-for="(c, i) in chartList"
        :key="i"
        class="cv-chart-item"
        @click="selectChart(c.path)"
      >
        <span class="cv-chart-ver">{{ c.version }}</span>
        <span class="cv-chart-creator">{{ c.creator }}</span>
        <span class="cv-chart-path">{{ c.path }}</span>
      </div>
    </div>

    <!-- ③ 处理中 -->
    <div v-if="isProcessing" class="cv-processing">
      <span class="cv-spinner" />
      <span>{{ status }}</span>
    </div>

    <!-- ④ 错误 -->
    <div v-if="errorMsg && !isProcessing" class="cv-error">
      ❌ {{ errorMsg }}
      <button class="cv-btn-small" @click="reset">重试</button>
    </div>

    <!-- ⑤ 结果 -->
    <div v-if="resultDataUrl" class="cv-result">
      <div class="cv-toolbar">
        <button class="cv-btn-primary" @click="downloadPng">⬇ 下载 PNG</button>
        <button class="cv-btn-ghost"   @click="reset">重新上传</button>
        <span class="cv-status">{{ status }}</span>
      </div>
      <div class="cv-canvas-wrap">
        <img :src="resultDataUrl" class="cv-result-img" alt="chart" />
      </div>
    </div>

  </div>
</template>

<!-- ══════════════════════ STYLE ══════════════════════ -->
<style scoped>
/* ── 根容器 ── */
.cv-root {
  background: #0f0f14;
  border: 1.5px solid #2a2a3a;
  border-radius: 12px;
  padding: 24px;
  font-family: 'JetBrains Mono', 'Cascadia Code', monospace;
  color: #c8cddc;
  transition: border-color 0.2s;
}
.cv-root.cv-dragging {
  border-color: #6978a8;
  background: #12121e;
}

/* ── 上传区 ── */
.cv-dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 180px;
  border: 1.5px dashed #2a2a3a;
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}
.cv-dropzone:hover,
.cv-root.cv-dragging .cv-dropzone {
  border-color: #6978a8;
  background: #16161f;
}
.cv-drop-icon  { font-size: 2.5rem; }
.cv-drop-title { margin: 0; font-size: 1rem; color: #adbde1; }
.cv-drop-sub   { margin: 0; font-size: 0.75rem; color: #50556e; letter-spacing: 0.05em; }

/* ── 多谱面选择 ── */
.cv-picker { display: flex; flex-direction: column; gap: 8px; }
.cv-picker-title {
  margin: 0 0 8px;
  font-size: 0.85rem;
  color: #ffd200;
  letter-spacing: 0.05em;
}
.cv-chart-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: #1c1c24;
  border: 1px solid #2a2a3a;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.cv-chart-item:hover { background: #23233a; border-color: #6978a8; }
.cv-chart-ver    { color: #adbde1; font-size: 0.9rem; min-width: 140px; }
.cv-chart-creator{ color: #8c91a0; font-size: 0.8rem; min-width: 120px; }
.cv-chart-path   { color: #50556e; font-size: 0.72rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* ── 处理中 ── */
.cv-processing {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: center;
  padding: 40px 0;
  color: #adbde1;
  font-size: 0.9rem;
}
.cv-spinner {
  display: inline-block;
  width: 20px; height: 20px;
  border: 2px solid #2a2a3a;
  border-top-color: #6978a8;
  border-radius: 50%;
  animation: cv-spin 0.8s linear infinite;
}
@keyframes cv-spin { to { transform: rotate(360deg); } }

/* ── 错误 ── */
.cv-error {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: #1f1018;
  border: 1px solid #4a1a2a;
  border-radius: 6px;
  color: #e89aa0;
  font-size: 0.85rem;
}
.cv-btn-small {
  margin-left: auto;
  padding: 4px 12px;
  border: 1px solid #4a1a2a;
  border-radius: 4px;
  background: transparent;
  color: #e89aa0;
  cursor: pointer;
  font-size: 0.8rem;
}
.cv-btn-small:hover { background: #2a1020; }

/* ── 结果区 ── */
.cv-result { display: flex; flex-direction: column; gap: 14px; }

.cv-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.cv-btn-primary {
  padding: 8px 20px;
  background: #6978a8;
  border: none;
  border-radius: 6px;
  color: #fff;
  font-family: inherit;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.15s;
}
.cv-btn-primary:hover { background: #7a8ec0; }

.cv-btn-ghost {
  padding: 8px 16px;
  background: transparent;
  border: 1px solid #2a2a3a;
  border-radius: 6px;
  color: #8c91a0;
  font-family: inherit;
  font-size: 0.85rem;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.cv-btn-ghost:hover { border-color: #6978a8; color: #adbde1; }

.cv-status { margin-left: auto; font-size: 0.8rem; color: #646982; }

/* ── 图片滚动容器（谱面可能很宽） ── */
.cv-canvas-wrap {
  overflow-x: auto;
  border: 1px solid #1e1e2a;
  border-radius: 6px;
  background: #121218;
}
.cv-result-img {
  display: block;
  height: 600px;       /* 固定显示高度，水平滚动 */
  width: auto;
  max-width: none;
}
</style>
