const storageKey = "zfl16-movable-type-workshop";

const starterInventory = [
  { id: crypto.randomUUID(), char: "山", style: "宋体旧字", size: 30, quantity: 4, wear: "微磨" },
  { id: crypto.randomUUID(), char: "月", style: "宋体旧字", size: 30, quantity: 3, wear: "旧痕" },
  { id: crypto.randomUUID(), char: "风", style: "楷体木刻", size: 28, quantity: 2, wear: "微磨" },
  { id: crypto.randomUUID(), char: "花", style: "楷体木刻", size: 28, quantity: 2, wear: "新" },
  { id: crypto.randomUUID(), char: "茶", style: "黑体铅字", size: 24, quantity: 3, wear: "旧痕" },
  { id: crypto.randomUUID(), char: "雨", style: "仿宋细字", size: 22, quantity: 4, wear: "新" }
];

const defaultState = {
  inventory: starterInventory,
  selectedTypeId: starterInventory[0].id,
  placements: [],
  drafts: [],
  settings: {
    paperSize: "postcard",
    flowMode: "horizontal",
    gridGap: 8,
    workTitle: "晚风小笺"
  }
};

let state = loadState();

const els = {
  paperSize: document.querySelector("#paperSize"),
  flowMode: document.querySelector("#flowMode"),
  gridGap: document.querySelector("#gridGap"),
  workTitle: document.querySelector("#workTitle"),
  stage: document.querySelector("#stage"),
  typeList: document.querySelector("#typeList"),
  typeForm: document.querySelector("#typeForm"),
  charInput: document.querySelector("#charInput"),
  styleInput: document.querySelector("#styleInput"),
  sizeInput: document.querySelector("#sizeInput"),
  quantityInput: document.querySelector("#quantityInput"),
  wearInput: document.querySelector("#wearInput"),
  inventorySearch: document.querySelector("#inventorySearch"),
  styleFilter: document.querySelector("#styleFilter"),
  selectedTypeLabel: document.querySelector("#selectedTypeLabel"),
  shortageBadge: document.querySelector("#shortageBadge"),
  usageList: document.querySelector("#usageList"),
  draftList: document.querySelector("#draftList"),
  placedCount: document.querySelector("#placedCount"),
  inventoryCount: document.querySelector("#inventoryCount"),
  saveDraftBtn: document.querySelector("#saveDraftBtn"),
  exportBtn: document.querySelector("#exportBtn"),
  clearBoardBtn: document.querySelector("#clearBoardBtn"),
  textLayoutBtn: document.querySelector("#textLayoutBtn"),
  textLayoutModal: document.querySelector("#textLayoutModal"),
  tlClose: document.querySelector("#tlClose"),
  tlText: document.querySelector("#tlText"),
  tlAnalyze: document.querySelector("#tlAnalyze"),
  tlAnalysis: document.querySelector("#tlAnalysis"),
  tlAnalysisContent: document.querySelector("#tlAnalysisContent"),
  tlCancel: document.querySelector("#tlCancel"),
  tlConfirm: document.querySelector("#tlConfirm"),
  exportInventoryBtn: document.querySelector("#exportInventoryBtn"),
  importInventoryBtn: document.querySelector("#importInventoryBtn"),
  importFileInput: document.querySelector("#importFileInput"),
  importModal: document.querySelector("#importModal"),
  importClose: document.querySelector("#importClose"),
  importCancel: document.querySelector("#importCancel"),
  importConfirm: document.querySelector("#importConfirm"),
  importSummary: document.querySelector("#importSummary"),
  importErrors: document.querySelector("#importErrors")
};

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return structuredClone(defaultState);
  try {
    const parsed = JSON.parse(saved);
    return {
      ...structuredClone(defaultState),
      ...parsed,
      settings: { ...defaultState.settings, ...parsed.settings }
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function getGrid() {
  const size = state.settings.paperSize;
  if (size === "bookmark") return { cols: 7, rows: 18 };
  if (size === "square") return { cols: 12, rows: 12 };
  return { cols: 16, rows: 10 };
}

function placementKey(row, col) {
  return `${row}:${col}`;
}

function getSelectedType() {
  return state.inventory.find((item) => item.id === state.selectedTypeId) || null;
}

function getUsage() {
  return state.placements.reduce((acc, placement) => {
    acc[placement.typeId] = (acc[placement.typeId] || 0) + 1;
    return acc;
  }, {});
}

function renderSettings() {
  els.paperSize.value = state.settings.paperSize;
  els.flowMode.value = state.settings.flowMode;
  els.gridGap.value = state.settings.gridGap;
  els.workTitle.value = state.settings.workTitle;
}

function renderStyleFilter() {
  const current = els.styleFilter.value || "all";
  const styles = [...new Set(state.inventory.map((item) => item.style))].sort((a, b) => a.localeCompare(b, "zh-CN"));
  els.styleFilter.innerHTML = `<option value="all">全部风格</option>${styles
    .map((style) => `<option value="${escapeHtml(style)}">${escapeHtml(style)}</option>`)
    .join("")}`;
  els.styleFilter.value = styles.includes(current) ? current : "all";
}

function renderInventory() {
  const keyword = els.inventorySearch.value.trim();
  const style = els.styleFilter.value;
  const usage = getUsage();
  const items = state.inventory.filter((item) => {
    const matchesKeyword = !keyword || `${item.char}${item.style}${item.wear}`.includes(keyword);
    const matchesStyle = style === "all" || item.style === style;
    return matchesKeyword && matchesStyle;
  });

  els.inventoryCount.textContent = `${state.inventory.length}枚字模`;
  els.typeList.innerHTML = items
    .map((item) => {
      const used = usage[item.id] || 0;
      const selected = item.id === state.selectedTypeId ? "selected" : "";
      return `
        <article class="type-card ${selected}" draggable="true" data-type-id="${item.id}">
          <div class="glyph" style="font-size:${Math.min(item.size, 36)}px">${escapeHtml(item.char)}</div>
          <div class="type-meta">
            <strong>${escapeHtml(item.char)} · ${escapeHtml(item.style)}</strong>
            <span>${item.size}px · ${escapeHtml(item.wear)} · 已用${used}/${item.quantity}</span>
          </div>
          <button class="mini-btn" title="删除字模" data-delete-type="${item.id}" type="button">×</button>
        </article>
      `;
    })
    .join("");
}

function renderStage() {
  const { cols, rows } = getGrid();
  const map = new Map(state.placements.map((item) => [placementKey(item.row, item.col), item]));
  els.stage.className = `stage ${state.settings.paperSize}`;
  els.stage.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
  els.stage.style.gridTemplateRows = `repeat(${rows}, minmax(0, 1fr))`;
  els.stage.style.gap = `${state.settings.gridGap}px`;
  const cells = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const placement = map.get(placementKey(row, col));
      const type = placement ? state.inventory.find((item) => item.id === placement.typeId) : null;
      const vertical = state.settings.flowMode === "vertical" ? "vertical" : "";
      cells.push(`
        <button class="cell ${type ? "used" : ""} ${vertical}" data-row="${row}" data-col="${col}" type="button" aria-label="第${row + 1}行第${col + 1}列">
          ${type ? escapeHtml(type.char) : ""}
        </button>
      `);
    }
  }
  els.stage.innerHTML = cells.join("");
}

function renderUsage() {
  const usage = getUsage();
  const entries = state.inventory.filter((item) => usage[item.id]);
  els.placedCount.textContent = `${state.placements.length}个落字`;

  const shortages = entries.filter((item) => usage[item.id] > item.quantity);
  els.shortageBadge.textContent = shortages.length ? `${shortages.length}处超量` : "数量充足";
  els.shortageBadge.className = `badge ${shortages.length ? "warn" : "ok"}`;

  const selectedType = getSelectedType();
  els.selectedTypeLabel.textContent = selectedType ? `当前：${selectedType.char} · ${selectedType.style}` : "未选择字模";

  els.usageList.innerHTML =
    entries
      .map((item) => {
        const used = usage[item.id];
        const warn = used > item.quantity ? "warn" : "";
        return `
          <div class="usage-item ${warn}">
            <strong>${escapeHtml(item.char)} ${escapeHtml(item.style)}</strong>
            <span>${used}/${item.quantity}</span>
          </div>
        `;
      })
      .join("") || `<p class="empty">还没有落字。</p>`;
}

function renderDrafts() {
  els.draftList.innerHTML =
    state.drafts
      .map(
        (draft) => `
          <article class="draft-item">
            <strong>${escapeHtml(draft.title)}</strong>
            <span>${draft.placements.length}个落字 · ${new Date(draft.savedAt).toLocaleString("zh-CN")}</span>
            <div class="draft-actions">
              <button type="button" data-load-draft="${draft.id}">载入</button>
              <button type="button" data-delete-draft="${draft.id}">删除</button>
            </div>
          </article>
        `
      )
      .join("") || `<p class="empty">还没有保存草稿。</p>`;
}

let tlPlan = null;

function computeTextAllocation(text) {
  const usage = getUsage();
  const usedTypeIds = {};
  const charCount = {};
  for (const ch of text) {
    charCount[ch] = (charCount[ch] || 0) + 1;
  }

  const perCharAllocation = {};

  for (const ch of text) {
    const matchingTypes = state.inventory.filter((item) => item.char === ch);
    if (matchingTypes.length === 0) continue;

    const sorted = [...matchingTypes].sort((a, b) => {
      const availA = a.quantity - (usage[a.id] || 0) - (usedTypeIds[a.id] || 0);
      const availB = b.quantity - (usage[b.id] || 0) - (usedTypeIds[b.id] || 0);
      return availB - availA;
    });
    const best = sorted[0];
    const currentUsed = (usage[best.id] || 0) + (usedTypeIds[best.id] || 0);
    if (currentUsed >= best.quantity) continue;

    usedTypeIds[best.id] = (usedTypeIds[best.id] || 0) + 1;
    if (!perCharAllocation[ch]) perCharAllocation[ch] = [];
    const existing = perCharAllocation[ch].find((a) => a.typeId === best.id);
    if (existing) {
      existing.count += 1;
    } else {
      perCharAllocation[ch].push({ typeId: best.id, char: best.char, style: best.style, count: 1, available: best.quantity - (usage[best.id] || 0) });
    }
  }

  const results = [];
  for (const [ch, needed] of Object.entries(charCount)) {
    const matchingTypes = state.inventory.filter((item) => item.char === ch);
    if (matchingTypes.length === 0) {
      results.push({ char: ch, needed, status: "missing", allocations: [], totalAvailable: 0 });
      continue;
    }
    const totalAvailable = matchingTypes.reduce((sum, t) => sum + Math.max(0, t.quantity - (usage[t.id] || 0)), 0);
    const allocations = perCharAllocation[ch] || [];
    const allocatedCount = allocations.reduce((sum, a) => sum + a.count, 0);
    const status = allocatedCount >= needed ? "ok" : "low";
    results.push({ char: ch, needed, status, allocations, totalAvailable });
  }

  return { results, usedTypeIds };
}

function openTextLayoutModal() {
  els.textLayoutModal.hidden = false;
  els.tlText.value = "";
  els.tlAnalysis.hidden = true;
  els.tlAnalysisContent.innerHTML = "";
  els.tlConfirm.disabled = true;
  tlPlan = null;
  document.querySelector('input[name="tlDir"][value="horizontal"]').checked = true;
  els.tlText.focus();
}

function closeTextLayoutModal() {
  els.textLayoutModal.hidden = true;
  tlPlan = null;
}

function analyzeText() {
  const text = els.tlText.value.replace(/\s/g, "");
  if (!text) return;

  const { results } = computeTextAllocation(text);
  const direction = document.querySelector('input[name="tlDir"]:checked').value;

  tlPlan = { text, direction, results };

  const okCount = results.filter((r) => r.status === "ok").length;
  const lowCount = results.filter((r) => r.status === "low").length;
  const missingCount = results.filter((r) => r.status === "missing").length;

  let html = `<div class="tl-summary">`;
  if (okCount) html += `<span class="tl-summary-item"><span class="dot green"></span>充足 ${okCount}字</span>`;
  if (lowCount) html += `<span class="tl-summary-item"><span class="dot gold"></span>不足 ${lowCount}字</span>`;
  if (missingCount) html += `<span class="tl-summary-item"><span class="dot red"></span>缺失 ${missingCount}字</span>`;
  html += `</div>`;

  for (const r of results) {
    const statusClass = r.status === "ok" ? "status-ok" : r.status === "low" ? "status-low" : "status-missing";
    const tagClass = r.status === "ok" ? "ok" : r.status === "low" ? "low" : "missing";
    const tagText = r.status === "ok" ? "充足" : r.status === "low" ? "不足" : "缺失";

    let allocHtml = "";
    if (r.status === "missing") {
      allocHtml = `<span>字模库中无此字</span>`;
    } else {
      const allocatedCount = r.allocations.reduce((sum, a) => sum + a.count, 0);
      allocHtml = `<span class="tl-total">总可用 ${r.totalAvailable} / 需 ${r.needed}（将分配 ${allocatedCount}）</span>`;
      if (r.allocations.length > 0) {
        allocHtml += `<div class="tl-alloc-list">`;
        for (const alloc of r.allocations) {
          allocHtml += `<span class="tl-alloc-item">${escapeHtml(alloc.style)} · 分配${alloc.count}/${alloc.available}</span>`;
        }
        allocHtml += `</div>`;
      }
      if (allocatedCount < r.needed) {
        const short = r.needed - allocatedCount;
        allocHtml += `<span class="tl-short">仍缺 ${short} 枚</span>`;
      }
    }

    html += `
      <div class="tl-char-row ${statusClass}">
        <div class="tl-char-glyph">${escapeHtml(r.char)}</div>
        <div class="tl-char-info">
          <strong>${escapeHtml(r.char)}（需${r.needed}枚）</strong>
          ${allocHtml}
        </div>
        <span class="tl-status-tag ${tagClass}">${tagText}</span>
      </div>
    `;
  }

  els.tlAnalysisContent.innerHTML = html;
  els.tlAnalysis.hidden = false;
  els.tlConfirm.disabled = false;
}

function confirmTextLayout() {
  if (!tlPlan) return;

  const { text, direction } = tlPlan;
  const { cols, rows } = getGrid();
  const usage = getUsage();
  const occupied = new Set(state.placements.map((p) => placementKey(p.row, p.col)));

  const charAssign = [];
  const usedTypeIds = {};

  for (const ch of text) {
    const matchingTypes = state.inventory.filter((item) => item.char === ch);
    if (matchingTypes.length === 0) {
      charAssign.push(null);
      continue;
    }
    const sorted = [...matchingTypes].sort((a, b) => {
      const availA = a.quantity - (usage[a.id] || 0) - (usedTypeIds[a.id] || 0);
      const availB = b.quantity - (usage[b.id] || 0) - (usedTypeIds[b.id] || 0);
      return availB - availA;
    });
    const best = sorted[0];
    const currentUsed = (usage[best.id] || 0) + (usedTypeIds[best.id] || 0);
    if (currentUsed >= best.quantity) {
      charAssign.push(null);
      continue;
    }
    usedTypeIds[best.id] = (usedTypeIds[best.id] || 0) + 1;
    charAssign.push(best.id);
  }

  const emptyCells = [];
  if (direction === "horizontal") {
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        if (!occupied.has(placementKey(row, col))) {
          emptyCells.push({ row, col });
        }
      }
    }
  } else {
    for (let col = 0; col < cols; col += 1) {
      for (let row = 0; row < rows; row += 1) {
        if (!occupied.has(placementKey(row, col))) {
          emptyCells.push({ row, col });
        }
      }
    }
  }

  let cellIdx = 0;
  for (let i = 0; i < charAssign.length; i += 1) {
    if (charAssign[i] === null) continue;
    if (cellIdx >= emptyCells.length) break;
    const cell = emptyCells[cellIdx];
    state.placements.push({ row: cell.row, col: cell.col, typeId: charAssign[i] });
    cellIdx += 1;
  }

  closeTextLayoutModal();
  renderAll();
}

function renderAll() {
  saveState();
  renderSettings();
  renderStyleFilter();
  renderInventory();
  renderStage();
  renderUsage();
  renderDrafts();
}

function placeType(row, col, typeId = state.selectedTypeId) {
  if (!typeId) return;
  const existingIndex = state.placements.findIndex((item) => item.row === row && item.col === col);
  if (existingIndex >= 0) {
    if (state.placements[existingIndex].typeId === typeId) {
      state.placements.splice(existingIndex, 1);
    } else {
      state.placements[existingIndex].typeId = typeId;
    }
  } else {
    state.placements.push({ row, col, typeId });
  }
  renderAll();
}

function addType(event) {
  event.preventDefault();
  const item = {
    id: crypto.randomUUID(),
    char: els.charInput.value.trim(),
    style: els.styleInput.value.trim(),
    size: Number(els.sizeInput.value),
    quantity: Number(els.quantityInput.value),
    wear: els.wearInput.value
  };
  if (!item.char || !item.style) return;
  state.inventory.unshift(item);
  state.selectedTypeId = item.id;
  els.typeForm.reset();
  els.sizeInput.value = 24;
  els.quantityInput.value = 3;
  renderAll();
}

function saveDraft() {
  const title = state.settings.workTitle.trim() || "未命名作品";
  state.drafts.unshift({
    id: crypto.randomUUID(),
    title,
    settings: structuredClone(state.settings),
    placements: structuredClone(state.placements),
    savedAt: new Date().toISOString()
  });
  state.drafts = state.drafts.slice(0, 8);
  renderAll();
}

function exportPreview() {
  const { cols, rows } = getGrid();
  const cell = state.settings.paperSize === "bookmark" ? 44 : 56;
  const gap = state.settings.gridGap;
  const margin = 48;
  const width = cols * cell + (cols - 1) * gap + margin * 2;
  const height = rows * cell + (rows - 1) * gap + margin * 2 + 70;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fffaf1";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#2f2921";
  ctx.lineWidth = 4;
  ctx.strokeRect(18, 18, width - 36, height - 36);
  ctx.fillStyle = "#22201c";
  ctx.font = "bold 28px sans-serif";
  ctx.fillText(state.settings.workTitle || "未命名作品", margin, 50);
  ctx.font = "bold 30px serif";
  state.placements.forEach((placement) => {
    const type = state.inventory.find((item) => item.id === placement.typeId);
    if (!type) return;
    const x = margin + placement.col * (cell + gap);
    const y = margin + 45 + placement.row * (cell + gap);
    ctx.fillStyle = "#2f2921";
    ctx.fillRect(x, y, cell, cell);
    ctx.fillStyle = "#fff5df";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `900 ${Math.min(type.size + 8, 42)}px serif`;
    ctx.fillText(type.char, x + cell / 2, y + cell / 2);
  });
  const link = document.createElement("a");
  link.download = `${state.settings.workTitle || "movable-type"}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const VALID_WEAR = ["新", "微磨", "旧痕"];

function validateInventoryItem(item, index) {
  const errors = [];
  if (!item || typeof item !== "object") {
    errors.push(`第${index + 1}条：不是有效对象`);
    return { valid: false, errors };
  }
  if (typeof item.char !== "string" || item.char.trim() === "" || item.char.length > 2) {
    errors.push(`第${index + 1}条：字段「字」不能为空且不超过2个字符`);
  }
  if (typeof item.style !== "string" || item.style.trim() === "") {
    errors.push(`第${index + 1}条：字段「风格」不能为空`);
  }
  if (typeof item.size !== "number" || !Number.isInteger(item.size) || item.size < 8 || item.size > 72) {
    errors.push(`第${index + 1}条：字段「字号」必须是8-72之间的整数`);
  }
  if (typeof item.quantity !== "number" || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
    errors.push(`第${index + 1}条：字段「数量」必须是1-99之间的整数`);
  }
  if (typeof item.wear !== "string" || !VALID_WEAR.includes(item.wear)) {
    errors.push(`第${index + 1}条：字段「磨损状态」必须是「新」「微磨」「旧痕」之一`);
  }
  return { valid: errors.length === 0, errors };
}

function normalizeInventoryItem(item) {
  return {
    id: crypto.randomUUID(),
    char: item.char.trim(),
    style: item.style.trim(),
    size: Number(item.size),
    quantity: Number(item.quantity),
    wear: item.wear
  };
}

function itemSignature(item) {
  return `${item.char}|${item.style}|${item.size}|${item.quantity}|${item.wear}`;
}

function exportInventory() {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    count: state.inventory.length,
    inventory: state.inventory.map((item) => ({
      char: item.char,
      style: item.style,
      size: item.size,
      quantity: item.quantity,
      wear: item.wear
    }))
  };
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  link.download = `字模库_${stamp}.json`;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

let pendingImport = null;

function openImportModal() {
  els.importFileInput.value = "";
  els.importFileInput.click();
}

function handleImportFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      processImportData(parsed, file.name);
    } catch {
      alert("文件解析失败：不是有效的JSON格式");
    }
  };
  reader.onerror = () => {
    alert("文件读取失败");
  };
  reader.readAsText(file, "utf-8");
}

function processImportData(data, fileName) {
  const rawArray = Array.isArray(data) ? data : data?.inventory;
  if (!Array.isArray(rawArray)) {
    alert("JSON格式不正确：缺少字模数组");
    return;
  }

  const validItems = [];
  const allErrors = [];

  rawArray.forEach((item, idx) => {
    const result = validateInventoryItem(item, idx);
    if (result.valid) {
      validItems.push(normalizeInventoryItem(item));
    } else {
      allErrors.push(...result.errors);
    }
  });

  const currentSigs = new Set(state.inventory.map(itemSignature));
  const importSigs = new Set();
  let newUniqueCount = 0;
  let duplicateCount = 0;

  for (const item of validItems) {
    const sig = itemSignature(item);
    if (importSigs.has(sig)) {
      duplicateCount += 1;
      continue;
    }
    importSigs.add(sig);
    if (!currentSigs.has(sig)) {
      newUniqueCount += 1;
    } else {
      duplicateCount += 1;
    }
  }

  pendingImport = {
    validItems,
    allErrors,
    newUniqueCount,
    duplicateCount,
    fileName
  };

  renderImportModal();
  els.importModal.hidden = false;
}

function renderImportModal() {
  if (!pendingImport) return;
  const { validItems, allErrors, newUniqueCount, duplicateCount, fileName } = pendingImport;
  const mergeTotal = state.inventory.length + newUniqueCount;
  const uniqueSet = new Set(validItems.map(itemSignature));
  const overwriteTotal = uniqueSet.size;

  let summaryHtml = `<p>文件：<strong>${escapeHtml(fileName)}</strong></p>`;
  summaryHtml += `<div class="import-stats">`;
  summaryHtml += `<span class="stat-item"><strong>${validItems.length}</strong>有效条目</span>`;
  summaryHtml += `<span class="stat-item"><strong>${newUniqueCount}</strong>新增条目</span>`;
  summaryHtml += `<span class="stat-item"><strong>${duplicateCount}</strong>重复条目</span>`;
  if (allErrors.length > 0) {
    summaryHtml += `<span class="stat-item warn"><strong>${allErrors.length}</strong>校验错误</span>`;
  }
  summaryHtml += `</div>`;
  summaryHtml += `<p class="import-hint">当前字模库共 ${state.inventory.length} 枚</p>`;
  summaryHtml += `<p class="import-hint">合并后预计：${mergeTotal} 枚（覆盖模式：${overwriteTotal} 枚）</p>`;

  els.importSummary.innerHTML = summaryHtml;

  if (allErrors.length > 0) {
    els.importErrors.hidden = false;
    els.importErrors.innerHTML = `
      <h4>校验失败条目</h4>
      <ul>${allErrors.map((e) => `<li>${escapeHtml(e)}</li>`).join("")}</ul>
    `;
  } else {
    els.importErrors.hidden = true;
    els.importErrors.innerHTML = "";
  }

  const canImport = validItems.length > 0 && overwriteTotal > 0;
  els.importConfirm.disabled = !canImport;
}

function closeImportModal() {
  els.importModal.hidden = true;
  pendingImport = null;
}

function confirmImport() {
  if (!pendingImport) return;

  const mode = document.querySelector('input[name="importMode"]:checked').value;
  const { validItems } = pendingImport;

  const seen = new Set();
  const dedupedImport = [];
  for (const item of validItems) {
    const sig = itemSignature(item);
    if (!seen.has(sig)) {
      seen.add(sig);
      dedupedImport.push(item);
    }
  }

  if (mode === "overwrite") {
    state.inventory = dedupedImport;
    state.placements = [];
    state.selectedTypeId = state.inventory[0]?.id || null;
  } else {
    const currentSigs = new Set(state.inventory.map(itemSignature));
    for (const item of dedupedImport) {
      const sig = itemSignature(item);
      if (!currentSigs.has(sig)) {
        state.inventory.push(item);
        currentSigs.add(sig);
      }
    }
    if (!state.inventory.find((i) => i.id === state.selectedTypeId)) {
      state.selectedTypeId = state.inventory[0]?.id || null;
    }
  }

  closeImportModal();
  renderAll();
}

els.paperSize.addEventListener("change", () => {
  state.settings.paperSize = els.paperSize.value;
  const { cols, rows } = getGrid();
  state.placements = state.placements.filter((item) => item.row < rows && item.col < cols);
  renderAll();
});

els.flowMode.addEventListener("change", () => {
  state.settings.flowMode = els.flowMode.value;
  renderAll();
});

els.gridGap.addEventListener("input", () => {
  state.settings.gridGap = Number(els.gridGap.value);
  renderAll();
});

els.workTitle.addEventListener("input", () => {
  state.settings.workTitle = els.workTitle.value;
  saveState();
});

els.typeForm.addEventListener("submit", addType);
els.inventorySearch.addEventListener("input", renderInventory);
els.styleFilter.addEventListener("change", renderInventory);
els.saveDraftBtn.addEventListener("click", saveDraft);
els.exportBtn.addEventListener("click", exportPreview);
els.clearBoardBtn.addEventListener("click", () => {
  state.placements = [];
  renderAll();
});

els.textLayoutBtn.addEventListener("click", openTextLayoutModal);
els.tlClose.addEventListener("click", closeTextLayoutModal);
els.tlCancel.addEventListener("click", closeTextLayoutModal);
els.tlAnalyze.addEventListener("click", analyzeText);
els.tlConfirm.addEventListener("click", confirmTextLayout);

els.exportInventoryBtn.addEventListener("click", exportInventory);
els.importInventoryBtn.addEventListener("click", openImportModal);
els.importFileInput.addEventListener("change", handleImportFile);
els.importClose.addEventListener("click", closeImportModal);
els.importCancel.addEventListener("click", closeImportModal);
els.importConfirm.addEventListener("click", confirmImport);

els.textLayoutModal.addEventListener("click", (event) => {
  if (event.target === els.textLayoutModal) closeTextLayoutModal();
});

els.importModal.addEventListener("click", (event) => {
  if (event.target === els.importModal) closeImportModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !els.textLayoutModal.hidden) closeTextLayoutModal();
  if (event.key === "Escape" && !els.importModal.hidden) closeImportModal();
});

els.typeList.addEventListener("click", (event) => {
  const deleteButton = event.target.closest("[data-delete-type]");
  if (deleteButton) {
    const typeId = deleteButton.dataset.deleteType;
    state.inventory = state.inventory.filter((item) => item.id !== typeId);
    state.placements = state.placements.filter((item) => item.typeId !== typeId);
    if (state.selectedTypeId === typeId) state.selectedTypeId = state.inventory[0]?.id || null;
    renderAll();
    return;
  }
  const card = event.target.closest("[data-type-id]");
  if (!card) return;
  state.selectedTypeId = card.dataset.typeId;
  renderAll();
});

els.typeList.addEventListener("dragstart", (event) => {
  const card = event.target.closest("[data-type-id]");
  if (!card) return;
  event.dataTransfer.setData("text/plain", card.dataset.typeId);
});

els.stage.addEventListener("dragover", (event) => {
  if (event.target.closest(".cell")) event.preventDefault();
});

els.stage.addEventListener("drop", (event) => {
  const cell = event.target.closest(".cell");
  if (!cell) return;
  event.preventDefault();
  placeType(Number(cell.dataset.row), Number(cell.dataset.col), event.dataTransfer.getData("text/plain"));
});

els.stage.addEventListener("click", (event) => {
  const cell = event.target.closest(".cell");
  if (!cell) return;
  placeType(Number(cell.dataset.row), Number(cell.dataset.col));
});

els.draftList.addEventListener("click", (event) => {
  const loadButton = event.target.closest("[data-load-draft]");
  const deleteButton = event.target.closest("[data-delete-draft]");
  if (loadButton) {
    const draft = state.drafts.find((item) => item.id === loadButton.dataset.loadDraft);
    if (!draft) return;
    state.settings = structuredClone(draft.settings);
    state.placements = structuredClone(draft.placements);
    renderAll();
  }
  if (deleteButton) {
    state.drafts = state.drafts.filter((item) => item.id !== deleteButton.dataset.deleteDraft);
    renderAll();
  }
});

renderAll();
