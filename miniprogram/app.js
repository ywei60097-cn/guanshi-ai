App({
  onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({
        env: "cloud1-d1gcb5j172439a6e1",
        traceUser: true
      });
    }
  },
  globalData: {
    rulebookVersion: "0.2.0",
    cloudEnv: "cloud1-d1gcb5j172439a6e1"
  }
});
