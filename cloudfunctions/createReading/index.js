const cloud = require("wx-server-sdk");
const https = require("node:https");
const { Solar } = require("lunar-javascript");
const { RULEBOOK_VERSION, SOURCE_ANCHORS, createReading } = require("./bazi-engine");
const { SCENES, buildSceneAdvice } = require("./scene-advice");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

globalThis.Solar = Solar;

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1900 || year > new Date().getFullYear()) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isValidTime(value) {
  if (!/^\d{2}:\d{2}$/.test(value || "")) return false;
  const [hours, minutes] = value.split(":").map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

function validateProfile(profile) {
  if (!profile || typeof profile !== "object") return "profile is required";
  if (!isValidDate(profile.birthDate)) return "birthDate must be a valid YYYY-MM-DD date";
  if (profile.birthTime && !isValidTime(profile.birthTime)) return "birthTime must be a valid HH:mm time";
  if (profile.dayBoundary && !["midnight", "ziStart"].includes(profile.dayBoundary)) return "dayBoundary is invalid";
  return null;
}

function publicReading(reading) {
  return {
    rulebookVersion: reading.rulebookVersion,
    chart: reading.chart,
    transit: reading.transit,
    analysis: reading.analysis,
  };
}

const SYSTEM_PROMPT = [
  "你是“观时AI”的命理推理助手，也是一位克制、准确、会讲现代人听得懂的话的中国传统命理师。",
  "你不是自由占卜模型，不能随机玄学化表达；你的任务是在结构化命盘、规则引擎结果和 ruleTrace 基础上做解释层与表达层。",
  "核心依据以《子平真诠》和《滴天髓》的方法论为主：以月令为纲，先看格局候选与成败条件，再看调候、旺衰、源流、通关与配合。",
  "禁止用“五行缺什么补什么”直接断事；合冲刑害不能脱离全局单断；不能承诺发财、中奖、赢钱、改运、疾病、婚恋等确定结果。",
  "麻将、牌局、出行、穿衣等场景只给娱乐和行动节奏参考，不预测输赢。",
  "你必须服从输入中的 chart、transit、analysis、ruleTrace 和 advice，不得重新排盘，不得改写命盘事实。",
  "输出要克制、清楚、具体，有古法逻辑和现代生活感，不恐吓、不宿命论。",
  "请只输出 JSON，不要输出 Markdown。JSON 字段必须是：headline、primaryAdvice、alternatives、note。",
  "alternatives 必须是 2 个字符串。每个字段都用中文。"
].join("\n");

const ASK_SYSTEM_PROMPT = [
  "你是“观时AI”，一位精通子平八字的中国传统命理师，但你的表达必须现代、克制、具体。",
  "你的核心约束：一切回答必须服从输入中的 chart、transit、analysis、ruleTrace、deterministicAdvice；不得重新排盘，不得编造命盘事实。",
  "方法论以《子平真诠》和《滴天髓》为底层：月令为纲，格局候选、调候、旺衰、源流通关依次复核；不能把“五行缺什么补什么”当作依据。",
  "你可以结合用户最近几次问题，逐渐理解用户偏好，但只能用于表达方式和现实建议，不能伪造长期记忆或隐私。",
  "用户可能会提出现实限制，例如“不能坐某方位”。现实限制优先，命理建议应降级为替代动作、心态调整或次优方案。",
  "禁止承诺赢钱、中奖、投资收益、疾病结果、婚恋确定结局；麻将和牌局只给娱乐参考，不预测输赢。",
  "请只输出 JSON，不要输出 Markdown。JSON 字段必须是：headline、primary、suggestions、basis、boundary。",
  "suggestions 必须是 2 到 3 个中文字符串。"
].join("\n");

function compactReadingForModel({ reading, advice, scene, choice }) {
  return {
    scene,
    choice,
    chart: {
      pillars: reading.chart.pillars,
      dayMaster: reading.chart.dayMaster,
      dayMasterElement: reading.chart.dayMasterElement,
      currentJie: reading.chart.currentJie,
      timeKnown: reading.chart.timeKnown,
      options: reading.chart.options,
    },
    transit: reading.transit,
    analysis: {
      strength: reading.analysis.strength,
      patternCandidate: reading.analysis.patternCandidate,
      climate: reading.analysis.climate,
      dailyFocus: reading.analysis.dailyFocus,
      interactions: reading.analysis.interactions,
      summary: reading.analysis.summary,
      ruleTrace: reading.analysis.ruleTrace,
      limitations: reading.analysis.limitations,
    },
    deterministicAdvice: advice,
  };
}

function getArkEndpoint() {
  if (process.env.LLM_ENDPOINT) return process.env.LLM_ENDPOINT;
  const base = process.env.ARK_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3";
  return `${base.replace(/\/$/, "")}/chat/completions`;
}

function safeJsonParse(text) {
  if (!text || typeof text !== "string") return null;
  const trimmed = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  try { return JSON.parse(trimmed); } catch {}
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try { return JSON.parse(trimmed.slice(start, end + 1)); } catch {}
  }
  return null;
}

function requestJson(url, payload, apiKey) {
  return new Promise((resolve, reject) => {
    const endpoint = new URL(url);
    const body = JSON.stringify(payload);
    const request = https.request({
      hostname: endpoint.hostname,
      path: `${endpoint.pathname}${endpoint.search}`,
      port: endpoint.port || 443,
      method: "POST",
      timeout: Number(process.env.ARK_TIMEOUT_MS || 45000),
      headers: {
        "authorization": `Bearer ${apiKey}`,
        "content-type": "application/json",
        "content-length": Buffer.byteLength(body),
      },
    }, (response) => {
      let raw = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { raw += chunk; });
      response.on("end", () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`LLM HTTP ${response.statusCode}: ${raw.slice(0, 240)}`));
          return;
        }
        try { resolve(JSON.parse(raw)); }
        catch { reject(new Error("LLM response is not valid JSON")); }
      });
    });
    request.on("timeout", () => request.destroy(new Error("LLM request timeout")));
    request.on("error", reject);
    request.write(body);
    request.end();
  });
}

function normalizeAiAdvice(parsed, fallbackAdvice) {
  if (!parsed || typeof parsed !== "object") return null;
  const headline = typeof parsed.headline === "string" && parsed.headline.trim() ? parsed.headline.trim() : fallbackAdvice.headline;
  const primaryAdvice = typeof parsed.primaryAdvice === "string" && parsed.primaryAdvice.trim() ? parsed.primaryAdvice.trim() : fallbackAdvice.primaryAdvice;
  const alternatives = Array.isArray(parsed.alternatives)
    ? parsed.alternatives.filter((item) => typeof item === "string" && item.trim()).slice(0, 2)
    : [];
  while (alternatives.length < 2) alternatives.push(fallbackAdvice.alternatives[alternatives.length] || "现实条件优先，命理建议只作轻量参考。");
  const note = typeof parsed.note === "string" && parsed.note.trim()
    ? parsed.note.trim()
    : "以上为传统文化娱乐参考，不作为医疗、投资、法律或博彩决策依据。";
  return { headline, primaryAdvice, alternatives, note };
}

function inferSceneFromQuestion(question) {
  const text = question || "";
  if (/麻将|牌|座|坐|东位|南位|西位|北位/.test(text)) return "mahjong";
  if (/穿|衣|颜色|色|搭配/.test(text)) return "outfit";
  if (/出门|方向|方位|去哪|往哪|客户|见客户|拍照|发内容/.test(text)) return "outing";
  return "work_social";
}

function normalizeAiAnswer(parsed, fallbackAdvice, question) {
  if (!parsed || typeof parsed !== "object") {
    return {
      headline: "先照现实，再取顺势",
      primary: `关于“${question}”，观时先按今日命盘给一个轻量判断：${fallbackAdvice.primaryAdvice}`,
      suggestions: fallbackAdvice.alternatives.slice(0, 3),
      basis: fallbackAdvice.appliedRule ? fallbackAdvice.appliedRule.inference : "依据今日命盘、流日与规则链路综合判断。",
      boundary: "本回答只作传统文化与行动节奏参考，不替代现实判断。"
    };
  }
  const suggestions = Array.isArray(parsed.suggestions)
    ? parsed.suggestions.filter((item) => typeof item === "string" && item.trim()).slice(0, 3)
    : [];
  while (suggestions.length < 2) suggestions.push(fallbackAdvice.alternatives[suggestions.length] || "现实限制优先，命理建议只作辅助参考。");
  return {
    headline: typeof parsed.headline === "string" && parsed.headline.trim() ? parsed.headline.trim() : fallbackAdvice.headline,
    primary: typeof parsed.primary === "string" && parsed.primary.trim() ? parsed.primary.trim() : fallbackAdvice.primaryAdvice,
    suggestions,
    basis: typeof parsed.basis === "string" && parsed.basis.trim()
      ? parsed.basis.trim()
      : (fallbackAdvice.appliedRule ? fallbackAdvice.appliedRule.inference : "依据今日命盘、流日与规则链路综合判断。"),
    boundary: typeof parsed.boundary === "string" && parsed.boundary.trim()
      ? parsed.boundary.trim()
      : "本回答只作传统文化与行动节奏参考，不作为医疗、投资、法律或博彩决策依据。"
  };
}

async function buildAiAdvice({ reading, advice, scene, choice }) {
  const apiKey = process.env.ARK_API_KEY || process.env.LLM_API_KEY;
  const model = process.env.ARK_MODEL || process.env.LLM_MODEL || "ep-20260627124109-zcp2t";
  if (!apiKey) return null;

  const payload = {
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `以下是规则引擎生成的命盘与推理链路。请严格基于这些输入改写场景建议，不要重新排盘，不要编造规则。\n${JSON.stringify(compactReadingForModel({ reading, advice, scene, choice }))}`,
      },
    ],
    temperature: Number(process.env.ARK_TEMPERATURE || 0.45),
    max_tokens: Number(process.env.ARK_MAX_TOKENS || 420),
  };
  const thinkingType = process.env.ARK_THINKING_TYPE || "disabled";
  if (thinkingType !== "default") {
    payload.thinking = { type: thinkingType };
  }

  const data = await requestJson(getArkEndpoint(), payload, apiKey);
  const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  const parsed = safeJsonParse(content);
  const normalized = normalizeAiAdvice(parsed, advice);
  return normalized ? { ...normalized, provider: "ark", model } : null;
}

async function buildAiAnswer({ reading, advice, scene, choice, question, context }) {
  const apiKey = process.env.ARK_API_KEY || process.env.LLM_API_KEY;
  const model = process.env.ARK_MODEL || process.env.LLM_MODEL || "ep-20260627124109-zcp2t";
  if (!apiKey) return null;

  const payload = {
    model,
    messages: [
      { role: "system", content: ASK_SYSTEM_PROMPT },
      {
        role: "user",
        content: JSON.stringify({
          question,
          recentTurns: context && Array.isArray(context.recentTurns) ? context.recentTurns.slice(0, 5) : [],
          input: compactReadingForModel({ reading, advice, scene, choice })
        }),
      },
    ],
    temperature: Number(process.env.ARK_TEMPERATURE || 0.35),
    max_tokens: Number(process.env.ARK_MAX_TOKENS || 520),
  };
  const thinkingType = process.env.ARK_THINKING_TYPE || "disabled";
  if (thinkingType !== "default") {
    payload.thinking = { type: thinkingType };
  }

  const data = await requestJson(getArkEndpoint(), payload, apiKey);
  const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  const parsed = safeJsonParse(content);
  const normalized = normalizeAiAnswer(parsed, advice, question);
  return normalized ? { ...normalized, provider: "ark", model } : null;
}

exports.main = async (event = {}) => {
  const action = event.action || "createReading";

  if (action === "healthz") {
    return { ok: true, rulebookVersion: RULEBOOK_VERSION, persistence: "disabled", runtime: "wx-cloud" };
  }

  if (action === "rulebook") {
    return { version: RULEBOOK_VERSION, anchors: SOURCE_ANCHORS, scenes: SCENES };
  }

  const profileError = validateProfile(event.profile);
  if (profileError) return { error: "invalid_profile", message: profileError };

  const question = typeof event.question === "string" ? event.question.trim().slice(0, 200) : "";
  const scene = action === "ask" ? (event.scene || inferSceneFromQuestion(question)) : (event.scene || "outfit");
  if (!SCENES[scene]) return { error: "invalid_scene" };

  const at = event.at ? new Date(event.at) : new Date();
  if (Number.isNaN(at.getTime())) return { error: "invalid_time" };

  const choice = typeof event.choice === "string" && SCENES[scene].choices.includes(event.choice)
    ? event.choice
    : SCENES[scene].choices[0];

  try {
    const reading = createReading({ ...event.profile, dayBoundary: event.profile.dayBoundary || "midnight" }, at);
    const advice = buildSceneAdvice(reading, scene, choice);
    if (action === "ask") {
      if (!question) return { error: "invalid_question", message: "question is required" };
      let ai = null;
      let answer = normalizeAiAnswer(null, advice, question);
      if (event.useAI !== false) {
        try {
          ai = await buildAiAnswer({ reading, advice, scene, choice, question, context: event.context });
          if (ai) answer = {
            headline: ai.headline,
            primary: ai.primary,
            suggestions: ai.suggestions,
            basis: ai.basis,
            boundary: ai.boundary,
          };
        } catch (error) {
          ai = { error: error.message || "LLM generation failed" };
        }
      }
      return { reading: publicReading(reading), advice, answer, ai, scene, choice, question };
    }

    let ai = null;
    let finalAdvice = advice;
    if (event.useAI !== false) {
      try {
        ai = await buildAiAdvice({ reading, advice, scene, choice });
        if (ai) {
          finalAdvice = {
            ...advice,
            headline: ai.headline,
            primaryAdvice: ai.primaryAdvice,
            alternatives: ai.alternatives,
            aiNote: ai.note,
          };
        }
      } catch (error) {
        ai = { error: error.message || "LLM generation failed" };
      }
    }
    return { reading: publicReading(reading), advice: finalAdvice, ai, scene, choice };
  } catch (error) {
    return { error: "calculation_failed", message: error.message || "calculation failed" };
  }
};
