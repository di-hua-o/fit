# Fit 未来开发落实清单（基于 plan 建议 + 当前项目现状）

> 约束默认：**无 server / 隐私优先 / 本地存储 / 多用户隔离 / CSV 可备份迁移**。  
> 本文将 `fit/plan/content_script.md` 的路线图（Hook 模型 + 三阶段）与当前 `fit` 项目已具备功能对齐，输出可直接执行的迭代清单与验收标准。

---

## 1. 背景与目标（来自 plan 的核心建议）

### 1.1 Hook 模型（习惯闭环）
- 触发（Trigger）：提醒、场景触发
- 行动（Action）：最小可行操作（例如“今日打卡”）
- 酬赏（Variable Reward）：完成反馈、徽章、连续天数
- 投入（Investment）：沉淀数据（体重、打卡、目标），形成复访动力

### 1.2 分阶段路线图（plan 建议）
- 阶段一：**交互闭环（打卡）**：每日打卡、SMART 目标、提醒机制
- 阶段二：**数据可视化**：仪表盘、趋势图、热力图、对比分析
- 阶段三：**智能调整**：计划推荐、难度自适应、异常预警（先规则后 AI）

### 1.3 差异化策略（plan 建议）
- 轻量化：无构建或轻构建、页面直开即可用
- 隐私优先：本地存储优先（localStorage/IndexedDB），无需服务端
- 开源透明：可审计、可二次开发

---

## 2. 当前项目功能基线（现状盘点）

当前 `fit` 是纯静态本地 Web 应用（`docs/*.html` + `docs/assets/*`），无需 server：

- 内容模块：每日饮食与补剂、周餐单、采购清单、锻炼计划、日历、开销统计
- 数据模块：
  - **多用户**：`docs/assets/js/fit-user.js` 将“工作区数据键”打包为 per-user 数据块
  - **体重记录**：`docs/weight.html`（Chart.js 折线 + BMI）
  - **热量统计**：`docs/calorie.html`（BMR/TDEE、餐单摄入、平衡对比、宏量营养素推荐）
  - **CSV 备份**：`docs/assets/js/data-csv.js`（导入/导出、可记住 data 目录句柄）
- 触发雏形：`scripts/daily-email.js` 可发送“今日计划”邮件（目前不在前端闭环里）

**关键结论**：阶段二（可视化）已具备基础（体重趋势、热量计算），最大缺口在阶段一（打卡闭环）与阶段三（智能建议）。

---

## 3. 未来开发里程碑（推荐执行顺序）

建议按 **M0（底座）→ M1（打卡闭环）→ M2（仪表盘）→ M3（智能建议）** 推进：

- **M0 工程底座**（3–5 天）：统一数据层/日期工具/餐单数据源，避免后续复制粘贴失控
- **M1 交互闭环**（2–4 周）：今日页 + 打卡 + 目标 + 连续/徽章 + 最小提醒（应用内）
- **M2 数据可视化**（4–8 周）：Dashboard + 热力图/趋势/异常提示 + 数据一致性治理
- **M3 智能调整**（2–6 个月）：先规则引擎建议，再做可选 AI（默认关闭）

---

## 4. M0：工程底座（3–5 天）

### 4.1 统一数据层（强烈建议先做）
**目标**：将 localStorage/JSON 读写、多用户工作区数据的读写、日期/星期等公共逻辑集中，减少多处散落脚本导致的 bug。

**新增文件建议**
- `docs/assets/js/storage.js`
  - `getString(key) / setString(key, value)`
  - `getJSON(key, fallback) / setJSON(key, obj)`
  - `remove(key)`
  - `todayStr()` / `isValidDateStr()`
- `docs/assets/js/date-utils.js`
  - `toDateStr(date)`、`parseDateStr(s)`
  - `getWeekRange(date)`（周一~周日）
  - `weekdayIndex(date)`（0=周日...6=周六）
- （可选但推荐）`docs/assets/js/meal-plan.js`
  - 输出 `MEALS/COMMON/SUPPLEMENTS/TRAINING_RULES`，供 `calendar.html`、`calorie.html`、`today.html` 复用

**改动文件（逐步迁移即可）**
- `docs/calendar.html`、`docs/calorie.html`：餐单/补剂数据改为 import（或 script 引入）同一份
- 其他页面逐步替换重复函数（日期、存储）

**验收**
- 不改变现有 UI 与数据表现
- 切用户后数据隔离仍正确
- CSV 导入/导出不受影响

### 4.2 多用户数据键扩展点预留
改动：`docs/assets/js/fit-user.js` 中 `USER_DATA_KEYS` 加入未来新增键：
- `fit-goals`
- `fit-checkins`
- `fit-badges`
- `fit-reminder-settings`
- （可选）`fit-training-records`

**验收**：新增键能随用户切换正确保存/加载。

### 4.3 CSV 备份扩展（保证“隐私优先”可迁移）
改动：`docs/assets/js/data-csv.js`

建议增强：在现有 CSV 末尾追加一个扩展区块（例如 `META_JSON` 段），用于携带：
- goals、checkins、badges、reminder-settings 等 JSON

**验收**
- 导出→清空 localStorage→导入后：个人信息、体重记录、未来的目标与打卡记录都可恢复

---

## 5. M1：阶段一「交互闭环」（2–4 周）

### 5.1 数据模型：打卡记录 `fit-checkins`
**数据键**：`fit-checkins`

**建议结构（按日期记录）**
```json
{
  "2026-03-06": {
    "water": true,
    "meals": { "breakfast": true, "lunch": true, "dinner": false, "beforeBed": true },
    "supplements": { "morning": true, "noon": true, "evening": false },
    "training": { "done": false, "type": "stairs", "minutes": 30 },
    "weightRecorded": true,
    "fatigue": 3,
    "note": "晚上加班，晚餐未执行"
  }
}
```

**验收**
- 可对任意日期：新增/更新/删除
- 可统计：连续天数（streak）、本周完成率、分项完成率

### 5.2 新增 `today.html`（最小行动入口，强烈建议）
**新增页面**：`docs/today.html`

**入口修改**
- `docs/index.html`：增加“今日打卡”入口卡片
- 侧边栏：所有页面菜单增加 `today.html`

**页面内容（MVP）**
- 今日摘要（星期/饮食/训练/补剂）
- 今日打卡清单（checkbox）
  - 饮水达标（≥4L）
  - 饮食执行（早餐/午餐/晚餐/睡前）
  - 补剂（早/中/晚）
  - 训练（done + 时长）
  - 体重是否记录（可跳转 `weight.html`）
- 即时反馈
  - 今日完成度
  - 当前连续天数（streak）
  - “本周进度条”（简单版即可）

**验收**
- 30 秒内完成一次“今日打卡”
- 勾选即保存、刷新不丢
- 切用户互不影响

### 5.3 日历增强：在 `calendar.html` 展示完成度
改动：`docs/calendar.html`
- 日历格子展示：未完成/部分完成/全完成（颜色或小点）
- 点击某天：显示该日打卡详情并可编辑

**验收**
- 月视图可快速定位“空洞天”
- 编辑后日历状态即时刷新

### 5.4 目标设定（SMART）：`fit-goals`
**数据键**：`fit-goals`

**落地方式**
- 方案 A（快）：在 `profile.html` 增加“目标设定”卡片
- 方案 B（清爽）：新增 `docs/goals.html`

**目标内容建议**
- 体重目标：目标体重、目标日期、每周期望变化上限（避免过快）
- 行为目标：每周训练次数、每周打卡天数、饮水达标天数

**验收**
- 目标保存后，`today.html` 显示“本周目标进度”

### 5.5 酬赏与投入：徽章 + 连续
**数据键**：`fit-badges`

**徽章规则建议（可本地硬编码）**
- 连续 7 天打卡、连续 21 天打卡
- 累计 30 次训练完成
- 累计 100 次打卡完成

**展示位置**
- `today.html` 小提示 + `profile.html` 徽章墙（或新增 `badges.html`）

**验收**
- 达成自动解锁，且可在 CSV 备份中迁移

### 5.6 提醒机制（按“无 server 现实”分层）
**数据键**：`fit-reminder-settings`

**优先顺序**
- A（必做）：应用内提醒（打开 today/dashboard 时提示今日未完成项）
- B（可选）：复用邮件脚本（仅当今日未打卡或未完成时发）
- C（可选增强）：PWA 通知（见 M2 的可选增强包）

**验收**
- A 可用且不打扰
- B/C 失败不影响主流程

---

## 6. M2：阶段二「数据可视化」（4–8 周）

### 6.1 新增 `dashboard.html`（把反馈集中展示）
**新增页面**：`docs/dashboard.html`

**展示模块（建议优先）**
- 本周打卡完成率（总/分项）
- 近 30 天热力图（按 checkins 完成度）
- 体重趋势（复用 Chart.js 或轻量图）：7 日均线 + 目标线
- 热量平衡周汇总（先做简化：按当前餐单摄入 + 当日消耗输入/推算）

**验收**
- 10 秒内回答：本周怎么样、体重走向、缺口在哪

### 6.2 异常提示（从“可视化”走向“可行动”）
**规则建议**
- 连续 3 天未记录体重
- 连续 3 天热量盈余
- 连续 7 天训练为 0

**展示**
- dashboard 顶部“提示卡片”，每条可点击跳转到对应日期/页面

**验收**
- 提示可解释、可定位、可关闭

### 6.3 数据一致性治理：餐单/补剂/训练单一数据源
**问题**：目前餐单在 `calendar.html`、`calorie.html`、`scripts/daily-email.js` 有重复定义，容易漂移。

**动作**
- 抽 `docs/assets/js/meal-plan.js` 为单一数据源
- 前端页面统一引入
- Node 脚本可选择复制同源数据（或独立一份但建立同步机制）

**验收**
- 修改一次餐单，前端与邮件一致

---

## 7. M3：阶段三「智能调整」（2–6 个月）

### 7.1 先做“规则引擎式建议”（离线、可解释、稳定）
**新增模块**：`docs/assets/js/recommend.js`

**输入**
- `fit-weight-records`、`fit-checkins`、`fit-goals`
- （可选）热量平衡历史

**输出**
- 1–3 条建议（每条附依据，例如“近 7 天训练=0 / 连续盈余=3 天”）

**展示**
- `today.html`、`dashboard.html`

**验收**
- 每条建议可解释、可关闭、不会“拍脑袋”

### 7.2 再做 AI（可选增强，默认关闭）
可选路径：
- 用户自带 API Key（明确开关、脱敏、最小化上传字段）
- 本地简化模型/规则强化

**验收**
- 默认关闭
- 开启前明确数据范围、可一键清除 Key

---

## 8. 可选增强包：PWA / 离线 / 通知（插入 M1~M2 之间）

### 8.1 PWA 离线可用
**新增**
- `docs/manifest.json`
- `docs/sw.js`
- 图标资源

**改动**
- `docs/index.html`（以及通用模板）注册 service worker

**验收**
- 离线可打开
- 资源缓存正常

### 8.2 通知提醒（不作为唯一触发手段）
说明：浏览器后台定时触达不稳定，建议仅作为增强。

**验收**
- 授权流程清晰
- 授权失败不影响使用

---

## 9. 风险与依赖（需要提前接受）
- Web 端后台定时提醒能力有限：优先做应用内提醒 + 邮件脚本增强
- 跨设备自动同步不在“无 server”默认范围：优先强化 CSV/目录直写体验

---

## 10. 最小可交付路径（推荐你先做的 3 件事）
1) **`today.html` + `fit-checkins` + streak/完成率**（Hook 模型“行动→酬赏→投入”立刻闭环）  
2) **`dashboard.html` 简版**（周完成率 + 30 天热力图 + 体重趋势）  
3) **餐单数据单一来源**（避免后期维护痛）

