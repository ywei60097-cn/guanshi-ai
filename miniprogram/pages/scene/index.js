const api = require("../../utils/api");
const store = require("../../utils/store");
const { SCENES } = require("../../utils/scenes");

Page({
  data: { scene: "outfit", title: "穿什么", detail: "穿搭色调", choices: [], selectedIndex: 0, time: "09:00", loading: false, error: "" },
  onLoad(query) {
    const scene = SCENES[query.scene] ? query.scene : "outfit";
    const meta = SCENES[scene];
    const now = new Date();
    this.setData({ scene, title: meta.title, detail: meta.detail, choices: meta.choices, time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}` });
  },
  back() { wx.navigateBack(); },
  choose(event) { this.setData({ selectedIndex: Number(event.currentTarget.dataset.index) }); },
  bindTime(event) { this.setData({ time: event.detail.value }); },
  async submit() {
    const profile = store.getProfile();
    if (!profile) return wx.reLaunch({ url: "/pages/onboarding/index" });
    this.setData({ loading: true, error: "" });
    const at = new Date();
    const [hours, minutes] = this.data.time.split(":").map(Number);
    at.setHours(hours, minutes, 0, 0);
    try {
      const result = await api.createReading(profile, this.data.scene, this.data.choices[this.data.selectedIndex], at.toISOString());
      store.saveResult(result);
      wx.navigateTo({ url: "/pages/result/index" });
    } catch (error) { this.setData({ loading: false, error: error.message }); }
  }
});
