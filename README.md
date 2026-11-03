# 大肥鱼成长 · dsh-agent-growth

让你的大肥鱼从真实素材里学点东西，想想值得分享什么，再把经历慢慢积累成自己的记忆。

这是从「筱哲的大肥鱼」本地试养中整理出来的 DeepSeek Harness 成长插件：学习、选题、作品复盘和记忆整理尽量由 AI 自己完成，每份成果都留下来源与历史版本。它也适用于你自己的 AI 角色，不绑定“大肥鱼”的名字、人设或账号。

总结和创作由宿主配置的模型完成；插件负责提供素材、调度任务、保存来源和检查结果。通用核心不绑定角色、账号或平台，另提供 B站数据快照适配器。

[English](README.en.md) · [下载安装包](https://github.com/XiaoZheBrother/dsh-agent-growth/releases) · [反馈问题](https://github.com/XiaoZheBrother/dsh-agent-growth/issues)

**当前为 v0.1.0 实验版。** 自动模型调用默认关闭；不自动发布视频、发送评论、安装其他插件或修改人设。

## 能做什么

| 能力 | 输入 | 产出 |
| --- | --- | --- |
| 学习和选题 | 你提供的观察、摘录或资料 | Agent 自己写的学习笔记和有来源的内容想法 |
| 发布复盘 | B站投稿的时间、指标快照和观察 | 基线、24/72 小时窗口复盘，区分观察、假设和下一步实验 |
| 记忆整理 | 已完成的学习与复盘 | 新的整理版本及修订理由，保留原记录 |
| 主对话召回 | 关键词 | 已完成成果、引用和历史修订标记 |

插件不采集网页、不登录 B站、不下载视频。已有采集工具只需导出约定的 JSON，就能接入；其他平台也可直接生成通用学习任务。

## 环境要求

- Node.js **22.19 或更新版本**，本地验收使用 22.23.1。
- 已安装并配置模型的 DeepSeek Harness **0.2.1-rc.5**。其他 DSH 版本尚未验证。
- 自动任务沿用宿主选中的 provider/model，可能产生模型费用，无需在插件中另填 API Key。

当前完成 Windows 本地验收；其他系统的 DSH 运行兼容性尚未验收。Node 的 SQLite 实验性提示不等于启动失败。

## 安装

从 [Releases](https://github.com/XiaoZheBrother/dsh-agent-growth/releases) 下载 `dsh-agent-growth-0.1.0.tgz`，用 **DSH 官方插件命令**安装。以下以 Windows PowerShell 为例，请替换实际文件路径：

```powershell
dsh plugin --profile web add "C:/Downloads/dsh-agent-growth-0.1.0.tgz"
```

安装和启动时应使用同一个 `DSH_HOME`。本说明使用 `web` profile；如果你使用其他 profile，应保持安装和启动配置一致。重启 DSH 后，主对话可调用两个只读工具：

- `agent_growth_status`：查看任务及本轮导入状态。
- `agent_growth_recall`：按关键词召回已完成的学习、复盘和记忆。

本版没有独立管理页面。也没有发布到 npm，请使用 Release 安装包或下文源码构建方式。

## 十分钟试用

### 1. 准备素材与配置

创建一个专用收件目录，例如 `C:/agent-growth/inbox`。从仓库下载 [learning.json](examples/learning.json)，放入该目录。它是明确标注的合成示例，不包含真实账号素材。

把下面内容保存为 `C:/agent-growth/growth.patch.yml`：

```yaml
- id: agent-growth
  config:
    dataDir: C:/agent-growth/data
    inboxDir: C:/agent-growth/inbox
    autoRun: false
    timeZone: Asia/Shanghai
    dailyBudget: 5
    timeoutSeconds: 300
    pollSeconds: 60
    memoryReview: true
    persona: 一个诚实、有自己表达方式的 AI 角色，根据证据学习，不编造亲身经历。
```

`dataDir` 和 `inboxDir` 必须使用绝对路径，收件目录需提前创建。请勿将凭据或私人配置放进收件目录：启用执行后，素材会发送给宿主选中的模型。

### 2. 先导入，再启用执行

停止原有的同一 DSH 实例，再携带配置启动：

```powershell
dsh web --patch "C:/agent-growth/growth.patch.yml"
```

在主对话中说：“调用 agent_growth_status，查看学习任务。”示例应为 `pending`。`autoRun: false` 仍会导入任务，但不会执行模型任务。

准备运行时，把配置中的 `autoRun` 改为 `true` 并重启。插件首次约一秒后检查，之后按 `pollSeconds` 轮询，每轮最多执行一项任务。示例完成后状态为 `done`；可说：“调用 agent_growth_recall，看看刚才学到了什么。”

日常使用可把 `pollSeconds` 改回默认的 `1800`。关闭自动任务时改回 `autoRun: false` 并重启。插件依赖宿主持续运行，不安装开机启动任务，电脑睡眠或关机时不会执行。

### 3. 添加自己的素材

复制示例结构，每次新任务使用新的任务 ID 和来源 ID，写入收件目录中的新 JSON 文件：

```json
{
  "version": 1,
  "type": "task",
  "job": {
    "id": "writing-learning-v1",
    "kind": "learn",
    "due": 0,
    "instruction": "总结值得学习的表达方式，并提出一个内容想法。",
    "sources": [{
      "id": "writing-observation-v1",
      "asOf": "2026-01-01T10:00:00Z",
      "text": "合成示例：这段讲解先给一个具体例子，再解释适用范围。",
      "partial": true
    }]
  }
}
```

`kind` 支持 `learn`、`review`、`memory`；`due` 是 Unix 毫秒时间戳，`0` 表示立即可执行。`partial: true` 表示摘录，不能据此声称读过完整视频或原文。可选 `url` 保存来源链接。

同一个 ID 的内容不可覆盖，修改素材需使用新的版本 ID。文件名使用英文字母、数字、点、下划线和连字符，以 `.json` 结尾；每个文件不超过 512000 字节。每轮最多处理 100 个有变化的文件，目录最多 1000 个 JSON 文件，超过时需自行归档已处理文件。导入失败后修改文件内容才会重新尝试。

## 接入 B站复盘

由现有采集器定期输出下面的 JSON 到收件目录；[完整示例](examples/bilibili-snapshot.json)使用虚构 BV 号和指标，请替换为真实观测：

```json
{
  "version": 1,
  "type": "bilibili-snapshot",
  "bvid": "BV0000000001",
  "publishedAt": "2026-01-01T10:00:00Z",
  "capturedAt": "2026-01-02T11:00:00Z",
  "statistics": { "view": 100, "like": 5 },
  "observations": ["合成示例：部分评论在询问下一期主题。"]
}
```

适配器根据**实际采集时间**建立基线和已到期的 24/72 小时复盘任务，提供已有历史快照作对比。若第一次采集就在发布几天后，不会伪造发布当天数据；缺失指标也不会当作零。窗口一旦建立便不重复创建；本版不是持续保存每次采样的指标数据库。采集器仍需自行保存完整历史。

## 配置

| 配置 | 默认值 | 说明 |
| --- | --- | --- |
| `dataDir` | `$DSH_HOME/agent-growth` | SQLite 数据目录，可改为绝对路径 |
| `inboxDir` | 空 | JSON 收件目录，空值禁用目录导入 |
| `autoRun` | `false` | 是否允许后台模型任务 |
| `persona` | 通用英文助手描述 | 角色的创作口吻，不包含任何私人角色设定 |
| `timeZone` | `UTC` | 每日任务预算使用的时区 |
| `dailyBudget` | `5` | 每个日历日最多尝试数，范围 1–20，失败也计数 |
| `timeoutSeconds` | `300` | 单任务超时，范围 1–900 秒 |
| `pollSeconds` | `1800` | 轮询间隔，整数且至少 60 秒 |
| `memoryReview` | `true` | 按 UTC 七天时间桶整理近期成果，并非固定每周某天 |

记忆整理可在当前时间桶第一次有成果后入队，至多引用近期 8 条成果；它和其他任务共用预算。失败的模型任务不会自动重试，需排查后用新的任务 ID 再提交。

## 数据与权限边界

- 每个任务由独立 DSH Agent 执行，只允许读取任务、分页读取来源、保存结果和回读确认四个工具。
- 保存需要引用实际读取过的来源；记录来源哈希和已提供的分页，摘录不会被标记为完整阅读。来源证明不是事实真实性或模型理解正确性的证明。
- 结果经回读后才进入召回。长结果的回读为摘要及哈希，不是全文审稿。
- 旧成果不覆盖。记忆任务只有完整读取对应原成果后，才能标记其被新版本替代；不会修改人设或权限。
- SQLite 保存任务所有权、期限、预算和版本，防止并发重复认领。不同用户或角色应使用独立数据目录。
- 工具限制针对模型调用；同一宿主中的其他插件仍是受信任代码，本插件不构成恶意插件的进程沙箱。

## 卸载与备份

```powershell
dsh plugin --profile web remove dsh-agent-growth
```

重启前同时移除你自定义 patch 中的 `agent-growth` 条目。卸载保留数据和外部收件目录。需要备份时，先停止使用该数据目录的 DSH 和 CLI，再复制整个数据目录；不要仅复制运行中的 SQLite 主文件。

## 源码开发与 CLI

```powershell
git clone https://github.com/XiaoZheBrother/dsh-agent-growth.git
cd dsh-agent-growth
npm ci --ignore-scripts
npm test
npm run check
npm pack
```

生成的 `.tgz` 可按前述方式安装。源码目录下也可用 CLI 导入、检查和召回（数据路径必须与插件配置一致）：

```powershell
node cli.js import "C:/agent-growth/data" ./examples/learning.json
node cli.js status "C:/agent-growth/data"
node cli.js recall "C:/agent-growth/data"
```

CLI 不执行模型任务。DSH profile 内安装的包不一定把 `dsh-growth` 放到系统 PATH，源码执行 `node cli.js` 可避免该问题。

## 验证范围与常见问题

初始版本在 Windows、Node 22.23.1、DSH 0.2.1-rc.5 下通过 10 项测试、语法检查、独立 DSH_HOME 安装和卸载验收，以及一次真实模型学习任务。卸载后结果保留。真实 B站采集、长期无人值守和其他系统上的 DSH 宿主运行尚未验收。

- **任务一直 pending**：检查 `autoRun`、到期时间、每日预算、宿主是否运行及轮询间隔。
- **任务 failed**：查看 status 中的 error，检查宿主模型配置、网络或超时；修复后使用新任务 ID，不会自动重复扣费重试。
- **找不到工具**：确认安装与启动的 profile/DSH_HOME 相同，重启后检查插件是否成功激活。
- **安装提示 peer dependency 警告**：本地验收也出现过；仅上述精确版本组合已通过真实运行，其他版本需自行验证。
- **修改旧 JSON 不生效**：任务和来源不可变，更换版本 ID。目录导入仅处理内容发生变化的文件。

## 许可证与来源

[MIT](LICENSE)。项目基于 DSH 原生 API 独立实现，受到 dsh-bili-workbench 的素材事件流程、dsh-soul-md 的主题记忆及 DSH-Ling 的可审计修订思路启发；不打包这些插件，也不包含私人账号、记忆或凭据。
