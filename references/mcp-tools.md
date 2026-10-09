# 官方工具映射与核对记录

核对日期：2026-10-09。来源：[官方仓库](https://github.com/M-China/mcd-mcp-server)、[控制台](https://open.mcd.cn/mcp)、[WorkBuddy Skill 文档](https://open.workbuddy.cn/docs/skill)、[连接器教程](https://www.workbuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Connector)。

已读取官方仓库当前README：远程托管服务、Streamable HTTP、`https://mcp.mcd.cn`、Bearer鉴权、每Token每分钟600请求和401/429含义已核对。仓库是接入指南，不能当成服务端源码。以下名称已与公开列表比对。

| 官方名称 | 用途与输入来源 | 本期允许操作 |
|---|---|---|
| query-nearby-stores | 用户提供的位置→选定店铺参数 | 读 |
| delivery-query-addresses | 已有配送地址→用户选择不敏感引用 | 读 |
| delivery-query-stores | 选定地址→可配送店铺 | 读 |
| query-meals | 已选门店/业务方式→可售SKU及分类 | 读 |
| query-meal-detail | 实际SKU→组成/替换/制作要求 | 读 |
| query-my-coupons | 账户已有券→内部券标识 | 读 |
| query-store-coupons | 门店场景→可用券限制 | 读 |
| list-nutrition-foods | 餐品规格匹配→可靠营养 | 读 |
| calculate-price | 当前候选→最终应付、费用、优惠 | 读，默认总预算12次 |
| create-order | 最后一次核价摘要→订单与官方支付信息 | 本轮明确确认后一次提交 |
| query-order | 真实订单标识→状态/支付结果 | 读；超时优先查 |
| available-coupons | 可领券信息 | P2，不自动执行 |
| auto-bind-coupons | 账户领券 | 仅用户额外明确确认；非默认流程 |

客户端可能添加前缀或转连字符为下划线。通过实时工具列表映射，禁止照抄某客户端内部工具名。新增地址、取消订单、积分兑换、抽奖等不属于默认权限。

## 实时 Schema 核对：到店场景已实测

2026-10-09 作者提供的 WorkBuddy 使用记录包含实际工具 Schema、请求和响应。已验证到店门店、菜单、套餐详情、空券列表、计价和本地回填；客户端工具前缀为 `mcp__mcd-mcp__`。完整脱敏记录与范围见 [实测汇总](../docs/workbuddy-validation.md)。项目由 GPT/Codex 辅助开发，WorkBuddy 是主要使用平台。

记录已确认安装目录中的 Skill 加载、references 读取和本地 Node.js v22.22.2 执行。主包包含 `mcd-optimize/SKILL.md`，兼容包根级 SKILL.md；记录未注明客户端版本、导入包名或 GUI 过程，两个布局不能同时标为实测通过。

## 当前字段核对范围

| 项目 | 字段 | 实时核对结果 |
|---|---|---|
| 门店场景 | storeCode、orderType、beType | 成功请求包含字符串 storeCode、orderType=1、beType=1；其他业务组合未覆盖 |
| 到店/外送 | takeWayList | 计价响应包含 eat-in / take-in-store；没有外送验收 |
| 商品 | items、productCode、quantity | 已确认到店商品参数及套餐选择/特调实例；按实时 Schema 构造，不保证其他商品可直接套用 |
| 优惠 | query-my-coupons / query-store-coupons | 百人会话返回空券列表；有效券位置、组合规则及核销未覆盖 |
| 计价金额 | data.price | 实际整数分；6580 对应 65.80 元、10000 对应 100.00 元 |
| 金额组成 | data.productOriginalPrice、productPrice、originalPrice、discount、price | 已观察无折扣到店响应；配送费与有券折扣未覆盖 |
| 时间 | datetime | 成功响应带服务时间字符串；客户端按场景和有效期重新核价 |
| 下单 | 订单ID、支付链接、查询参数 | 作者确认成功下单，但本次导出没有实际调用和回执，字段仍未核对 |

WorkBuddy 自定义 MCP 通过顶层 `{"mcpServers": {}}` 配置，真实工具调用已确认连接可用。使用 [mcp-config.example.json](mcp-config.example.json) 的官方接入参数，只在私有配置绑定 Token；已有其他服务时合并条目。当前导出未证明环境变量占位符能自动展开。

步骤：在 WorkBuddy 自定义MCP中填写mcpServers JSON配置→保存并启用服务→查看实际工具 Schema→选择真实门店/方式→保存脱敏核对记录→确认金额单位→编写 temp/ 的显式字段mapping→只读查询菜单、详情、券、营养→本地搜索→有限核价→回填→按真人清单验收。未知关键字段则停止该分支，不伪造默认值。

本地 `pricingRequests` 是内部任务对象，含 `verificationKey`、context、items、couponIds；它不可以直接作为官方工具入参。套餐items中的 `configurationKey` 是内部组成指纹，**不是官方参数**；由Agent用保存的真实详情映射回当前选项。官方结构变化时更新显式映射和测试，不让算法直接理解任意原始响应。

## 异常处理

401停止当前核价，用户在WorkBuddy配置检查Token，无需向聊天粘贴Token。429最多两次退避（100、200毫秒），重试计入12次总预算。到达预算后停止，记录未验证数量。全部失败返回verification_failed，只报告无法确认实际价格。创建订单超时不自动重试，先查订单。

## 差异登记

- 麦当劳公开接入/工具名称：未发现与任务书冲突。
- 实时 Schema：已保留到店调用记录；两人会话 16 次计价中 3 次因参数 Schema 不匹配失败，成功后回填 12 条候选价格。不能将文档中的默认 12 次预算当作整轮已遵守的事实。
- WorkBuddy：Skill 加载、资料读取和 Node 执行已验证；GUI 导入布局和客户端版本仍缺记录。
- 原创代码许可证不授予第三方接口、文档或商标使用权。参赛与发布前仍需核对平台活动规则及麦当劳服务条款。
