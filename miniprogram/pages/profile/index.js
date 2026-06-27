const store = require("../../utils/store");

Page({
  data: { profile: null, chart: null, pillars: "" },
  onShow() {
    const profile = store.getProfile();
    const result = store.getResult();
    if (!profile) return wx.reLaunch({ url: "/pages/onboarding/index" });
    this.setData({ profile, chart: result && result.reading.chart, pillars: result ? result.reading.chart.pillars.map((pillar) => pillar ? pillar.text : "—").join(" ") : "等待首次计算" });
  },
  clearData() {
    wx.showModal({ title: "删除资料", content: "将删除本机保存的出生资料与本次结果。", success: (result) => {
      if (!result.confirm) return;
      store.clearProfile(); store.clearResult(); wx.reLaunch({ url: "/pages/onboarding/index" });
    }});
  }
});
