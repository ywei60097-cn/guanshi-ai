const api = require("../../utils/api");
const store = require("../../utils/store");
const { pickDailyQuestions } = require("../../utils/questions");

Page({
  data: {
    question: "",
    quickQuestions: [],
    messages: [],
    loading: false,
    error: "",
    aiDebug: ""
  },

  onLoad(query) {
    const question = query.question ? decodeURIComponent(query.question) : "";
    this.setData({ question, quickQuestions: pickDailyQuestions() });
    if (question) {
      setTimeout(() => this.submit(), 80);
    }
  },

  back() { wx.navigateBack(); },

  chooseQuestion(event) {
    const question = event.currentTarget.dataset.question || "";
    this.sendQuestion(question);
  },

  inputQuestion(event) {
    this.setData({ question: event.detail.value });
  },

  submit(event) {
    const fromKeyboard = event && event.detail && typeof event.detail.value === "string" ? event.detail.value : "";
    this.sendQuestion(fromKeyboard || this.data.question);
  },

  async sendQuestion(rawQuestion) {
    if (this.data.loading) return;
    const profile = store.getProfile();
    const question = (rawQuestion || "").trim();
    if (!profile) return wx.reLaunch({ url: "/pages/onboarding/index" });
    if (!question) {
      this.setData({ error: "先问一句具体的问题，比如“今天适合见客户吗？”" });
      return;
    }
    const messages = this.data.messages.concat([{ role: "user", text: question }]);
    this.setData({ messages, question: "", loading: true, error: "", aiDebug: "" });
    try {
      const context = { recentTurns: store.getAskHistory().slice(0, 5) };
      const result = await api.askGuanshi(profile, question, new Date().toISOString(), context);
      const answer = result.answer || {};
      const aiDebug = result.ai && result.ai.error ? `AI 增强未启用：${result.ai.error}` : "";
      const turn = {
        question,
        answer: answer.primary || answer.headline || "",
        at: new Date().toISOString()
      };
      store.saveAskTurn(turn);
      this.setData({
        messages: this.data.messages.concat([{ role: "assistant", answer }]),
        aiDebug,
        loading: false
      });
    } catch (error) {
      this.setData({
        messages: this.data.messages.concat([{ role: "assistant", error: error.message || "观时暂时没有接上，请稍后再试" }]),
        loading: false,
        error: ""
      });
    }
  }
});
