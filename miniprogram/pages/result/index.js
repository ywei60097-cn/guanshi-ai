const store = require("../../utils/store");

const SCENE_LABELS = {
  outfit: "穿衣",
  outing: "出门",
  work_social: "办事",
  mahjong: "麻将"
};

Page({
  data: { result: null, advice: null, scene: "", sceneLabel: "", choice: "", primaryElement: "", aiDebug: "", isMahjong: false },
  onShow() {
    const result = store.getResult();
    if (!result) return wx.navigateBack();
    const labels = { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" };
    const aiDebug = result.ai && result.ai.error ? `AI 增强未启用：${result.ai.error}` : "";
    this.setData({
      result: result.reading,
      advice: result.advice,
      scene: result.scene,
      sceneLabel: SCENE_LABELS[result.scene] || result.scene,
      choice: result.choice,
      primaryElement: labels[result.reading.analysis.dailyFocus.primary],
      aiDebug,
      isMahjong: result.scene === "mahjong"
    });
  },
  back() { wx.navigateBack(); },
  openReasoning() { wx.navigateTo({ url: "/pages/reasoning/index" }); },
  askFollowup() {
    const question = this.data.isMahjong
      ? "我现在选择不了推荐方位，如果坐另一个方位，可以吗？有什么建议？"
      : `关于${this.data.sceneLabel}，如果现实条件限制比较多，怎么调整？`;
    wx.navigateTo({ url: `/pages/ask/index?question=${encodeURIComponent(question)}` });
  }
});
