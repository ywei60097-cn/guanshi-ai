import {
  ELEMENT_COLORS,
  ELEMENT_DIRECTIONS,
  ELEMENT_LABEL,
  RULEBOOK_VERSION,
  SOURCE_ANCHORS,
  createReading,
} from "./bazi-engine.js";
import { SCENES, buildSceneAdvice } from "./scene-advice.js";

const app = document.querySelector("#app");

const SIGNALS = {
  wood: { accent: "#58f6c5", soft: "rgba(88, 246, 197, .13)", glow: "rgba(88, 246, 197, .22)" },
  fire: { accent: "#f27ca8", soft: "rgba(242, 124, 168, .13)", glow: "rgba(242, 124, 168, .22)" },
  earth: { accent: "#e8b96d", soft: "rgba(232, 185, 109, .13)", glow: "rgba(232, 185, 109, .22)" },
  metal: { accent: "#b8d2ff", soft: "rgba(184, 210, 255, .13)", glow: "rgba(184, 210, 255, .22)" },
  water: { accent: "#70a9ff", soft: "rgba(112, 169, 255, .13)", glow: "rgba(112, 169, 255, .22)" },
};

let state = { page: "onboarding", scene: "outfit", selectedChoice: "日常通勤", latestReading: null };

function profileFromStorage() {
  try { return JSON.parse(localStorage.getItem("guanshi-profile")); } catch { return null; }
}

function saveProfile(profile) { localStorage.setItem("guanshi-profile", JSON.stringify(profile)); }
function clearProfile() { localStorage.removeItem("guanshi-profile"); localStorage.removeItem("guanshi-feedback"); }
function pad(value) { return String(value).padStart(2, "0"); }
function escapeHtml(value = "") { return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[char])); }
function dateLabel(date = new Date()) { return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`; }
function localIsoDate(date = new Date()) { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`; }

function setSignal(element) {
  const signal = SIGNALS[element] || SIGNALS.wood;
  document.documentElement.style.setProperty("--accent", signal.accent);
  document.documentElement.style.setProperty("--accent-soft", signal.soft);
  document.documentElement.style.setProperty("--accent-glow", signal.glow);
}

function topMark(label = "RULEBOOK") {
  return `<div class="top-mark"><span class="live-dot"></span><span>${label} · v${RULEBOOK_VERSION}</span></div>`;
}

function nav(active) {
  return `<nav class="bottom-nav" aria-label="主导航"><div class="bottom-nav-inner">
    <button class="nav-button ${active === "today" ? "is-active" : ""}" data-go="today"><span>01</span>今日</button>
    <button class="nav-button ${active === "scene" ? "is-active" : ""}" data-go="scene"><span>02</span>场景</button>
    <button class="nav-button ${active === "profile" ? "is-active" : ""}" data-go="profile"><span>03</span>我的</button>
  </div></nav>`;
}

function renderOnboarding() {
  state.page = "onboarding";
  setSignal("wood");
  app.innerHTML = `
    <section class="page onboarding-page">
      <div class="grid-halo" aria-hidden="true"></div>
      <header class="onboarding-header">
        ${topMark("BAZI CORE")}
        <p class="eyebrow">观时 / DAILY DIVINATION SYSTEM</p>
        <h1 class="display">用一张命盘，<br>读取今天的节奏。</h1>
        <p class="lead">先按节气排盘，再按月令、格局候选、调候与旺衰依序推演。每一步都留痕，不让 AI 即兴编造。</p>
      </header>
      <form class="form-stack cyber-form" id="profile-form">
        <label class="field"><span class="field-label">01 / 出生日期</span><input required name="birthDate" type="date" max="${localIsoDate()}" value="1994-09-08"></label>
        <label class="field"><span class="field-label">02 / 出生时间</span><input name="birthTime" type="time" value="09:20"><p class="input-note">不确定可留空；时柱会按正午占位并标注限制。</p></label>
        <label class="field"><span class="field-label">03 / 出生地</span><input required name="birthPlace" type="text" value="杭州" placeholder="例如：杭州"><p class="input-note">当前只保留资料；真太阳时校正将在专业版启用。</p></label>
        <label class="field"><span class="field-label">04 / 子时换日</span><select name="dayBoundary"><option value="midnight">零点换日（默认）</option><option value="ziStart">子初换日（23:00）</option></select><p class="input-note">子时属于流派差异，不能被系统悄悄忽略。</p></label>
        <div class="form-actions"><button class="primary-button" type="submit"><span>启动命盘引擎</span><b>→</b></button><button class="demo-link" type="button" data-action="demo">先进入一份示例命盘</button></div>
      </form>
      <p class="privacy-note">资料仅保存在当前浏览器。系统提供文化娱乐与自我探索参考，不用于医疗、法律、投资或博彩决定。</p>
    </section>`;
  document.querySelector("#profile-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    saveProfile({ birthDate: data.get("birthDate"), birthTime: data.get("birthTime"), birthPlace: data.get("birthPlace"), dayBoundary: data.get("dayBoundary") });
    renderToday();
  });
  document.querySelector("[data-action='demo']").addEventListener("click", () => {
    saveProfile({ birthDate: "1994-09-08", birthTime: "09:20", birthPlace: "杭州", dayBoundary: "midnight", isDemo: true });
    renderToday();
  });
}

function renderToday() {
  const profile = profileFromStorage();
  if (!profile) return renderOnboarding();
  state.page = "today";
  const reading = createReading(profile);
  state.latestReading = reading;
  const { chart, transit, analysis } = reading;
  const primary = analysis.dailyFocus.primary;
  const secondary = analysis.dailyFocus.secondary;
  const colors = ELEMENT_COLORS[primary];
  const direction = ELEMENT_DIRECTIONS[primary];
  setSignal(primary);
  app.innerHTML = `
    <section class="page today-page">
      <header class="today-header topbar">
        <div><p class="today-date">${dateLabel()}</p><p class="today-pillar">${transit.day} 日 · ${transit.currentJie}</p></div>
        <button class="profile-initial" data-go="profile" aria-label="打开我的">命</button>
      </header>
      <section class="core-frame">
        <i class="frame-corner corner-a"></i><i class="frame-corner corner-b"></i>
        <div class="core-topline">${topMark("BAZI CORE")}</div>
        <div class="core-layout">
          <div class="core-orbit"><div class="orbit-inner"><span>DAY MASTER</span><strong>${chart.dayMaster}</strong><small>${ELEMENT_LABEL[chart.dayMasterElement]}</small></div></div>
          <div class="core-copy"><p class="section-kicker">TODAY / ${analysis.climate.season}</p><h1 class="display">先辨节奏，<br>再作选择。</h1><p>${analysis.summary}</p></div>
        </div>
        <div class="core-data"><span>月令 <b>${chart.pillars[1].branch}</b></span><span>格局候选 <b>${analysis.patternCandidate}</b></span><span>旺衰初判 <b>${analysis.strength.tendency}</b></span></div>
      </section>
      <section class="advice-list cyber-lines" aria-label="今日建议">
        <button class="advice-row" data-scene="outfit"><span class="advice-index">01</span><span class="advice-label">穿什么</span><span class="advice-value">优先 ${colors[0]} 一类低饱和色</span><span class="advice-arrow">↗</span></button>
        <button class="advice-row" data-scene="outing"><span class="advice-index">02</span><span class="advice-label">往哪里</span><span class="advice-value">若可选，可从${direction}向开始</span><span class="advice-arrow">↗</span></button>
        <button class="advice-row" data-scene="work_social"><span class="advice-index">03</span><span class="advice-label">怎么做</span><span class="advice-value">用${ELEMENT_LABEL[primary]}的方式，先完成一小步</span><span class="advice-arrow">↗</span></button>
      </section>
      <section class="quick-section">
        <div class="section-heading"><h2 class="section-title">调取一个具体场景</h2><span class="meta">SCENE MODULES</span></div>
        <div class="quick-grid">
          ${Object.entries(SCENES).map(([key, scene], index) => `<button class="quick-action" data-scene="${key}"><span>0${index + 1} / ${scene.detail}</span><strong>${scene.title}</strong><i>↗</i></button>`).join("")}
        </div>
      </section>
      <button class="reasoning-link" data-go="reasoning"><span>TRACE</span> 查看今天的推演依据 <b>→</b></button>
    </section>
    ${nav("today")}`;
  wireNavigation();
  document.querySelectorAll("[data-scene]").forEach((button) => button.addEventListener("click", () => renderScene(button.dataset.scene)));
}

function renderScene(sceneKey = "outfit") {
  const profile = profileFromStorage();
  if (!profile) return renderOnboarding();
  state.page = "scene";
  state.scene = sceneKey;
  const scene = SCENES[sceneKey];
  const choice = scene.choices.includes(state.selectedChoice) ? state.selectedChoice : scene.choices[0];
  state.selectedChoice = choice;
  const currentTime = new Date();
  app.innerHTML = `
    <section class="page scene-page">
      <button class="back-button" data-go="today">返回今日场</button>
      <header class="scene-header"><p class="eyebrow">SCENE / ${scene.detail.toUpperCase()}</p><h1 class="display">${scene.title}</h1><p class="lead">${scene.lead}</p></header>
      <form id="scene-form" class="cyber-form">
        <fieldset class="choice-fieldset"><legend class="field-label">01 / ${scene.field}</legend><div class="choices">
          ${scene.choices.map((item) => `<label class="choice"><input type="radio" name="choice" value="${item}" ${item === choice ? "checked" : ""}><span>${item}</span></label>`).join("")}
        </div></fieldset>
        <label class="field"><span class="field-label">02 / 发生时间</span><input name="time" type="time" value="${pad(currentTime.getHours())}:${pad(currentTime.getMinutes())}"><p class="input-note">用于重算流日与流时。流时映射仍处于规则覆盖阶段，界面会显示限制。</p></label>
        <div class="form-actions"><button class="primary-button" type="submit"><span>生成场景建议</span><b>→</b></button></div>
      </form>
    </section>
    ${nav("scene")}`;
  wireNavigation();
  document.querySelector("#scene-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    state.selectedChoice = form.get("choice");
    const [hours, minutes] = form.get("time").split(":").map(Number);
    const at = new Date();
    at.setHours(hours, minutes, 0, 0);
    state.latestReading = createReading(profile, at);
    renderResult(state.latestReading, sceneKey, state.selectedChoice);
  });
}

function renderResult(reading = state.latestReading, scene = state.scene, choice = state.selectedChoice) {
  const profile = profileFromStorage();
  if (!profile) return renderOnboarding();
  const result = buildSceneAdvice(reading, scene, choice);
  const primary = reading.analysis.dailyFocus.primary;
  setSignal(primary);
  const ranking = result.ranking ? `<section class="result-group"><h2>信号排序</h2><ol class="rank-list">${result.ranking.map((item, index) => `<li><span class="rank-number">0${index + 1}</span><div><strong>${item.label}</strong><small>${item.reason}</small></div></li>`).join("")}</ol></section>` : "";
  app.innerHTML = `
    <section class="page result-page">
      <button class="back-button" data-go="scene">调整条件</button>
      <header class="result-title-row"><div><p class="eyebrow">SCENE RESULT / ${SCENES[scene].detail}</p><h1 class="result-headline">${result.headline}</h1></div><span class="result-sigil">${ELEMENT_LABEL[primary]}</span></header>
      <p class="result-intro">${result.primaryAdvice}</p>
      <section class="result-group"><h2>备选路径</h2><ul>${result.alternatives.map((item) => `<li>${item}</li>`).join("")}</ul></section>
      ${ranking}
      <section class="result-group trace-group"><h2>本次依据</h2><p><span>${result.appliedRule.source}</span>${result.appliedRule.inference}</p></section>
      <section class="result-group"><h2>现实边界</h2><p>流日为 ${result.transit.day}。场景映射只给行动偏好，不对结果、输赢或风险作确定预测。</p></section>
      <button class="reasoning-link" data-go="reasoning"><span>TRACE</span> 看完整推演依据 <b>→</b></button>
      <div class="feedback-row"><button data-feedback="helpful">这条有用</button><button data-feedback="not-useful">不太适用</button></div>
    </section>
    ${nav("scene")}`;
  wireNavigation();
  document.querySelectorAll("[data-feedback]").forEach((button) => button.addEventListener("click", () => {
    localStorage.setItem("guanshi-feedback", button.dataset.feedback);
    showToast(button.dataset.feedback === "helpful" ? "反馈已写入本地记录。" : "已记下，这条不会被包装成“命中”。");
  }));
}

function renderReasoning() {
  const profile = profileFromStorage();
  if (!profile) return renderOnboarding();
  const reading = state.latestReading || createReading(profile);
  state.latestReading = reading;
  const { chart, transit, analysis } = reading;
  setSignal(analysis.dailyFocus.primary);
  app.innerHTML = `
    <section class="page reasoning-page">
      <button class="back-button" data-go="today">回到今天</button>
      <header class="scene-header"><div class="trace-header-line">${topMark("AUDIT TRACE")}</div><p class="eyebrow">FACT → RULE → SCENE</p><h1 class="display">命理推演<br>不是黑箱。</h1><p class="lead">先保存排盘事实，按规则优先级逐层处理；未覆盖的判断保持未定，不把它伪装成一句漂亮结论。</p></header>
      <section class="reasoning-summary"><div class="summary-grid">
        <div><span>四柱</span><strong>${chart.pillars.map((pillar) => pillar ? pillar.text : "—").join(" · ")}</strong></div>
        <div><span>节气月</span><strong>${chart.currentJie}</strong></div>
        <div><span>格局候选</span><strong>${analysis.patternCandidate}</strong></div>
        <div><span>流日</span><strong>${transit.day}</strong></div>
      </div></section>
      <section class="rule-order"><span>RULE ORDER</span><p>月令与格局候选 <b>→</b> 调候 <b>→</b> 旺衰辅助 <b>→</b> 流通与作用 <b>→</b> 场景映射</p></section>
      <section class="trace-list" aria-label="推演步骤">
        ${analysis.ruleTrace.map((step, index) => `<article class="reasoning-step ${step.status === "guardrail" ? "is-guardrail" : ""}"><span class="step-number">${pad(index + 1)}</span><div class="step-content"><p class="rule-id">${step.id} / ${step.source}</p><p class="step-fact">${step.fact}</p><p class="step-inference">${step.inference}</p></div></article>`).join("")}
      </section>
      <section class="limitations"><p class="section-kicker">LIMITATIONS / CURRENT BUILD</p><ul>${analysis.limitations.map((item) => `<li>${item}</li>`).join("")}</ul></section>
      <section class="source-anchors"><p class="section-kicker">RULEBOOK ANCHORS</p>${SOURCE_ANCHORS.map((source) => `<p><b>${source.book}</b> · ${source.sections.join("、")}<span>${source.principle}</span></p>`).join("")}</section>
    </section>
    ${nav("today")}`;
  wireNavigation();
}

function renderProfile() {
  const profile = profileFromStorage();
  if (!profile) return renderOnboarding();
  const reading = state.latestReading || createReading(profile);
  const { chart } = reading;
  setSignal(reading.analysis.dailyFocus.primary);
  app.innerHTML = `
    <section class="page profile-page">
      ${topMark("LOCAL PROFILE")}
      <p class="eyebrow">DATA / CALCULATION CONFIG</p><h1 class="section-title">我的命盘<br>配置</h1>
      <section class="profile-list">
        <div class="profile-row"><span>出生资料</span><strong>${escapeHtml(profile.birthDate)} · ${escapeHtml(profile.birthTime || "未知")}</strong></div>
        <div class="profile-row"><span>出生地</span><strong>${escapeHtml(profile.birthPlace)}</strong></div>
        <div class="profile-row"><span>四柱</span><strong>${chart.pillars.map((pillar) => pillar ? pillar.text : "—").join(" ")}</strong></div>
        <div class="profile-row"><span>换月规则</span><strong>${chart.options.monthBoundary}</strong></div>
        <div class="profile-row"><span>子时规则</span><strong>${chart.options.dayBoundary}</strong></div>
        <div class="profile-row"><span>历法引擎</span><strong>${chart.options.calendarEngine}</strong></div>
      </section>
      <section class="disclosure"><strong>资料边界</strong><br>命盘资料只保存在当前浏览器。本地原型未上传出生资料，也没有接入语言模型接口。</section>
      <button class="danger-button" data-action="clear-profile">删除本地资料与反馈</button>
    </section>
    ${nav("profile")}`;
  wireNavigation();
  document.querySelector("[data-action='clear-profile']").addEventListener("click", () => { clearProfile(); renderOnboarding(); showToast("本地资料已删除。"); });
}

function wireNavigation() {
  document.querySelectorAll("[data-go]").forEach((button) => button.addEventListener("click", () => {
    const target = button.dataset.go;
    if (target === "today") renderToday();
    if (target === "scene") renderScene(state.scene);
    if (target === "reasoning") renderReasoning();
    if (target === "profile") renderProfile();
  }));
}

function showToast(message) {
  document.querySelector(".toast")?.remove();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.append(toast);
  window.setTimeout(() => toast.remove(), 2200);
}

if (profileFromStorage()) renderToday();
else renderOnboarding();
