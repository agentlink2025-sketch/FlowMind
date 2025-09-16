// pages/chat/chat.js
var req = require('../../utils/request');

Page({
  data: {
    draft: '',
    messages: [],
    sending: false,
    scrollInto: 'anchor'
  },

  onLoad: function () {
    this.appendBot('你好，我是营销智能体。请直接输入你的问题。');
  },

  onInput: function (e) {
    this.setData({ draft: e.detail.value });
  },

  onSend: function () {
    var question = (this.data.draft || '').trim();
    if (!question || this.data.sending) return;

    this.setData({ sending: true });
    this.appendUser(question);
    var botMsg = this.appendBot('...', true); // 占位

    var that = this;
    req.request('/api/chat', {
      method: 'POST',
      data: { prompt: question }
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

  scrollToBottom: function () {
    this.setData({ scrollInto: 'anchor' });
  }
});
