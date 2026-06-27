const { API_BASE_URL } = require("./config");

function request(path, method, data) {
  if (!API_BASE_URL || API_BASE_URL.includes("api.example.com")) {
    return Promise.reject(new Error("请先在 utils/config.js 配置正式 API 域名"));
  }
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE_URL}${path}`,
      method,
      data,
      timeout: 5000,
      header: { "content-type": "application/json" },
      success(response) {
        if (response.statusCode >= 200 && response.statusCode < 300) return resolve(response.data);
        reject(new Error(response.data && response.data.error ? response.data.error : "服务暂时不可用"));
      },
      fail() { reject(new Error("网络连接失败，请稍后再试")); }
    });
  });
}

function createReading(profile, scene, choice, at) {
  return request("/v1/readings", "POST", { profile, scene, choice, at });
}

module.exports = { createReading };
