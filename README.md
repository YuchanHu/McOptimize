# McOptimize · 麦麦最优解

**把预算、口味和营养要求，变成经过官方核价的麦当劳点餐方案。**

麦麦最优解由 GPT/Codex 辅助开发，主要用于 WorkBuddy。输入预算、人数和每人的需求，技能会查询真实门店菜单，搜索可行组合，给出最低金额、丰富优先、营养优先等选择，并把套餐中的餐品分配到每个人。选择方案后，先核对完整订单摘要，经你明确确认再创建订单，付款在麦当劳官方页面完成。

项目已完成 **54 项自动化测试**，并在 WorkBuddy 中贯通 **Skill 加载 → 真实菜单与营养查询 → 本地搜索 → 官方核价 → 多人分配 → 改餐再确认 → 成功建单** 的实测链路。

[下载 v1.0.0 安装包](https://github.com/YuchanHu/McOptimize/releases/tag/v1.0.0) · [查看真实验证](docs/workbuddy-validation.md) · [MCP 接入说明](MCP_INTEGRATION.md)

## 能做什么

- **控制整单预算**：以整数分计算金额，用当前门店官方核价筛选方案。
- **照顾每个人**：分别设置必选餐品、口味偏好、排除条件和热量上限。
- **拆分套餐分配**：按套餐购买，按子餐品分配，保证同一份餐品只分给一个人。
- **比较不同目标**：最低金额、丰富优先、营养优先分别排序，避免重复组合。
- **解释推荐理由**：展示购买清单、每人份数、热量依据、费用和核价时间。
- **确认后下单**：改餐后重新核价并再次确认，未知建单结果先查询，避免重复提交。

适合日常点餐、小组聚餐和关注热量的用户。项目采用 Node.js 20+ ESM 和标准库，无第三方运行依赖。

## 真实使用案例

以下为 2026-10-09 的 WorkBuddy 实测，价格对应当时门店和餐品配置。

| 场景 | 实测结果 |
|---|---|
| 三人总预算 90 元，A 不吃牛肉，B 要主食与薯条，C 不超过 600 kcal | 三种方案核价 **54.00 / 63.90 / 65.00 元**；C 分别为 **369 / 595 / 325 kcal**；最终确认后一次成功创建 **54 元**外带订单 |
| 两人总预算 70 元，牛肉汉堡、有糖可乐、薯条及去洋葱要求 | 推荐组合核价 **65.80 元**，最低金额组合 **43.30 元**；完成套餐配置、候选搜索和价格回填 |
| 百人总预算 100 元，持续调整分配规则 | WorkBuddy 查询并核价 **100.00 元**采购组合，结合用户反馈完善现场分配规则；属于大规模对话推理案例 |

三人实测订单回执为“待支付”，证明建单成功；实际支付由用户在官方渠道完成。三人案例的完整流程见 [脱敏记录](docs/workbuddy-three-person-records.md)，两人及百人案例见 [使用记录](docs/workbuddy-usage-records.md)。

## 安装与连接

1. 准备可执行本地 Node.js 20+ 的 WorkBuddy 工作区，从 [Release](https://github.com/YuchanHu/McOptimize/releases/tag/v1.0.0) 下载 ZIP。
2. 在 Skill 管理入口导入 `mcd-optimize-skill.zip`；主包包含 `mcd-optimize/` 顶层目录。接受根级入口的客户端可选择 `mcd-optimize-skill-flat.zip`。也可解压主包后添加 `mcd-optimize` 目录。
3. 在 [麦当劳官方控制台](https://open.mcd.cn/mcp) 获取 Token，在 WorkBuddy 自定义 MCP 配置中合并以下服务：

```json
{
  "mcpServers": {
    "mcd-mcp": {
      "type": "streamablehttp",
      "url": "https://mcp.mcd.cn",
      "headers": {
        "Authorization": "Bearer ${MCD_MCP_TOKEN}"
      }
    }
  }
}
```

公开模板见 [mcp-config.example.json](mcp-config.example.json)。Token 只绑定在私有配置中；客户端支持环境变量时使用 `MCD_MCP_TOKEN`，否则在私有配置编辑器中替换占位符。已有服务时合并 `mcd-mcp` 条目。

4. 启用 Skill，引用 `/mcd-optimize` 并描述预算与需求；先确认门店和就餐方式，再生成真实方案。

## 直接这样使用

> 三人总预算 90 元，A 不吃牛肉，B 要主食和薯条，C 要主食且不超过 600 千卡。给三种方案与份数分配。

> 两个人预算 70 元，都吃牛肉汉堡和有糖可乐，至少一份薯条，B 的汉堡不要洋葱。优先划算，A 饭量更大。

> 选择方案一，请展示门店、餐品份数与最终金额，我确认后再下单。

技能会查询当前菜单、生成候选并进行官方核价。临时修改餐品或饮料后会重新报价，让你确认更新后的摘要。

## 本地运行与复现

无需 `npm install`。在包含 `SKILL.md` 和 `package.json` 的项目目录执行：

```powershell
npm test
node scripts/optimize.mjs --input tests/fixtures/request.mock.json --mock-pricing --output temp/single.json
node scripts/optimize.mjs --input tests/fixtures/request.multiplayer.mock.json --mock-pricing --output temp/group.json
```

这些 fixtures 是用于复现的模拟数据，输出明确标记数据来源。真实使用由 WorkBuddy 读取官方数据并回填计价结果：

```powershell
node scripts/optimize.mjs --input temp/input.json --output temp/candidates.json
node scripts/optimize.mjs --input temp/input.json --pricing-results temp/prices.json --output temp/result.json
```

CLI 输出机器可解析 JSON。业务上的无解或计价失败退出 0；非法输入退出 2，内部故障退出 3。完整契约见 [输入输出规范](references/input-output-schema.md)。

## 工程与质量保障

| 模块 | 职责 |
|---|---|
| SKILL.md | 需求理解、工具编排、推荐与订单确认流程 |
| constraints / optimizer / ranker | 约束校验、有界搜索、套餐守恒和三目标排序 |
| normalize / pricing | 显式字段映射、计价任务与价格回填 |
| workflow | 确认摘要绑定、订单状态与重复提交保护 |
| package / zip | 白名单打包、CRC32、SHA256 和凭据检查 |
| tests / references / demos | 54 项自动化测试、数据契约与复现步骤 |

质量记录见 [测试报告](demos/test-results.md) 和 [验收记录](demos/acceptance-checklist.md)。ZIP 可通过 `npm run package`、`npm run verify-package` 重新构建和校验。`v1.0.0` 附件保留发布时的稳定快照，最新实测材料在主分支在线提供。

## 使用范围

本地组合引擎支持 **1–8 人**；百人案例由 WorkBuddy 对话推理与官方核价完成。推荐针对当前门店、已确认的套餐组成和已搜索候选；营养上限使用匹配餐品规格的数据，未知值保留为未知。优惠默认比较无券或单券策略，食品过敏需求需向门店核实。

当前真实验收覆盖到店场景。外送、有券核销、支付后订单查询等场景的覆盖范围列在 [实测汇总](docs/workbuddy-validation.md)，便于选择适合自己的使用方式。

## 参赛与许可

本项目参与麦当劳程序员创意开发大赛，开发工具为 GPT/Codex，主要使用平台为 WorkBuddy；聊天记录作为使用验证材料。参赛文件包括 [官方声明](CONTEST_DECLARATION.md)、[MCP 接入说明](MCP_INTEGRATION.md)、[配置模板](mcp-config.example.json) 和 [报名说明](demos/contest-submission.md)。活动规则以 [官方仓库](https://github.com/M-China/mcd-developer-innovation-challenge) 为准。

原创代码使用 MIT 许可；项目为独立作品，麦当劳商品、商标、接口与第三方文档的权利归各自权利人。
