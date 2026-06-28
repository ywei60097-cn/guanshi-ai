const api = require("../../utils/api");
const store = require("../../utils/store");
const { SCENES } = require("../../utils/scenes");

Page({
  data: { scene: "outfit", title: "穿什么", detail: "穿搭色调", lead: "", choices: [], selectedIndex: 0, time: "09:00", loading: false, error: "", isMahjong: false },
  onLoad(query) {
    const scene = SCENES[query.scene] ? query.scene : "outfit";
    const meta = SCENES[scene];
    const now = new Date();
    const isMahjong = scene === "mahjong";
    const lead = isMahjong
      ? "不用先选东南西北。观时会先给完整排序；如果你现场不能坐推荐位，可以在结果页继续问替代方案。"
      : "每个场景都采用同一条经审计的命理推演链；现实限制始终拥有更高优先级。";
    this.setData({ scene, title: meta.title, detail: meta.detail, lead, choices: meta.choices, isMahjong, time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}` });
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
