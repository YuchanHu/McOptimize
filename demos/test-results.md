# 实际测试记录（2026-10-09，Windows）

本文按阶段保留历史测试结果。下方初版中的“未验证”描述对应当时开发环境；后续已在 WorkBuddy 完成真实使用联调，当前状态以文末补充和 [实测汇总](../docs/workbuddy-validation.md) 为准。项目由 GPT/Codex 辅助开发，WorkBuddy 为主要使用平台。

环境：Node.js v20.9.0，npm 10.1.0，PowerShell。无第三方运行依赖、无真实网络业务调用。原始TAP在忽略的temp/tests.tap中，本报告与offline-summary.json可以随包分发。

## 自动化结果

实际执行 `npm test`：**53 tests / 53 pass / 0 fail / 0 skipped / 0 cancelled**，退出0，总测试时间约1213毫秒。覆盖全部任务书T01–T18，以及价格时效/绑定、套餐配置变化、部分计价失败、ZIP破损和独立小菜单穷举对照。

T18：40 SKU、maxItems=5、maxNodes=10000；实测493毫秒，节点10000，低于2秒，searchExhaustive=false。有界算法不含任何MCP网络耗时。

| 验收项 | 自动化覆盖与结果 |
|---|---|
| T01–T05 | 预算、两类必选、排除牛肉、套餐覆盖与不双重计价；通过 |
| T06–T08 | 多人份数守恒、整单预算、严格营养未知淘汰；通过 |
| T09–T10 | 券面值不扣估价、实际计价超预算淘汰；通过 |
| T11–T14 | 非法金额数量、稳定去重、资源上限、空/停售菜单；通过 |
| T15 | mock 401停止、429有界退避、总请求预算、超时；通过 |
| T16–T17 | 未确认禁止写、摘要变化失效、unknown禁重试；通过 |
| T18 | 40SKU压力与节点计数；通过 |
| 补充 | 场景/价格时效/来源/套餐指纹绑定、部分成功、ZIP CRC32与SHA256；通过 |

开发过程中修复：Windows Node20不展开npm脚本中的shell通配符，改为node --test tests；ZIP检查错误匹配.gitignore，修正路径边界。首次沙箱运行Node测试因子进程EPERM失败，经允许运行本地测试进程后完整执行。失败记录未冒充验收通过。

`npm run validate-skill`实际退出0，检查任务书要求的WorkBuddy metadata、入口与引用资源。skill-creator的Python quick_validate尝试执行，但环境缺PyYAML未运行成功；其Codex字段白名单也与WorkBuddy扩展字段不同，因此未用它证明WorkBuddy兼容。未安装额外Python依赖，目标平台本地检查由项目Node校验器完成，线上导入仍待真人验证。

## 实际CLI演示

执行命令：

```powershell
node scripts/optimize.mjs --input tests/fixtures/request.mock.json --output temp/result.json
node scripts/optimize.mjs --input tests/fixtures/request.mock.json --mock-pricing --output temp/mock-priced.json
node scripts/optimize.mjs --input tests/fixtures/request.multiplayer.mock.json --mock-pricing --output temp/group.json
```

全部正常退出0，JSON可解析、status=ok、dataSource=mock。快照见 [offline-summary.json](offline-summary.json)。

| 场景 | 价格状态 | 三种目标金额（分） | 候选统计 |
|---|---|---|---|
| 单人未核价 | not_verified | 菜单估价1900 / 2900 / 2000 | 生成389，淘汰357，待核价6 |
| 单人模拟核价 | verified，mock_adapter | 模拟最终1800 / 2700 / 2100 | 6组合核价成功，总尝试≤12 |
| 三人模拟核价 | verified，mock_adapter | 模拟最终4900 / 6200 / 4900 | 生成637，淘汰556，6组合核价成功 |

三人同金额的最低/营养方案SKU不同，没有重复方案。每人分配存在，C可信mock热量不超过600；多人场景因分配节点上限触发searchExhaustive=false，输出有BOUNDED_SEARCH_ONLY。这些金额不能当成麦当劳真实价格，mock营养不能当成官方营养，也不能用不同组成之间的价差声称节省。

## 包与线上验收

构建命令 `npm run package`，校验 `npm run verify-package`。主包顶层mcd-optimize/，兼容包根级SKILL.md。dist/manifest.json保存真实文件清单、SHA256与大小；打包白名单包括本报告、源码、fixtures与文档，排除temp原始TAP、上级任务书和凭据。

已使用Python标准库zipfile独立检查两包，testzip返回无坏条目，均41文件；PowerShell Expand-Archive成功。解压项目独立npm test为53通过/0失败；带空格的Windows目录再次执行同样53通过/0失败，约1253毫秒。CLI子进程测试路径改为fileURLToPath，支持含空格的安装路径。已对照任务书调试凭据扫描交付源码与ZIP，未发现凭据内容；凭据未打印到扫描输出。结构离线校验与WorkBuddy实际导入是两项不同验收，不将本地解压说成WorkBuddy安装成功。

未执行：WorkBuddy GUI、真实MCP Schema/菜单/券/营养/计价、真实下单/付款/订单状态。当前环境无已连接WorkBuddy麦当劳工具会话，未使用任务书凭据调用业务接口。官方GitHub公开工具与接入信息已核对；WorkBuddy在线资料读取失败，差异/待验证在mcp-tools.md记录。

## 自定义MCP配置说明修订

根据用户提供的WorkBuddy配置界面信息，安装说明已改为顶层mcpServers的JSON配置，并新增references/mcp-config.example.json（只有Token占位符）。同时修复打包凭据扫描误判Authorization占位符的问题，并增加回归测试，验证占位符可通过而真实凭据形状仍被拦截。

本次实际完整npm test：**54 tests / 54 pass / 0 fail / 0 skipped / 0 cancelled**，退出0，约1180毫秒。修订后的两种ZIP各含42个文件，重新执行打包、逐文件SHA256及ZIP完整性校验。前面的53项测试与41文件解压记录对应初版；真实MCP连接仍未验证。

## 参赛公开发布准备

2026-10-09通过GitHub MCP核对官方活动材料与目标公开仓库。增加官方原文CONTEST_DECLARATION.md、MCP_INTEGRATION.md、根目录mcp-config.example.json和参赛准备说明；配置模板改为环境变量占位符。参赛声明与官方正文逐字比对一致。

该版本完整npm test仍为**54项通过、0项失败**，约1217毫秒；T18实测488毫秒、10000节点。源码与参赛材料进入ZIP白名单，当前每包46文件。正式报名所需真实麦当劳MCP使用及WorkBuddy专项对话仍未取得，本报告不把GitHub MCP发布操作算成麦当劳业务联调。

## WorkBuddy 使用联调补充

2026-10-09，作者提供两人 70 元与百人 100 元两份真实使用导出，记录确认 Skill 加载、Node v22.22.2、本地候选搜索、真实到店菜单/套餐查询、官方计价及价格回填。两人推荐组合为 65.80 元，最低金额组合为 43.30 元；百人采购组合为 100.00 元，备选为 290.00 元，均是当时核价。

两人会话逐条统计为 16 次计价调用（13 成功、3 次参数校验失败），与原最终回复“12 次全部成功”口径不同；Agent 整轮 12 次预算未落实，仍待改进。百人场景超出引擎 8 人上限，由 WorkBuddy 对话推理处理，不计为本地引擎百人测试。

作者确认已经在 WorkBuddy 完整验证并成功下单。两份导出未提供建单、查询、支付回执，支付完成和异常恢复不作通过声明。真实营养、外送、有券核销及具体 ZIP 导入布局等仍未覆盖。

项目由 GPT/Codex 辅助开发，WorkBuddy 记录仅为使用证据，保存在 docs/workbuddy-usage-records.md，不作为专项开发材料。本次仅更新仓库文档与 Release 描述，v1.0.0 附件保留原始内容和哈希。

本次文档更新后再次执行 `npm test`：**54 tests / 54 pass / 0 fail**，约 1241 毫秒。首次受沙箱子进程 `spawn EPERM` 限制未能运行测试；获准在沙箱外重跑后通过。另通过文档链接/脱敏扫描、5 轮用户消息与 94 个工具段落完整性检查，以及 Release 描述同步的 4 种本地模拟检查；两个原 ZIP 的 SHA256 保持一致。
