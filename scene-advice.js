import { ELEMENT_COLORS, ELEMENT_DIRECTIONS, ELEMENT_LABEL } from "./bazi-engine.js";

export const SCENES = {
  outfit: { title: "穿什么", detail: "穿搭色调", lead: "先尊重现实场合，再从日常倾向里挑一个让自己更稳的色域。", field: "今天的场合", choices: ["日常通勤", "正式见面", "朋友聚会", "运动休闲"] },
  outing: { title: "往哪里", detail: "出行方位", lead: "方位只是一个微小参考。路线、天气、交通和安全始终优先。", field: "这次出门要做什么", choices: ["见客户", "处理事务", "短途出行", "散心走走"] },
  work_social: { title: "怎么推进", detail: "行动策略", lead: "把命理提示翻译为沟通和执行的节奏，而不是替你替代判断。", field: "这件事更接近", choices: ["提出想法", "谈合作", "整理收尾", "关系沟通"] },
  timing: { title: "何时开始", detail: "节奏选择", lead: "给一件已经决定要做的事，找一个更合适的推进窗口。", field: "你准备做什么", choices: ["上午推进", "午后沟通", "傍晚收尾", "夜间复盘"] },
  mahjong: { title: "坐哪里", detail: "娱乐参考", lead: "只给专注感与节奏的娱乐参考；不预测输赢，也不鼓励下注。", field: "现场可选位置", choices: ["东位", "南位", "西位", "北位"] },
};

export function buildSceneAdvice(reading, scene, choice) {
  const { analysis, transit } = reading;
  const primary = analysis.dailyFocus.primary;
  const secondary = analysis.dailyFocus.secondary;
  const colors = ELEMENT_COLORS[primary];
  let headline = "让下一步更清楚";
  let primaryAdvice = "先完成一个最小动作，再决定是否扩大推进。";
  let alternatives = ["如果现实限制较多，把建议降级为一次小范围试行。"];
  let ranking = null;

  if (scene === "outfit") {
    headline = `用${colors[0]}，保持信号稳定`;
    primaryAdvice = `${choice}时，可把${colors[0]}或${colors[1]}作为主色；若着装有硬性要求，就在内搭、配件或小面积处使用${colors[2]}。`;
    alternatives = ["专业感优先：黑、灰、白仍可作为大面积底色。", "不需要凑齐五行色；干净、舒适和场合匹配更重要。"];
  }
  if (scene === "outing") {
    headline = `若路线可选，从${ELEMENT_DIRECTIONS[primary]}向开始`;
    primaryAdvice = `${choice}时，可把${ELEMENT_DIRECTIONS[primary]}向作为优先起点；不便调整方位时，改为先完成与${ELEMENT_LABEL[primary]}有关的准备动作。`;
    alternatives = [`${ELEMENT_DIRECTIONS[secondary]}向可作为次选。`, "交通、天气和行程安全永远覆盖命理偏好。"];
  }
  if (scene === "work_social") {
    const action = { wood: "先开一个明确话题", fire: "把观点压缩成一句结论", earth: "把事实和下一步写清楚", metal: "收束边界，先定标准", water: "先听信息，再留出回应空间" }[primary];
    headline = "先让信息流动起来";
    primaryAdvice = `${choice}时，建议${action}。把事情变成一个可回应的问题，比试图一次说服所有人更合适。`;
    alternatives = ["对方节奏很快时，先给结论，再补充理由。", "出现分歧时，先确认事实，暂缓情绪化定性。"];
  }
  if (scene === "timing") {
    const preferredTime = { wood: "上午", fire: "午后", earth: "傍晚", metal: "傍晚", water: "夜间" }[primary];
    const selectedTime = { "上午推进": "上午", "午后沟通": "午后", "傍晚收尾": "傍晚", "夜间复盘": "夜间" }[choice];
    if (selectedTime === preferredTime) {
      headline = `${choice}与今天的节奏相合`;
      primaryAdvice = `今天可以在${preferredTime}完成第一步：先启动和对齐，不要求当场交付全部结果。`;
      alternatives = ["若时间被压缩，保留 15 分钟做准备或确认，也算有效推进。", "重要事项仍应服从对方可用时间和正式流程。"];
    } else {
      headline = `若能调整，${preferredTime}更适合启动`;
      primaryAdvice = `你选择的是${choice}；本次日常映射更偏向${preferredTime}。若时间可调，把需要主动推进的关键一步放到${preferredTime}。`;
      alternatives = [`若必须在${selectedTime}行动，可先完成资料整理、确认目标或预约，关键推进留到${preferredTime}。`, "重要事项仍应服从对方可用时间和正式流程。"];
    }
  }
  if (scene === "mahjong") {
    const positions = ["东", "南", "西", "北"].map((label) => {
      const element = { 东: "wood", 南: "fire", 西: "metal", 北: "water" }[label];
      return { label: `${label}位`, score: element === primary ? 2 : element === secondary ? 1 : 0 };
    }).sort((a, b) => b.score - a.score);
    headline = `若能自选，${positions[0].label}更顺手`;
    primaryAdvice = `你的日常映射当前偏${ELEMENT_LABEL[primary]}，因此优先${positions[0].label}作一个轻量娱乐选择。它只服务于心态与专注，不代表输赢预测。`;
    alternatives = [`次选 ${positions[1].label}；不能选位时不必强行调整。`, "设好娱乐预算、按时休息，远比座位建议重要。"];
    ranking = positions.map((item, index) => ({ label: item.label, reason: index === 0 ? `与当日${ELEMENT_LABEL[primary]}倾向更接近` : index === 1 ? `可作为${ELEMENT_LABEL[secondary]}的次选` : "当前规则没有额外偏好" }));
  }
  return { headline, primaryAdvice, alternatives, ranking, transit, appliedRule: analysis.ruleTrace[0] };
}
