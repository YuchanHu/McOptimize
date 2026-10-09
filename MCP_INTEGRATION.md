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
| 真实麦当劳 MCP 连接、门店、菜单、券和营养查询 | 未验证 |
| 真实 calculate-price、订单、支付字段与状态 | 未验证 |
| WorkBuddy 导入、脚本执行及真实开发对话 | 未验证 |

模拟 fixtures 的门店、商品、价格、优惠及营养全部虚构，`mock_adapter` 通过不是官方联调证据。没有伪造 `workbuddy.md`。根据 [官方活动规则](https://github.com/M-China/mcd-developer-innovation-challenge/blob/main/activityGuidelines.md)，正式参赛必须真实使用麦当劳 MCP；目前这项验收仍待补充。

## 联调记录方法

使用 WorkBuddy 私有配置连接官方服务，在 [真人验收清单](demos/acceptance-checklist.md) 中逐项记录日期、客户端版本、实际工具名、脱敏 Schema 和计价结果。公开记录只保留必要的商品、场景及金额说明，不保留 Token、账号凭证、手机号、详细地址、券码和完整支付链接。真实记录取得之前维持“未验证”状态。
