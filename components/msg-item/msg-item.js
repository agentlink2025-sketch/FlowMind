Component({
  properties: {
  from: { type: String, value: 'bot' },
  text: { type: String, value: '' },
  loading: { type: Boolean, value: false },
  error: { type: Boolean, value: false },
  userAvatar: { type: String, value: '/assets/user.png' },
  botAvatar: { type: String, value: '/assets/bot.png' },
  messageId: { type: String, value: '' }
  },
  data: { rendered: '' },
  lifetimes: {
  attached() { this.renderMarkdown(); }
  },
  observers: {
  'text': function() { this.renderMarkdown(); }
  },
  methods: {
  // 极简 Markdown → HTML 渲染（加粗、代码块、换行）
  renderMarkdown() {
  const escape = (s) => String(s || '').replace(/[&<>]/g, (c)=>({ '&':'&amp;','<':'&lt;','>':'&gt;' }[c]));
  let html = escape(this.data.text)
  .replace(/```([\s\S]*?)```/g, '<pre>$1</pre>')
  .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
  .replace(/\n/g, '<br/>');
  this.setData({ rendered: html });
  },
  onRetry() { this.triggerEvent('retry', { id: this.data.messageId }); }
  }
  });
