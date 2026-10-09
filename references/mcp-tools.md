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

## 实时Schema核对：未实测

本开发环境没有连接到麦当劳的 WorkBuddy 工具会话。任务书包含调试凭据，但未将其写入项目或通过本地脚本访问账户。没有执行菜单/券/营养/计价/订单真实调用，未取得实时JSON Schema或真实响应。这是待人工联调，不把任务书字段提示伪称实测Schema。

WorkBuddy两个文档页通过网页读取超时，直接请求亦未成功；frontmatter必填字段与 `@references` 采用任务书约定。当前线上解析规则及ZIP顶层布局尚未证实。主包包含 `mcd-optimize/SKILL.md`，兼容包根级SKILL.md；真人导入成功后记录客户端版本、包名及布局。使用纯Node ESM、无Bash依赖，但WorkBuddy具体执行权限也须验收。

## 联调必须填写的表（禁止猜字段）

| 项目 | 任务书提示（不是已验证Schema） | 实时核对结果 |
|---|---|---|
| 门店场景 | storeCode、beCode、orderType、beType | 未核对必填性/类型/业务组合 |
| 到店/外送 | orderType示意1/2；beType示意1/2/5/6 | 未核对当前枚举 |
| 商品 | items、productCode、quantity | 未核对套餐选择/特制嵌套 |
| 优惠 | couponId、couponCode等可能字段 | 未核对券位置、组合规则、作用范围 |
| 计价金额 | 任务书提到整数示例 | 未核对字段路径和单位，禁止猜金额单位 |
| 最终金额 | 含商品、配送等全部费用 | 未核对最终应付、费用、优惠字段 |
| 时间 | 官方计价时间或实际完成时间 | 未核对响应时间字段 |
| 下单 | payH5Url可能为支付字段 | 未核对订单ID、支付链接与查询入参 |

用户已确认WorkBuddy自定义MCP通过配置文件设置，顶层结构是 `{"mcpServers": {}}`。使用 [mcp-config.example.json](mcp-config.example.json) 的官方接入参数，将占位Token只替换在WorkBuddy配置中；已有其他服务时合并条目，避免覆盖。此结构说明来自用户提供的当前界面信息，不代表连接已实测成功。

步骤：在 WorkBuddy 自定义MCP中填写mcpServers JSON配置→保存并启用服务→查看实际工具 Schema→选择真实门店/方式→保存脱敏核对记录→确认金额单位→编写 temp/ 的显式字段mapping→只读查询菜单、详情、券、营养→本地搜索→有限核价→回填→按真人清单验收。未知关键字段则停止该分支，不伪造默认值。

本地 `pricingRequests` 是内部任务对象，含 `verificationKey`、context、items、couponIds；它不可以直接作为官方工具入参。套餐items中的 `configurationKey` 是内部组成指纹，**不是官方参数**；由Agent用保存的真实详情映射回当前选项。官方结构变化时更新显式映射和测试，不让算法直接理解任意原始响应。

## 异常处理

401停止当前核价，用户在WorkBuddy配置检查Token，无需向聊天粘贴Token。429最多两次退避（100、200毫秒），重试计入12次总预算。到达预算后停止，记录未验证数量。全部失败返回verification_failed，只报告无法确认实际价格。创建订单超时不自动重试，先查订单。

## 差异登记

- 麦当劳公开接入/工具名称：未发现与任务书冲突。
- 实时Schema：未获取，适配采用显式路径与已核对标志，未硬编码假想官方嵌套结构。
- WorkBuddy线上文档及ZIP导入：未读取成功/未做GUI验证，提供两种布局和可复现校验。
- 原创代码许可证不授予第三方接口、文档或商标使用权。参赛与发布前仍需核对平台活动规则及麦当劳服务条款。
