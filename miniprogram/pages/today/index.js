const api = require("../../utils/api");
const store = require("../../utils/store");
const { SCENES } = require("../../utils/scenes");
const { formatToday } = require("../../utils/presentation");

Page({
  data: { loading: true, error: "", today: null, sceneCards: Object.keys(SCENES).map((key, index) => ({ key, index: `0${index + 1}`, title: SCENES[key].title, detail: SCENES[key].detail })) },
  onShow() { this.load(); },
  async load() {
    const profile = store.getProfile();
    if (!profile) return wx.reLaunch({ url: "/pages/onboarding/index" });
    this.setData({ loading: true, error: "" });
    try {
      const result = await api.createReading(profile, "outfit", "日常通勤", new Date().toISOString());
      store.saveResult(result);
      this.setData({ today: formatToday(result.reading), loading: false });
    } catch (error) { this.setData({ loading: false, error: error.message }); }
  },
  openScene(event) { wx.navigateTo({ url: `/pages/scene/index?scene=${event.currentTarget.dataset.scene}` }); },
  openReasoning() { wx.navigateTo({ url: "/pages/reasoning/index" }); },
  openProfile() { wx.navigateTo({ url: "/pages/profile/index" }); }
});
