const QUESTION_POOL = [
  "今天适合见客户吗？",
  "今天适合表白/沟通关系吗？",
  "今天适合开会还是写方案？",
  "今天适合运动还是休息？",
  "今天适合整理房间/断舍离吗？",
  "今天适合签约/提交材料吗？",
  "今天适合拍照/发内容吗？",
  "如果今天不方便往推荐方位走，怎么调整？",
  "今天更适合主动推进，还是先观察？",
  "今天适合做重要决定吗？"
];

function pickDailyQuestions(count = 3, now = new Date()) {
  const seed = now.getTime() + Math.floor(Math.random() * 100000);
  return QUESTION_POOL
    .map((question, index) => ({ question, weight: (seed + index * 37) % 97 }))
    .sort((a, b) => a.weight - b.weight)
    .slice(0, count)
    .map((item) => item.question);
}

module.exports = { QUESTION_POOL, pickDailyQuestions };
