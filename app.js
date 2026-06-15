const storageKey = "zfl16-movable-type-workshop";

const starterInventory = [
  { id: crypto.randomUUID(), char: "山", style: "宋体旧字", size: 30, quantity: 4, wear: "微磨" },
  { id: crypto.randomUUID(), char: "月", style: "宋体旧字", size: 30, quantity: 3, wear: "旧痕" },
  { id: crypto.randomUUID(), char: "风", style: "楷体木刻", size: 28, quantity: 2, wear: "微磨" },
  { id: crypto.randomUUID(), char: "花", style: "楷体木刻", size: 28, quantity: 2, wear: "新" },
  { id: crypto.randomUUID(), char: "茶", style: "黑体铅字", size: 24, quantity: 3, wear: "旧痕" },
  { id: crypto.randomUUID(), char: "雨", style: "仿宋细字", size: 22, quantity: 4, wear: "新" }
];

function createDefaultPage(name = "第1页") {
  return {
    id: crypto.randomUUID(),
    name,
    settings: {
      paperSize: "postcard",
      flowMode: "horizontal",
      gridGap: 8
    },
    placements: [],
    activeTemplateId: null
  };
}

const defaultState = {
  inventory: starterInventory,
  selectedTypeId: starterInventory[0].id,
  drafts: [],
  workTitle: "晚风小笺",
  currentPageId: null,
  pages: [],
  usageTab: "current"
};

let state = loadState();

const MAX_HISTORY = 50;
let historyStack = [];
let redoStack = [];
let isRestoringHistory = false;

function deepCloneState(s) {
  return {
    inventory: structuredClone(s.inventory),
    selectedTypeId: s.selectedTypeId,
    drafts: structuredClone(s.drafts),
    workTitle: s.workTitle,
    currentPageId: s.currentPageId,
    pages: structuredClone(s.pages),
    usageTab: s.usageTab
  };
}

function pushHistory() {
  if (isRestoringHistory) return;
  historyStack.push(deepCloneState(state));
  if (historyStack.length > MAX_HISTORY) {
    historyStack.shift();
  }
  redoStack = [];
  updateHistoryButtons();
}

function updateHistoryButtons() {
  els.undoBtn.disabled = historyStack.length === 0;
  els.redoBtn.disabled = redoStack.length === 0;
}

function undo() {
  if (historyStack.length === 0) return;
  redoStack.push(deepCloneState(state));
  state = historyStack.pop();
  isRestoringHistory = true;
  saveState();
  renderAll();
  isRestoringHistory = false;
  updateHistoryButtons();
}

function redo() {
  if (redoStack.length === 0) return;
  historyStack.push(deepCloneState(state));
  state = redoStack.pop();
  isRestoringHistory = true;
  saveState();
  renderAll();
  isRestoringHistory = false;
  updateHistoryButtons();
}

if (state.pages.length === 0) {
  const firstPage = createDefaultPage();
  state.pages.push(firstPage);
  state.currentPageId = firstPage.id;
  saveState();
}

function getCurrentPage() {
  return state.pages.find((p) => p.id === state.currentPageId) || state.pages[0];
}

function getPageById(id) {
  return state.pages.find((p) => p.id === id);
}

function getPageIndex(pageId) {
  return state.pages.findIndex((p) => p.id === pageId);
}

function getPageSettings() {
  return getCurrentPage().settings;
}

function getPagePlacements() {
  return getCurrentPage().placements;
}

function getPageTemplateId() {
  return getCurrentPage().activeTemplateId;
}

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
  importErrors: document.querySelector("#importErrors"),
  templateLibraryBtn: document.querySelector("#templateLibraryBtn"),
  templateLibraryModal: document.querySelector("#templateLibraryModal"),
  tlLibraryClose: document.querySelector("#tlLibraryClose"),
  tlLibraryCancel: document.querySelector("#tlLibraryCancel"),
  templateList: document.querySelector("#templateList"),
  activeTemplateLabel: document.querySelector("#activeTemplateLabel"),
  clearTemplateBtn: document.querySelector("#clearTemplateBtn"),
  pagesTabs: document.querySelector("#pagesTabs"),
  addPageBtn: document.querySelector("#addPageBtn"),
  duplicatePageBtn: document.querySelector("#duplicatePageBtn"),
  renamePageBtn: document.querySelector("#renamePageBtn"),
  deletePageBtn: document.querySelector("#deletePageBtn"),
  currentPageCount: document.querySelector("#currentPageCount"),
  totalCount: document.querySelector("#totalCount"),
  usageTabs: document.querySelector(".usage-tabs"),
  undoBtn: document.querySelector("#undoBtn"),
  redoBtn: document.querySelector("#redoBtn"),
  proofreadBtn: document.querySelector("#proofreadBtn"),
  proofreadRefreshBtn: document.querySelector("#proofreadRefreshBtn"),
  proofreadSummary: document.querySelector("#proofreadSummary"),
  proofreadIssues: document.querySelector("#proofreadIssues"),
  exportConfirmModal: document.querySelector("#exportConfirmModal"),
  exportConfirmClose: document.querySelector("#exportConfirmClose"),
  exportConfirmCancel: document.querySelector("#exportConfirmCancel"),
  exportConfirmOk: document.querySelector("#exportConfirmOk"),
  exportConfirmContent: document.querySelector("#exportConfirmContent"),
  panelTabs: document.querySelector(".panel-tabs")
};

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return structuredClone(defaultState);
  try {
    const parsed = JSON.parse(saved);
    const newState = { ...structuredClone(defaultState), ...parsed };

    if (!newState.pages || newState.pages.length === 0) {
      const migratedPage = createDefaultPage("第1页");
      if (parsed.settings) {
        migratedPage.settings = {
          paperSize: parsed.settings.paperSize || "postcard",
          flowMode: parsed.settings.flowMode || "horizontal",
          gridGap: parsed.settings.gridGap || 8
        };
        newState.workTitle = parsed.settings.workTitle || "晚风小笺";
      }
      if (parsed.placements) {
        migratedPage.placements = parsed.placements;
      }
      if (parsed.activeTemplateId !== undefined) {
        migratedPage.activeTemplateId = parsed.activeTemplateId;
      }
      newState.pages = [migratedPage];
      newState.currentPageId = migratedPage.id;
    }

    if (!newState.usageTab) {
      newState.usageTab = "current";
    }

    return newState;
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function getGrid(paperSize = getPageSettings().paperSize) {
  if (paperSize === "bookmark") return { cols: 7, rows: 18 };
  if (paperSize === "square") return { cols: 12, rows: 12 };
  return { cols: 16, rows: 10 };
}

function isTemplateCell(row, col, page = getCurrentPage()) {
  if (!page.activeTemplateId) return true;
  const positions = getTemplatePositions(page.activeTemplateId, page.settings.paperSize);
  return positions.some((p) => p.row === row && p.col === col);
}

function placementKey(row, col) {
  return `${row}:${col}`;
}

function getSelectedType() {
  return state.inventory.find((item) => item.id === state.selectedTypeId) || null;
}

function getUsage(placements = getPagePlacements()) {
  return placements.reduce((acc, placement) => {
    acc[placement.typeId] = (acc[placement.typeId] || 0) + 1;
    return acc;
  }, {});
}

function getTotalUsage() {
  const allPlacements = state.pages.flatMap((p) => p.placements);
  return getUsage(allPlacements);
}

function renderSettings() {
  const pageSettings = getPageSettings();
  els.paperSize.value = pageSettings.paperSize;
  els.flowMode.value = pageSettings.flowMode;
  els.gridGap.value = pageSettings.gridGap;
  els.workTitle.value = state.workTitle;
}

function renderPages() {
  els.pagesTabs.innerHTML = state.pages
    .map((page) => {
      const active = page.id === state.currentPageId ? "active" : "";
      return `
        <button class="page-tab ${active}" data-page-id="${page.id}" type="button">
          <span class="page-tab-name">${escapeHtml(page.name)}</span>
          <span class="page-tab-count">${page.placements.length}</span>
        </button>
      `;
    })
    .join("");
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
  const currentPage = getCurrentPage();
  const { cols, rows } = getGrid(currentPage.settings.paperSize);
  const map = new Map(currentPage.placements.map((item) => [placementKey(item.row, item.col), item]));
  const templatePositions = currentPage.activeTemplateId ? new Set(getTemplatePositions(currentPage.activeTemplateId, currentPage.settings.paperSize).map((p) => placementKey(p.row, p.col))) : null;
  els.stage.className = `stage ${currentPage.settings.paperSize}`;
  els.stage.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
  els.stage.style.gridTemplateRows = `repeat(${rows}, minmax(0, 1fr))`;
  els.stage.style.gap = `${currentPage.settings.gridGap}px`;
  const cells = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const key = placementKey(row, col);
      const placement = map.get(key);
      const type = placement ? state.inventory.find((item) => item.id === placement.typeId) : null;
      const vertical = currentPage.settings.flowMode === "vertical" ? "vertical" : "";
      const inTemplate = templatePositions?.has(key);
      const templateCellClass = templatePositions ? (inTemplate ? "template-cell" : "non-template-cell") : "";
      cells.push(`
        <button class="cell ${type ? "used" : ""} ${vertical} ${templateCellClass}" data-row="${row}" data-col="${col}" type="button" aria-label="第${row + 1}行第${col + 1}列">
          ${type ? escapeHtml(type.char) : ""}
        </button>
      `);
    }
  }
  els.stage.innerHTML = cells.join("");
}

function renderActiveTemplateLabel() {
  const templateId = getPageTemplateId();
  if (templateId) {
    const template = layoutTemplates.find((t) => t.id === templateId);
    els.activeTemplateLabel.textContent = template ? `当前模板：${template.name}` : "";
    els.clearTemplateBtn.hidden = false;
  } else {
    els.activeTemplateLabel.textContent = "";
    els.clearTemplateBtn.hidden = true;
  }
}

function openTemplateLibraryModal() {
  els.templateLibraryModal.hidden = false;
  renderTemplateList();
}

function closeTemplateLibraryModal() {
  els.templateLibraryModal.hidden = true;
}

function renderTemplateList() {
  const activeTemplateId = getPageTemplateId();
  els.templateList.innerHTML = layoutTemplates
    .map((template) => {
      const { cols, rows } = getGrid(template.recommended.paperSize);
      const positions = template.getPositions(cols, rows);
      const isActive = activeTemplateId === template.id;
      return `
        <article class="template-card ${isActive ? "active" : ""}" data-template-id="${template.id}">
          <div class="template-preview">
            ${renderTemplatePreview(template, cols, rows)}
          </div>
          <div class="template-info">
            <strong>${escapeHtml(template.name)}</strong>
            <span>${escapeHtml(template.description)}</span>
            <span class="template-meta">
              推荐：${template.recommended.paperSize === "postcard" ? "明信片" : template.recommended.paperSize === "bookmark" ? "书签" : "方形小笺"} · 
              ${template.recommended.flowMode === "horizontal" ? "横排" : "竖排"} · 
              网格${template.recommended.gridGap}px · 
              ${positions.length}个预留位
            </span>
          </div>
          <button class="primary apply-template-btn" type="button" data-apply-template="${template.id}">
            ${isActive ? "重新应用" : "应用模板"}
          </button>
        </article>
      `;
    })
    .join("");
}

function renderTemplatePreview(template, cols, rows) {
  const positions = new Set(template.getPositions(cols, rows).map((p) => placementKey(p.row, p.col)));
  let html = `<div class="template-preview-wrap" style="aspect-ratio: ${cols}/${rows};">`;
  html += `<div class="template-preview-grid" style="grid-template-columns: repeat(${cols}, 1fr); grid-template-rows: repeat(${rows}, 1fr); gap: 1px; width: 100%; height: 100%;">`;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const key = placementKey(r, c);
      const active = positions.has(key) ? "preview-active" : "";
      html += `<div class="preview-cell ${active}"></div>`;
    }
  }
  html += `</div></div>`;
  return html;
}

function applyTemplate(templateId) {
  const template = layoutTemplates.find((t) => t.id === templateId);
  if (!template) return;

  pushHistory();

  const currentPage = getCurrentPage();
  currentPage.activeTemplateId = templateId;
  currentPage.settings.paperSize = template.recommended.paperSize;
  currentPage.settings.flowMode = template.recommended.flowMode;
  currentPage.settings.gridGap = template.recommended.gridGap;
  currentPage.placements = [];

  const { cols, rows } = getGrid();
  currentPage.placements = currentPage.placements.filter((item) => item.row < rows && item.col < cols);

  closeTemplateLibraryModal();
  renderAll();
}

function clearTemplate() {
  pushHistory();
  getCurrentPage().activeTemplateId = null;
  renderAll();
}

function renderUsage() {
  const usage = state.usageTab === "current" ? getUsage() : getTotalUsage();
  const entries = state.inventory.filter((item) => usage[item.id]);
  const currentPage = getCurrentPage();

  const currentCount = currentPage.placements.length;
  const totalCount = state.pages.reduce((sum, p) => sum + p.placements.length, 0);
  els.currentPageCount.textContent = `${currentCount}个落字`;
  els.totalCount.textContent = `${totalCount}个落字`;

  const shortages = entries.filter((item) => usage[item.id] > item.quantity);
  els.shortageBadge.textContent = shortages.length ? `${shortages.length}处超量` : "数量充足";
  els.shortageBadge.className = `badge ${shortages.length ? "warn" : "ok"}`;

  const selectedType = getSelectedType();
  els.selectedTypeLabel.textContent = selectedType ? `当前：${selectedType.char} · ${selectedType.style}` : "未选择字模";

  document.querySelectorAll(".usage-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.usageTab === state.usageTab);
  });

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
        (draft) => {
          const totalPlacements = draft.pages ? draft.pages.reduce((sum, p) => sum + p.placements.length, 0) : (draft.placements?.length || 0);
          const pageCount = draft.pages ? draft.pages.length : 1;
          return `
          <article class="draft-item">
            <strong>${escapeHtml(draft.title)}</strong>
            <span>${pageCount}页 · ${totalPlacements}个落字 · ${new Date(draft.savedAt).toLocaleString("zh-CN")}</span>
            <div class="draft-actions">
              <button type="button" data-load-draft="${draft.id}">载入</button>
              <button type="button" data-delete-draft="${draft.id}">删除</button>
            </div>
          </article>
        `;
        }
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

  pushHistory();

  const currentPage = getCurrentPage();
  const { text, direction } = tlPlan;
  const { cols, rows } = getGrid(currentPage.settings.paperSize);
  const usage = getUsage();
  const occupied = new Set(currentPage.placements.map((p) => placementKey(p.row, p.col)));

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
        if (!occupied.has(placementKey(row, col)) && isTemplateCell(row, col, currentPage)) {
          emptyCells.push({ row, col });
        }
      }
    }
  } else {
    for (let col = 0; col < cols; col += 1) {
      for (let row = 0; row < rows; row += 1) {
        if (!occupied.has(placementKey(row, col)) && isTemplateCell(row, col, currentPage)) {
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
    currentPage.placements.push({ row: cell.row, col: cell.col, typeId: charAssign[i] });
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
  renderPages();
  renderStage();
  renderUsage();
  renderDrafts();
  renderActiveTemplateLabel();
  updateHistoryButtons();
  const proofreadTab = document.querySelector('.panel-tab[data-right-tab="proofread"]');
  if (proofreadTab && proofreadTab.classList.contains("active")) {
    renderProofread();
  }
}

function placeType(row, col, typeId = state.selectedTypeId) {
  if (!typeId) return;
  const placements = getPagePlacements();
  const existingIndex = placements.findIndex((item) => item.row === row && item.col === col);
  pushHistory();
  if (existingIndex >= 0) {
    if (placements[existingIndex].typeId === typeId) {
      placements.splice(existingIndex, 1);
    } else {
      placements[existingIndex].typeId = typeId;
    }
  } else {
    placements.push({ row, col, typeId });
  }
  renderAll();
}

function addPage() {
  pushHistory();
  const newIndex = state.pages.length + 1;
  const newPage = createDefaultPage(`第${newIndex}页`);
  state.pages.push(newPage);
  state.currentPageId = newPage.id;
  renderAll();
}

function duplicatePage() {
  pushHistory();
  const currentPage = getCurrentPage();
  const newIndex = state.pages.length + 1;
  const newPage = {
    id: crypto.randomUUID(),
    name: `${currentPage.name} 副本`,
    settings: { ...currentPage.settings },
    placements: [...currentPage.placements],
    activeTemplateId: currentPage.activeTemplateId
  };
  const currentIndex = getPageIndex(currentPage.id);
  state.pages.splice(currentIndex + 1, 0, newPage);
  state.currentPageId = newPage.id;
  renderAll();
}

function renamePage() {
  const currentPage = getCurrentPage();
  const newName = prompt("请输入新的页面名称：", currentPage.name);
  if (newName && newName.trim()) {
    pushHistory();
    currentPage.name = newName.trim();
    renderAll();
  }
}

function deletePage() {
  if (state.pages.length <= 1) {
    alert("至少需要保留一个页面！");
    return;
  }
  const currentPage = getCurrentPage();
  if (!confirm(`确定要删除页面「${currentPage.name}」吗？`)) return;

  pushHistory();
  const currentIndex = getPageIndex(currentPage.id);
  state.pages = state.pages.filter((p) => p.id !== currentPage.id);
  state.currentPageId = state.pages[Math.max(0, currentIndex - 1)].id;
  renderAll();
}

function switchPage(pageId) {
  if (state.currentPageId === pageId) return;
  state.currentPageId = pageId;
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
  pushHistory();
  state.inventory.unshift(item);
  state.selectedTypeId = item.id;
  els.typeForm.reset();
  els.sizeInput.value = 24;
  els.quantityInput.value = 3;
  renderAll();
}

function saveDraft() {
  const title = state.workTitle.trim() || "未命名作品";
  state.drafts.unshift({
    id: crypto.randomUUID(),
    title,
    workTitle: state.workTitle,
    pages: structuredClone(state.pages),
    savedAt: new Date().toISOString()
  });
  state.drafts = state.drafts.slice(0, 8);
  renderAll();
}

const exportSizeLimits = {
  minSide: 320,
  maxSide: 2400,
  maxPixels: 4000000
};

function getExportCanvasSize(page) {
  const { cols, rows } = getGrid(page.settings.paperSize);
  const cell = page.settings.paperSize === "bookmark" ? 44 : 56;
  const gap = Number(page.settings.gridGap);
  const margin = 48;
  const width = cols * cell + (cols - 1) * gap + margin * 2;
  const height = rows * cell + (rows - 1) * gap + margin * 2 + 70;
  return { width, height };
}

function renderPageToCanvas(page, title, pageIndex, totalPages) {
  const { cols } = getGrid(page.settings.paperSize);
  const cell = page.settings.paperSize === "bookmark" ? 44 : 56;
  const gap = page.settings.gridGap;
  const margin = 48;
  const { width, height } = getExportCanvasSize(page);
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
  const pageInfo = totalPages > 1 ? `（${pageIndex + 1}/${totalPages}）${page.name}` : "";
  ctx.fillText(`${title || "未命名作品"}${pageInfo}`, margin, 50);
  ctx.font = "bold 30px serif";
  page.placements.forEach((placement) => {
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
  return canvas;
}

let pendingExportMode = null;

function doExport(mode) {
  const totalPages = state.pages.length;
  const title = state.workTitle;

  if (mode === "all" && totalPages === 1) {
    mode = "current";
  }

  if (mode === "current") {
    const currentPage = getCurrentPage();
    const currentIndex = getPageIndex(currentPage.id);
    const canvas = renderPageToCanvas(currentPage, title, currentIndex, totalPages);
    const link = document.createElement("a");
    link.download = `${title || "movable-type"}_${currentPage.name}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    return;
  }

  state.pages.forEach((page, index) => {
    setTimeout(() => {
      const canvas = renderPageToCanvas(page, title, index, totalPages);
      const link = document.createElement("a");
      link.download = `${title || "movable-type"}_${page.name}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    }, index * 300);
  });
}

function exportPreview() {
  const issues = runProofread();
  if (hasSevereIssues(issues)) {
    openExportConfirm(issues);
    return;
  }

  const totalPages = state.pages.length;
  if (totalPages <= 1) {
    doExport("current");
    return;
  }

  if (!confirm(`当前作品集共 ${totalPages} 页，是否逐张导出所有页面？\n\n点击"确定"导出所有页面，点击"取消"仅导出当前页。`)) {
    doExport("current");
  } else {
    doExport("all");
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const layoutTemplates = [
  {
    id: "centered",
    name: "居中题签",
    description: "文字集中于中央区域，四周留白，适合题字落款",
    recommended: { paperSize: "postcard", flowMode: "horizontal", gridGap: 8 },
    getPositions: (cols, rows) => {
      const marginX = Math.floor(cols * 0.25);
      const marginY = Math.floor(rows * 0.25);
      const positions = [];
      for (let r = marginY; r < rows - marginY; r++) {
        for (let c = marginX; c < cols - marginX; c++) {
          positions.push({ row: r, col: c });
        }
      }
      return positions;
    }
  },
  {
    id: "topbottom",
    name: "上下留白",
    description: "上下留有空白，文字在中间区域，适合书签",
    recommended: { paperSize: "bookmark", flowMode: "vertical", gridGap: 6 },
    getPositions: (cols, rows) => {
      const marginY = Math.floor(rows * 0.2);
      const positions = [];
      for (let r = marginY; r < rows - marginY; r++) {
        for (let c = 0; c < cols; c++) {
          positions.push({ row: r, col: c });
        }
      }
      return positions;
    }
  },
  {
    id: "border",
    name: "边框题款",
    description: "文字沿边框排列，中间大面积留白，适合方形小笺",
    recommended: { paperSize: "square", flowMode: "horizontal", gridGap: 10 },
    getPositions: (cols, rows) => {
      const positions = [];
      for (let c = 0; c < cols; c++) {
        positions.push({ row: 0, col: c });
        positions.push({ row: rows - 1, col: c });
      }
      for (let r = 1; r < rows - 1; r++) {
        positions.push({ row: r, col: 0 });
        positions.push({ row: r, col: cols - 1 });
      }
      return positions;
    }
  },
  {
    id: "scattered",
    name: "疏密错落",
    description: "疏密交替，错落有致，适合诗句短文",
    recommended: { paperSize: "postcard", flowMode: "horizontal", gridGap: 8 },
    getPositions: (cols, rows) => {
      const positions = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if ((r + c) % 3 === 0 || (r % 2 === 0 && c % 2 === 0)) {
            positions.push({ row: r, col: c });
          }
        }
      }
      return positions;
    }
  }
];

function getTemplatePositions(templateId, paperSize) {
  const template = layoutTemplates.find((t) => t.id === templateId);
  if (!template) return [];
  const { cols, rows } = getGrid(paperSize);
  return template.getPositions(cols, rows);
}

let proofreadHighlightTimer = null;

function clearProofreadHighlights() {
  document.querySelectorAll(".cell.proofread-highlight, .cell.proofread-highlight-warning").forEach((cell) => {
    cell.classList.remove("proofread-highlight", "proofread-highlight-warning");
  });
  if (proofreadHighlightTimer) {
    clearTimeout(proofreadHighlightTimer);
    proofreadHighlightTimer = null;
  }
}

function highlightCells(cells, warning = false) {
  clearProofreadHighlights();
  const className = warning ? "proofread-highlight-warning" : "proofread-highlight";
  cells.forEach(({ row, col, pageId }) => {
    if (pageId && pageId !== state.currentPageId) {
      switchPage(pageId);
    }
    requestAnimationFrame(() => {
      const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
      if (cell) {
        cell.classList.add(className);
        cell.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      }
    });
  });
  proofreadHighlightTimer = setTimeout(clearProofreadHighlights, 4000);
}

function checkInventoryShortage() {
  const issues = [];
  const totalUsage = getTotalUsage();
  for (const typeId in totalUsage) {
    const item = state.inventory.find((i) => i.id === typeId);
    if (!item) continue;
    if (totalUsage[typeId] > item.quantity) {
      const locations = [];
      state.pages.forEach((page) => {
        page.placements
          .filter((p) => p.typeId === typeId)
          .forEach((p) => {
            locations.push({ row: p.row, col: p.col, pageId: page.id });
          });
      });
      issues.push({
        id: `shortage-${typeId}`,
        type: "error",
        title: `字模「${item.char}·${item.style}」超量`,
        desc: `当前共使用 ${totalUsage[typeId]} 枚，库存仅有 ${item.quantity} 枚，超出 ${totalUsage[typeId] - item.quantity} 枚。`,
        locations,
        locText: `涉及 ${locations.length} 格`
      });
    }
  }
  return issues;
}

function checkExcessiveBlanks() {
  const issues = [];
  state.pages.forEach((page) => {
    const { cols, rows } = getGrid(page.settings.paperSize);
    const totalCells = cols * rows;
    const usedCells = page.placements.length;
    if (totalCells === 0) return;
    const blankRatio = (totalCells - usedCells) / totalCells;
    if (usedCells > 0 && blankRatio > 0.85) {
      issues.push({
        id: `blank-${page.id}`,
        type: "warning",
        title: `页面「${page.name}」空白过多`,
        desc: `版面共 ${totalCells} 格，仅落字 ${usedCells} 格，空白比例约 ${Math.round(blankRatio * 100)}%。`,
        locations: [{ row: 0, col: 0, pageId: page.id }],
        locText: `${page.name} · 建议增加内容`
      });
    }
  });
  return issues;
}

function checkConsecutiveDuplicates() {
  const issues = [];
  state.pages.forEach((page) => {
    const { cols, rows } = getGrid(page.settings.paperSize);
    const map = new Map(page.placements.map((p) => [placementKey(p.row, p.col), p]));

    for (let row = 0; row < rows; row++) {
      let prevChar = null;
      let prevTypeId = null;
      let startCol = -1;
      let streak = 0;
      for (let col = 0; col < cols; col++) {
        const p = map.get(placementKey(row, col));
        const type = p ? state.inventory.find((i) => i.id === p.typeId) : null;
        const curChar = type ? type.char : null;
        const curTypeId = p ? p.typeId : null;
        if (curChar && curChar === prevChar && curTypeId === prevTypeId) {
          streak++;
        } else {
          if (streak >= 3) {
            const locations = [];
            for (let c = startCol; c < col; c++) {
              locations.push({ row, col: c, pageId: page.id });
            }
            issues.push({
              id: `dup-h-${page.id}-${row}-${startCol}`,
              type: "warning",
              title: `「${prevChar}」横向连续重复`,
              desc: `第 ${row + 1} 行第 ${startCol + 1} 列起，「${prevChar}」连续出现 ${streak} 次（同一款式）。`,
              locations,
              locText: `${page.name} · 第${row + 1}行`
            });
          }
          streak = curChar ? 1 : 0;
          startCol = col;
          prevChar = curChar;
          prevTypeId = curTypeId;
        }
      }
      if (streak >= 3) {
        const locations = [];
        for (let c = startCol; c < cols; c++) {
          locations.push({ row, col: c, pageId: page.id });
        }
        issues.push({
          id: `dup-h-${page.id}-${row}-${startCol}`,
          type: "warning",
          title: `「${prevChar}」横向连续重复`,
          desc: `第 ${row + 1} 行第 ${startCol + 1} 列起，「${prevChar}」连续出现 ${streak} 次（同一款式）。`,
          locations,
          locText: `${page.name} · 第${row + 1}行`
        });
      }
    }

    for (let col = 0; col < cols; col++) {
      let prevChar = null;
      let prevTypeId = null;
      let startRow = -1;
      let streak = 0;
      for (let row = 0; row < rows; row++) {
        const p = map.get(placementKey(row, col));
        const type = p ? state.inventory.find((i) => i.id === p.typeId) : null;
        const curChar = type ? type.char : null;
        const curTypeId = p ? p.typeId : null;
        if (curChar && curChar === prevChar && curTypeId === prevTypeId) {
          streak++;
        } else {
          if (streak >= 3) {
            const locations = [];
            for (let r = startRow; r < row; r++) {
              locations.push({ row: r, col, pageId: page.id });
            }
            issues.push({
              id: `dup-v-${page.id}-${col}-${startRow}`,
              type: "warning",
              title: `「${prevChar}」纵向连续重复`,
              desc: `第 ${col + 1} 列第 ${startRow + 1} 行起，「${prevChar}」连续出现 ${streak} 次（同一款式）。`,
              locations,
              locText: `${page.name} · 第${col + 1}列`
            });
          }
          streak = curChar ? 1 : 0;
          startRow = row;
          prevChar = curChar;
          prevTypeId = curTypeId;
        }
      }
      if (streak >= 3) {
        const locations = [];
        for (let r = startRow; r < rows; r++) {
          locations.push({ row: r, col, pageId: page.id });
        }
        issues.push({
          id: `dup-v-${page.id}-${col}-${startRow}`,
          type: "warning",
          title: `「${prevChar}」纵向连续重复`,
          desc: `第 ${col + 1} 列第 ${startRow + 1} 行起，「${prevChar}」连续出现 ${streak} 次（同一款式）。`,
          locations,
          locText: `${page.name} · 第${col + 1}列`
        });
      }
    }
  });
  return issues;
}

function checkEdgeDensity() {
  const issues = [];
  state.pages.forEach((page) => {
    const { cols, rows } = getGrid(page.settings.paperSize);
    const edgeCells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
          edgeCells.push({ row: r, col: c });
        }
      }
    }
    const edgeUsed = page.placements.filter((p) =>
      edgeCells.some((e) => e.row === p.row && e.col === p.col)
    ).length;
    const totalUsed = page.placements.length;
    if (totalUsed > 0 && edgeUsed >= Math.max(3, Math.ceil(totalUsed * 0.6))) {
      const locations = edgeCells
        .filter((e) => page.placements.some((p) => p.row === e.row && p.col === e.col))
        .map((e) => ({ row: e.row, col: e.col, pageId: page.id }));
      issues.push({
        id: `edge-${page.id}`,
        type: "warning",
        title: `页面「${page.name}」边缘落字过密`,
        desc: `边缘格子共落字 ${edgeUsed} 个，占总落字 ${totalUsed} 个的 ${Math.round((edgeUsed / totalUsed) * 100)}%，视觉上可能显得拥挤。`,
        locations,
        locText: `${page.name} · 边缘区域`
      });
    }
  });
  return issues;
}

function checkEmptyTitle() {
  const issues = [];
  if (!state.workTitle || state.workTitle.trim() === "") {
    issues.push({
      id: "empty-title",
      type: "error",
      title: "作品名为空",
      desc: "当前作品名未填写，导出图片将使用默认文件名。",
      focusElement: "workTitle",
      locText: "顶部设置栏 · 作品名"
    });
  }
  return issues;
}

function checkExportSize() {
  const issues = [];
  state.pages.forEach((page) => {
    const usedCount = page.placements.length;
    const { width, height } = getExportCanvasSize(page);
    const totalPixels = width * height;
    const invalidSize = !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0;
    const sideOutOfRange = width < exportSizeLimits.minSide || height < exportSizeLimits.minSide || width > exportSizeLimits.maxSide || height > exportSizeLimits.maxSide;
    const pixelsOutOfRange = totalPixels > exportSizeLimits.maxPixels;

    if (usedCount === 0) {
      issues.push({
        id: `empty-page-${page.id}`,
        type: "error",
        title: `页面「${page.name}」无内容`,
        desc: `该页面未落任何字，导出后为空白页面。`,
        locations: [{ row: 0, col: 0, pageId: page.id }],
        locText: `${page.name} · 请添加内容`
      });
    }
    if (invalidSize || sideOutOfRange || pixelsOutOfRange) {
      const sizeText = invalidSize ? "无法计算" : `${Math.round(width)} × ${Math.round(height)}px`;
      issues.push({
        id: `export-size-${page.id}`,
        type: "error",
        title: `页面「${page.name}」导出尺寸异常`,
        desc: `当前导出尺寸为 ${sizeText}，允许范围为单边 ${exportSizeLimits.minSide}-${exportSizeLimits.maxSide}px 且总像素不超过 ${Math.round(exportSizeLimits.maxPixels / 10000)} 万。`,
        focusElement: invalidSize ? "paperSize" : "gridGap",
        locText: invalidSize ? `${page.name} · 纸张设置` : `${page.name} · 导出尺寸 ${sizeText}`
      });
    }
    if (page.settings.gridGap >= 16 && usedCount > 5) {
      issues.push({
        id: `large-gap-${page.id}`,
        type: "warning",
        title: `页面「${page.name}」网格间距过大`,
        desc: `当前网格间距 ${page.settings.gridGap}px，落字较多时字距过大，可能影响整体观感。`,
        focusElement: "gridGap",
        locText: `${page.name} · 网格间距 ${page.settings.gridGap}px`
      });
    }
  });
  return issues;
}

function runProofread() {
  return [
    ...checkInventoryShortage(),
    ...checkExcessiveBlanks(),
    ...checkConsecutiveDuplicates(),
    ...checkEdgeDensity(),
    ...checkEmptyTitle(),
    ...checkExportSize()
  ];
}

function hasSevereIssues(issues) {
  return issues.some((i) => i.type === "error");
}

function renderProofread() {
  const issues = runProofread();
  const errorCount = issues.filter((i) => i.type === "error").length;
  const warningCount = issues.filter((i) => i.type === "warning").length;

  const errorClass = errorCount > 0 ? "error" : "ok";
  const warningClass = warningCount > 0 ? "warning" : "ok";

  els.proofreadSummary.innerHTML = `
    <div class="proofread-summary-item ${errorClass}">
      <span class="label">严重问题</span>
      <span class="value">${errorCount} 项</span>
    </div>
    <div class="proofread-summary-item ${warningClass}">
      <span class="label">提示警告</span>
      <span class="value">${warningCount} 项</span>
    </div>
  `;

  if (issues.length === 0) {
    els.proofreadIssues.innerHTML = `
      <div class="proofread-empty">
        <div class="proofread-empty-icon">✓</div>
        <div class="proofread-empty-text">排版校对通过</div>
        <div class="proofread-empty-hint">未发现异常问题，可以放心导出</div>
      </div>
    `;
  } else {
    els.proofreadIssues.innerHTML = issues
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "error" ? -1 : 1;
        return 0;
      })
      .map(
        (issue) => `
      <article class="proofread-issue ${issue.type}" data-proofread-id="${issue.id}">
        <div class="proofread-issue-head">
          <span class="proofread-issue-title">${escapeHtml(issue.title)}</span>
          <span class="proofread-issue-tag ${issue.type}">${issue.type === "error" ? "严重" : "提示"}</span>
        </div>
        <div class="proofread-issue-desc">${escapeHtml(issue.desc)}</div>
        <span class="proofread-issue-loc">📍 ${escapeHtml(issue.locText)}</span>
      </article>
    `
      )
      .join("");
  }

  return issues;
}

let exportProofreadResult = null;

function openExportConfirm(issues) {
  exportProofreadResult = issues;
  const errorCount = issues.filter((i) => i.type === "error").length;
  const warningCount = issues.filter((i) => i.type === "warning").length;

  let issuesHtml = "";
  if (issues.length > 0) {
    issuesHtml = `
      <div class="export-confirm-issues">
        ${issues
          .sort((a, b) => (a.type !== b.type ? (a.type === "error" ? -1 : 1) : 0))
          .slice(0, 8)
          .map(
            (issue) => `
          <div class="export-confirm-issue ${issue.type}">
            <div>
              <div class="export-confirm-issue-title">${escapeHtml(issue.title)}</div>
              <div class="export-confirm-issue-desc">${escapeHtml(issue.desc)}</div>
            </div>
          </div>
        `
          )
          .join("")}
        ${issues.length > 8 ? `<div class="export-confirm-issue-desc" style="padding:4px 10px;">还有 ${issues.length - 8} 项问题，请前往排版校对中心查看详情。</div>` : ""}
      </div>
    `;
  }

  els.exportConfirmContent.innerHTML = `
    <div class="export-confirm-alert">
      <strong>⚠ 发现 ${errorCount} 项严重问题，${warningCount} 项提示警告</strong>
      <p>导出前建议先修复以上问题。若确认无误，可点击「继续导出」。</p>
    </div>
    ${issuesHtml}
  `;

  els.exportConfirmModal.hidden = false;
}

function closeExportConfirm() {
  els.exportConfirmModal.hidden = true;
  exportProofreadResult = null;
}

function switchRightTab(tabName) {
  document.querySelectorAll(".panel-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.rightTab === tabName);
  });
  document.querySelectorAll("[data-right-tab-content]").forEach((content) => {
    content.hidden = content.dataset.rightTabContent !== tabName;
  });
  if (tabName === "proofread") {
    renderProofread();
  }
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

  pushHistory();

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
    state.pages.forEach((page) => {
      page.placements = [];
    });
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
  const currentPage = getCurrentPage();
  const { cols, rows } = getGrid(els.paperSize.value);
  const willCrop = currentPage.placements.some((item) => item.row >= rows || item.col >= cols);
  if (willCrop || currentPage.settings.paperSize !== els.paperSize.value) {
    pushHistory();
  }
  currentPage.settings.paperSize = els.paperSize.value;
  currentPage.placements = currentPage.placements.filter((item) => item.row < rows && item.col < cols);
  renderAll();
});

els.flowMode.addEventListener("change", () => {
  pushHistory();
  getCurrentPage().settings.flowMode = els.flowMode.value;
  renderAll();
});

let gridGapTimer = null;
els.gridGap.addEventListener("input", () => {
  if (gridGapTimer) clearTimeout(gridGapTimer);
  gridGapTimer = setTimeout(() => {
    pushHistory();
    getCurrentPage().settings.gridGap = Number(els.gridGap.value);
    renderAll();
  }, 300);
});

els.workTitle.addEventListener("input", () => {
  state.workTitle = els.workTitle.value;
  saveState();
});

els.typeForm.addEventListener("submit", addType);
els.inventorySearch.addEventListener("input", renderInventory);
els.styleFilter.addEventListener("change", renderInventory);
els.saveDraftBtn.addEventListener("click", saveDraft);
els.exportBtn.addEventListener("click", exportPreview);
els.clearBoardBtn.addEventListener("click", () => {
  if (getCurrentPage().placements.length === 0) return;
  pushHistory();
  getCurrentPage().placements = [];
  renderAll();
});

els.addPageBtn.addEventListener("click", addPage);
els.duplicatePageBtn.addEventListener("click", duplicatePage);
els.renamePageBtn.addEventListener("click", renamePage);
els.deletePageBtn.addEventListener("click", deletePage);

els.pagesTabs.addEventListener("click", (event) => {
  const tab = event.target.closest("[data-page-id]");
  if (tab) {
    switchPage(tab.dataset.pageId);
  }
});

els.usageTabs.addEventListener("click", (event) => {
  const tab = event.target.closest("[data-usage-tab]");
  if (tab) {
    state.usageTab = tab.dataset.usageTab;
    renderUsage();
    saveState();
  }
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

els.templateLibraryBtn.addEventListener("click", openTemplateLibraryModal);
els.tlLibraryClose.addEventListener("click", closeTemplateLibraryModal);
els.tlLibraryCancel.addEventListener("click", closeTemplateLibraryModal);
els.clearTemplateBtn.addEventListener("click", clearTemplate);

els.templateList.addEventListener("click", (event) => {
  const applyButton = event.target.closest("[data-apply-template]");
  if (applyButton) {
    applyTemplate(applyButton.dataset.applyTemplate);
  }
});

els.textLayoutModal.addEventListener("click", (event) => {
  if (event.target === els.textLayoutModal) closeTextLayoutModal();
});

els.templateLibraryModal.addEventListener("click", (event) => {
  if (event.target === els.templateLibraryModal) closeTemplateLibraryModal();
});

els.importModal.addEventListener("click", (event) => {
  if (event.target === els.importModal) closeImportModal();
});

els.undoBtn.addEventListener("click", undo);
els.redoBtn.addEventListener("click", redo);

document.addEventListener("keydown", (event) => {
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const modKey = isMac ? event.metaKey : event.ctrlKey;

  if (modKey && !event.shiftKey && event.key.toLowerCase() === "z") {
    event.preventDefault();
    undo();
    return;
  }

  if ((modKey && event.shiftKey && event.key.toLowerCase() === "z") || (modKey && event.key.toLowerCase() === "y")) {
    event.preventDefault();
    redo();
    return;
  }

  if (event.key === "Escape" && !els.textLayoutModal.hidden) closeTextLayoutModal();
  if (event.key === "Escape" && !els.importModal.hidden) closeImportModal();
  if (event.key === "Escape" && !els.templateLibraryModal.hidden) closeTemplateLibraryModal();
  if (event.key === "Escape" && !els.exportConfirmModal.hidden) closeExportConfirm();
});

els.proofreadBtn.addEventListener("click", () => {
  switchRightTab("proofread");
});

els.proofreadRefreshBtn.addEventListener("click", () => {
  renderProofread();
});

els.panelTabs.addEventListener("click", (event) => {
  const tab = event.target.closest("[data-right-tab]");
  if (tab) {
    switchRightTab(tab.dataset.rightTab);
  }
});

els.proofreadIssues.addEventListener("click", (event) => {
  const issueEl = event.target.closest("[data-proofread-id]");
  if (!issueEl) return;
  const issueId = issueEl.dataset.proofreadId;
  const issues = runProofread();
  const issue = issues.find((i) => i.id === issueId);
  if (!issue) return;
  if (issue.focusElement) {
    const target = document.getElementById(issue.focusElement);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.style.transition = "box-shadow 0.3s";
      target.style.boxShadow = "0 0 0 3px rgba(166, 64, 55, 0.3)";
      setTimeout(() => {
        target.style.boxShadow = "";
      }, 2000);
    }
  }
  if (issue.locations && issue.locations.length > 0) {
    highlightCells(issue.locations, issue.type === "warning");
  }
});

els.exportConfirmClose.addEventListener("click", closeExportConfirm);
els.exportConfirmCancel.addEventListener("click", closeExportConfirm);
els.exportConfirmOk.addEventListener("click", () => {
  closeExportConfirm();
  const totalPages = state.pages.length;
  if (totalPages <= 1) {
    doExport("current");
    return;
  }
  if (!confirm(`当前作品集共 ${totalPages} 页，是否逐张导出所有页面？\n\n点击"确定"导出所有页面，点击"取消"仅导出当前页。`)) {
    doExport("current");
  } else {
    doExport("all");
  }
});

els.exportConfirmModal.addEventListener("click", (event) => {
  if (event.target === els.exportConfirmModal) closeExportConfirm();
});

els.typeList.addEventListener("click", (event) => {
  const deleteButton = event.target.closest("[data-delete-type]");
  if (deleteButton) {
    const typeId = deleteButton.dataset.deleteType;
    pushHistory();
    state.inventory = state.inventory.filter((item) => item.id !== typeId);
    state.pages.forEach((page) => {
      page.placements = page.placements.filter((item) => item.typeId !== typeId);
    });
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

    pushHistory();

    if (draft.pages && draft.pages.length > 0) {
      state.pages = structuredClone(draft.pages);
      state.currentPageId = state.pages[0].id;
    } else {
      const migratedPage = createDefaultPage("第1页");
      if (draft.settings) {
        migratedPage.settings = {
          paperSize: draft.settings.paperSize || "postcard",
          flowMode: draft.settings.flowMode || "horizontal",
          gridGap: draft.settings.gridGap || 8
        };
      }
      if (draft.placements) {
        migratedPage.placements = draft.placements;
      }
      state.pages = [migratedPage];
      state.currentPageId = migratedPage.id;
    }

    if (draft.workTitle) {
      state.workTitle = draft.workTitle;
    } else if (draft.settings?.workTitle) {
      state.workTitle = draft.settings.workTitle;
    }

    renderAll();
  }
  if (deleteButton) {
    state.drafts = state.drafts.filter((item) => item.id !== deleteButton.dataset.deleteDraft);
    renderAll();
  }
});

renderAll();
