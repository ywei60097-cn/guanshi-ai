const store = require("../../utils/store");

Page({
  data: { result: null, advice: null, scene: "", choice: "", primaryElement: "" },
  onShow() {
    const result = store.getResult();
    if (!result) return wx.navigateBack();
    const labels = { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" };
    this.setData({ result: result.reading, advice: result.advice, scene: result.scene, choice: result.choice, primaryElement: labels[result.reading.analysis.dailyFocus.primary] });
  },
  back() { wx.navigateBack(); },
  openReasoning() { wx.navigateTo({ url: "/pages/reasoning/index" }); }
});
