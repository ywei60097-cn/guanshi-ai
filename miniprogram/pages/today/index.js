const api = require("../../utils/api");
const store = require("../../utils/store");
const { SCENES } = require("../../utils/scenes");
const { formatToday } = require("../../utils/presentation");
const { pickDailyQuestions } = require("../../utils/questions");

Page({
  data: {
    loading: true,
    error: "",
    today: null,
    sceneCards: Object.keys(SCENES).map((key, index) => ({ key, index: `0${index + 1}`, title: SCENES[key].title, detail: SCENES[key].detail })),
    questions: pickDailyQuestions()
  },
  onShow() { this.load(); },
  async load() {
    const profile = store.getProfile();
    if (!profile) return wx.reLaunch({ url: "/pages/onboarding/index" });
    this.setData({ loading: true, error: "" });
    try {
      const result = await api.createReading(profile, "outfit", "日常通勤", new Date().toISOString());
      store.saveResult(result);
      this.setData({ today: formatToday(result.reading, result.advice), questions: pickDailyQuestions(), loading: false });
    } catch (error) { this.setData({ loading: false, error: error.message }); }
  },
  openScene(event) { wx.navigateTo({ url: `/pages/scene/index?scene=${event.currentTarget.dataset.scene}` }); },
  openAsk(event) {
    const question = event.currentTarget.dataset.question || "";
    wx.navigateTo({ url: `/pages/ask/index?question=${encodeURIComponent(question)}` });
  },
  openReasoning() { wx.navigateTo({ url: "/pages/reasoning/index" }); },
  openProfile() { wx.navigateTo({ url: "/pages/profile/index" }); }
});
