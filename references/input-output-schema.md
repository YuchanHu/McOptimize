# 内部数据契约 1.0

这份契约是算法接口，不是麦当劳工具 Schema。所有示例 JSON 以 `tests/fixtures/` 为准，都是 mock。`mode=real` 的资料必须来自实时 MCP；设置 real 不能将模拟数据变成真实证据。

## 输入

| 字段 | 类型/边界 | 含义 |
|---|---|---|
| schemaVersion / mode | `1.0` / `mock` 或 `real` | 契约版本与来源 |
| request.budgetFen | 正整数，≤100000000 | 整单预算分；零/负/字符串拒绝 |
| request.maxItems | 整数1–10，默认5 | 购买 SKU 总份数，套餐计一份 |
| request.people | 1–8人，唯一id | 每人至少一份可分配子餐品 |
| person.mustHaveCategories / mustHaveProducts | 字符串数组，默认空 | 每人必选类别/商品编码；套餐编码也可指定 |
| person.excludeTags / excludeCategories / excludeProducts | 字符串数组 | 只约束此人的分配，不把其他人的牛肉禁掉 |
| person.maxEnergyKcal | 正数或null | 有严格上限时全部分配餐品须可信匹配 |
| person.preferredTags | 字符串数组 | 软偏好，不覆盖硬约束 |
| request.preferences.nutritionGoal | lower_energy / higher_protein | 默认较低热量，可优先蛋白质 |
| request.preferences.optimizeFor | 四种目标之一 | 意图记录；默认仍返回三目标比较 |
| context | storeCode、beCode、orderType、beType、dataSource | 门店参数由工具取得；真实合法业务组合需再核对 Schema |
| context.fulfillmentRef / reservationRef | 可选不敏感引用 | 配送/预约场景变化绑定到价格；禁止完整地址 |
| products | 最多2000条；SKU编码唯一 | 空数组可返回no_solution |
| product.priceFen | 非负整数分 | 门店菜单估价；未知金额单位或空价报错 |
| product.available / maxQuantity | 布尔 / 1–10 | 门店可售状态与每SKU数量上限 |
| product.type | single / bundle | 套餐配置必须经过详情确认 |
| product.categories / tags | 字符串数组 | 内部标签；不能仅按名称猜禁忌 |
| product.evidence | 见下文 | 硬约束使用证据源与可信程度 |
| product.energyKcal / proteinG | 非负数或null | 每份营养，未知保留null |
| product.nutritionVerified | 布尔 | 必须同时有nutrition证据才能参与营养判断 |
| bundle.components | 子项数组，每项quantity正整数 | 子项价格不累计；同一子项份数仅分配一次 |
| bundle.configurationVerified / configurationRef | 必须true / 可选不敏感配置引用 | 只搜索已确认固定组成；引用绑定额外选项变化 |
| coupons | 最多100条；唯一id | 待尝试策略，面值永不用于离线扣减 |
| coupon.storeCodes / beTypes / productCodes / minSpendFen / expiresAt / eligible | 可选限制 | 已知不适用先排除，真实适用性仍需核价 |
| search.maxProducts | 默认40，上限100 | 相关性筛选后的可售SKU数 |
| search.maxCandidates | 默认12，上限50 | 待计价请求总预算（重试也计入） |
| search.beamWidth / maxNodes | 默认300 / 10000 | 有界搜索资源 |
| search.maxAllocationNodes / maxAllocationTotalNodes | 默认2000 / 200000 | 单组合与整次分配遍历上限 |

证据例（mock 用 `source: mock`，真实只能用 `official`）：

```json
{"categories":{"source":"official","confidence":1,"reference":"脱敏详情字段/人工核对记录"},"tags":{"source":"official","confidence":1,"reference":"完整成分范围已核对"},"nutrition":{"source":"official","confidence":1,"reference":"营养表同SKU同规格匹配"}}
```

未提供证据/置信度不足1时不支持对应硬约束。“tags=[] + 完整可信证据”表示已核实没有列出的禁忌；空数组而无证据表示未知。一个人的严格营养数据缺失会淘汰相应分配，其他没有严格上限的人可收到未知营养餐品，整单营养仍显示不可验证。

## 官方数据归一化

`normalize.mjs` 接收显式字段路径与金额单位，不绑定未经验证的官方嵌套字段。WorkBuddy 从实时工具 Schema 填写 `temp/menu-mapping.json`；只有检查过 Schema 才设置 `schemaReviewed=true`，记录 `schemaReference`。在 factsByCode 填官方详情已验证的type/categories/tags/components/evidence等。本地不下载 Schema。

模拟字段示意（并非官方字段）：

```json
{"schemaReviewed":true,"schemaReference":"mock demonstration only","productsPath":"rows","codePath":"sku","namePath":"title","pricePath":"price","availablePath":"onSale","moneyUnit":"fen","factsByCode":{"MOCK_A":{"type":"single","categories":["main"],"tags":[],"energyKcal":null,"nutritionVerified":false}}}
```

```powershell
node scripts/normalize-cli.mjs --raw temp/menu.raw.json --mapping temp/menu-mapping.json --base temp/base.json --output temp/input.json
```

base.json 包含除 products 外的完整输入。敏感原始数据应先脱敏；不保存真实手机号/详细地址。金额为fen时只接受整数；为yuan时只接受十进制字符串，如 `"16.01" → 1601`，拒绝浮点值与超过两位小数。未知单位拒绝；不能依据金额值猜单位。facts不能覆盖原始SKU/名称/价格/可售状态。路径只读键，不执行表达式。

## 待计价与回填

初次 CLI 输出 candidates（仍未核价）及 pricingRequests，WorkBuddy 为每个请求按实时官方 Schema 调用。请求指纹绑定 SKU+数量、门店、方式、配送/预约引用与券；套餐items带内部configurationKey（根据子项编码/份数和configurationRef计算），禁止直接传为官方参数。本版只支持默认/已核实固定套餐配置。不同选择请更新组成/configurationRef后重新搜索、核价与确认，不能复用原指纹。

`temp/prices.json` 是数组，每条成功结果如下；失败只需要verificationKey与状态：

```json
{"verificationKey":"从原pricingRequests原样回填","status":200,"dataSource":"real","totalFen":2600,"extraFeesFen":0,"discountFen":0,"couponUse":[],"context":{"storeCode":"实时门店","beCode":"实时业务参数","orderType":1,"beType":1,"dataSource":"real"},"calculatedAt":"接口计价时间或Agent实际完成响应时间的ISO字符串"}
```

此金额仅为内部契约示意，非真实价格。totalFen必须是含配送费等全部费用的最终应付，不是商品小计；extraFeesFen与discountFen必须明确。没有优惠字段时由已核对官方响应证明无优惠后填0，不能猜测。实际使用券必须与任务策略一致；请求用了券但返回未使用，则单独不带券任务验证，不能标记这张券已优惠。优惠额是整单已验证优惠，不推算单券分摊。

`normalizePrice` 可使用显式 totalPath/feesPath/discountPath/couponIdsPath/timePath 转换。若时间来自 Agent 响应完成时，先在脱敏原始响应中添加准确时间字段再映射；该字段不能伪称官方字段。

```powershell
node scripts/normalize-cli.mjs --raw temp/price.raw.json --mapping temp/price-mapping.json --request temp/pricing-request.json --output temp/price.normalized.json
```

把每条脱敏结果合并为prices.json数组，再 `optimize.mjs --pricing-results`。回填不是在线认证：本地相信 WorkBuddy 交付的已核对结果；哈希只防止混配，不证明官方签名。重复/未知verificationKey报错，过期/错误场景/错误来源/超预算结果淘汰。默认5分钟有效。

## 输出与退出码

- schemaVersion、status、dataSource、priceVerification、verificationSource、plans、candidates、pricingRequests、meta、warnings、reasons。
- plans最多3项，只有满足可验证硬约束的候选；items为购买SKU计价单位，allocation.servings带唯一servingId与purchaseCode，套餐与子项严格守恒。
- estimatedTotalFen为菜单估价；verifiedTotalFen未核价为null。`verified`搭配dataSource=mock/verificationSource=mock_adapter只说明模拟验证；real回填为agent_mcp_results。
- 营养totalKcal/proteinG可信时才有值，verified=false时不能宣称符合严格上限。
- meta记录generated、pruned、evaluated、nodes、allocationNodes、priceSucceeded、unverified及截断原因；evaluated指满足分配硬约束的本地候选数。
- searchExhaustive只针对输入中的固定配置、预算内组合、资源范围；不会证明整个真实菜单/优惠的全局最优。
- 正常推荐/no_solution/verification_failed均输出合法JSON并退出0；非法参数/数据/读写错误退出2；内部未知故障退出3。stdout仅JSON，stderr仅脱敏错误码。
- 支持 `--input -` 从stdin读入，输出参数可选；避免用PowerShell字符串插值构造包含用户输入的命令。
