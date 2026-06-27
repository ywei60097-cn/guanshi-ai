const store = require("../../utils/store");

Page({
  data: { reading: null, trace: [], limitations: [], pillars: "" },
  onShow() {
    const result = store.getResult();
    if (!result) return wx.navigateBack();
    const reading = result.reading;
    this.setData({ reading, trace: reading.analysis.ruleTrace, limitations: reading.analysis.limitations, pillars: reading.chart.pillars.map((pillar) => pillar ? pillar.text : "—").join(" · ") });
  },
  back() { wx.navigateBack(); }
});
