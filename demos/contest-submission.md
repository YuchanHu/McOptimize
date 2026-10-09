# 参赛准备说明

作品名称：麦麦最优解 / McOptimize。

计划发布地址：[YuchanHu/McOptimize](https://github.com/YuchanHu/McOptimize)。仓库名称与公开状态由用户创建，文件上传状态以最终 MCP 校验结果为准。

## 中文项目描述

麦麦最优解：面向 WorkBuddy 的麦当劳点餐组合优化技能，支持整单预算、多人偏好、套餐分配与可信营养约束，提供可解释的组合推荐和官方 MCP 计价流程。

## 必需材料

- README.md：介绍、目标用户、安装与示例。
- CONTEST_DECLARATION.md：从官方活动仓库获取的原文，文件名和正文不改动；参赛者应亲自阅读并确认其中声明。
- MCP_INTEGRATION.md：服务、工具、工作流与实际验证状态。
- mcp-config.example.json：公开文件只有环境变量占位符。
- 源代码、测试、模拟数据及可导入 ZIP。

正式报名仍需真实使用麦当劳 MCP，当前本地模拟结果不能替代这项要求。WorkBuddy 专项奖励另需真实使用 WorkBuddy，并提交导出的完整脱敏开发对话 workbuddy.md；本次初始代码由 Codex 辅助开发，没有将其伪称为 WorkBuddy 开发对话。

## 报名文本草稿

以下是待验收完成后的报名草稿，没有代用户发送 Issue，也不代表已报名成功：

```text
【参赛申请】
项目名称：麦麦最优解 / McOptimize
项目地址：https://github.com/YuchanHu/McOptimize
项目简介：输入整单预算、人数与每人的餐品或营养要求，麦麦最优解通过确定性算法搜索合法组合，结合麦当劳官方 MCP 查询与计价流程，给出不重复的推荐及多人份数分配；默认只推荐，创建订单前需要明确确认。
```

活动页面：[麦当劳程序员创意开发大赛](https://github.com/M-China/mcd-developer-innovation-challenge)。官方公布的报名截止时间是北京时间2026年10月25日23:59，提交前再次核对当前规则。提交报名及确认规则由参赛者完成。
