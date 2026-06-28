const PROFILE_KEY = "guanshi-profile";
const RESULT_KEY = "guanshi-result";
const ASK_HISTORY_KEY = "guanshi-ask-history";

function get(key) { return wx.getStorageSync(key); }
function set(key, value) { wx.setStorageSync(key, value); }
function remove(key) { wx.removeStorageSync(key); }

module.exports = {
  getProfile: () => get(PROFILE_KEY),
  saveProfile: (profile) => set(PROFILE_KEY, profile),
  clearProfile: () => remove(PROFILE_KEY),
  getResult: () => get(RESULT_KEY),
  saveResult: (result) => set(RESULT_KEY, result),
  clearResult: () => remove(RESULT_KEY),
  getAskHistory: () => get(ASK_HISTORY_KEY) || [],
  saveAskTurn: (turn) => {
    const history = (get(ASK_HISTORY_KEY) || []).filter(Boolean);
    set(ASK_HISTORY_KEY, [turn, ...history].slice(0, 8));
  },
  clearAskHistory: () => remove(ASK_HISTORY_KEY)
};
