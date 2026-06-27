# AI 算命小助手｜产品与技术规格（v1）

## 1. 定位与原则

### 1.1 产品定位

以子平八字为主引擎、以《子平真诠》《滴天髓》的方法论为规则来源的日常决策辅助产品。输出必须是“命理推演 + 场景映射 + 现实提醒”，不能只是模型生成的泛化文案。

### 1.2 规则优先级

规则实现遵循以下优先级，防止“缺什么补什么”或神煞堆砌取代子平主体判断：

```text
节气与四柱准确性
  > 月令、格局与透干
  > 调候、通关、扶抑
  > 日主强弱与用神/喜忌
  > 大运、流年、流月、流日、流时的作用关系
  > 合冲刑害、三合三会等结构变化
  > 神煞、纳音等辅助信号
```

当规则冲突时，低优先级规则不得推翻高优先级结论；最多追加“可能的微调提示”。规则需要由命理顾问审核，且每次变动必须有版本号。

### 1.3 输出边界

- 使用“倾向、优先、适合留意、若条件允许”等措辞。
- 禁止承诺收益、输赢、婚姻结果、疾病结果、生死灾祸或违法风险判断。
- “麻将坐哪里”只可输出氛围与状态管理、座位偏好，不可鼓励下注或声称提高赢钱概率。
- 出生时辰未知时，只输出不依赖时柱的低置信建议，并明确标注准确度受限。

## 2. 核心领域模型

### 2.1 输入

```ts
type BirthProfile = {
  id: string;
  birthDate: "YYYY-MM-DD";
  birthTime?: "HH:mm";
  timeAccuracy: "exact" | "range" | "unknown";
  birthPlace?: { name: string; latitude?: number; longitude?: number; timezone: string };
  gender?: "female" | "male" | "unspecified";
  calendar: "gregorian";
  consentVersion: string;
};

type ScenarioRequest = {
  profileId: string;
  scenario: "outfit" | "outing" | "work_social" | "mahjong";
  occurredAt: string; // ISO 8601，默认当前时间
  location?: { latitude?: number; longitude?: number; timezone: string };
  goal?: string;
  constraints?: Record<string, string | string[]>;
  options?: Array<{ id: string; label: string; attributes: string[] }>;
};
```

### 2.2 排盘结果

```ts
type BaZiChart = {
  pillars: {
    year: Pillar; month: Pillar; day: Pillar; hour?: Pillar;
  };
  dayMaster: HeavenlyStem;
  solarTerms: { current: string; monthBoundary: string };
  hiddenStems: HiddenStem[];
  tenGods: TenGodRelation[];
  elementCounts: Record<"wood" | "fire" | "earth" | "metal" | "water", number>;
  interactions: Interaction[];
  calculation: {
    timezone: string;
    trueSolarTimeApplied: boolean;
    calendarLibraryVersion: string;
  };
};
```

### 2.3 推演结果

```ts
type ReasoningResult = {
  conclusion: {
    dayMasterStrength: "strong" | "weak" | "balanced" | "follow" | "undetermined";
    pattern?: string;
    climateNeed?: string;
    usefulElements: Element[];
    favorableElements: Element[];
    unfavorableElements: Element[];
    confidence: "high" | "medium" | "low";
  };
  steps: ReasoningStep[];
  ruleVersion: string;
  limitations: string[];
};

type ReasoningStep = {
  order: number;
  ruleId: string;
  fact: string;
  inference: string;
  effect: "primary" | "secondary" | "informational";
};
```

## 3. 排盘与命理推演

### 3.1 排盘服务 `chart-service`

**职责：** 将出生信息和目标时刻转换为可重复计算的干支、节气、藏干和关系数据。

- 必须以节气（而非农历月份）确定月柱。
- 年柱应依据立春规则切换；日柱采用经过测试的儒略日/干支日算法。
- 时柱使用当地时区；若启用真太阳时，记录经纬度、校正分钟数和计算版本。
- 对夏令时、历史时区数据和跨午夜边界建立自动化测试。
- 输入时间缺失时，计算前三柱和可能的时柱范围，不伪造一个时柱。

### 3.2 子平推演服务 `reasoning-service`

**职责：** 根据命盘返回一致、可解释、可版本化的强弱、格局、调候、用神及喜忌判断。

执行流程：

1. 读取月令与日主在十二长生的状态，作为季节基线。
2. 计算同党、印比、食伤、财、官杀等力量来源；考虑透干、通根、得令、得地、合化条件。
3. 识别格局候选及成立/破格条件。`pattern` 为空也允许，不能为了输出而强行定格。
4. 判断寒暖燥湿与调候需求；判断能否形成通关关系。
5. 综合格局、调候、扶抑与从格条件，产出用神、喜神、忌神及置信度。
6. 生成不超过 8 步的 `ReasoningStep`。每一步只表达一个可验证判断。

**规则文件格式建议：**

```yaml
id: STRENGTH.MONTH_COMMAND.001
version: 1.0.0
priority: 100
when:
  day_master: wood
  month_branch_in: [shen, you]
then:
  add_signal:
    key: seasonal_pressure
    element: metal
    weight: 0.8
explanation:
  factTemplate: "日主为木，生于{{monthBranch}}月。"
  inferenceTemplate: "月令金气当令，对日主构成主要季节压力。"
source:
  work: "内部整理的子平规则索引"
  locator: "待命理顾问校订"
```

> 规则文件保存的是可执行条件与自写的概括性解释，不直接大量复制古籍文本。来源定位应由专业顾问建立、审校。

### 3.3 时空作用服务 `transit-service`

**职责：** 计算当前/指定时刻的流年、流月、流日、流时，并判断它们与原局的作用关系。

- 输出当前时间干支与五行权重，不单独使用“今日属什么”做结论。
- 识别与四柱的冲、合、刑、害、破及三合、三会候选关系。
- 输出“增强喜用”“加重忌神”“引动某柱”“关系不显著”等中间标签。
- 大运在 v1 只作可选的背景信息；当性别/出生时刻不完整时不输出确定的大运结论。

## 4. 场景映射服务 `scenario-service`

### 4.1 通用评分规则

场景结论不直接由“五行 → 一个颜色/方位”硬映射，而是由多信号加权得出。

```text
optionScore =
  natalPreferenceScore × 0.45
  + transitCompatibilityScore × 0.25
  + timeCompatibilityScore × 0.10
  + interactionAdjustment × 0.15
  + practicalConstraintScore × 0.05
```

- 权重可以按场景覆写，但每次结果必须返回实际使用的权重与评分理由。
- 低置信命盘、出生时辰未知、用户数据不足时，扩大备选范围并降低语气强度。
- 实际约束优先于命理偏好。例如面试要求正装时，先提供合规配色中的优先项。

### 4.2 v1 场景规则

| 场景 | 必填/推荐输入 | 输出 | 特殊约束 |
| --- | --- | --- | --- |
| 穿什么 `outfit` | 场合、衣物颜色选项（可选） | 主色、辅助色、少用色、搭配建议 | 色彩不等同于保证结果；尊重职业着装要求 |
| 去哪里 `outing` | 目的、出发时间、可选方向 | 优先方位、备选方位、适合时段 | 交通、安全、天气永远优先 |
| 怎么推进 `work_social` | 工作/社交、目标、时间 | 宜主动/沟通/整理/观望、表达方式 | 不替代劳动、法律或医疗建议 |
| 麻将 `mahjong` | 开始时间、座位方位/现场可选项 | 仅给“舒适/专注偏好”排序、休息提醒 | 不使用“赢钱”“财运保证”等表述，不诱导赌博 |

### 4.3 场景输出协议

```ts
type ScenarioResponse = {
  headline: string;          // 18 字以内的行动结论
  primaryAdvice: string;     // 一条主建议
  alternatives: string[];    // 1–2 条受限时的备选
  avoidOrCaution?: string;   // 克制表述的注意项
  scoreRanking?: Array<{ optionId: string; rank: number; reason: string }>;
  reasoningSummary: string;  // 面向普通用户，80 字以内
  evidence: ReasoningStep[]; // 完整依据页使用
  practicalReminder: string;
  limitation: string;
};
```

## 5. AI 表达层

### 5.1 职责

语言模型的职责是澄清缺失信息、把结构化结果写得自然、处理用户追问；不能计算八字、决定用神、修改分数或补造依据。

### 5.2 提示词契约

系统提示应包含以下硬约束：

```text
你是命理助手的表达层。所有命理事实仅以 INPUT_JSON 为准。
不得改变日主、强弱、用神、喜忌、流日关系、方位或选项排序。
若用户问题超出 INPUT_JSON，先提问或说明无法从当前资料判断。
用“倾向/优先/若条件允许”等非确定性语言。
禁止对医疗、投资、法律、博彩输赢、生命安全做预测或行动指令。
输出顺序：结论、备选、简要原因、现实提醒；避免堆砌术语。
```

### 5.3 解释模式

- **简明模式（默认）：** 结论 + 一句原因 + 现实提醒。
- **依据模式：** 逐步显示 `ReasoningStep`，由规则服务提供，不要求模型补充古籍引文。
- **追问模式：** 用户问“为什么西边不优先？”时，从已存在的评分和作用关系回答；没有依据时坦诚说“当前规则无法支持更细判断”。

## 6. 小程序页面规格

### 6.1 全局设计约束

- 标题使用细字重（300–400）；正文 400–500；仅按钮等需要操作确认的文字可到 500–600。
- 单页仅保留一个主要圆角容器层级；信息块之间用留白和 1px 分割线，不嵌套卡片。
- 同一屏最多一种强调色；强调色的用途只能是当前重点、选中状态或一个关键动作。
- 不使用默认“玄学”视觉元素作为功能装饰；不能出现满屏五行色、渐变金光或夸张转盘。
- 文案避免全大写、多个感叹号、恐吓和绝对断言。

### 6.2 页面清单

#### A. 欢迎 / 建档（`/onboarding`）

| 区域 | 内容 | 交互 |
| --- | --- | --- |
| 页首 | 细标题“给日常一个参考角度” | 无 |
| 主体 | 分步填写出生资料 | 日期、时间、地点；时辰可跳过 |
| 底部 | “开始排盘”主按钮 | 校验、展示隐私摘要、提交 |

布局：全屏暖白背景；字段直接排列，不放进大卡片；步骤说明以细线和小号文本呈现。

#### B. 今日（`/today`）

| 区域 | 内容 | 交互 |
| --- | --- | --- |
| 顶部 | 日期、节气、干支、小型资料入口 | 进入我的 |
| 主题 | 一句当天主题 + 主建议 | 点击查看结果详情 |
| 快捷操作 | 穿什么、去哪里、怎么推进、问一问 | 进入对应场景 |
| 页尾 | “查看今天的依据” | 进入依据页 |

布局：一个主信息区，三条建议用分割线排开。快捷操作是简洁横排，不做四张小卡。

#### C. 场景输入（`/scene/:type`）

| 区域 | 内容 | 交互 |
| --- | --- | --- |
| 页首 | 场景名称 + 一句轻提示 | 返回 |
| 表单 | 场合、时间、地点、选项 | 按需出现，不一次性展开所有字段 |
| 页尾 | “给我一个建议” | 调用场景服务 |

#### D. 场景结果（`/result/:id`）

| 区域 | 内容 | 交互 |
| --- | --- | --- |
| 结论 | 细标题 + 主建议，使用唯一重点色 | 无 |
| 备选 | 两条以内的替代做法 | 可复制或重新选择条件 |
| 原因 | 约 80 字摘要 | “看推演依据” |
| 提醒 | 现实条件与不确定性 | 无 |
| 反馈 | 有帮助 / 不适用 | 打开简短反馈层 |

布局：结果以一条纵向阅读流呈现。结论、备选、原因之间用间距和细线分层，不使用每段一张卡。

#### E. 推演依据（`/reasoning/:id`）

| 区域 | 内容 | 交互 |
| --- | --- | --- |
| 摘要 | 日主、强弱倾向、用神、今日作用 | 默认可见 |
| 推演链 | `事实 → 判断 → 场景影响` | 可逐条展开 |
| 细节 | 四柱、十神、藏干、互动关系 | 默认折叠 |
| 说明 | 规则版本、局限与用途声明 | 无 |

布局：用左侧编号、细线与正文形成“阅读时间线”，避免密集表格和徽章堆砌。

#### F. 我的（`/profile`）

- 出生资料与命盘摘要；编辑入口必须二次确认重新推演。
- 数据管理：删除资料、记录和账号。
- 产品说明与使用边界。

## 7. API 与数据存储

### 7.1 服务接口

| 方法 | 路径 | 职责 |
| --- | --- | --- |
| `POST` | `/v1/profiles` | 创建/校验出生资料 |
| `GET` | `/v1/profiles/:id/chart` | 读取命盘与计算元信息 |
| `POST` | `/v1/readings/today` | 生成当日基础建议 |
| `POST` | `/v1/readings/scenario` | 提交场景与选项，返回排序/建议 |
| `GET` | `/v1/readings/:id/reasoning` | 获取完整推演链和规则版本 |
| `POST` | `/v1/readings/:id/feedback` | 记录适用性反馈 |
| `DELETE` | `/v1/profiles/:id` | 删除用户资料及关联可识别数据 |

### 7.2 最小数据表

```text
profiles           出生资料；敏感字段加密存储
charts             版本化排盘快照
reasoning_runs     规则版本、输入快照、推演步骤、置信度
scenario_readings  场景输入、结果、排序、现实提醒
feedback           用户对建议适用性的匿名/关联反馈
rule_sets          规则版本、审核状态、生效窗口、回滚信息
audit_logs         规则执行与输出安全审计；不记录不必要原文
```

## 8. 安全、隐私与质量

### 8.1 隐私

- 出生日期、时间和地点按敏感个人资料处理；传输与静态加密。
- 用户可下载或删除资料；删除操作涵盖命盘快照、问答与关联标识。
- 不将原始出生资料发送给表达模型；只发送最小的结构化推演结果。
- 默认不公开命盘或生成社交分享图。

### 8.2 内容安全

- 高风险话题触发安全模板：承认无法以命理作判断，建议寻求合适的现实帮助。
- 对博彩问题只给娱乐性质、非预测性的提醒；不对下注、追损、借贷做建议。
- 不根据命理身份标签做歧视性用工、婚恋或群体评价。

### 8.3 测试策略

| 类型 | 关键测试 |
| --- | --- |
| 历法单元测试 | 立春、节气交接、时区、跨日、闰年、夏令时 |
| 规则单元测试 | 每条规则的成立、不成立、冲突优先级、版本回归 |
| 例盘审阅 | 命理顾问对匿名例盘的推演链审阅，不以“算准人生事件”作验收 |
| 场景测试 | 有/无可选项、职业限制、时辰未知、极端日期 |
| LLM 契约测试 | 模型不得篡改结构化字段、不得作高风险断言 |
| 视觉回归 | 标题字重、单强调色、无嵌套卡片、无夸张玄学装饰 |

## 9. 上线门槛

1. 核心排盘的节气与干支测试全部通过，且依赖库版本锁定。
2. 每条产品化规则都有唯一 ID、版本、测试和审核状态。
3. v1 三个场景均能返回主建议、备选、依据和现实提醒。
4. AI 表达层通过安全与“不得篡改规则结果”的对抗测试。
5. 完成隐私告知、删除流程和高风险内容降级流程。
6. 页面设计评审通过：细标题、无 Card 套 Card、低饱和单重点色三项均满足。
