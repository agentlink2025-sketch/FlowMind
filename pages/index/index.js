Page({
  statusBarHeight: 20,  // 默认值，避免为空
  data: {
    draft: '',
    chips: ['小红书文案', '广告效果分析', '营销工作计划']
  },
  onLoad() {
    // 获取系统信息
    const systemInfo = wx.getSystemInfoSync()
    this.setData({
      statusBarHeight: systemInfo.statusBarHeight
    })
  },
  onInput: function(e){ this.setData({ draft: e.detail.value }); },
  onChipTap: function(e){
    var text = e.currentTarget.dataset.text || '';
    this.setData({ draft: text });
  },
  goChat: function(){
    var q = (this.data.draft || '').trim();
    wx.navigateTo({ url: '/pages/chat/chat?q=' + encodeURIComponent(q) });
  },
  goMe: function(){ wx.showToast({ title: '敬请期待', icon: 'none' }); },
  onMore: function(){ wx.showActionSheet({ itemList: ['关于', '反馈'] }); },
  onScan: function(){ /* open-type=scanCode 成功后自动返回结果，这里可按需处理 */ }
});
