const colorMap = { wood: "电青", fire: "暗绯红", earth: "沙金", metal: "银灰", water: "深海蓝" };
const directionMap = { wood: "东", fire: "南", earth: "中", metal: "西", water: "北" };

function formatToday(reading) {
  const analysis = reading.analysis;
  const primary = analysis.dailyFocus.primary;
  const secondary = analysis.dailyFocus.secondary;
  return {
    dayMaster: reading.chart.dayMaster,
    dayMasterElement: { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" }[reading.chart.dayMasterElement],
    transitDay: reading.transit.day,
    currentJie: reading.transit.currentJie,
    monthBranch: reading.chart.pillars[1].branch,
    patternCandidate: analysis.patternCandidate,
    strength: analysis.strength.tendency,
    summary: analysis.summary,
    primary,
    secondary,
    adviceRows: [
      { key: "outfit", index: "01", label: "穿什么", value: `优先 ${colorMap[primary]} 一类低饱和色` },
      { key: "outing", index: "02", label: "往哪里", value: `若路线可选，可从${directionMap[primary]}向开始` },
      { key: "work_social", index: "03", label: "怎么做", value: `用${{ wood: "木", fire: "火", earth: "土", metal: "金", water: "水" }[primary]}的方式，先完成一小步` }
    ]
  };
}

module.exports = { formatToday };
