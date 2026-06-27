/**
 * 子平推演内核（v0.2）
 *
 * 这是一个可审计的规则骨架，而不是把古籍原文交给模型自由发挥。
 * 排盘交给 lunar-javascript；推演以月令、格局候选、调候、旺衰、取用顺序
 * 依次展开。未被规则覆盖的格局不会伪装成确定结论。
 */

export const RULEBOOK_VERSION = "0.2.0";

export const SOURCE_ANCHORS = [
  {
    id: "ZPZQ.YONGSHEN",
    book: "子平真诠",
    sections: ["论用神", "论用神变化", "论相神紧要"],
    principle: "以月令与格局为先，再讨论用神及其成败；不用五行数量直接替代取用。",
  },
  {
    id: "ZPZQ.CLIMATE",
    book: "子平真诠",
    sections: ["论用神配气候得失"],
    principle: "寒暖燥湿是取用时必须并看的条件，不把扶抑当作唯一判断。",
  },
  {
    id: "DTST.MONTH",
    book: "滴天髓",
    sections: ["月令", "衰旺", "中和"],
    principle: "先察月令和全局旺衰，再判断体用是否有偏。",
  },
  {
    id: "DTST.FLOW",
    book: "滴天髓",
    sections: ["源流", "通关", "配合"],
    principle: "观察生克制化是否流通；合、冲、刑、害只作条件信号，不能脱离全局单断。",
  },
];

export const ELEMENTS = ["wood", "fire", "earth", "metal", "water"];
export const ELEMENT_LABEL = { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" };
export const ELEMENT_COLORS = {
  wood: ["电青", "深松绿", "青蓝"],
  fire: ["暗绯红", "紫红", "暖灰"],
  earth: ["沙金", "岩褐", "雾白"],
  metal: ["银灰", "月白", "冷灰"],
  water: ["深海蓝", "靛青", "灰蓝"],
};
export const ELEMENT_DIRECTIONS = { wood: "东", fire: "南", earth: "中", metal: "西", water: "北" };

const STEMS = {
  甲: { element: "wood", polarity: "yang" }, 乙: { element: "wood", polarity: "yin" },
  丙: { element: "fire", polarity: "yang" }, 丁: { element: "fire", polarity: "yin" },
  戊: { element: "earth", polarity: "yang" }, 己: { element: "earth", polarity: "yin" },
  庚: { element: "metal", polarity: "yang" }, 辛: { element: "metal", polarity: "yin" },
  壬: { element: "water", polarity: "yang" }, 癸: { element: "water", polarity: "yin" },
};

const HIDDEN_STEMS = {
  子: ["癸"], 丑: ["己", "癸", "辛"], 寅: ["甲", "丙", "戊"], 卯: ["乙"],
  辰: ["戊", "乙", "癸"], 巳: ["丙", "戊", "庚"], 午: ["丁", "己"], 未: ["己", "丁", "乙"],
  申: ["庚", "壬", "戊"], 酉: ["辛"], 戌: ["戊", "辛", "丁"], 亥: ["壬", "甲"],
};

const BRANCH_ELEMENT = {
  子: "water", 丑: "earth", 寅: "wood", 卯: "wood", 辰: "earth", 巳: "fire",
  午: "fire", 未: "earth", 申: "metal", 酉: "metal", 戌: "earth", 亥: "water",
};

const CLASH_PAIRS = new Set(["子午", "午子", "丑未", "未丑", "寅申", "申寅", "卯酉", "酉卯", "辰戌", "戌辰", "巳亥", "亥巳"]);
const COMBINE_PAIRS = new Set(["子丑", "丑子", "寅亥", "亥寅", "卯戌", "戌卯", "辰酉", "酉辰", "巳申", "申巳", "午未", "未午"]);
const ELEMENT_ORDER = ["wood", "fire", "earth", "metal", "water"];

function solarApi() {
  if (!globalThis.Solar) throw new Error("Calendar library unavailable. Load lunar-javascript before bazi-engine.");
  return globalThis.Solar;
}

function parseDateTime(profile) {
  const [year, month, day] = profile.birthDate.split("-").map(Number);
  const [hour = 12, minute = 0] = (profile.birthTime || "12:00").split(":").map(Number);
  return { year, month, day, hour, minute };
}

function asPillar(name, value, eightChar) {
  const stem = value.slice(0, 1);
  const branch = value.slice(1, 2);
  const accessors = {
    year: ["getYearHideGan", "getYearShiShenGan", "getYearShiShenZhi", "getYearDiShi"],
    month: ["getMonthHideGan", "getMonthShiShenGan", "getMonthShiShenZhi", "getMonthDiShi"],
    day: ["getDayHideGan", "getDayShiShenGan", "getDayShiShenZhi", "getDayDiShi"],
    hour: ["getTimeHideGan", "getTimeShiShenGan", "getTimeShiShenZhi", "getTimeDiShi"],
  }[name];
  return {
    name,
    text: value,
    stem,
    branch,
    stemElement: STEMS[stem].element,
    branchElement: BRANCH_ELEMENT[branch],
    hiddenStems: [...eightChar[accessors[0]]()],
    stemTenGod: eightChar[accessors[1]](),
    branchTenGods: [...eightChar[accessors[2]]()],
    diShi: eightChar[accessors[3]](),
  };
}

function getNearbyTerm(lunar) {
  const term = lunar.getPrevJie(true);
  return term ? `${term.getName()}（${term.getSolar().toYmd()}）` : "节气资料待补";
}

export function buildChart(profile) {
  const { year, month, day, hour, minute } = parseDateTime(profile);
  const timeKnown = Boolean(profile.birthTime);
  const solar = solarApi().fromYmdHms(year, month, day, hour, minute, 0);
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();
  // sect=2：零点换日；sect=1：子初换日。两者是可配置的流派差异。
  eightChar.setSect(profile.dayBoundary === "ziStart" ? 1 : 2);
  const allPillars = [
    asPillar("year", eightChar.getYear(), eightChar),
    asPillar("month", eightChar.getMonth(), eightChar),
    asPillar("day", eightChar.getDay(), eightChar),
    asPillar("hour", eightChar.getTime(), eightChar),
  ];
  const pillars = timeKnown ? allPillars : [...allPillars.slice(0, 3), null];
  return {
    pillars,
    dayMaster: pillars[2].stem,
    dayMasterElement: pillars[2].stemElement,
    currentJie: getNearbyTerm(lunar),
    solar: solar.toYmdHms(),
    lunar: lunar.toString(),
    timeKnown,
    options: {
      calendarEngine: "lunar-javascript@1.7.7",
      monthBoundary: "按节气换月",
      dayBoundary: profile.dayBoundary === "ziStart" ? "子初换日" : "零点换日",
      trueSolarTime: false,
    },
  };
}

export function buildTransit(date = new Date()) {
  const solar = solarApi().fromYmdHms(date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds());
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();
  return {
    year: eightChar.getYear(),
    month: eightChar.getMonth(),
    day: eightChar.getDay(),
    hour: eightChar.getTime(),
    currentJie: getNearbyTerm(lunar),
    dayStem: eightChar.getDayGan(),
    dayBranch: eightChar.getDayZhi(),
  };
}

function relationToSelf(element, self) {
  const delta = (ELEMENT_ORDER.indexOf(element) - ELEMENT_ORDER.indexOf(self) + 5) % 5;
  return ["同类", "我生", "我克", "克我", "生我"][delta];
}

function tenGod(dayStem, targetStem) {
  const self = STEMS[dayStem];
  const target = STEMS[targetStem];
  const relation = relationToSelf(target.element, self.element);
  const samePolarity = self.polarity === target.polarity;
  const table = {
    同类: samePolarity ? "比肩" : "劫财",
    我生: samePolarity ? "食神" : "伤官",
    我克: samePolarity ? "偏财" : "正财",
    克我: samePolarity ? "七杀" : "正官",
    生我: samePolarity ? "偏印" : "正印",
  };
  return table[relation];
}

function measureElements(chart) {
  const weights = Object.fromEntries(ELEMENTS.map((element) => [element, 0]));
  const evidence = [];
  chart.pillars.filter(Boolean).forEach((pillar) => {
    weights[pillar.stemElement] += 100;
    evidence.push({ element: pillar.stemElement, source: `${pillar.name}干${pillar.stem}`, weight: 100 });
    const multiplier = pillar.name === "month" ? 1.35 : 1;
    pillar.hiddenStems.forEach((stem, index) => {
      const raw = [78, 36, 16][index] || 12;
      const weight = Math.round(raw * multiplier);
      weights[STEMS[stem].element] += weight;
      evidence.push({ element: STEMS[stem].element, source: `${pillar.name}支${pillar.branch}藏${stem}`, weight });
    });
  });
  return { weights, evidence };
}

function climateSignal(monthBranch) {
  const seasons = {
    寅: ["初春", "木气初发，兼看寒湿是否未解", ["fire"]],
    卯: ["仲春", "木气升发，兼看湿土与暖意", ["fire", "earth"]],
    辰: ["暮春", "湿土当令，兼看木气余势与疏通", ["wood", "fire"]],
    巳: ["初夏", "火气渐显，先观察燥热是否需要润泽", ["water"]],
    午: ["仲夏", "火旺燥热，调候上先观察水的作用条件", ["water"]],
    未: ["暮夏", "暑湿并见，须结合土的燥湿与水火条件", ["water", "wood"]],
    申: ["初秋", "金气初至，兼看燥气和水的流通", ["water"]],
    酉: ["仲秋", "金旺而燥，兼看水木是否有根有源", ["water", "wood"]],
    戌: ["暮秋", "燥土收束，兼看火土金水是否失衡", ["water"]],
    亥: ["初冬", "水气渐强，先观察寒湿和火的条件", ["fire"]],
    子: ["仲冬", "水寒偏重，调候上先观察火是否可用", ["fire"]],
    丑: ["暮冬", "寒湿土中藏气，兼看火的温养条件", ["fire"]],
  };
  const [season, note, candidates] = seasons[monthBranch];
  return { season, note, candidates };
}

function detectTransitInteractions(chart, transit) {
  const result = [];
  chart.pillars.filter(Boolean).forEach((pillar) => {
    const pair = `${pillar.branch}${transit.dayBranch}`;
    if (CLASH_PAIRS.has(pair)) result.push({ type: "冲", target: `${pillar.name}支${pillar.branch}`, with: transit.dayBranch });
    if (COMBINE_PAIRS.has(pair)) result.push({ type: "合", target: `${pillar.name}支${pillar.branch}`, with: transit.dayBranch });
  });
  return result;
}

function strengthAssessment(dayMasterElement, weights) {
  const supporting = weights[dayMasterElement] + Object.entries(weights)
    .filter(([element]) => relationToSelf(element, dayMasterElement) === "生我")
    .reduce((total, [, value]) => total + value, 0);
  const draining = Object.entries(weights)
    .filter(([element]) => ["我生", "我克", "克我"].includes(relationToSelf(element, dayMasterElement)))
    .reduce((total, [, value]) => total + value, 0);
  const delta = supporting - draining;
  return {
    support: supporting,
    drain: draining,
    tendency: delta > 85 ? "偏旺" : delta < -85 ? "偏弱" : "中和附近",
  };
}

function workingTendency(dayMasterElement, strength, climate) {
  const selfIndex = ELEMENT_ORDER.indexOf(dayMasterElement);
  const resource = ELEMENT_ORDER[(selfIndex + 4) % 5];
  const output = ELEMENT_ORDER[(selfIndex + 1) % 5];
  const wealth = ELEMENT_ORDER[(selfIndex + 2) % 5];
  const primary = strength.tendency === "偏弱" ? resource : strength.tendency === "偏旺" ? output : wealth;
  const secondary = strength.tendency === "偏弱" ? dayMasterElement : output;
  const candidates = [...new Set([...climate.candidates, primary, secondary])];
  return { primary, secondary, candidates };
}

export function analyzeChart(chart, transit = buildTransit()) {
  const { weights, evidence } = measureElements(chart);
  const month = chart.pillars[1];
  const climate = climateSignal(month.branch);
  const strength = strengthAssessment(chart.dayMasterElement, weights);
  const monthCommander = month.hiddenStems[0];
  const patternCandidate = tenGod(chart.dayMaster, monthCommander);
  const dailyFocus = workingTendency(chart.dayMasterElement, strength, climate);
  const interactions = detectTransitInteractions(chart, transit);
  const dominantElements = Object.entries(weights).sort(([, left], [, right]) => right - left).slice(0, 2).map(([element]) => element);

  return {
    weights,
    evidence,
    strength,
    patternCandidate,
    climate,
    dailyFocus,
    interactions,
    summary: `日主为${chart.dayMaster}${ELEMENT_LABEL[chart.dayMasterElement]}，月令为${month.branch}，先以月令、${patternCandidate}格局候选与${climate.season}调候信号复核；日常映射暂取${ELEMENT_LABEL[dailyFocus.primary]}为先、${ELEMENT_LABEL[dailyFocus.secondary]}为辅。`,
    ruleTrace: [
      {
        id: "ZPZQ.MONTH-COMMAND.001",
        source: "《子平真诠》·论用神",
        fact: `月令为${month.branch}，司令藏干先取${monthCommander}${ELEMENT_LABEL[STEMS[monthCommander].element]}。`,
        inference: `月令十神为${patternCandidate}，先作为格局候选；尚需透干、通根、破格等条件后才能定格。`,
        status: "applied",
      },
      {
        id: "ZPZQ.CLIMATE.001",
        source: "《子平真诠》·论用神配气候得失",
        fact: `命局生于${climate.season}，${climate.note}。`,
        inference: `把${climate.candidates.map((element) => ELEMENT_LABEL[element]).join("、")}列为调候观察项，不直接等同最终用神。`,
        status: "applied",
      },
      {
        id: "DTST.STRENGTH.001",
        source: "《滴天髓》·月令、衰旺",
        fact: `按透干、藏干与月支加权，局中${dominantElements.map((element) => ELEMENT_LABEL[element]).join("、")}信号较显；日主初判${strength.tendency}。`,
        inference: `旺衰仅作扶抑的辅助判断，不能覆盖月令、格局与调候。`,
        status: "applied",
      },
      {
        id: "DTST.FLOW.001",
        source: "《滴天髓》·源流、通关、配合",
        fact: interactions.length ? `流日${transit.day}与原局出现${interactions.map((item) => `${item.target}${item.type}${item.with}`).join("；")}。` : `流日${transit.day}与原局未见本规则已覆盖的支合冲信号。`,
        inference: `合冲只记录为触发条件，必须结合全局和具体场景，不单独推导吉凶。`,
        status: "applied",
      },
      {
        id: "NO-MISSING-ELEMENT.001",
        source: "产品约束",
        fact: "本系统不把“五行缺什么”当作补什么的依据。",
        inference: "每日颜色、方位建议只使用已审计的日常倾向，不冒充完整取用结论。",
        status: "guardrail",
      },
    ],
    limitations: [
      ...(chart.timeKnown ? [] : ["出生时辰未知：时柱未参与权重、合冲或场景判断。"]),
      "未启用真太阳时；出生地仅作资料保留，专业版需据经纬度校正。",
      "格局成败、相神、从格及大运流年仍需逐条规则覆盖和专业审校。",
      "当前日常映射是文化娱乐与自我探索参考，不推断医疗、投资、法律或博彩结果。",
    ],
  };
}

export function createReading(profile, at = new Date()) {
  const chart = buildChart(profile);
  const transit = buildTransit(at);
  const analysis = analyzeChart(chart, transit);
  return { chart, transit, analysis, createdAt: at.toISOString(), rulebookVersion: RULEBOOK_VERSION };
}

export function getElementForStem(stem) { return STEMS[stem]?.element; }
