const { ELEMENT_COLORS, ELEMENT_DIRECTIONS, ELEMENT_LABEL } = require("./bazi-engine");

const SCENES = {
  outfit: { title: "穿什么", detail: "穿搭色调", lead: "先尊重现实场合，再从日常倾向里挑一个让自己更稳的色域。", field: "今天的场合", choices: ["日常通勤", "正式见面", "朋友聚会", "运动休闲"] },
  outing: { title: "往哪里", detail: "出行方位", lead: "方位只是一个微小参考。路线、天气、交通和安全始终优先。", field: "这次出门要做什么", choices: ["见客户", "处理事务", "短途出行", "散心走走"] },
  work_social: { title: "怎么推进", detail: "行动策略", lead: "把命理提示翻译为沟通和执行的节奏，而不是替你替代判断。", field: "这件事更接近", choices: ["提出想法", "谈合作", "整理收尾", "关系沟通"] },
  mahjong: { title: "坐哪里", detail: "娱乐参考", lead: "只给专注感与节奏的娱乐参考；不预测输赢，也不鼓励下注。", field: "判断方式", choices: ["帮我排座位"] },
};

function buildSceneAdvice(reading, scene, choice) {
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
  if (scene === "mahjong") {
    const positions = ["东", "南", "西", "北"].map((label) => {
      const element = { 东: "wood", 南: "fire", 西: "metal", 北: "water" }[label];
      return { label: `${label}位`, score: element === primary ? 2 : element === secondary ? 1 : 0 };
    }).sort((a, b) => b.score - a.score);
    headline = `若能自选，${positions[0].label}更顺手`;
    primaryAdvice = `你的日常映射当前偏${ELEMENT_LABEL[primary]}，因此优先${positions[0].label}作一个轻量娱乐选择。若现场不能坐推荐位，就从次选或现实最方便的位置里取，不必强行换座。`;
    alternatives = [`次选 ${positions[1].label}；如果只能坐别的位置，把它当作普通位置即可。`, "设好娱乐预算、按时休息，远比座位建议重要。"];
    ranking = positions.map((item, index) => ({ label: item.label, reason: index === 0 ? `与当日${ELEMENT_LABEL[primary]}倾向更接近` : index === 1 ? `可作为${ELEMENT_LABEL[secondary]}的次选` : "当前规则没有额外偏好" }));
  }
  return { headline, primaryAdvice, alternatives, ranking, transit, appliedRule: analysis.ruleTrace[0] };
}

module.exports = { SCENES, buildSceneAdvice };
