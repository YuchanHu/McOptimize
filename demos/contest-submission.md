# 参赛项目说明

作品名称：**麦麦最优解 / McOptimize**。

[公开仓库](https://github.com/YuchanHu/McOptimize) · [安装包](https://github.com/YuchanHu/McOptimize/releases/tag/v1.0.0) · [真实验证](../docs/workbuddy-validation.md)

## 项目简介

麦麦最优解由 GPT/Codex 辅助开发，主要用于 WorkBuddy。它将整单预算、多人口味和营养条件转换为可执行的点餐组合，结合麦当劳官方 MCP 查询与计价，提供三目标推荐、套餐份数分配和确认后下单流程。

真实三人场景已完成营养查询、本地搜索、官方核价、重新确认和一次成功建单：三种方案分别为 54.00、63.90、65.00 元，C 的热量均在 600 kcal 内；最终创建 54 元外带订单。两人偏好组合与百人规则迭代也有官方核价记录。订单回执明确区分待支付与付款完成。

## 已提供材料

| 文件 | 内容 |
|---|---|
| README.md | 功能、目标用户、安装、使用案例与工程说明 |
| CONTEST_DECLARATION.md | 官方参赛声明原文 |
| MCP_INTEGRATION.md | 真实使用的服务、工具、调用链及业务价值 |
| mcp-config.example.json | 环境变量占位符公开配置 |
| docs/workbuddy-validation.md | 三组真实场景的验证结果与范围 |
| docs/workbuddy-three-person-records.md | 三人推荐、营养与建单的完整脱敏使用记录 |
| docs/workbuddy-usage-records.md | 两人及百人完整脱敏使用记录 |
| tests/ 与 demos/test-results.md | 54 项自动化测试与复现报告 |
| v1.0.0 Release | 两种布局的 ZIP 安装包与中文说明 |

开发来源为 GPT/Codex，WorkBuddy 是主要使用平台；对话记录作为使用证据，按用户要求不提供 WorkBuddy 专项开发材料 workbuddy.md。

## 报名文本

```text
【参赛申请】
项目名称：麦麦最优解 / McOptimize
项目地址：https://github.com/YuchanHu/McOptimize
项目简介：由 GPT/Codex 辅助开发、主要用于 WorkBuddy 的麦当劳点餐组合优化技能。输入整单预算、多人偏好与营养要求，结合官方 MCP 实时菜单、营养查询及计价，输出最低金额、丰富优先和营养优先方案，并给出每人份数分配。已在真实三人场景完成54.00/63.90/65.00元三方案核价、600千卡个人约束及最终确认后的54元成功建单；提供54项自动化测试、脱敏实测记录和ZIP安装包。
```

本页提供报名文本，报名提交状态以活动 Issue 为准。活动页面：[麦当劳程序员创意开发大赛](https://github.com/M-China/mcd-developer-innovation-challenge)；官方公布的报名截止时间为北京时间 2026-10-25 23:59，参赛者按当前规则提交并确认声明。
