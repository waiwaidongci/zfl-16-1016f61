# 活字排版工坊

一个纯前端本地应用，用来维护字模库、在网格版面中落字、检查字模数量是否超用、保存草稿并导出PNG预览图。

直接打开 `index.html` 即可使用，也可以在本目录启动静态服务访问。

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

| 函数 | 职责 | 输入 → 输出 |
|---|---|---|
| `parseImportRawArray(data)` | 解析 JSON，提取字模数组 | 任意 JSON → `Array \| null` |
| `validateAndNormalizeItems(rawArray)` | 逐条校验 + 归一化 | 字模数组 → `{ validItems, allErrors }` |
| `computeImportStats(validItems, existingInventory)` | 计算新增/重复/合并/覆盖数 | 有效条目 + 现有库 → `{ newUniqueCount, duplicateCount, mergeTotal, overwriteTotal }` |
| `deduplicateItems(items)` | 按签名去重 | 字模数组 → 去重后的数组 |
| `buildExportPayload(inventory)` | 生成导出 JSON 对象 | 字模库 → `{ version, exportedAt, count, inventory }` |
| `applyImportToInventory(currentInventory, mode, dedupedImport)` | 合并或覆盖 | 现有库 + 模式 + 去重条目 → 新库存数组 |
| `resolveSelectedTypeId(inventory, prevSelectedTypeId)` | 确保选中项有效 | 库 + 旧选中ID → 新选中ID |

**最小验证步骤**：在 URL 后加 `?test=1` 参数打开页面，点击「运行全部测试」，5 个用例全部通过即可确认导入导出行为正确。
