var req = require('../../utils/request')

Page({
  data: {
    draft: '',
    messages: [],
    sending: false,

    // 键盘高度（仅用于把 composer 往上移）
    keyboardHeight: 0,

    // 消息滚动（只作用于内部 scroll-view，不影响页面）
    svScrollTop: 0,
    // scroll-view 底部留白：= 基础输入区高度 + 键盘高度
    pbottom: 120   // 初始给个大约值（单位 px）
  },

  onLoad() {
    this.appendBot('你好，我是营销智能体。请直接输入你的问题。')
    // 首屏拉到底（内部 scroll-view）
    this.scrollSVToBottom()
  },

  onShow() {
    if (wx.onKeyboardHeightChange) {
      wx.onKeyboardHeightChange(res => {
        const h = res.height || 0
        // 仅移动输入区 + 增加列表底部留白，防止最后一条被遮
        this.setData({
          keyboardHeight: h,
          pbottom: 120 + h   // 120px 约等于 composer 的可视高度
        })
        // 不滚动消息列表（保持用户的阅读位置）
      })
    }
  },

  onHide() { this.resetKbd() },
  onUnload() { this.resetKbd() },
  resetKbd() {
    this.setData({ keyboardHeight: 0, pbottom: 120 })
  },

  onFocus() {
    // 不触发页面滚动；按需把内部列表微调到底
    setTimeout(() => this.scrollSVToBottom(), 150)
  },
  onBlur() {
    // 键盘收起后，输入区落回底部，留白恢复
    setTimeout(() => this.setData({ keyboardHeight: 0, pbottom: 120 }), 80)
  },

  onInput(e) { this.setData({ draft: e.detail.value }) },

  onSend() {
    const question = (this.data.draft || '').trim()
    if (!question || this.data.sending) return

    this.setData({ sending: true })
    this.appendUser(question)
    const botMsg = this.appendBot('…生成中', true)

    req.request('/api/chat', { method: 'POST', data: { prompt: question } })
      .then(res => {
        const answer = (res && (res.answer || res.data)) || '（无回复）'
        this.updateMessage(botMsg.id, { text: answer, loading: false })
      })
      .catch(() => {
        this.updateMessage(botMsg.id, { text: '网络或服务异常', loading: false })
      })
      .finally(() => {
        this.setData({ draft: '', sending: false })
        // 新消息到达后，把内部 scroll-view 拉到底
        this.scrollSVToBottom()
      })
  },

  /* ===== 消息工具 ===== */
  appendUser(text) {
    const msg = { id: Date.now() + '' + Math.floor(Math.random() * 1000), from: 'user', text }
    this.setData({ messages: this.data.messages.concat([msg]) }, this.scrollSVToBottom)
    return msg
  },

  appendBot(text, loading = false) {
    const msg = { id: Date.now() + '' + Math.floor(Math.random() * 1000), from: 'bot', text, loading }
    this.setData({ messages: this.data.messages.concat([msg]) }, this.scrollSVToBottom)
    return msg
  },

  updateMessage(id, patch) {
    const list = this.data.messages.map(m => (m.id === id ? Object.assign({}, m, patch) : m))
    this.setData({ messages: list }, this.scrollSVToBottom)
  },

  /* ===== 仅滚动内部 scroll-view，不动页面 ===== */
  scrollSVToBottom() {
    // 用一个很大的值推进去，避免测量高度
    this.setData({ svScrollTop: this.data.svScrollTop + 1e6 })
  },

  /* 可选：返回上一页 */
  navigateBack() { wx.navigateBack({ delta: 1 }) }
})
