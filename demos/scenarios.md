# 演示剧本

本地离线剧本已可重复运行；GUI/线上调用待真人验收。全程默认不真实消费。

## 1. 三人90元（主剧本）

1. 开场字幕：“McOptimize；本段使用虚构门店、商品、优惠与营养”。
2. 用户输入：三人总预算90元，A不吃牛肉，B要主食和薯条，C要主食且≤600千卡。
3. 展示结构化people，强调整单预算9000分。
4. 在安装目录运行：

```powershell
node scripts/optimize.mjs --input tests/fixtures/request.multiplayer.mock.json --mock-pricing --output temp/group.json
```

5. 展示meta的候选/淘汰/计价数，最多三种目标、唯一SKU组合及每人servingId，C的分配热量。
6. 强调模拟计价、虚构营养，不提供“官方省了XX元”的字幕。
7. 用户只表达下单意向，展示确认摘要，mock停在这里，不调用任何账户写工具。

真人版本：先配置官方MCP，录制只读查询和calculate-price。录屏脱敏门店场景可留，Token/手机号/完整地址/券码/支付URL隐藏；有同场景同或可比需求的单独已核价基准后才能展示节省金额。未完成这些步骤不把本地视频说成线上成功。

## 2. 单人30元（备用）

```powershell
node scripts/optimize.mjs --input tests/fixtures/request.mock.json --output temp/estimated.json
node scripts/optimize.mjs --input tests/fixtures/request.mock.json --mock-pricing --output temp/priced.json
```

先展示not_verified，后展示mock_adapter的verified与MOCK_PRICING_NOT_OFFICIAL。解释三个目标不重复、营养不足时可少于三种。

## 3. 安全/异常

跑npm test展示T15/T16/T17：401停止、429有界、未确认不写、创建结果未知不能自动重试。展示T08：营养未知不能声称符合600千卡；T10：计价超预算剔除。不要用模拟订单ID伪称真实建单。
