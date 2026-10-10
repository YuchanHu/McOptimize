# 演示与复现

项目已完成三人、两人和百人三组真实 WorkBuddy 使用验证。可直接展示脱敏记录，也可使用模拟 fixtures 复现算法输出。

## 三人 90 元：推荐、营养与下单流程

1. 用户输入：A 不吃牛肉，B 要主食与薯条，C 要主食且不超过 600 kcal。
2. 展示真实门店、菜单、营养查询，以及本地搜索和官方价格回填。
3. 对照三种方案：最低金额 54.00 元、丰富优先 63.90 元、营养优先 65.00 元；展示 C 的 369 / 595 / 325 kcal 分配。
4. 展示用户修改饮料后重新报价，再改回无糖并确认外带的过程。
5. 展示一次成功建单回执：54 元、待支付。支付链接和订单标识使用脱敏画面。

完整依据：[三人使用记录](../docs/workbuddy-three-person-records.md)。重演时以当前门店重新查询和核价；只有当前用户明确确认才提交真实订单。

## 两人 70 元：套餐和制作偏好

展示牛肉汉堡、有糖可乐、薯条及 B 去洋葱的要求，核对套餐选项与实际配置。真实记录中的推荐为 65.80 元，最低金额为 43.30 元。使用当时价格作为案例结果，不作为固定售卖价。

## 百人 100 元：用户反馈与分配规则

展示 WorkBuddy 官方查询/核价与多轮分配规则修改。100 元采购组合按现场实际数量清点均分。本地引擎面向 1–8 人，此案例由对话推理处理。

## 离线复现

```powershell
node scripts/optimize.mjs --input tests/fixtures/request.multiplayer.mock.json --mock-pricing --output temp/group.json
node scripts/optimize.mjs --input tests/fixtures/request.mock.json --mock-pricing --output temp/single.json
npm test
```

模拟数据明确标记 MOCK_DATA / MOCK_PRICING_NOT_OFFICIAL，供无业务凭据时复现。自动化测试展示预算、营养未知、401/429、确认与未知订单等分支。需要费用比较时使用同场景可比需求的独立核价基准，不能把不同餐品组合的价差当作节省。
