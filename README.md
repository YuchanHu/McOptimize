# McOptimize · 麦麦最优解

麦麦最优解是一款面向 WorkBuddy 的麦当劳点餐组合优化技能。输入预算、人数和每人的需求，本地算法搜索满足条件的餐品组合，给出最低金额、丰富优先和营养优先等不同选择，并将套餐子项分配给每个人。

真实使用时，由 WorkBuddy 调用麦当劳官方 MCP 查询门店、菜单与优惠，再对候选组合计价。默认只推荐；创建订单前需要用户明确确认，付款由用户在官方页面完成。本项目为麦当劳程序员创意开发大赛准备，非麦当劳官方产品。

## 适用场景

- 单人点餐：30 元预算，鸡肉汉堡与小食必选，饮料可选。
- 多人聚餐：三人总预算 90 元，各自有口味、必选餐品或热量要求。
- 方案比较：在同一门店与就餐方式下比较已经核价的不同组合。

适合希望明确控制预算、照顾多人需求并了解推荐理由的用户。不会用模型记忆中的菜单或价格代替当前门店数据。

项目以Node.js 20+ ESM和标准库实现，无第三方运行依赖，无独立网站/App/MCP服务端。所有fixtures和离线展示均虚构。模拟核价通过不表示取得官方价格，更不表示已下单/付款。

## 当前状态与参赛材料

离线引擎、模拟核价、自动化测试与 ZIP 安装包已完成；真实麦当劳 MCP 联调及 WorkBuddy GUI 验收尚未完成。官方活动要求真实使用麦当劳 MCP，正式报名之前应补充脱敏使用记录。

| 文件 | 内容 |
|---|---|
| [CONTEST_DECLARATION.md](CONTEST_DECLARATION.md) | 官方参赛声明原文，未修改 |
| [MCP_INTEGRATION.md](MCP_INTEGRATION.md) | MCP 服务、工具、调用流程、业务价值与实际验证状态 |
| [mcp-config.example.json](mcp-config.example.json) | 仅含环境变量占位符的公开配置示例 |
| [参赛准备说明](demos/contest-submission.md) | 报名文本草稿与待完成步骤 |

本项目的初始开发由 Codex 辅助完成，尚无真实 WorkBuddy 开发对话，未提供冒充对话的 `workbuddy.md`。申请 WorkBuddy 专项奖励时，须真实使用 WorkBuddy，并导出完整脱敏对话到该固定文件名。活动规则以 [官方活动仓库](https://github.com/M-China/mcd-developer-innovation-challenge) 为准。

## 本地运行（Windows）

打开PowerShell，切换到项目目录，确认 `node --version` 为20+：

```powershell
# 切换到解压后的项目根目录（其中包含 SKILL.md 和 package.json）
npm test
node scripts/optimize.mjs --input tests/fixtures/request.mock.json --output temp/result.json
node scripts/optimize.mjs --input tests/fixtures/request.mock.json --mock-pricing --output temp/mock-priced.json
node scripts/optimize.mjs --input tests/fixtures/request.multiplayer.mock.json --mock-pricing --output temp/group.json
npm run package
npm run verify-package
```

无需npm install。`--input -` 可读取stdin；stdout为JSON，诊断在stderr。无解/计价失败是有效业务响应（退出0）；非法数据退出2，内部故障退出3。完整契约在 [references/input-output-schema.md](references/input-output-schema.md)。不要把用户输入插入shell命令，写JSON数据文件。

真实流程：WorkBuddy查询菜单/详情/券/营养→显式归一化→本地候选→WorkBuddy有限调用calculate-price→脱敏价格数组回填→重新排序。`--mock-pricing`只支持mock输入，真实流程用：

```powershell
node scripts/optimize.mjs --input temp/input.json --output temp/candidates.json
node scripts/optimize.mjs --input temp/input.json --pricing-results temp/prices.json --output temp/result.json
```

## WorkBuddy安装与连接麦当劳MCP

1. 安装或更新Windows WorkBuddy，确保可执行本地Node.js脚本。将麦当劳Token保存在WorkBuddy MCP连接器配置；不要粘贴到Skill/README/测试数据。Token在 [官方控制台](https://open.mcd.cn/mcp) 获取。
2. WorkBuddy自定义MCP使用JSON配置文件，顶层为 `mcpServers`。可复制 [配置模板](mcp-config.example.json)，通过本地私有配置绑定环境变量 `MCD_MCP_TOKEN`。已有其他服务时，只把 `mcd-mcp` 条目合并到原有 `mcpServers` 中。模板中的环境变量语法是公开占位符，本次没有验证 WorkBuddy 自动展开它；如果当前客户端不支持展开，只在 WorkBuddy 配置编辑器中将占位符替换为实际 Token，不改动项目文件。

   ```json
   {
     "mcpServers": {
       "mcd-mcp": {
         "type": "streamablehttp",
         "url": "https://mcp.mcd.cn",
         "headers": {
           "Authorization": "Bearer ${MCD_MCP_TOKEN}"
         }
       }
     }
   }
   ```

   公开配置文件只保留环境变量占位符。包含真实 Token 的配置只保存在你的私有 WorkBuddy 配置中，不回写模板或放入 ZIP。

3. 连接成功后查看实际工具列表和Schema，记录 [references/mcp-tools.md](references/mcp-tools.md) 中未核对的字段，特别是套餐选择、券、最终金额单位。此项目不把未经验证的官方字段写死。
4. 在WorkBuddy的Skill管理/导入入口选择 `dist/mcd-optimize-skill.zip`。主包布局是 `mcd-optimize/SKILL.md` 及同级配套资源。若当前版本只接受根级SKILL.md，用 `dist/mcd-optimize-skill-flat.zip`。本开发环境尚未在WorkBuddy GUI实测导入，两个包均已可做离线校验；导入成功后请填写真人清单。
5. 若客户端支持从目录添加Skill，可解压主包并选择其 `mcd-optimize` 文件夹。启用后让WorkBuddy读SKILL.md，从安装目录执行 `node scripts/optimize.mjs ...`。不能假设全局工作目录等于Skill目录。
6. 先运行下面的mock三段对话，确认调用本地脚本，再进行真实只读查询和计价。真实订单不属于安装验收必做项。

WorkBuddy官方Skill文档本次读取超时，线上frontmatter规则和ZIP导入行为须真人验证。当前使用任务书要求的 name、description、description_zh、description_en、version、author，未添加未经核对的分类值。

## 三段示范对话

- 单人：“使用麦麦最优解的模拟数据演示：30元，一个鸡肉汉堡和小食，不吃牛肉，饮料可选。只推荐。”应标记MOCK_DATA，先菜单估价，再明确模拟计价，无账户写操作。
- 多人：“使用模拟数据：三人总预算90元，A不吃牛肉，B要主食和薯条，C要主食且不超过600千卡。给三种方案与份数分配。”应展示整单金额和每人servingId，不重复占用套餐子项。
- 下单保护：“就选方案一，给我看看能不能下单。”mock应阻止真实建单；真实核价流程应先展示完整摘要并请求本轮明确最终确认，不把这句话当授权。可停在待确认处录制视频。真实确认后支付仍由用户在官方页面完成。

详细异常与演示步骤在 [references/workflow-examples.md](references/workflow-examples.md) 和 [demos/scenarios.md](demos/scenarios.md)。没有同场景已核价的基准就不展示节省金额。未提供GUI截图；真人验收成功后可用脱敏截图补充，禁止展示Token/地址/支付URL。

## 架构与文件

| 文件 | 职责 |
|---|---|
| SKILL.md | 触发、工具编排、运行脚本、失败分支、确认与支付流程 |
| scripts/constraints.mjs | 类型/金额/数量/证据校验、每人约束与份数分配 |
| scripts/optimizer.mjs | 有界多重集枚举+beam截断、套餐覆盖、稳定指纹 |
| scripts/ranker.mjs | 最低金额/丰富/营养三个目标与组合去重 |
| scripts/normalize.mjs、normalize-cli.mjs | 实时Schema显式映射；禁止猜金额单位 |
| scripts/pricing.mjs | 计价任务预算、券策略、可注入mock adapter、回填绑定 |
| scripts/format.mjs、optimize.mjs | 机器可解析JSON与CLI |
| scripts/workflow.mjs | 可测试的本轮摘要确认与unknown状态保护 |
| scripts/package.mjs、zip.mjs | 无依赖ZIP、白名单、CRC32/SHA256和内容校验 |
| tests/ | Node原生自动化测试及纯模拟fixtures |
| references/、demos/ | 数据契约、官方工具核对、人工验收与剧本 |

WorkBuddy承担自然语言解释和真实工具路由，本地只做确定性搜索，不持有Token、不联网、不代付。workflow helper只能帮助Agent检查状态，不能替代客户端工具权限。

## ZIP校验

```powershell
npm run package
npm run verify-package
Get-FileHash dist/mcd-optimize-skill.zip -Algorithm SHA256
Expand-Archive -LiteralPath dist/mcd-optimize-skill.zip -DestinationPath temp/package-preview -Force
Get-ChildItem temp/package-preview/mcd-optimize
```

`dist/manifest.json`保存两包SHA256、大小与完整内部清单。每个条目比对源码SHA256，ZIP含CRC32。内容改变后重新打包；verify-package会拒绝与当前源码不一致的旧包。ZIP不包含上级任务书、Token、temp、运行日志、node_modules或.git。源码中的链接需安装时保持相对路径。

## 测试与尚未验证的事项

实际开发测试记录见 [demos/test-results.md](demos/test-results.md)，真人验收见 [demos/acceptance-checklist.md](demos/acceptance-checklist.md)。完整T01–T18包含预算、套餐、禁忌、营养、多人分配、价格变动、401/429、确认、未知订单和40 SKU压测。

尚未验证：WorkBuddy GUI导入与技能触发、该客户端Node脚本执行环境、麦当劳实时工具Schema/真实门店菜单/券/营养/计价、真实建单支付字段与状态查询。本环境虽有任务书调试凭据，未连接WorkBuddy MCP工具会话，凭据未进入交付项目。

当前版本需要 Node.js 20+ 执行环境。手机版是否能执行脚本或连接远程工作区尚未验证；只有手机时，不能保证直接运行这个 ZIP 技能。

已知边界：有界搜索只称已搜索候选最佳；只使用已确认固定套餐组成；菜单估价超预算的组合不会因假定券折扣被保留，可能遗漏优惠后可负担组合；仅比较无券/单券，不搜索叠加；每人至少一份不等于保证饱腹；过敏原不明不承诺安全；超过8人或资源上限需调整需求。上述保守限制在输出中保留警告。

P2未实现：历史偏好记忆、定时领券、独立Vue展示界面；后续可以扩展，但不属于当前交付。只对原创代码提供MIT许可，不对官方服务、文档、商品信息或商标授权。发布/参赛前核对平台和麦当劳条款。
