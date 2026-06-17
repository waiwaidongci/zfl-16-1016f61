# 活字排版工坊

一个纯前端本地应用，用来维护字模库、在网格版面中落字、检查字模数量是否超用、保存草稿并导出PNG预览图。

直接打开 `index.html` 即可使用，也可以在本目录启动静态服务访问。

---

## 开发与回归验证工程化流程

> 以下流程在不引入后端服务、不破坏直接打开 `index.html` 使用方式的前提下，提供本地静态服务、代码风格检查、浏览器自动化冒烟测试和PNG导出验证。

### 环境准备

首次使用前执行：

```bash
npm install
npm run test:install
```

- `npm install` 安装所有开发依赖（http-server、ESLint、Prettier、Playwright 等）
- `npm run test:install` 下载 Playwright 的 Chromium 浏览器（约200MB+，用于浏览器自动化测试）

### 本地静态服务

| 命令            | 说明                                                         |
| --------------- | ------------------------------------------------------------ |
| `npm start`     | 启动静态服务并自动在浏览器打开 http://127.0.0.1:8080，无缓存 |
| `npm run serve` | 仅启动静态服务，不自动打开浏览器                             |

> 说明：静态服务基于 `http-server`，仅提供本地访问，不修改任何源码，不影响直接双击 `index.html` 的使用方式。

### 代码风格检查与格式化

| 命令                  | 说明                                                |
| --------------------- | --------------------------------------------------- |
| `npm run lint`        | 运行 ESLint 检查 app.js，仅报告错误和警告（不阻断） |
| `npm run lint:strict` | 严格模式：有任何警告即退出非零（适合 CI）           |
| `npm run lint:fix`    | 运行 ESLint 自动修复可修复的问题                    |
| `npm run format`      | 运行 Prettier 检查所有文件格式                      |
| `npm run format:fix`  | 运行 Prettier 自动格式化所有文件                    |

检查范围：

- **ESLint**：`app.js` —— 语法正确性、未使用变量、`===` 比较、分号、`const`/`let` 等
- **Prettier**：`*.{js,css,html,json,md}` —— 缩进、换行、引号等排版一致

### 浏览器自动化冒烟测试

冒烟测试覆盖核心功能链路，使用 Playwright + Chromium 无头浏览器自动运行。

\*\*测试启动时会自动在后台启动静态服务，无需手动启动。

| 命令                        | 说明                                     |
| --------------------------- | ---------------------------------------- |
| `npm run test:smoke`        | 运行冒烟测试套件（无头模式）             |
| `npm run test:smoke:headed` | 运行冒烟测试（有头模式，可见浏览器操作） |

#### 冒烟测试覆盖范围（8 个用例）

| #   | 用例名称                 | 覆盖功能                 | 验证要点                                       |
| --- | ------------------------ | ------------------------ | ---------------------------------------------- |
| 1   | 应用启动并渲染核心UI     | 页面加载、UI初始化       | h1标题、editorView、stage、typeList、workTitle |
| 2   | 新增字模功能正常         | 字模表单提交、字模库增长 | char/style/size/quantity/wear 字段正确入库     |
| 3   | 落字功能正常             | 网格点击放置/移除字模    | placements数组、used类、文本内容               |
| 4   | 多页面切换功能正常       | 新增页面、切换页面       | 新增后自动切新页、点击tab切换状态同步          |
| 5   | 保存作品（存档）功能正常 | 切换到档案页、作品入库   | archiveView显示、作品卡片标题匹配              |
| 6   | 打开排版校对中心正常     | 校对面板激活、数据渲染   | proofread tab激活、summary/issues 渲染         |
| 7   | 字模库导出功能正常       | JSON文件下载、格式校验   | 文件名、version、字段完整性                    |
| 8   | 字模库导入功能正常       | 文件选择、合并导入       | 新字模出现于库存中                             |

### PNG 导出验证

专门针对导出预览图功能做像素级和结构级验证。

| 命令               | 说明                  |
| ------------------ | --------------------- |
| `npm run test:png` | 运行 PNG 导出验证套件 |

#### PNG 导出验证覆盖范围（4 个用例）

| #   | 用例名称                   | 验证要点                                            |
| --- | -------------------------- | --------------------------------------------------- |
| 1   | 空白版面 PNG 生成验证      | Canvas尺寸、文件大小、PNG解析成功、尺寸匹配基准快照 |
| 2   | 带字模版面 PNG 验证        | 版面非空白像素存在、落字区域有墨迹像素              |
| 3   | 打印预览 Canvas 参数完整性 | 纸色/边框/网格控件存在、墨迹像素统计                |
| 4   | 多纸张尺寸 PNG 导出        | 明信片/书签/方形小笺三种尺寸、书签尺寸高大于宽      |

基准快照首次运行自动保存至 `tests/snapshots/`，后续可用于对比回归。

### 完整回归验证

```bash
npm run test:all
```

一次性运行冒烟测试 + PNG 导出验证，共 **12 个用例全部通过**即为回归验证通过。

查看 HTML 测试报告：

```bash
npx playwright show-report
```

### 工程化配置文件说明

| 文件                       | 职责                                     |
| -------------------------- | ---------------------------------------- |
| `package.json`             | npm 脚本和依赖声明                       |
| `.eslintrc.json`           | ESLint 代码检查规则                      |
| `.prettierrc`              | Prettier 格式化规则                      |
| `.prettierignore`          | Prettier 忽略文件                        |
| `playwright.config.js`     | Playwright 测试配置                      |
| `tests/smoke.spec.js`      | 冒烟测试用例                             |
| `tests/png-export.spec.js` | PNG 导出验证用例                         |
| `.gitignore`               | 已包含 `node_modules/`、测试报告、快照等 |

### 推荐开发工作流

```
1. 修改代码
   ↓
2. npm run format:fix   ← 格式化代码
3. npm run lint       ← 检查有无语法问题
   ↓
4. npm start        ← 本地手动验证（可选）
   ↓
5. npm run test:all ← 完整自动化回归
```

### 目录结构

```
zfl-16/
├── index.html               # 应用入口（可直接双击打开）
├── app.js                 # 主逻辑
├── styles.css              # 样式表
├── README.md              # 本说明文档
├── package.json          # 工程化配置和脚本
├── playwright.config.js    # 浏览器自动化配置
├── .eslintrc.json        # 代码检查规则
├── .prettierrc           # 格式化规则
├── tests/
│   ├── smoke.spec.js     # 8 个冒烟测试用例
│   └── png-export.spec.js # 4 个 PNG 验证用例
└── tests/snapshots/    # PNG 基准快照（首次运行自动生成）
```

---

## 字模库导入与导出

### 导出字模库

在左侧「字模库」面板头部，点击「导出」按钮，即可将当前字模库所有字模条目导出为一份 JSON 文件，文件名形如 `字模库_2026-06-15T10-30-00.json`。导出文件中包含版本号、导出时间、字模总数以及每条字模的「字」「风格」「字号」「数量」「磨损状态」字段（内部 ID 不会导出，以保证跨设备复用）。

### 导入字模库

点击「导入」按钮，选择一份 JSON 文件即可打开导入预览窗口。导入前系统会自动执行以下校验：

1. **字（char）**：非空字符串，不超过 2 个字符
2. **风格（style）**：非空字符串
3. **字号（size）**：8 到 72 之间的整数
4. **数量（quantity）**：1 到 99 之间的整数
5. **磨损状态（wear）**：必须是「新」「微磨」「旧痕」之一

校验失败的条目会在预览窗口中逐项列出原因，并被跳过。

导入方式有两种可选：

- **合并到现有字模库**（默认）：保留当前所有字模，只追加导入文件中与现有条目不完全重复的字模。重复判断标准为「字 + 风格 + 字号 + 数量 + 磨损状态」五个字段完全相同。
- **覆盖当前字模库**：清空现有字模库及版面上已落的字，替换为导入文件中的有效条目。

### JSON 文件格式

导出的 JSON 文件结构如下，也可按此格式手工编制后导入：

```json
{
  "version": 1,
  "exportedAt": "2026-06-15T10:30:00.000Z",
  "count": 6,
  "inventory": [
    {
      "char": "山",
      "style": "宋体旧字",
      "size": 30,
      "quantity": 4,
      "wear": "微磨"
    },
    {
      "char": "月",
      "style": "宋体旧字",
      "size": 30,
      "quantity": 3,
      "wear": "旧痕"
    }
  ]
}
```

导入时也支持直接传入一个数组（省略外层包装对象），数组中的每个元素即一条字模。

### 内部逻辑与最小验证方式

字模库导入导出核心逻辑已拆分为以下纯函数，可在浏览器控制台或内置测试中独立调用验证：

| 函数                                                            | 职责                      | 输入 → 输出                                                                          |
| --------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------ |
| `parseImportRawArray(data)`                                     | 解析 JSON，提取字模数组   | 任意 JSON → `Array \| null`                                                          |
| `validateAndNormalizeItems(rawArray)`                           | 逐条校验 + 归一化         | 字模数组 → `{ validItems, allErrors }`                                               |
| `computeImportStats(validItems, existingInventory)`             | 计算新增/重复/合并/覆盖数 | 有效条目 + 现有库 → `{ newUniqueCount, duplicateCount, mergeTotal, overwriteTotal }` |
| `deduplicateItems(items)`                                       | 按签名去重                | 字模数组 → 去重后的数组                                                              |
| `buildExportPayload(inventory, exportedAt)`                     | 生成导出 JSON 对象        | 字模库 + 导出时间 → `{ version, exportedAt, count, inventory }`                      |
| `applyImportToInventory(currentInventory, mode, dedupedImport)` | 合并或覆盖                | 现有库 + 模式 + 去重条目 → 新库存数组                                                |
| `resolveSelectedTypeId(inventory, prevSelectedTypeId)`          | 确保选中项有效            | 库 + 旧选中ID → 新选中ID                                                             |

**最小验证步骤**：在 URL 后加 `?test=1` 参数打开页面，点击「运行全部测试」，6 个用例全部通过即可确认导入导出行为正确，并覆盖核心纯函数重复调用一致性。
