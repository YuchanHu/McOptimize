# 麦当劳 MCP 接入说明

## 服务与运行环境

本项目面向麦当劳中国官方远程 MCP 服务：`https://mcp.mcd.cn`，采用 Streamable HTTP，鉴权头为 `Authorization: Bearer`。公开配置只保留 `${MCD_MCP_TOKEN}` 环境变量占位符，见 [mcp-config.example.json](mcp-config.example.json)。凭据在用户的私有客户端配置中绑定，不能写入源代码、对话截图或安装包。

客户端负责官方工具调用；Node.js 20+ 本地脚本只处理脱敏 JSON，负责确定性组合搜索、多人分配与排序，不持有 Token，不向业务服务发起网络请求。环境变量是否自动展开由客户端决定；未支持时只在私有配置界面手动替换占位符。

## 工具与业务价值

| 官方工具 | 作用 |
|---|---|
| query-nearby-stores | 到店场景选择真实门店与业务参数 |
| delivery-query-addresses / delivery-query-stores | 外送场景选择已有地址与可配送门店 |
| query-meals / query-meal-detail | 获取当前可售商品、套餐固定组成和已确认的选择 |
| query-my-coupons / query-store-coupons | 获取已有优惠券及当前门店限制 |
| list-nutrition-foods | 匹配同餐品、同规格的营养数据，缺失不估造 |
| calculate-price | 验证组合和单券策略的最终应付金额，包含额外费用 |
| create-order | 获得本轮最终确认后提交一次订单 |
| query-order | 查询真实订单状态，创建结果不明时优先核查 |

工具名称可能被客户端添加前缀，入参及金额单位须按当前实际 Schema 核对。[references/mcp-tools.md](references/mcp-tools.md) 记录完整映射和待核对项。领券、积分兑换、抽奖、修改地址及取消订单不是默认操作。

## 调用流程

1. 确认预算、人数与每人约束；选定真实门店及到店或外送方式。
2. 客户端查询菜单、详情、已有优惠与必要的营养信息。
3. 根据实时 Schema 明确金额单位、套餐结构和证据来源，归一化为内部输入。
4. 执行 `node scripts/optimize.mjs --input temp/input.json --output temp/candidates.json`。
5. 从 `pricingRequests` 构造实际 `calculate-price` 请求。默认最多 12 次尝试，重试也计入；不假定券可叠加，不先扣券面值。
6. 将脱敏结果回填为 `temp/prices.json`，运行 `node scripts/optimize.mjs --input temp/input.json --pricing-results temp/prices.json --output temp/result.json`。
7. 淘汰超预算、失败、过期或场景不一致的结果，输出最多三种不同组合及每人份数。
8. 用户希望购买时展示完整订单摘要，重新核对价格有效期并取得明确确认。创建结果未知时先查订单，禁止自动重复提交；支付由用户在官方页面完成。

组合算法解决整单预算与多人需求冲突，官方计价校验实际可用优惠与最终金额；套餐按购买 SKU 计价，其子餐品仅用于覆盖、营养及份数分配。搜索有界，不能宣称全菜单全局最优。

## 实际验证状态

| 项目 | 状态 |
|---|---|
| 官方公开接入指南、工具名称、活动要求 | 已核对 |
| 本地优化、模拟核价、预算/营养/份数约束及确认状态 | 已自动化测试 |
| WorkBuddy Skill 加载、安装目录资料读取、本地脚本 | 2026-10-09 真实记录确认，Node.js v22.22.2；具体 ZIP 导入过程与客户端版本未记录 |
| 真实 MCP 门店、菜单与套餐详情 | 已验证；客户端工具前缀为 `mcp__mcd-mcp__` |
| 账户券与门店券查询 | 百人会话返回无可用券；有效券使用/核销未覆盖 |
| 真实 calculate-price 与价格回填 | 已验证两人方案 65.80 / 43.30 元；百人采购 100.00 元和备选 290.00 元亦有官方返回 |
| 真实下单 | 作者确认已成功下单；提供的导出没有建单/查询调用或订单回执 |
| 支付字段、支付完成、订单状态/异常恢复 | 导出未覆盖，不推断已支付 |
| 真实营养和外送 | 未覆盖 |
| WorkBuddy 真实使用与联调记录 | 完整脱敏合并记录见 `docs/workbuddy-usage-records.md`；项目由 GPT/Codex 辅助开发 |

模拟 fixtures 的门店、商品、价格、优惠及营养仍全部虚构，`mock_adapter` 通过不是官方联调证据。此次真实证据来自作者提供的两份 WorkBuddy 导出，完整脱敏文本见 [使用记录](docs/workbuddy-usage-records.md)，结论与限制见 [实测汇总](docs/workbuddy-validation.md)。项目由 GPT/Codex 辅助开发，主要用于 WorkBuddy；这些是使用证据，不作为 WorkBuddy 专项开发材料。

两人会话实际有 16 次 `calculate-price` 调用：13 次成功（含 1 次套餐配置校验）、3 次 Schema 参数校验失败，之后 12 条候选结果回填。本地任务预算测试通过不代表 Agent 在整轮对话中遵守了 12 次上限；该偏差保留为待改进项。百人场景由 WorkBuddy 对话推理处理，未通过当前最多 8 人的本地求解器。

## 联调记录方法

使用 WorkBuddy 私有配置连接官方服务，在 [真人验收清单](demos/acceptance-checklist.md) 中逐项记录日期、客户端版本、实际工具名、脱敏 Schema 和计价结果。公开记录不保留 Token、账号凭证、手机号、详细地址、券码、追踪标识或完整支付链接；未来补充证据时继续区分工具回执与作者反馈。
