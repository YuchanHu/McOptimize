# 参赛准备说明

作品名称：麦麦最优解 / McOptimize。

公开项目地址：[YuchanHu/McOptimize](https://github.com/YuchanHu/McOptimize)。成品下载：[v1.0.0 Release](https://github.com/YuchanHu/McOptimize/releases/tag/v1.0.0)。

## 中文项目描述

麦麦最优解：面向 WorkBuddy 的麦当劳点餐组合优化技能，支持整单预算、多人偏好、套餐分配与可信营养约束，提供可解释的组合推荐和官方 MCP 计价流程。

## 必需材料

- README.md：介绍、目标用户、安装与示例。
- CONTEST_DECLARATION.md：从官方活动仓库获取的原文，文件名和正文不改动；参赛者应亲自阅读并确认其中声明。
- MCP_INTEGRATION.md：服务、工具、工作流与实际验证状态。
- mcp-config.example.json：公开文件只有环境变量占位符。
- 源代码、测试、模拟数据及可导入 ZIP。
- docs/workbuddy-usage-records.md：2026-10-09 两份真实 WorkBuddy 使用记录的完整脱敏合并文本。
- docs/workbuddy-validation.md：真实查询、核价、价格回填、作者下单反馈与验证边界。

现已补充真实 WorkBuddy 与麦当劳 MCP 使用证据：Skill 加载、本地脚本、门店/菜单/套餐查询、官方核价和回填；两人 70 元场景推荐核价 65.80 元。作者另确认在 WorkBuddy 完整验证并成功下单，两份导出未包含建单或支付回执，此项按作者反馈记录。

项目由 GPT/Codex 辅助开发，主要用于 WorkBuddy；聊天记录只作为使用与业务联调证据，不申报为 WorkBuddy 开发作品，不提供专项开发材料 workbuddy.md。百人场景为对话推理案例，超出本地引擎上限，不宣称百人求解或足量供餐保证。已保留失败调用及说明。

## 报名文本草稿

以下报名草稿已根据真实记录更新；尚未代用户发送 Issue，不代表已报名成功：

```text
【参赛申请】
项目名称：麦麦最优解 / McOptimize
项目地址：https://github.com/YuchanHu/McOptimize
项目简介：由 GPT/Codex 辅助开发、主要用于 WorkBuddy 的麦当劳点餐组合优化技能。输入预算与多人偏好，本地算法生成候选，结合官方 MCP 查询真实菜单并核价，给出可解释的推荐与份数分配。已在 WorkBuddy 完成真实查询、核价及价格回填，两人 70 元实测推荐组合为 65.80 元；作者确认已成功下单。仓库提供脱敏使用记录、54 项离线测试和 ZIP 安装包，具体证据与边界见实测汇总。
```

活动页面：[麦当劳程序员创意开发大赛](https://github.com/M-China/mcd-developer-innovation-challenge)。官方公布的报名截止时间是北京时间2026年10月25日23:59，提交前再次核对当前规则。提交报名及确认规则由参赛者完成。
