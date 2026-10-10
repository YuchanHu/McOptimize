# 官方工具映射与实测字段

核对更新：2026-10-10。服务为麦当劳中国官方远程 MCP，地址 `https://mcp.mcd.cn`、Streamable HTTP、Bearer 鉴权。实测客户端前缀为 `mcp__mcd-mcp__`，适配时仍以当前客户端工具 Schema 为准。

来源：[官方接入仓库](https://github.com/M-China/mcd-mcp-server)、[控制台](https://open.mcd.cn/mcp) 及 [真实使用记录](../docs/workbuddy-validation.md)。项目由 GPT/Codex 辅助开发，主要用于 WorkBuddy。

## 工具映射

| 工具 | 用途 | 授权规则 |
|---|---|---|
| query-nearby-stores | 选择到店门店 | 读取 |
| delivery-query-addresses / delivery-query-stores | 外送地址与门店选择 | 读取已有信息 |
| query-meals / query-meal-detail | 当前菜单、套餐结构、选项与特调 | 读取 |
| query-my-coupons / query-store-coupons | 当前券与门店优惠 | 读取 |
| list-nutrition-foods | 官方餐品营养数据 | 读取 |
| calculate-price | 候选与改餐最终报价 | 读取；每轮任务默认预算 12 次，含重试 |
| create-order | 当前完整摘要确认后的订单提交 | 确认后一次提交 |
| query-order | 后续订单状态与未知结果核查 | 读取 |
| auto-bind-coupons | 领取优惠券 | 用户额外明确确认，非默认动作 |

积分兑换、抽奖、新增地址和取消订单不属于技能默认动作。三人会话的取消请求由助手引导至官方渠道，未调用取消接口。

## 实测字段

| 项目 | 字段与结果 |
|---|---|
| 到店场景 | 成功请求使用字符串 storeCode、orderType=1、beType=1 |
| 取餐选择 | 计价响应 takeWayList 包含 eat-in / take-in-store |
| 商品与套餐 | items、productCode、quantity；套餐配置按 query-meal-detail 映射，特调按当前 Schema 传入 |
| 优惠 | 查询账户与门店券，实测时为空列表 |
| 营养 | list-nutrition-foods 返回实际营养库；三人分配中 C 为 369 / 595 / 325 kcal |
| 计价 | data.price 为整数分；5400 对应 54.00 元、6390 对应 63.90 元 |
| 金额组成 | productOriginalPrice、productPrice、originalPrice、discount、price；实测为无折扣到店结果 |
| 时间 | 计价响应 datetime，用于核价时效检查 |
| 建单 | data.orderId、payId、payH5Url、orderDetail；三人一次建单返回成功 |
| 订单详情 | orderDetail.orderStatus=待支付、status=10、totalAmount=54、realTotalAmount=54、takeWay=外带 |

**金额单位按接口分别处理**：calculate-price 的 data.price 为整数分；此次 create-order 的 orderDetail 金额为元的字符串，如 `"54"`。不能把两类响应直接使用同一倍率。订单 ID 和支付信息仅用于当前会话，不写入公开文件。

三人全会话 10 次计价成功，7 条候选回填后三目标推荐有效；饮料修改和最终确认阶段重新核价。丰富方案的部分营养未知保留未知，不影响 C 的可信个人约束。

本次实际字段来自到店查询与建单记录。外送费用、有券使用、支付后 query-order 及真实创建结果未知恢复的覆盖范围见验证汇总，不从已成功的到店请求推断其他业务枚举。

## 配置与内部适配

WorkBuddy 使用顶层 `mcpServers` JSON 配置，示例见 [mcp-config.example.json](mcp-config.example.json)。公开文件只有环境变量占位符，凭据绑定在私有配置中；客户端环境变量支持按其实际能力设置。

内部 pricingRequests 带 verificationKey、context、items、couponIds，用于候选绑定与回填，不能整对象直接传给官方工具。configurationKey 是本地套餐组成指纹，Agent 须将其映射回已查询的真实选项。

三人实测在 Node.js v22.22.2 下完成 Skill 加载、资料读取、本地候选与回填；使用命令和数据契约见 [input-output-schema.md](input-output-schema.md)。

## 异常与复现

401 停止当前核价，在 WorkBuddy 私有配置检查鉴权。429 按预算执行有界退避；全部失败返回 verification_failed。创建结果不明先查询，不自动重复建单。上述分支由自动化测试覆盖。

早期两人输入适配记录中的 3 次 Schema 校验失败及整轮调用统计保留在 [验证汇总](../docs/workbuddy-validation.md)，便于复现参数映射。真实场景的结果与模拟测试分别记录。
