const store = require("../../utils/store");

Page({
  data: {
    birthDate: "1994-09-08",
    birthTime: "09:20",
    timeKnown: true,
    birthPlace: "",
    boundaryIndex: 0,
    boundaries: ["零点换日（默认）", "子初换日（23:00）"]
  },
  onShow() {
    const profile = store.getProfile();
    if (profile) this.setData({ birthDate: profile.birthDate, birthTime: profile.birthTime || "09:20", timeKnown: Boolean(profile.birthTime), birthPlace: profile.birthPlace || "", boundaryIndex: profile.dayBoundary === "ziStart" ? 1 : 0 });
  },
  bindDate(event) { this.setData({ birthDate: event.detail.value }); },
  bindTime(event) { this.setData({ birthTime: event.detail.value, timeKnown: true }); },
  bindTimeKnown(event) { this.setData({ timeKnown: event.detail.value }); },
  bindPlace(event) { this.setData({ birthPlace: event.detail.value.trim() }); },
  bindBoundary(event) { this.setData({ boundaryIndex: Number(event.detail.value) }); },
  submit() {
    if (!this.data.birthDate || !this.data.birthPlace) return wx.showToast({ title: "请补全出生日期与出生地", icon: "none" });
    store.saveProfile({
      birthDate: this.data.birthDate,
      birthTime: this.data.timeKnown ? this.data.birthTime : "",
      birthPlace: this.data.birthPlace,
      dayBoundary: this.data.boundaryIndex === 1 ? "ziStart" : "midnight"
    });
    wx.reLaunch({ url: "/pages/today/index" });
  }
});
