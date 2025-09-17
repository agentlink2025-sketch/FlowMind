// pages/chat/chat.js
var req = require('../../utils/request');

Page({
  data: {
    draft: '',
    messages: [],
    sending: false,
    scrollInto: 'anchor',
    composerBottom: 96 // px，默认离底部 96
  },

  // 接收首页传来的初始问题 ?q=xxx
  onLoad: function (options) {
    var initQ = options && options.q ? decodeURIComponent(options.q) : '';
    if (initQ) {
      this.setData({ draft: initQ });
      // 如果希望自动发送首条问题，取消下一行注释：
      // this.onSend();
    } else {
      this.appendBot('你好，我是营销智能体。请直接输入你的问题。');
    }
  },

  // 键盘高度变化：抬高输入区，避免遮挡
  onShow: function () {
    var that = this;
    this._kbHandler = function (res) {
      var h = res && res.height ? res.height : 0; // px
      if (h > 0) {
        that.setData({ composerBottom: h + 12 });
      } else {
        that.setData({ composerBottom: 96 });
      }
    };
    if (wx.onKeyboardHeightChange) wx.onKeyboardHeightChange(this._kbHandler);
  },

  onHide: function () {
    this.setData({ composerBottom: 96 });
  },

  onUnload: function () {
    this._kbHandler = null;
  },

  // 输入框事件
  onInput: function (e) { this.setData({ draft: e.detail.value }); },
  onFocus: function () { this.scrollToBottom(); },
  onBlur: function () {
    var that = this;
    setTimeout(function(){ that.setData({ composerBottom: 96 }); }, 120);
  },

  // 发送消息
  onSend: function () {
    var question = (this.data.draft || '').trim();
    if (!question || this.data.sending) return;

    this.setData({ sending: true });
    this.appendUser(question);
    var botMsg = this.appendBot('...', true); // 占位+打字中

    var that = this;
    req.request('/api/chat', {
      method: 'POST',
      data: {
        prompt: question,
        // 可选：附带历史消息，后端若不需要可忽略
        messages: this.data.messages.map(function (m) {
          return { role: m.from === 'user' ? 'user' : 'assistant', content: m.text };
        }),
        stream: false
      }
    })
    .then(function (res) {
      var answer = (res && (res.answer || res.data)) || '';
      that.updateMessage(botMsg.id, { text: answer, loading: false });
    })
    .catch(function () {
      that.updateMessage(botMsg.id, { text: '网络或服务异常', loading: false });
    })
    .finally(function () {
      that.setData({ draft: '', sending: false });
      that.scrollToBottom();
    });
  },

  // 追加用户消息
  appendUser: function (text) {
    var msg = {
      id: String(Date.now()) + String(Math.floor(Math.random() * 1000)),
      from: 'user',
      text: text
    };
    this.setData({ messages: this.data.messages.concat([msg]) });
    this.scrollToBottom();
    return msg;
  },

  // 追加机器人消息
  appendBot: function (text, loading) {
    if (typeof text === 'undefined') text = '';
    if (typeof loading === 'undefined') loading = false;
    var msg = {
      id: String(Date.now()) + String(Math.floor(Math.random() * 1000)),
      from: 'bot',
      text: text,
      loading: loading
    };
    this.setData({ messages: this.data.messages.concat([msg]) });
    this.scrollToBottom();
    return msg;
  },

  // 更新指定消息
  updateMessage: function (id, patch) {
    var list = this.data.messages.map(function (m) {
      if (m.id === id) {
        var merged = {};
        for (var k in m) merged[k] = m[k];
        for (var p in patch) merged[p] = patch[p];
        return merged;
      }
      return m;
    });
    this.setData({ messages: list });
  },

  // 滚动到底部
  scrollToBottom: function () { this.setData({ scrollInto: 'anchor' }); }
});
