function callCreateReading(data) {
  return new Promise((resolve, reject) => {
    if (!wx.cloud) {
      reject(new Error("当前基础库不支持云开发，请升级微信开发者工具或基础库"));
      return;
    }
    wx.cloud.callFunction({
      name: "createReading",
      data,
      success(response) {
        const result = response.result || {};
        console.log("Guanshi cloud result", result);
        if (!result.error) return resolve(result);
        reject(new Error(result.message || result.error || "云函数计算失败"));
      },
      fail(error) {
        const detail = error && (error.errMsg || error.message);
        reject(new Error(detail ? `云函数调用失败：${detail}` : "云函数调用失败，请稍后再试"));
      }
    });
  });
}

function createReading(profile, scene, choice, at) {
  return callCreateReading({ profile, scene, choice, at });
}

function askGuanshi(profile, question, at, context) {
  return callCreateReading({ action: "ask", profile, question, at, context });
}

module.exports = { createReading, askGuanshi };
