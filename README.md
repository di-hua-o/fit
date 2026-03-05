# Fit · 高尿酸专属 · 饮食补剂管理

基于「高尿酸专属·饮食补剂管理合集」的本地 Web 应用：饮食与补剂方案、一周餐单、采购与锻炼计划、体重与热量管理，支持多用户；个人信息可导出/导入为 CSV 文件，**无需 server**。

---

## 项目结构

```
fit/
├── README.md                 # 本说明
├── all.md                    # 源文档（饮食补剂与锻炼内容）
├── weight-export.csv         # 示例/导出的体重 CSV（可删）
│
├── scripts/                  # 邮件与体重更新脚本（Node.js）
│   ├── accounts.json        # 多账户配置（邮箱、性别/年龄/身高/体重等），发每日邮件与按邮件更新体重时使用
│   ├── daily-email.js       # 通过 SMTP 发送「今日饮食 + 锻炼 + 补剂」邮件，正文含各账户当前体重
│   └── update-weights-from-mail.js   # 从 IMAP 读未读邮件，解析正文中的体重并写回 accounts.json
│
├── docs/                     # 所有 HTML 页面与备用样式（GitHub Pages 根目录）
│   ├── common.css            # 备用样式（苹果风格）
│   ├── index.html            # 首页（目录与模块入口）
│   ├── profile.html          # 我的信息
│   ├── section1.html         # 每日饮食与补剂执行方案
│   ├── section2.html         # 一周每日饮食清单
│   ├── section3.html         # 采购清单
│   ├── section4.html         # 锻炼计划
│   ├── calendar.html         # 日历
│   ├── budget.html           # 开销统计
│   ├── weight.html           # 体重记录
│   └── calorie.html          # 热量统计
│
├── assets/
│   ├── css/
│   │   └── hyperspace.css    # 全局样式、各页背景、表单与表格
│   └── js/
│       ├── fit-user.js       # 多用户：当前用户、per-user 数据切换
│       └── data-csv.js       # 个人信息 CSV：下载为文件、从本地文件加载
│
└── data/                     # 可选：存放导出的 CSV（可手动保存到此目录）
    └── .gitignore            # 可选忽略规则
```

---

## 功能概览

| 模块 | 说明 |
|------|------|
| **我的信息** | 当前用户切换/添加、个人信息（身高/体重/出生日期/性别/活动量）、体重 CSV 导入/导出、信息汇总、导出/导入 CSV（下载当前用户 CSV、从本地文件加载） |
| **每日饮食与补剂** | 早餐/午餐/晚餐/加餐与补剂方案（高尿酸版） |
| **一周饮食清单** | 周一～周日餐单 |
| **采购清单** | 主食、蛋白、蔬果坚果、补剂与调味 |
| **锻炼计划** | 工作日有氧（周二/周四）、周末有氧+无氧 |
| **日历** | 月历，点击日期查看当日饮食与训练 |
| **开销统计** | 饮食与补剂一周预估（参考上海） |
| **体重记录** | 身高、日期+体重录入、体重/BMI 图表、历史记录、导出 CSV |
| **热量统计** | 身体数据（身高/体重/出生日期/性别/活动量）、BMR/TDEE、按餐单的日摄入与平衡 |

数据均在浏览器本地（localStorage），按**当前用户**隔离；在「我的信息」可**下载当前用户 CSV** 或**从本地 CSV 文件加载**，无需任何 server。

---

## 快速开始

本地使用：用浏览器直接打开 **`docs/index.html`**（或任意 `docs/*.html`），即可使用。体重、热量等数据保存在本机 localStorage，**多用户**在「我的信息」里切换。导出/导入：在「我的信息」点「下载 CSV」保存到本地，或点「从文件加载」选择之前导出的 CSV。

---

## GitHub Pages 部署

- **分支**：`main`
- **目录**：`/docs`（Settings → Pages → Build and deployment → Branch: `main`，Folder: `/docs`）
- 部署成功后访问形如 `https://<your-username>.github.io/fit/` 的地址即可在线使用本应用。

---

## 邮件与体重更新（脚本）

- **每日邮件**：`scripts/daily-email.js` 按 `scripts/accounts.json` 中的账户，通过 SMTP 发送「今日饮食 + 锻炼 + 补剂」邮件，正文中会附带该账户当前体重等信息。
- **通过邮件更新体重**：`scripts/update-weights-from-mail.js` 通过 IMAP 读取**未读**邮件，在正文中解析类似「今日体重：83.5kg」或「体重：83.5 kg」的文本，根据**发件人邮箱**匹配 `accounts.json` 中的账户并更新其 `weight`，然后将该邮件标为已读。
- **回复或新邮件均可**：不区分是回复每日邮件还是新发一封邮件。只要发件人是 `accounts.json` 里配置的邮箱，且正文中有合法体重（如 `体重：83.5kg`），就会更新对应账户的体重。定时任务（如 GitHub Actions）跑完脚本后可将更新后的 `accounts.json` 自动提交回仓库。

### 使用 Gmail（推荐在 GitHub Actions 上使用）

国内邮箱（如 163）的 IMAP 在 GitHub 海外 runner 上常连不上（ETIMEDOUT），建议用 Gmail：

1. **GitHub Secrets** 配置：
   - `IMAP_HOST` = `imap.gmail.com`
   - `IMAP_PORT` = `993`
   - `IMAP_USER` = 你的 Gmail 地址（用于收体重邮件的那个邮箱）
   - `IMAP_PASS` = **应用专用密码**（不是登录密码）：
     - 先开启 [Google 两步验证](https://myaccount.google.com/signinoptions/two-step-verification)
     - 再在 [应用密码](https://myaccount.google.com/apppasswords) 里生成一个「邮件」用密码，复制进 `IMAP_PASS`
2. **accounts.json**：把里面的 `email` 改成对应的 **Gmail 地址**（谁发体重邮件，就填谁的 Gmail；发件人须在列表中才会更新）。

---

## 技术说明

- **前端**：纯 HTML + CSS + JavaScript，无构建；样式为 Hyperspace 深色主题。
- **多用户**：`fit-user.js` 维护用户列表与当前用户，体重/热量等页统一读当前用户的 localStorage 数据。
- **CSV 导出/导入**：`data-csv.js` 将当前用户个人信息与体重记录构建为 CSV 供下载，或从用户选择的 CSV 文件解析并写回当前用户；无需 server。
- **体重 CSV**：格式为「日期,体重(kg)」，日期 `YYYY-MM-DD`；支持在「我的信息」导入、在「我的信息」与「体重记录」导出。

---

## 数据与备份

- 本地数据键以 `fit-` 为前缀，存在浏览器 localStorage。
- 在「我的信息」可下载当前用户 CSV 到任意目录（如项目下的 `data/`），或从本地 CSV 文件加载，便于备份或换机恢复。
