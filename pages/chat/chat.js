var req = require('../../utils/request')

// 强制最小延迟，避免 UI 合并渲染
const MIN_DELAY_MS = 80
// 如果后端按“单字切片”，本地每 3 个字合并为一片
const GROUP_IF_SINGLE_CHAR = 3

Page({
  data: {
    draft: '',
    messages: [],
    sending: false,
    keyboardHeight: 0,
    svScrollTop: 0,
    pbottom: 120
  },

  _streamTimer: null,

  onLoad() {
    this.appendBot('你好，我是营销智能体。请直接输入你的问题。')
    this.scrollSVToBottom()
  },

  onShow() {
    if (wx.onKeyboardHeightChange) {
      wx.onKeyboardHeightChange(res => {
        const h = res.height || 0
        this.setData({ keyboardHeight: h, pbottom: 120 + h })
      })
    }
  },

  onHide()  { this.resetKbd(); this.stopStream() },
  onUnload(){ this.resetKbd(); this.stopStream() },
  resetKbd(){ this.setData({ keyboardHeight: 0, pbottom: 120 }) },

  onFocus(){ setTimeout(() => this.scrollSVToBottom(), 150) },
  onBlur(){  setTimeout(() => this.setData({ keyboardHeight: 0, pbottom: 120 }), 80) },
  onInput(e){ this.setData({ draft: e.detail.value }) },

  /* 发送 */
  onSend() {
    const question = (this.data.draft || '').trim()
    if (!question || this.data.sending) return

    this.stopStream()
    this.setData({ sending: true })
    this.appendUser(question)
    const botMsg = this.appendBot('...思考中', true)

    req.request('/api/chat/miniprogram', {
      method: 'POST',
      data: { prompt: question }
    })
    .then((res) => {
      const { chunks, delay, complete } = this.extractStreamPayload(res)

      if (Array.isArray(chunks) && chunks.length > 0) {
        const playable = this._mergeTinyChunks(chunks, GROUP_IF_SINGLE_CHAR)
        this._startPlaying(botMsg.id, playable, Math.max(delay || 0, MIN_DELAY_MS))
      } else if (complete && complete.length) {
        const fake = this.localChunkify(complete)
        this._startPlaying(botMsg.id, fake, MIN_DELAY_MS)
      } else {
        this.updateBot(botMsg.id, { text: '（无回复）', loading: false })
      }
    })
    .catch((err) => {
      console.error('请求失败:', err)
      this.updateBot(botMsg.id, { text: '网络或服务异常', loading: false })
    })
    .finally(() => {
      this.setData({ draft: '', sending: false })
      this.scrollSVToBottom()
    })
  },

  /* 分片播放 */
  _startPlaying(botId, chunks, delayMs) {
    this.updateBot(botId, { text: '', loading: true })
    let i = 0, acc = ''

    const step = () => {
      const idx = this._findMsgIndex(botId)
      if (idx < 0) { this.stopStream(); return }

      if (i >= chunks.length) {
        this.updateBot(botId, { loading: false })
        this._streamTimer = null
        return
      }

      acc += String(chunks[i++] || '')
      this.setData({ [`messages[${idx}].text`]: acc })

      wx.nextTick(() => this.scrollSVToBottom())
      this._streamTimer = setTimeout(step, Math.max(16, delayMs))
    }
    step()
  },

  stopStream() {
    if (this._streamTimer) {
      clearTimeout(this._streamTimer)
      this._streamTimer = null
    }
  },

  /* 根据 id 找消息索引 */
  _findMsgIndex(id) {
    const list = this.data.messages
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].id === id) return i
    }
    return -1
  },

  /* 提取后端数据 */
  extractStreamPayload(res) {
    try { console.log('resp:', JSON.stringify(res)) } catch(e){}
    const paths = [ o=>o && o.data && o.data.data, o=>o && o.data, o=>o ]
    for (const pick of paths) {
      const d = pick(res)
      if (!d) continue
      if (Array.isArray(d.chunks)) {
        return { chunks: d.chunks, delay: d.chunk_delay || 0, complete: d.complete_answer || '' }
      }
      if (typeof d.answer === 'string') {
        return { chunks: [], delay: 0, complete: d.answer }
      }
    }
    return { chunks: [], delay: 0, complete: '' }
  },

  /* 本地切片（兜底流式） */
  localChunkify(text) {
    const segs = text.split(/(?<=[。！？?!；;])/).map(s=>s.trim()).filter(Boolean)
    const chunks = []
    const pushByWords = (s) => {
      const words = s.split(/(\s+|,|，|、|；|;|：|:)/).filter(Boolean)
      let buf = ''
      for (const w of words) {
        const next = buf + w
        if (next.length > 20) { chunks.push(buf); buf = w }
        else { buf = next }
      }
      if (buf) chunks.push(buf)
    }
    for (const s of segs.length ? segs : [text]) {
      if (s.length <= 24) chunks.push(s)
      else pushByWords(s)
    }
    return chunks
  },

  _mergeTinyChunks(chs, n) {
    if (!chs || chs.length === 0) return []
    if (chs.every(c => c.length === 1)) {
      const out = []; let buf = ''
      for (const c of chs) {
        buf += c
        if (buf.length >= n) { out.push(buf); buf = '' }
      }
      if (buf) out.push(buf)
      return out
    }
    return chs
  },

  /* 消息工具 */
  appendUser(text) {
    const msg = { id: Date.now()+''+Math.floor(Math.random()*1000), from: 'user', text }
    this.setData({ messages: this.data.messages.concat([msg]) }, this.scrollSVToBottom)
    return msg
  },
  appendBot(text, loading=false) {
    const msg = { id: Date.now()+''+Math.floor(Math.random()*1000), from: 'bot', text, loading }
    this.setData({ messages: this.data.messages.concat([msg]) }, this.scrollSVToBottom)
    return msg
  },
  updateBot(id, patch) {
    const idx = this._findMsgIndex(id)
    if (idx < 0) return
    const updates = {}
    for (let k in patch) updates[`messages[${idx}].${k}`] = patch[k]
    this.setData(updates)
  },

  scrollSVToBottom() { this.setData({ svScrollTop: this.data.svScrollTop + 1e6 }) },
  navigateBack() { wx.navigateBack({ delta: 1 }) }
})
