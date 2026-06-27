const PROFILE_KEY = "guanshi-profile";
const RESULT_KEY = "guanshi-result";

function get(key) { return wx.getStorageSync(key); }
function set(key, value) { wx.setStorageSync(key, value); }
function remove(key) { wx.removeStorageSync(key); }

module.exports = {
  getProfile: () => get(PROFILE_KEY),
  saveProfile: (profile) => set(PROFILE_KEY, profile),
  clearProfile: () => remove(PROFILE_KEY),
  getResult: () => get(RESULT_KEY),
  saveResult: (result) => set(RESULT_KEY, result),
  clearResult: () => remove(RESULT_KEY)
};
