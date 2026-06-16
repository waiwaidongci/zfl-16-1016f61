const storageKey = "zfl16-movable-type-workshop";
const archiveStorageKey = "zfl16-movable-type-archive";
const archiveMetaKey = "zfl16-movable-type-archive-meta";

const archiveStore = {
  works: {},
  currentWorkId: null,
  currentView: "editor",
  searchQuery: "",
  filterMode: "active"
};

function createWorkMetadata(name) {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    name: name || "未命名作品",
    createdAt: now,
    updatedAt: now,
    archived: false
  };
}

function createDefaultWorkState() {
  const firstPage = createDefaultPage("第1页");
  return {
    inventory: structuredClone(starterInventory),
    selectedTypeId: starterInventory[0].id,
    drafts: [],
    workTitle: "晚风小笺",
    currentPageId: firstPage.id,
    pages: [firstPage],
    usageTab: "current",
    exportSettings: {
      paperColor: "#fffaf1",
      inkDepth: 70,
      showBorder: true,
      showInnerGrid: false
    }
  };
}

function saveArchiveMeta() {
  const meta = {
    currentWorkId: archiveStore.currentWorkId,
    version: 1
  };
  localStorage.setItem(archiveMetaKey, JSON.stringify(meta));
}

function loadArchiveMeta() {
  const saved = localStorage.getItem(archiveMetaKey);
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

function saveWorkToArchive(workId, workState) {
  if (!workId) return;
  const meta = archiveStore.works[workId];
  if (meta) {
    meta.updatedAt = Date.now();
    if (workState.workTitle && workState.workTitle.trim()) {
      meta.name = workState.workTitle;
    }
  }
  localStorage.setItem(`${archiveStorageKey}-${workId}`, JSON.stringify(workState));
  localStorage.setItem(archiveStorageKey, JSON.stringify({ works: archiveStore.works }));
}

function loadWorkFromArchive(workId) {
  const saved = localStorage.getItem(`${archiveStorageKey}-${workId}`);
  if (!saved) return null;
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
    if (!newState.usageTab) newState.usageTab = "current";
    if (!newState.exportSettings) {
      newState.exportSettings = {
        paperColor: "#fffaf1",
        inkDepth: 70,
        showBorder: true,
        showInnerGrid: false
      };
    }
    return newState;
  } catch {
    return null;
  }
}

function deleteWorkFromArchive(workId) {
  delete archiveStore.works[workId];
  localStorage.removeItem(`${archiveStorageKey}-${workId}`);
  localStorage.setItem(archiveStorageKey, JSON.stringify({ works: archiveStore.works }));
  if (archiveStore.currentWorkId === workId) {
    archiveStore.currentWorkId = null;
    saveArchiveMeta();
  }
}

function loadArchiveWorksIndex() {
  const saved = localStorage.getItem(archiveStorageKey);
  if (!saved) return {};
  try {
    const parsed = JSON.parse(saved);
    return parsed.works || {};
  } catch {
    return {};
  }
}

function migrateLegacyDataIfNeeded() {
  const legacyData = localStorage.getItem(storageKey);
  const archiveExists = localStorage.getItem(archiveStorageKey);
  
  if (!legacyData) return false;
  if (archiveExists) return false;

  let workState;
  try {
    const parsed = JSON.parse(legacyData);
    workState = { ...structuredClone(defaultState), ...parsed };
    if (!workState.pages || workState.pages.length === 0) {
      const migratedPage = createDefaultPage("第1页");
      if (parsed.settings) {
        migratedPage.settings = {
          paperSize: parsed.settings.paperSize || "postcard",
          flowMode: parsed.settings.flowMode || "horizontal",
          gridGap: parsed.settings.gridGap || 8
        };
        workState.workTitle = parsed.settings.workTitle || "晚风小笺";
      }
      if (parsed.placements) {
        migratedPage.placements = parsed.placements;
      }
      if (parsed.activeTemplateId !== undefined) {
        migratedPage.activeTemplateId = parsed.activeTemplateId;
      }
      workState.pages = [migratedPage];
      workState.currentPageId = migratedPage.id;
    }
    if (!workState.usageTab) workState.usageTab = "current";
    if (!workState.exportSettings) {
      workState.exportSettings = {
        paperColor: "#fffaf1",
        inkDepth: 70,
        showBorder: true,
        showInnerGrid: false
      };
    }
  } catch {
    return false;
  }

  const workName = (workState.workTitle && workState.workTitle.trim()) ? workState.workTitle : "我的作品";
  const metadata = createWorkMetadata(workName);
  const workId = metadata.id;

  archiveStore.works[workId] = metadata;
  archiveStore.currentWorkId = workId;

  localStorage.setItem(`${archiveStorageKey}-${workId}`, JSON.stringify(workState));
  localStorage.setItem(archiveStorageKey, JSON.stringify({ works: archiveStore.works }));
  saveArchiveMeta();

  return true;
}

function initializeArchive() {
  archiveStore.works = loadArchiveWorksIndex();
  const meta = loadArchiveMeta();

  const migrated = migrateLegacyDataIfNeeded();

  if (Object.keys(archiveStore.works).length === 0) {
    const defaultStateWork = createDefaultWorkState();
    const metadata = createWorkMetadata(defaultStateWork.workTitle);
    const workId = metadata.id;
    archiveStore.works[workId] = metadata;
    archiveStore.currentWorkId = workId;
    localStorage.setItem(`${archiveStorageKey}-${workId}`, JSON.stringify(defaultStateWork));
    localStorage.setItem(archiveStorageKey, JSON.stringify({ works: archiveStore.works }));
    saveArchiveMeta();
    return defaultStateWork;
  }

  let workId = meta?.currentWorkId;
  if (!workId || !archiveStore.works[workId]) {
    const nonArchived = Object.values(archiveStore.works).find(w => !w.archived);
    workId = nonArchived ? nonArchived.id : Object.keys(archiveStore.works)[0];
    archiveStore.currentWorkId = workId;
    saveArchiveMeta();
  }

  return loadWorkFromArchive(archiveStore.currentWorkId) || createDefaultWorkState();
}

function saveCurrentWork() {
  if (!archiveStore.currentWorkId) return;
  saveWorkToArchive(archiveStore.currentWorkId, state);
}

function switchToWork(workId) {
  if (!archiveStore.works[workId]) return;
  saveCurrentWork();
  archiveStore.currentWorkId = workId;
  saveArchiveMeta();
  const loaded = loadWorkFromArchive(workId);
  if (loaded) {
    state = loaded;
    historyStack = [];
    redoStack = [];
    if (state.pages.length === 0) {
      const firstPage = createDefaultPage();
      state.pages.push(firstPage);
      state.currentPageId = firstPage.id;
    }
    saveState();
    renderAll();
  }
  switchView("editor");
}

function createNewWork(name) {
  const newState = createDefaultWorkState();
  if (name && name.trim()) {
    newState.workTitle = name.trim();
  }
  const metadata = createWorkMetadata(newState.workTitle);
  const workId = metadata.id;
  archiveStore.works[workId] = metadata;
  localStorage.setItem(`${archiveStorageKey}-${workId}`, JSON.stringify(newState));
  localStorage.setItem(archiveStorageKey, JSON.stringify({ works: archiveStore.works }));
  switchToWork(workId);
}

function duplicateWork(workId) {
  const sourceMeta = archiveStore.works[workId];
  if (!sourceMeta) return;
  const sourceState = loadWorkFromArchive(workId);
  if (!sourceState) return;

  const newState = structuredClone(sourceState);

  const typeIdMap = new Map();
  const remapPlacements = (placements = []) => placements.map(p => {
    const newPlacement = { ...p };
    if (typeIdMap.has(newPlacement.typeId)) {
      newPlacement.typeId = typeIdMap.get(newPlacement.typeId);
    }
    return newPlacement;
  });

  newState.inventory = newState.inventory.map(item => {
    const newItem = { ...item, id: crypto.randomUUID() };
    typeIdMap.set(item.id, newItem.id);
    return newItem;
  });
  if (newState.inventory.length > 0) {
    newState.selectedTypeId = newState.inventory[0].id;
  }

  newState.pages.forEach(page => {
    page.id = crypto.randomUUID();
    page.placements = remapPlacements(page.placements);
  });
  if (newState.pages.length > 0) {
    newState.currentPageId = newState.pages[0].id;
  }

  newState.drafts = (newState.drafts || []).map(d => {
    const newDraft = { ...d, id: crypto.randomUUID() };
    if (newDraft.pages) {
      newDraft.pages = newDraft.pages.map(p => {
        const newPage = { ...p, id: crypto.randomUUID() };
        if (newPage.placements) {
          newPage.placements = remapPlacements(newPage.placements);
        }
        return newPage;
      });
    }
    if (newDraft.placements) {
      newDraft.placements = remapPlacements(newDraft.placements);
    }
    return newDraft;
  });

  const copyName = `${sourceMeta.name} (副本)`;
  newState.workTitle = copyName;
  const metadata = createWorkMetadata(copyName);
  const newWorkId = metadata.id;
  archiveStore.works[newWorkId] = metadata;
  localStorage.setItem(`${archiveStorageKey}-${newWorkId}`, JSON.stringify(newState));
  localStorage.setItem(archiveStorageKey, JSON.stringify({ works: archiveStore.works }));
  renderArchiveView();
}

function toggleArchiveWork(workId) {
  const meta = archiveStore.works[workId];
  if (!meta) return;
  meta.archived = !meta.archived;
  localStorage.setItem(archiveStorageKey, JSON.stringify({ works: archiveStore.works }));
  renderArchiveView();
}

function renameWork(workId, newName) {
  const meta = archiveStore.works[workId];
  if (!meta || !newName || !newName.trim()) return;
  meta.name = newName.trim();
  localStorage.setItem(archiveStorageKey, JSON.stringify({ works: archiveStore.works }));
  if (workId === archiveStore.currentWorkId) {
    state.workTitle = newName.trim();
    saveState();
    renderAll();
  }
  renderArchiveView();
}

function getFilteredWorks() {
  const query = archiveStore.searchQuery.trim().toLowerCase();
  let works = Object.values(archiveStore.works);
  if (archiveStore.filterMode === "active") {
    works = works.filter(w => !w.archived);
  } else if (archiveStore.filterMode === "archived") {
    works = works.filter(w => w.archived);
  }
  if (query) {
    works = works.filter(w => w.name.toLowerCase().includes(query));
  }
  return works.sort((a, b) => b.updatedAt - a.updatedAt);
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "刚刚";
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

function getWorkStats(workId) {
  const workState = loadWorkFromArchive(workId);
  if (!workState) return { pages: 0, chars: 0, types: 0, drafts: 0 };
  const totalPlacements = workState.pages.reduce((sum, p) => sum + p.placements.length, 0);
  return {
    pages: workState.pages.length,
    chars: totalPlacements,
    types: workState.inventory.length,
    drafts: (workState.drafts || []).length
  };
}

function renderArchiveView() {
  const works = getFilteredWorks();
  const gridEl = document.getElementById("archiveGrid");
  const emptyEl = document.getElementById("archiveEmpty");
  if (!gridEl || !emptyEl) return;

  if (works.length === 0) {
    gridEl.hidden = true;
    emptyEl.hidden = false;
    emptyEl.querySelector("h3").textContent =
      archiveStore.searchQuery ? "没有找到匹配的作品" :
      archiveStore.filterMode === "archived" ? "还没有归档的作品" : "还没有作品";
    emptyEl.querySelector("p").textContent =
      archiveStore.searchQuery ? "试试换个关键词搜索吧" :
      archiveStore.filterMode === "archived" ? "在「进行中」列表中归档作品后，可以在这里找到" : "点击上方「新建作品」创建你的第一个活字排版作品";
    return;
  }

  gridEl.hidden = false;
  emptyEl.hidden = true;

  gridEl.innerHTML = works.map(work => {
    const stats = getWorkStats(work.id);
    const isCurrent = work.id === archiveStore.currentWorkId;
    return `
      <article class="work-card ${work.archived ? "archived" : ""} ${isCurrent ? "current" : ""}" data-work-id="${work.id}">
        <div class="work-card-head">
          <h3 class="work-card-title">${escapeHtml(work.name)}</h3>
          ${work.archived ? '<span class="work-card-badge archived-badge">已归档</span>' : ""}
          ${isCurrent ? '<span class="work-card-badge current-badge">编辑中</span>' : ""}
        </div>
        <div class="work-card-stats">
          <div class="work-card-stat">
            <span class="work-card-stat-label">页面</span>
            <span class="work-card-stat-value">${stats.pages}</span>
          </div>
          <div class="work-card-stat">
            <span class="work-card-stat-label">落字</span>
            <span class="work-card-stat-value">${stats.chars}</span>
          </div>
          <div class="work-card-stat">
            <span class="work-card-stat-label">字模</span>
            <span class="work-card-stat-value">${stats.types}</span>
          </div>
          <div class="work-card-stat">
            <span class="work-card-stat-label">草稿</span>
            <span class="work-card-stat-value">${stats.drafts}</span>
          </div>
        </div>
        <div class="work-card-time">
          <span>更新于 ${formatDate(work.updatedAt)}</span>
        </div>
        <div class="work-card-actions">
          <button class="work-card-btn primary" data-action="edit" type="button">编辑</button>
          <button class="work-card-btn" data-action="duplicate" type="button">复制</button>
          <button class="work-card-btn" data-action="rename" type="button">改名</button>
          <button class="work-card-btn ${work.archived ? "" : "warn"}" data-action="toggleArchive" type="button">
            ${work.archived ? "取消归档" : "归档"}
          </button>
          <button class="work-card-btn danger" data-action="delete" type="button">删除</button>
        </div>
      </article>
    `;
  }).join("");
}

function switchView(view) {
  archiveStore.currentView = view;
  const archiveView = document.getElementById("archiveView");
  const editorView = document.getElementById("editorView");
  const toggleBtn = document.getElementById("viewToggleArchive");
  if (!archiveView || !editorView || !toggleBtn) return;

  if (view === "archive") {
    saveCurrentWork();
    archiveView.hidden = false;
    editorView.hidden = true;
    toggleBtn.textContent = "✎ 返回编辑";
    toggleBtn.title = "返回编辑器";
    toggleBtn.classList.add("active");
    renderArchiveView();
  } else {
    archiveView.hidden = true;
    editorView.hidden = false;
    toggleBtn.textContent = "📚 作品档案";
    toggleBtn.title = "切换到作品档案";
    toggleBtn.classList.remove("active");
  }
}

let workNameModalState = { mode: "create", targetWorkId: null };

function openWorkNameModal(mode, targetWorkId = null) {
  workNameModalState = { mode, targetWorkId };
  const modal = document.getElementById("workNameModal");
  const title = document.getElementById("workNameModalTitle");
  const input = document.getElementById("workNameInput");
  const confirmBtn = document.getElementById("workNameModalConfirm");
  if (!modal || !title || !input || !confirmBtn) return;

  if (mode === "create") {
    title.textContent = "新建作品";
    input.value = "";
    input.placeholder = "请输入作品名称...";
  } else if (mode === "rename") {
    title.textContent = "重命名作品";
    const meta = archiveStore.works[targetWorkId];
    input.value = meta ? meta.name : "";
    input.placeholder = "请输入新的作品名称...";
  }
  confirmBtn.disabled = !input.value.trim();
  modal.hidden = false;
  setTimeout(() => input.focus(), 50);
}

function closeWorkNameModal() {
  const modal = document.getElementById("workNameModal");
  if (modal) modal.hidden = true;
  workNameModalState = { mode: "create", targetWorkId: null };
}

function confirmWorkNameModal() {
  const input = document.getElementById("workNameInput");
  if (!input) return;
  const name = input.value.trim();
  if (!name) return;

  if (workNameModalState.mode === "create") {
    createNewWork(name);
  } else if (workNameModalState.mode === "rename") {
    renameWork(workNameModalState.targetWorkId, name);
  }
  closeWorkNameModal();
}

function handleArchiveCardClick(event) {
  const card = event.target.closest("[data-work-id]");
  if (!card) return;
  const workId = card.dataset.workId;
  const actionBtn = event.target.closest("[data-action]");
  if (!actionBtn) {
    switchToWork(workId);
    return;
  }
  const action = actionBtn.dataset.action;
  switch (action) {
    case "edit":
      switchToWork(workId);
      break;
    case "duplicate":
      if (confirm(`确定要复制作品「${archiveStore.works[workId]?.name || ""}」吗？`)) {
        duplicateWork(workId);
      }
      break;
    case "rename":
      openWorkNameModal("rename", workId);
      break;
    case "toggleArchive": {
      const meta = archiveStore.works[workId];
      if (meta && meta.archived) {
        toggleArchiveWork(workId);
      } else {
        if (confirm(`确定要归档作品「${meta?.name || ""}」吗？归档后可以在「已归档」列表中找到。`)) {
          toggleArchiveWork(workId);
        }
      }
      break;
    }
    case "delete":
      if (confirm(`⚠ 确定要永久删除作品「${archiveStore.works[workId]?.name || ""}」吗？此操作不可恢复！`)) {
        deleteWorkFromArchive(workId);
        if (archiveStore.currentWorkId === null && Object.keys(archiveStore.works).length > 0) {
          const firstWork = Object.values(archiveStore.works).find(w => !w.archived) || Object.values(archiveStore.works)[0];
          switchToWork(firstWork.id);
        } else if (Object.keys(archiveStore.works).length === 0) {
          const newState = createDefaultWorkState();
          const metadata = createWorkMetadata(newState.workTitle);
          const newId = metadata.id;
          archiveStore.works[newId] = metadata;
          archiveStore.currentWorkId = newId;
          localStorage.setItem(`${archiveStorageKey}-${newId}`, JSON.stringify(newState));
          localStorage.setItem(archiveStorageKey, JSON.stringify({ works: archiveStore.works }));
          saveArchiveMeta();
          state = newState;
          historyStack = [];
          redoStack = [];
          saveState();
          renderAll();
        }
        renderArchiveView();
      }
      break;
  }
}

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
  usageTab: "current",
  exportSettings: {
    paperColor: "#fffaf1",
    inkDepth: 70,
    showBorder: true,
    showInnerGrid: false
  }
};

let state = initializeArchive();

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
    usageTab: s.usageTab,
    exportSettings: structuredClone(s.exportSettings)
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

let selectionState = {
  selectedCells: new Set(),
  clipboard: null,
  isSelecting: false,
  selectionStart: null,
  isMoveMode: false,
  moveOriginCell: null,
  moveOriginalPlacements: [],
  isPasteMode: false,
  pastePreviewCell: null
};

function clearSelection() {
  selectionState.selectedCells.clear();
  selectionState.isMoveMode = false;
  selectionState.moveOriginCell = null;
  selectionState.moveOriginalPlacements = [];
  selectionState.isPasteMode = false;
  selectionState.pastePreviewCell = null;
  updateSelectionUI();
  renderStageSelection();
  hidePastePreview();
}

function getSelectedCellsArray() {
  return Array.from(selectionState.selectedCells).map((key) => {
    const [row, col] = key.split(":").map(Number);
    return { row, col };
  });
}

function getSelectionBounds() {
  const cells = getSelectedCellsArray();
  if (cells.length === 0) return null;
  let minRow = Infinity, maxRow = -Infinity, minCol = Infinity, maxCol = -Infinity;
  for (const cell of cells) {
    minRow = Math.min(minRow, cell.row);
    maxRow = Math.max(maxRow, cell.row);
    minCol = Math.min(minCol, cell.col);
    maxCol = Math.max(maxCol, cell.col);
  }
  return { minRow, maxRow, minCol, maxCol, rows: maxRow - minRow + 1, cols: maxCol - minCol + 1 };
}

function updateSelectionUI() {
  const count = selectionState.selectedCells.size;
  if (els.selectionToolbar) {
    els.selectionToolbar.hidden = count === 0 && !selectionState.isPasteMode;
  }
  if (els.selectionInfo) {
    if (selectionState.isPasteMode) {
      els.selectionInfo.textContent = "粘贴模式：点击格子选择粘贴位置";
    } else if (selectionState.isMoveMode) {
      els.selectionInfo.textContent = `移动模式：已选择 ${count} 个格子，点击目标位置移动`;
    } else {
      els.selectionInfo.textContent = `已选择 ${count} 个格子`;
    }
  }
  if (els.moveSelectionBtn) {
    els.moveSelectionBtn.textContent = selectionState.isMoveMode ? "✥ 取消移动" : "✥ 移动";
    els.moveSelectionBtn.classList.toggle("primary", selectionState.isMoveMode);
  }
  if (els.pasteSelectionBtn) {
    els.pasteSelectionBtn.disabled = !selectionState.clipboard;
    els.pasteSelectionBtn.textContent = selectionState.isPasteMode ? "📄 取消粘贴" : "📄 粘贴";
    els.pasteSelectionBtn.classList.toggle("primary", selectionState.isPasteMode);
  }
}

function renderStageSelection() {
  const cells = document.querySelectorAll(".cell");
  cells.forEach((cell) => {
    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    const key = placementKey(row, col);
    cell.classList.toggle("selected", selectionState.selectedCells.has(key));
  });
}

function selectCellRange(startRow, startCol, endRow, endCol, additive = false) {
  const minRow = Math.min(startRow, endRow);
  const maxRow = Math.max(startRow, endRow);
  const minCol = Math.min(startCol, endCol);
  const maxCol = Math.max(startCol, endCol);

  if (!additive) {
    selectionState.selectedCells.clear();
  }

  for (let r = minRow; r <= maxRow; r += 1) {
    for (let c = minCol; c <= maxCol; c += 1) {
      selectionState.selectedCells.add(placementKey(r, c));
    }
  }

  updateSelectionUI();
  renderStageSelection();
}

function getCellFromPoint(clientX, clientY) {
  const stageRect = els.stage.getBoundingClientRect();
  const x = clientX - stageRect.left;
  const y = clientY - stageRect.top;

  if (x < 0 || y < 0 || x > stageRect.width || y > stageRect.height) {
    return null;
  }

  const { cols, rows } = getGrid();
  const cellWidth = stageRect.width / cols;
  const cellHeight = stageRect.height / rows;

  const col = Math.floor(x / cellWidth);
  const row = Math.floor(y / cellHeight);

  if (row < 0 || row >= rows || col < 0 || col >= cols) {
    return null;
  }

  return { row, col };
}

function updateMarquee(startX, startY, endX, endY) {
  if (!els.selectionMarquee) return;

  const stageRect = els.stage.getBoundingClientRect();
  const containerRect = els.stageContainer.getBoundingClientRect();

  const relStartX = startX - containerRect.left;
  const relStartY = startY - containerRect.top;
  const relEndX = endX - containerRect.left;
  const relEndY = endY - containerRect.top;

  const left = Math.min(relStartX, relEndX);
  const top = Math.min(relStartY, relEndY);
  const width = Math.abs(relEndX - relStartX);
  const height = Math.abs(relEndY - relStartY);

  els.selectionMarquee.style.left = `${left}px`;
  els.selectionMarquee.style.top = `${top}px`;
  els.selectionMarquee.style.width = `${width}px`;
  els.selectionMarquee.style.height = `${height}px`;
  els.selectionMarquee.hidden = false;
}

function hideMarquee() {
  if (els.selectionMarquee) {
    els.selectionMarquee.hidden = true;
  }
}

function showPastePreview(row, col) {
  if (!selectionState.clipboard || !selectionState.clipboard.placements) return;

  hidePastePreview();

  const { placements } = selectionState.clipboard;
  const check = canPasteSelection(row, col);

  placements.forEach((p) => {
    const r = row + p.offsetRow;
    const c = col + p.offsetCol;
    const cell = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
    if (cell) {
      cell.classList.add("paste-preview");
      if (!check.ok) {
        cell.classList.add("paste-preview-invalid");
      }
    }
  });
}

function hidePastePreview() {
  document.querySelectorAll(".cell.paste-preview").forEach((cell) => {
    cell.classList.remove("paste-preview", "paste-preview-invalid");
  });
}

function startPasteMode() {
  if (!selectionState.clipboard) return;
  selectionState.isPasteMode = true;
  selectionState.isMoveMode = false;
  selectionState.pastePreviewCell = null;
  updateSelectionUI();
}

function endPasteMode() {
  selectionState.isPasteMode = false;
  selectionState.pastePreviewCell = null;
  hidePastePreview();
  updateSelectionUI();
}

function copySelection() {
  const bounds = getSelectionBounds();
  if (!bounds) return;

  const currentPage = getCurrentPage();
  const map = new Map(currentPage.placements.map((item) => [placementKey(item.row, item.col), item]));

  const clipboard = [];
  for (let r = bounds.minRow; r <= bounds.maxRow; r += 1) {
    for (let c = bounds.minCol; c <= bounds.maxCol; c += 1) {
      const key = placementKey(r, c);
      const placement = map.get(key);
      if (placement) {
        clipboard.push({
          offsetRow: r - bounds.minRow,
          offsetCol: c - bounds.minCol,
          typeId: placement.typeId
        });
      }
    }
  }

  selectionState.clipboard = {
    placements: clipboard,
    bounds: { rows: bounds.rows, cols: bounds.cols }
  };

  updateSelectionUI();
}

function canPasteSelection(targetRow, targetCol) {
  if (!selectionState.clipboard || !selectionState.clipboard.placements || selectionState.clipboard.placements.length === 0) {
    return { ok: false, reason: "剪贴板为空" };
  }

  const { cols, rows } = getGrid();
  const { placements, bounds } = selectionState.clipboard;

  const outOfBounds = placements.some((p) => {
    const r = targetRow + p.offsetRow;
    const c = targetCol + p.offsetCol;
    return r < 0 || r >= rows || c < 0 || c >= cols;
  });

  if (outOfBounds) {
    return { ok: false, reason: "粘贴位置越界，部分字将落在版面外" };
  }

  const currentPage = getCurrentPage();
  const existingMap = new Map(currentPage.placements.map((item) => [placementKey(item.row, item.col), item]));
  const willOverwrite = placements.some((p) => {
    const r = targetRow + p.offsetRow;
    const c = targetCol + p.offsetCol;
    return existingMap.has(placementKey(r, c));
  });

  const usage = getUsage();
  const needed = {};
  for (const p of placements) {
    needed[p.typeId] = (needed[p.typeId] || 0) + 1;
  }

  const targetKeys = placements.map((p) => placementKey(targetRow + p.offsetRow, targetCol + p.offsetCol));
  const existingInTarget = currentPage.placements.filter(
    (pl) => targetKeys.includes(placementKey(pl.row, pl.col))
  );
  const freedTypeIdCount = {};
  for (const pl of existingInTarget) {
    freedTypeIdCount[pl.typeId] = (freedTypeIdCount[pl.typeId] || 0) + 1;
  }

  const shortages = [];
  for (const [typeId, count] of Object.entries(needed)) {
    const item = state.inventory.find((i) => i.id === typeId);
    if (!item) continue;
    const used = usage[typeId] || 0;
    const freed = freedTypeIdCount[typeId] || 0;
    const netUsed = used - freed + count;
    if (netUsed > item.quantity) {
      shortages.push({ char: item.char, style: item.style, needed: netUsed, available: item.quantity });
    }
  }

  if (shortages.length > 0) {
    return {
      ok: false,
      reason: "字模库存不足",
      shortages
    };
  }

  return {
    ok: true,
    willOverwrite,
    overwrittenCount: placements.filter((p) => existingMap.has(placementKey(targetRow + p.offsetRow, targetCol + p.offsetCol))).length
  };
}

function pasteSelection(targetRow, targetCol) {
  if (!selectionState.clipboard || !selectionState.clipboard.placements || selectionState.clipboard.placements.length === 0) return false;

  const { placements } = selectionState.clipboard;
  const currentPage = getCurrentPage();
  const targetKeys = placements.map((p) => placementKey(targetRow + p.offsetRow, targetCol + p.offsetCol));

  pushHistory();

  currentPage.placements = currentPage.placements.filter(
    (pl) => !targetKeys.includes(placementKey(pl.row, pl.col))
  );

  for (const p of placements) {
    currentPage.placements.push({
      row: targetRow + p.offsetRow,
      col: targetCol + p.offsetCol,
      typeId: p.typeId
    });
  }

  const newSelection = new Set();
  for (const p of placements) {
    newSelection.add(placementKey(targetRow + p.offsetRow, targetCol + p.offsetCol));
  }
  selectionState.selectedCells = newSelection;
  selectionState.isPasteMode = false;
  selectionState.pastePreviewCell = null;

  renderAll();
  return true;
}

function startMoveMode() {
  if (selectionState.selectedCells.size === 0) return;

  const currentPage = getCurrentPage();
  const selectedPlacements = currentPage.placements.filter((pl) =>
    selectionState.selectedCells.has(placementKey(pl.row, pl.col))
  );

  if (selectedPlacements.length === 0) {
    alert("选区内没有可移动的落字");
    return;
  }

  selectionState.isMoveMode = true;
  selectionState.isPasteMode = false;
  selectionState.moveOriginalPlacements = structuredClone(selectedPlacements);
  hidePastePreview();
  updateSelectionUI();
}

function endMoveMode() {
  selectionState.isMoveMode = false;
  selectionState.moveOriginCell = null;
  selectionState.moveOriginalPlacements = [];
  updateSelectionUI();
}

function moveSelectionTo(targetRow, targetCol) {
  if (!selectionState.isMoveMode || selectionState.moveOriginalPlacements.length === 0) return false;

  const bounds = getSelectionBounds();
  if (!bounds) return false;

  const offsetRow = targetRow - bounds.minRow;
  const offsetCol = targetCol - bounds.minCol;

  const { cols, rows } = getGrid();
  const outOfBounds = selectionState.moveOriginalPlacements.some((p) => {
    const r = p.row + offsetRow;
    const c = p.col + offsetCol;
    return r < 0 || r >= rows || c < 0 || c >= cols;
  });

  if (outOfBounds) {
    return false;
  }

  const currentPage = getCurrentPage();
  const originalKeys = new Set(
    selectionState.moveOriginalPlacements.map((p) => placementKey(p.row, p.col))
  );

  const targetPlacements = selectionState.moveOriginalPlacements.map((p) => ({
    row: p.row + offsetRow,
    col: p.col + offsetCol,
    typeId: p.typeId
  }));

  const targetKeys = new Set(targetPlacements.map((p) => placementKey(p.row, p.col)));

  pushHistory();

  currentPage.placements = currentPage.placements.filter(
    (pl) => !originalKeys.has(placementKey(pl.row, pl.col))
  );

  currentPage.placements = currentPage.placements.filter(
    (pl) => !targetKeys.has(placementKey(pl.row, pl.col))
  );

  currentPage.placements.push(...targetPlacements);

  selectionState.selectedCells = new Set(targetPlacements.map((p) => placementKey(p.row, p.col)));

  selectionState.moveOriginalPlacements = structuredClone(targetPlacements);

  renderAll();
  return true;
}

function clearSelectionContent() {
  if (selectionState.selectedCells.size === 0) return;

  if (!confirm(`确定要清空选中的 ${selectionState.selectedCells.size} 个格子的内容吗？`)) return;

  pushHistory();

  const currentPage = getCurrentPage();
  currentPage.placements = currentPage.placements.filter(
    (pl) => !selectionState.selectedCells.has(placementKey(pl.row, pl.col))
  );

  renderAll();
}

function saveDraftFromSelection() {
  if (selectionState.selectedCells.size === 0) return;

  const bounds = getSelectionBounds();
  if (!bounds) return;

  const currentPage = getCurrentPage();
  const selectedPlacements = currentPage.placements
    .filter((pl) => selectionState.selectedCells.has(placementKey(pl.row, pl.col)))
    .map((pl) => ({
      row: pl.row - bounds.minRow,
      col: pl.col - bounds.minCol,
      typeId: pl.typeId
    }));

  if (selectedPlacements.length === 0) {
    alert("选区内没有落字，无法生成草稿");
    return;
  }

  const title = prompt("请输入草稿片段名称：", `选区片段 (${bounds.cols}×${bounds.rows})`);
  if (!title || !title.trim()) return;

  const draftPage = {
    id: crypto.randomUUID(),
    name: title.trim(),
    settings: { ...currentPage.settings },
    placements: selectedPlacements,
    activeTemplateId: null
  };

  state.drafts.unshift({
    id: crypto.randomUUID(),
    title: title.trim(),
    workTitle: state.workTitle,
    pages: [draftPage],
    exportSettings: structuredClone(state.exportSettings),
    savedAt: new Date().toISOString(),
    isFragment: true,
    fragmentSize: { rows: bounds.rows, cols: bounds.cols }
  });

  state.drafts = state.drafts.slice(0, 12);
  renderAll();
  alert("草稿片段已保存，可在「草稿与核对」面板中查看");
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
  panelTabs: document.querySelector(".panel-tabs"),
  shortageListBtn: document.querySelector("#shortageListBtn"),
  shortageListModal: document.querySelector("#shortageListModal"),
  slClose: document.querySelector("#slClose"),
  slText: document.querySelector("#slText"),
  slAnalyze: document.querySelector("#slAnalyze"),
  slResults: document.querySelector("#slResults"),
  slMissingList: document.querySelector("#slMissingList"),
  slLowList: document.querySelector("#slLowList"),
  slOkList: document.querySelector("#slOkList"),
  slCancel: document.querySelector("#slCancel"),
  slDefaultStyle: document.querySelector("#slDefaultStyle"),
  slDefaultSize: document.querySelector("#slDefaultSize"),
  slDefaultQuantity: document.querySelector("#slDefaultQuantity"),
  slDefaultWear: document.querySelector("#slDefaultWear"),
  slAddAllMissing: document.querySelector("#slAddAllMissing"),
  slAddAllLow: document.querySelector("#slAddAllLow"),
  slSummary: document.querySelector(".sl-summary"),
  printPreviewModal: document.querySelector("#printPreviewModal"),
  ppClose: document.querySelector("#ppClose"),
  ppCancel: document.querySelector("#ppCancel"),
  ppPageSelect: document.querySelector("#ppPageSelect"),
  ppPageInfo: document.querySelector("#ppPageInfo"),
  ppInkDepth: document.querySelector("#ppInkDepth"),
  ppInkValue: document.querySelector("#ppInkValue"),
  ppBorderToggle: document.querySelector("#ppBorderToggle"),
  ppInnerGridToggle: document.querySelector("#ppInnerGridToggle"),
  ppPreviewCanvas: document.querySelector("#ppPreviewCanvas"),
  ppInfoPaper: document.querySelector("#ppInfoPaper"),
  ppInfoFlow: document.querySelector("#ppInfoFlow"),
  ppInfoGap: document.querySelector("#ppInfoGap"),
  ppInfoCount: document.querySelector("#ppInfoCount"),
  ppExportCurrent: document.querySelector("#ppExportCurrent"),
  ppExportAll: document.querySelector("#ppExportAll"),
  ppCanvasWrap: document.querySelector("#ppCanvasWrap"),
  selectionToolbar: document.querySelector("#selectionToolbar"),
  selectionInfo: document.querySelector("#selectionInfo"),
  selectionMarquee: document.querySelector("#selectionMarquee"),
  copySelectionBtn: document.querySelector("#copySelectionBtn"),
  pasteSelectionBtn: document.querySelector("#pasteSelectionBtn"),
  moveSelectionBtn: document.querySelector("#moveSelectionBtn"),
  clearSelectionBtn: document.querySelector("#clearSelectionBtn"),
  draftFromSelectionBtn: document.querySelector("#draftFromSelectionBtn"),
  cancelSelectionBtn: document.querySelector("#cancelSelectionBtn"),
  stageContainer: document.querySelector(".stage-container")
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

    if (!newState.exportSettings) {
      newState.exportSettings = {
        paperColor: "#fffaf1",
        inkDepth: 70,
        showBorder: true,
        showInnerGrid: false
      };
    }

    return newState;
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
  saveCurrentWork();
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
        <button class="cell ${type ? 'used' : ''} ${vertical} ${templateCellClass}" data-row="${row}" data-col="${col}" type="button" aria-label="第${row + 1}行第${col + 1}列">
          ${type ? escapeHtml(type.char) : ''}
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

  clearSelection();
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
  renderStageSelection();
  renderUsage();
  renderDrafts();
  renderActiveTemplateLabel();
  updateHistoryButtons();
  updateSelectionUI();
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
  clearSelection();
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
  clearSelection();
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
  clearSelection();
  renderAll();
}

function switchPage(pageId) {
  if (state.currentPageId === pageId) return;
  state.currentPageId = pageId;
  clearSelection();
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
    exportSettings: structuredClone(state.exportSettings),
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

const printPreviewDefaults = {
  paperColor: "#fffaf1",
  inkDepth: 70,
  showBorder: true,
  showInnerGrid: false
};

let printPreviewState = { ...printPreviewDefaults, currentPageId: null };

function getExportCanvasSize(page) {
  const { cols, rows } = getGrid(page.settings.paperSize);
  const cell = page.settings.paperSize === "bookmark" ? 44 : 56;
  const gap = Number(page.settings.gridGap);
  const margin = 48;
  const width = cols * cell + (cols - 1) * gap + margin * 2;
  const height = rows * cell + (rows - 1) * gap + margin * 2 + 70;
  return { width, height };
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 255, g: 250, b: 241 };
}

function rgbToHex(r, g, b) {
  return (
    "#" +
    [r, g, b]
      .map((x) => {
        const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      })
      .join("")
  );
}

function adjustColorDepth(baseRgb, depthPercent) {
  const t = depthPercent / 100;
  const darken = 1 - t * 0.5;
  return {
    r: Math.round(baseRgb.r * darken),
    g: Math.round(baseRgb.g * darken),
    b: Math.round(baseRgb.b * darken)
  };
}

function createSeededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function hashStringToSeed(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash) + 1;
}

function getWearEffects(wear) {
  switch (wear) {
    case "新":
      return {
        opacity: 1.0,
        edgeRoughness: 0,
        spotCount: 0,
        cornerChamfer: 0,
        innerNoise: 0
      };
    case "微磨":
      return {
        opacity: 0.92,
        edgeRoughness: 2,
        spotCount: 3,
        cornerChamfer: 2,
        innerNoise: 0.05
      };
    case "旧痕":
      return {
        opacity: 0.82,
        edgeRoughness: 4,
        spotCount: 7,
        cornerChamfer: 4,
        innerNoise: 0.12
      };
    default:
      return {
        opacity: 1.0,
        edgeRoughness: 0,
        spotCount: 0,
        cornerChamfer: 0,
        innerNoise: 0
      };
  }
}

function drawWornRect(ctx, x, y, w, h, effects, inkRgb, randomFn = Math.random) {
  const { edgeRoughness, cornerChamfer } = effects;
  const rnd = randomFn;
  ctx.save();
  ctx.beginPath();

  const c = Math.min(cornerChamfer, w / 4, h / 4);

  const points = [
    { x: x + c + (rnd() - 0.5) * edgeRoughness, y: y + (rnd() - 0.5) * edgeRoughness },
    { x: x + w - c + (rnd() - 0.5) * edgeRoughness, y: y + (rnd() - 0.5) * edgeRoughness },
    { x: x + w + (rnd() - 0.5) * edgeRoughness, y: y + c + (rnd() - 0.5) * edgeRoughness },
    { x: x + w + (rnd() - 0.5) * edgeRoughness, y: y + h - c + (rnd() - 0.5) * edgeRoughness },
    { x: x + w - c + (rnd() - 0.5) * edgeRoughness, y: y + h + (rnd() - 0.5) * edgeRoughness },
    { x: x + c + (rnd() - 0.5) * edgeRoughness, y: y + h + (rnd() - 0.5) * edgeRoughness },
    { x: x + (rnd() - 0.5) * edgeRoughness, y: y + h - c + (rnd() - 0.5) * edgeRoughness },
    { x: x + (rnd() - 0.5) * edgeRoughness, y: y + c + (rnd() - 0.5) * edgeRoughness }
  ];

  ctx.moveTo(points[0].x, points[0].y);
  ctx.lineTo(points[1].x, points[1].y);
  ctx.quadraticCurveTo(x + w, y, points[2].x, points[2].y);
  ctx.lineTo(points[3].x, points[3].y);
  ctx.quadraticCurveTo(x + w, y + h, points[4].x, points[4].y);
  ctx.lineTo(points[5].x, points[5].y);
  ctx.quadraticCurveTo(x, y + h, points[6].x, points[6].y);
  ctx.lineTo(points[7].x, points[7].y);
  ctx.quadraticCurveTo(x, y, points[0].x, points[0].y);
  ctx.closePath();

  ctx.fillStyle = `rgb(${inkRgb.r}, ${inkRgb.g}, ${inkRgb.b})`;
  ctx.fill();

  if (effects.innerNoise > 0) {
    ctx.globalCompositeOperation = "destination-out";
    const noiseDensity = Math.floor(w * h * effects.innerNoise * 0.02);
    for (let i = 0; i < noiseDensity; i++) {
      const nx = x + rnd() * w;
      const ny = y + rnd() * h;
      const nr = rnd() * 1.5 + 0.3;
      ctx.beginPath();
      ctx.arc(nx, ny, nr, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,0,0,${rnd() * 0.4 + 0.1})`;
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  }

  if (effects.spotCount > 0) {
    ctx.globalCompositeOperation = "destination-out";
    for (let i = 0; i < effects.spotCount; i++) {
      const sx = x + rnd() * w;
      const sy = y + rnd() * h;
      const sr = rnd() * 2 + 0.8;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,0,0,${rnd() * 0.5 + 0.3})`;
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  }

  ctx.restore();
}

function renderPageToCanvas(page, title, pageIndex, totalPages, options = {}) {
  const opts = { ...printPreviewDefaults, ...options };
  const { cols, rows } = getGrid(page.settings.paperSize);
  const cell = page.settings.paperSize === "bookmark" ? 44 : 56;
  const gap = page.settings.gridGap;
  const margin = 48;
  const { width, height } = getExportCanvasSize(page);
  const isVertical = page.settings.flowMode === "vertical";
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  const seedKey = `${page.id}_${opts.paperColor}_${opts.inkDepth}_${opts.showBorder}_${opts.showInnerGrid}_${pageIndex}_${totalPages}`;
  const seed = hashStringToSeed(seedKey);
  const rnd = createSeededRandom(seed);

  const paperRgb = hexToRgb(opts.paperColor);
  const baseInk = hexToRgb("#2f2921");
  const inkRgb = adjustColorDepth(baseInk, opts.inkDepth);
  const baseTextInk = hexToRgb("#fff5df");
  const textInkRgb = adjustColorDepth(baseTextInk, 100 - (100 - opts.inkDepth) * 0.3);

  ctx.fillStyle = `rgb(${paperRgb.r}, ${paperRgb.g}, ${paperRgb.b})`;
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < Math.floor(width * height * 0.00008); i++) {
    const nx = rnd() * width;
    const ny = rnd() * height;
    const nr = rnd() * 1.2 + 0.2;
    const variation = (rnd() - 0.5) * 20;
    ctx.beginPath();
    ctx.arc(nx, ny, nr, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${Math.max(0, paperRgb.r - 30 + variation)}, ${Math.max(0, paperRgb.g - 30 + variation)}, ${Math.max(0, paperRgb.b - 30 + variation)}, ${rnd() * 0.15 + 0.05})`;
    ctx.fill();
  }

  if (opts.showBorder) {
    ctx.strokeStyle = `rgb(${inkRgb.r}, ${inkRgb.g}, ${inkRgb.b})`;
    ctx.lineWidth = 4;
    ctx.lineJoin = "miter";
    const borderInset = 18;
    ctx.beginPath();
    const jitter = () => (rnd() - 0.5) * 1.5;
    ctx.moveTo(borderInset + jitter(), borderInset + jitter());
    ctx.lineTo(width - borderInset + jitter(), borderInset + jitter());
    ctx.lineTo(width - borderInset + jitter(), height - borderInset + jitter());
    ctx.lineTo(borderInset + jitter(), height - borderInset + jitter());
    ctx.closePath();
    ctx.stroke();

    ctx.lineWidth = 1;
    ctx.strokeStyle = `rgba(${inkRgb.r}, ${inkRgb.g}, ${inkRgb.b}, 0.35)`;
    const innerInset = 26;
    ctx.beginPath();
    ctx.moveTo(innerInset, innerInset);
    ctx.lineTo(width - innerInset, innerInset);
    ctx.lineTo(width - innerInset, height - innerInset);
    ctx.lineTo(innerInset, height - innerInset);
    ctx.closePath();
    ctx.stroke();
  }

  const pageInfo = totalPages > 1 ? `（${pageIndex + 1}/${totalPages}）${page.name}` : "";
  const fullTitle = `${title || "未命名作品"}${pageInfo}`;
  ctx.fillStyle = `rgb(${inkRgb.r}, ${inkRgb.g}, ${inkRgb.b})`;
  ctx.globalAlpha = opts.inkDepth / 100;

  if (isVertical) {
    ctx.font = "bold 24px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const titleX = width - margin - 14;
    const titleY = margin;
    const chars = fullTitle.split("");
    const lineHeight = 32;
    chars.forEach((ch, i) => {
      ctx.fillText(ch, titleX + (rnd() - 0.5) * 0.8, titleY + i * lineHeight + (rnd() - 0.5) * 0.8);
    });
  } else {
    ctx.font = "bold 28px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    const titleX = margin;
    const titleY = 50;
    ctx.fillText(fullTitle, titleX, titleY);
  }
  ctx.globalAlpha = 1;

  const gridOriginX = isVertical ? margin : margin;
  const gridOriginY = isVertical ? margin : margin + 45;
  const gridWidth = cols * cell + (cols - 1) * gap;
  const gridHeight = rows * cell + (rows - 1) * gap;

  if (opts.showInnerGrid) {
    ctx.save();
    ctx.strokeStyle = `rgba(${inkRgb.r}, ${inkRgb.g}, ${inkRgb.b}, 0.12)`;
    ctx.lineWidth = 1;
    for (let r = 0; r <= rows; r++) {
      const ly = gridOriginY + r * (cell + gap) - gap / 2;
      ctx.beginPath();
      ctx.moveTo(gridOriginX - 4, ly);
      ctx.lineTo(gridOriginX + gridWidth + 4, ly);
      ctx.stroke();
    }
    for (let c = 0; c <= cols; c++) {
      const lx = gridOriginX + c * (cell + gap) - gap / 2;
      ctx.beginPath();
      ctx.moveTo(lx, gridOriginY - 4);
      ctx.lineTo(lx, gridOriginY + gridHeight + 4);
      ctx.stroke();
    }
    ctx.restore();
  }

  page.placements.forEach((placement, idx) => {
    const type = state.inventory.find((item) => item.id === placement.typeId);
    if (!type) return;
    const x = gridOriginX + placement.col * (cell + gap);
    const y = gridOriginY + placement.row * (cell + gap);
    const wear = getWearEffects(type.wear);

    const charSeed = hashStringToSeed(`${seedKey}_${placement.col}_${placement.row}_${type.id}`);
    const charRnd = createSeededRandom(charSeed);

    ctx.save();
    ctx.globalAlpha = wear.opacity * (0.75 + (opts.inkDepth / 100) * 0.25);
    drawWornRect(ctx, x, y, cell, cell, wear, inkRgb, charRnd);
    ctx.restore();

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `900 ${Math.min(type.size + 8, 42)}px serif`;
    ctx.globalAlpha = wear.opacity * (0.8 + (opts.inkDepth / 100) * 0.2);

    const centerX = x + cell / 2;
    const centerY = y + cell / 2;
    const charOffsetX = (charRnd() - 0.5) * (wear.edgeRoughness * 0.3);
    const charOffsetY = (charRnd() - 0.5) * (wear.edgeRoughness * 0.3);
    const charRotate = (charRnd() - 0.5) * (wear.edgeRoughness * 0.015);

    ctx.translate(centerX + charOffsetX, centerY + charOffsetY);
    ctx.rotate(charRotate);

    ctx.fillStyle = `rgb(${textInkRgb.r}, ${textInkRgb.g}, ${textInkRgb.b})`;
    ctx.fillText(type.char, 0, 0);

    if (wear.innerNoise > 0) {
      ctx.globalCompositeOperation = "destination-out";
      const noiseCount = Math.floor(wear.innerNoise * 15);
      for (let i = 0; i < noiseCount; i++) {
        const nx = (charRnd() - 0.5) * cell * 0.7;
        const ny = (charRnd() - 0.5) * cell * 0.7;
        const nr = charRnd() * 1.2 + 0.3;
        ctx.beginPath();
        ctx.arc(nx, ny, nr, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,0,0,${charRnd() * 0.3 + 0.15})`;
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    }

    ctx.restore();
  });

  return canvas;
}

function getPaperSizeLabel(size) {
  const map = {
    postcard: "明信片",
    bookmark: "书签",
    square: "方形小笺"
  };
  return map[size] || size;
}

function getFlowModeLabel(mode) {
  return mode === "vertical" ? "竖排" : "横排";
}

function getInkDepthLabel(value) {
  const v = Number(value);
  if (v <= 30) return `较淡 (${v}%)`;
  if (v <= 60) return `适中 (${v}%)`;
  if (v <= 85) return `较浓 (${v}%)`;
  return `浓墨 (${v}%)`;
}

function renderPrintPreview() {
  const page = getPageById(printPreviewState.currentPageId) || getCurrentPage();
  const pageIndex = getPageIndex(page.id);
  const totalPages = state.pages.length;
  const title = state.workTitle;

  const canvas = renderPageToCanvas(page, title, pageIndex, totalPages, {
    paperColor: printPreviewState.paperColor,
    inkDepth: printPreviewState.inkDepth,
    showBorder: printPreviewState.showBorder,
    showInnerGrid: printPreviewState.showInnerGrid
  });

  const previewCanvas = els.ppPreviewCanvas;
  previewCanvas.width = canvas.width;
  previewCanvas.height = canvas.height;
  const ctx = previewCanvas.getContext("2d");
  ctx.drawImage(canvas, 0, 0);

  els.ppInfoPaper.textContent = getPaperSizeLabel(page.settings.paperSize);
  els.ppInfoFlow.textContent = getFlowModeLabel(page.settings.flowMode);
  els.ppInfoGap.textContent = `${page.settings.gridGap}px`;
  els.ppInfoCount.textContent = `${page.placements.length}枚`;
}

function updatePrintPreviewPageSelect() {
  const currentPageId = printPreviewState.currentPageId || state.currentPageId;
  els.ppPageSelect.innerHTML = state.pages
    .map((page, index) => {
      const selected = page.id === currentPageId ? "selected" : "";
      return `<option value="${page.id}" ${selected}>第${index + 1}页 · ${escapeHtml(page.name)}（${page.placements.length}枚）</option>`;
    })
    .join("");

  const total = state.pages.length;
  const currentIdx = getPageIndex(currentPageId) + 1;
  els.ppPageInfo.textContent = `${currentIdx} / ${total}`;
}

function openPrintPreview() {
  const settings = state.exportSettings || printPreviewDefaults;
  printPreviewState = {
    ...settings,
    currentPageId: state.currentPageId
  };

  const paperRadio = document.querySelector(`input[name="ppPaperColor"][value="${settings.paperColor}"]`);
  if (paperRadio) paperRadio.checked = true;
  els.ppInkDepth.value = settings.inkDepth;
  els.ppInkValue.textContent = getInkDepthLabel(settings.inkDepth);
  els.ppBorderToggle.checked = settings.showBorder;
  els.ppInnerGridToggle.checked = settings.showInnerGrid;

  updatePrintPreviewPageSelect();
  renderPrintPreview();

  const totalPages = state.pages.length;
  els.ppExportAll.style.display = totalPages > 1 ? "" : "none";

  els.printPreviewModal.hidden = false;
}

function closePrintPreview() {
  els.printPreviewModal.hidden = true;
}

function downloadPrintPage(pageId) {
  const page = getPageById(pageId) || getCurrentPage();
  const title = state.workTitle;

  let canvas;
  if (pageId === printPreviewState.currentPageId) {
    canvas = els.ppPreviewCanvas;
  } else {
    const pageIndex = getPageIndex(page.id);
    const totalPages = state.pages.length;
    canvas = renderPageToCanvas(page, title, pageIndex, totalPages, {
      paperColor: printPreviewState.paperColor,
      inkDepth: printPreviewState.inkDepth,
      showBorder: printPreviewState.showBorder,
      showInnerGrid: printPreviewState.showInnerGrid
    });
  }

  const link = document.createElement("a");
  link.download = `${title || "movable-type"}_${page.name}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function downloadPrintAllPages() {
  const totalPages = state.pages.length;
  const currentId = printPreviewState.currentPageId;
  state.pages.forEach((page, index) => {
    setTimeout(() => {
      if (page.id === currentId) {
        downloadPrintPage(page.id);
      } else {
        const title = state.workTitle;
        const canvas = renderPageToCanvas(page, title, index, totalPages, {
          paperColor: printPreviewState.paperColor,
          inkDepth: printPreviewState.inkDepth,
          showBorder: printPreviewState.showBorder,
          showInnerGrid: printPreviewState.showInnerGrid
        });
        const link = document.createElement("a");
        link.download = `${title || "movable-type"}_${page.name}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      }
    }, index * 350);
  });
}

function exportPreview() {
  const issues = runProofread();
  if (hasSevereIssues(issues)) {
    openExportConfirm(issues);
    return;
  }
  openPrintPreview();
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

let slAnalysisResult = null;
let slAddedItems = new Set();

function countChars(text) {
  const count = {};
  for (const ch of text) {
    if (ch.trim() === "") continue;
    count[ch] = (count[ch] || 0) + 1;
  }
  return count;
}

function analyzeShortage(text) {
  const charCount = countChars(text);
  const usage = getTotalUsage();
  const results = [];

  for (const [char, needed] of Object.entries(charCount)) {
    const matchingTypes = state.inventory.filter((item) => item.char === char);

    if (matchingTypes.length === 0) {
      results.push({
        char,
        needed,
        status: "missing",
        totalAvailable: 0,
        totalUsed: 0,
        types: []
      });
      continue;
    }

    const totalAvailable = matchingTypes.reduce((sum, t) => sum + t.quantity, 0);
    const totalUsed = matchingTypes.reduce((sum, t) => sum + (usage[t.id] || 0), 0);
    const remaining = totalAvailable - totalUsed;

    const types = matchingTypes.map((t) => ({
      id: t.id,
      style: t.style,
      size: t.size,
      quantity: t.quantity,
      used: usage[t.id] || 0,
      wear: t.wear
    }));

    if (remaining >= needed) {
      results.push({
        char,
        needed,
        status: "ok",
        totalAvailable,
        totalUsed,
        remaining,
        types
      });
    } else {
      results.push({
        char,
        needed,
        status: "low",
        totalAvailable,
        totalUsed,
        remaining,
        shortage: needed - remaining,
        types
      });
    }
  }

  return results.sort((a, b) => {
    const statusOrder = { missing: 0, low: 1, ok: 2 };
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    return b.needed - a.needed;
  });
}

function openShortageListModal() {
  const pageSettings = getPageSettings();
  els.shortageListModal.hidden = false;
  els.slText.value = "";
  els.slResults.hidden = true;
  els.slDefaultStyle.value = "";
  els.slDefaultSize.value = "24";
  els.slDefaultQuantity.value = "3";
  els.slDefaultWear.value = "微磨";
  const dirRadio = document.querySelector(`input[name="slDir"][value="${pageSettings.flowMode}"]`);
  if (dirRadio) {
    dirRadio.checked = true;
  } else {
    document.querySelector('input[name="slDir"][value="horizontal"]').checked = true;
  }
  slAnalysisResult = null;
  slAddedItems.clear();
  els.slText.focus();
}

function closeShortageListModal() {
  els.shortageListModal.hidden = true;
  slAnalysisResult = null;
  slAddedItems.clear();
}

function analyzeShortageText() {
  const text = els.slText.value;
  if (!text.trim()) {
    alert("请输入待排正文内容");
    return;
  }

  const results = analyzeShortage(text);
  slAnalysisResult = results;
  slAddedItems.clear();

  const missingCount = results.filter((r) => r.status === "missing").length;
  const lowCount = results.filter((r) => r.status === "low").length;
  const okCount = results.filter((r) => r.status === "ok").length;

  let summaryHtml = "";
  if (missingCount) summaryHtml += `<span class="sl-summary-item"><span class="dot red"></span>缺字 ${missingCount} 种</span>`;
  if (lowCount) summaryHtml += `<span class="sl-summary-item"><span class="dot gold"></span>不足 ${lowCount} 种</span>`;
  if (okCount) summaryHtml += `<span class="sl-summary-item"><span class="dot green"></span>充足 ${okCount} 种</span>`;
  summaryHtml += `<span class="sl-summary-item">共 ${Object.keys(countChars(text)).length} 种字，${text.replace(/\s/g, "").length} 个字</span>`;
  els.slSummary.innerHTML = summaryHtml;

  renderShortageList("missing", results.filter((r) => r.status === "missing"));
  renderShortageList("low", results.filter((r) => r.status === "low"));
  renderShortageList("ok", results.filter((r) => r.status === "ok"));

  els.slResults.hidden = false;
}

function renderShortageList(type, items) {
  const listEl = type === "missing" ? els.slMissingList : type === "low" ? els.slLowList : els.slOkList;
  const defaultStyle = els.slDefaultStyle.value.trim();
  const defaultSize = Number(els.slDefaultSize.value) || 24;
  const defaultQuantity = Number(els.slDefaultQuantity.value) || 3;
  const defaultWear = els.slDefaultWear.value;

  listEl.innerHTML = items
    .map((item) => {
      const isMissing = type === "missing";
      const isLow = type === "low";
      const isOk = type === "ok";
      const itemKey = `${type}-${item.char}`;
      const isAdded = slAddedItems.has(itemKey);

      let infoHtml = "";
      if (isMissing) {
        infoHtml = `<strong>${escapeHtml(item.char)}（需${item.needed}枚）</strong><span>字模库中无此字，需采购</span>`;
      } else if (isLow) {
        infoHtml = `<strong>${escapeHtml(item.char)}（需${item.needed}枚）</strong><span>库存${item.totalAvailable}，已用${item.totalUsed}，剩余${item.remaining}，缺${item.shortage}枚</span>`;
      } else {
        infoHtml = `<strong>${escapeHtml(item.char)}（需${item.needed}枚）</strong><span>库存${item.totalAvailable}，已用${item.totalUsed}，剩余${item.remaining}，充足</span>`;
      }

      let quantityHtml = "";
      let buttonHtml = "";

      if (isMissing) {
        const defaultQty = Number(els.slDefaultQuantity.value) || 3;
        const quantity = Math.max(item.needed, defaultQty);
        quantityHtml = `
          <div class="sl-item-quantity">
            <span>数量</span>
            <input type="number" min="1" max="99" value="${quantity}" data-sl-quantity-missing="${item.char}" />
          </div>
        `;
        buttonHtml = `
          <button class="sl-item-add-btn ${isAdded ? "added" : ""}" type="button" data-sl-add-missing="${item.char}" ${isAdded ? "disabled" : ""}>
            ${isAdded ? "已加入" : "加入字模库"}
          </button>
        `;
      } else if (isLow) {
        const defaultQty = Number(els.slDefaultQuantity.value) || 3;
        const quantity = Math.max(item.shortage, defaultQty);
        quantityHtml = `
          <div class="sl-item-quantity">
            <span>补充</span>
            <input type="number" min="1" max="99" value="${quantity}" data-sl-quantity-low="${item.char}" />
          </div>
        `;
        buttonHtml = `
          <button class="sl-item-add-btn ${isAdded ? "added" : ""}" type="button" data-sl-add-low="${item.char}" ${isAdded ? "disabled" : ""}>
            ${isAdded ? "已补充" : "补充采购"}
          </button>
        `;
      }

      return `
        <div class="sl-item">
          <div class="sl-item-glyph">${escapeHtml(item.char)}</div>
          <div class="sl-item-info">${infoHtml}</div>
          ${quantityHtml}
          ${buttonHtml}
        </div>
      `;
    })
    .join("");
}

function batchUpdateQuantity() {
  if (!slAnalysisResult) return;
  const newQuantity = Number(els.slDefaultQuantity.value) || 3;
  const missingItems = slAnalysisResult.filter((r) => r.status === "missing");
  const lowItems = slAnalysisResult.filter((r) => r.status === "low");

  missingItems.forEach((item) => {
    const inputEl = document.querySelector(`[data-sl-quantity-missing="${item.char}"]`);
    if (inputEl && !slAddedItems.has(`missing-${item.char}`)) {
      inputEl.value = Math.max(item.needed, newQuantity);
    }
  });

  lowItems.forEach((item) => {
    const inputEl = document.querySelector(`[data-sl-quantity-low="${item.char}"]`);
    if (inputEl && !slAddedItems.has(`low-${item.char}`)) {
      inputEl.value = Math.max(item.shortage, newQuantity);
    }
  });
}

function addMissingToInventory(char) {
  const style = els.slDefaultStyle.value.trim();
  if (!style) {
    alert("请先设置默认风格");
    els.slDefaultStyle.focus();
    return;
  }

  const size = Number(els.slDefaultSize.value) || 24;
  const wear = els.slDefaultWear.value;
  const quantityInput = document.querySelector(`[data-sl-quantity-missing="${char}"]`);
  const quantity = quantityInput ? Number(quantityInput.value) : 3;

  const existingItem = state.inventory.find((item) => item.char === char && item.style === style && item.size === size && item.wear === wear);
  if (existingItem) {
    if (!confirm(`字模库中已存在「${char}·${style}」，是否增加数量？`)) return;
    pushHistory();
    existingItem.quantity += quantity;
  } else {
    pushHistory();
    const item = {
      id: crypto.randomUUID(),
      char,
      style,
      size,
      quantity,
      wear
    };
    state.inventory.unshift(item);
    state.selectedTypeId = item.id;
  }

  slAddedItems.add(`missing-${char}`);
  renderShortageList("missing", slAnalysisResult.filter((r) => r.status === "missing"));
  renderAll();
  alert(`已添加「${char}」${quantity}枚到字模库`);
}

function addLowToInventory(char) {
  const style = els.slDefaultStyle.value.trim();
  if (!style) {
    alert("请先设置默认风格");
    els.slDefaultStyle.focus();
    return;
  }

  const size = Number(els.slDefaultSize.value) || 24;
  const wear = els.slDefaultWear.value;
  const quantityInput = document.querySelector(`[data-sl-quantity-low="${char}"]`);
  const quantity = quantityInput ? Number(quantityInput.value) : 1;

  const existingItem = state.inventory.find((item) => item.char === char && item.style === style && item.size === size && item.wear === wear);
  pushHistory();

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    const item = {
      id: crypto.randomUUID(),
      char,
      style,
      size,
      quantity,
      wear
    };
    state.inventory.unshift(item);
    state.selectedTypeId = item.id;
  }

  slAddedItems.add(`low-${char}`);
  renderShortageList("low", slAnalysisResult.filter((r) => r.status === "low"));
  renderAll();
  alert(`已为「${char}」补充${quantity}枚`);
}

function addAllMissing() {
  const missingItems = slAnalysisResult.filter((r) => r.status === "missing");
  if (missingItems.length === 0) return;

  const style = els.slDefaultStyle.value.trim();
  if (!style) {
    alert("请先设置默认风格");
    els.slDefaultStyle.focus();
    return;
  }

  const size = Number(els.slDefaultSize.value) || 24;
  const wear = els.slDefaultWear.value;

  pushHistory();
  let addedCount = 0;

  for (const item of missingItems) {
    const char = item.char;
    if (slAddedItems.has(`missing-${char}`)) continue;

    const quantityInput = document.querySelector(`[data-sl-quantity-missing="${char}"]`);
    const quantity = quantityInput ? Number(quantityInput.value) : item.needed;

    const existingItem = state.inventory.find((i) => i.char === char && i.style === style && i.size === size && i.wear === wear);
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      const newItem = {
        id: crypto.randomUUID(),
        char,
        style,
        size,
        quantity,
        wear
      };
      state.inventory.unshift(newItem);
    }

    slAddedItems.add(`missing-${char}`);
    addedCount++;
  }

  renderShortageList("missing", slAnalysisResult.filter((r) => r.status === "missing"));
  renderAll();
  alert(`已批量添加 ${addedCount} 种缺字到字模库`);
}

function addAllLow() {
  const lowItems = slAnalysisResult.filter((r) => r.status === "low");
  if (lowItems.length === 0) return;

  const style = els.slDefaultStyle.value.trim();
  if (!style) {
    alert("请先设置默认风格");
    els.slDefaultStyle.focus();
    return;
  }

  const size = Number(els.slDefaultSize.value) || 24;
  const wear = els.slDefaultWear.value;

  pushHistory();
  let addedCount = 0;

  for (const item of lowItems) {
    const char = item.char;
    if (slAddedItems.has(`low-${char}`)) continue;

    const quantityInput = document.querySelector(`[data-sl-quantity-low="${char}"]`);
    const quantity = quantityInput ? Number(quantityInput.value) : item.shortage;

    const existingItem = state.inventory.find((i) => i.char === char && i.style === style && i.size === size && i.wear === wear);
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      const newItem = {
        id: crypto.randomUUID(),
        char,
        style,
        size,
        quantity,
        wear
      };
      state.inventory.unshift(newItem);
    }

    slAddedItems.add(`low-${char}`);
    addedCount++;
  }

  renderShortageList("low", slAnalysisResult.filter((r) => r.status === "low"));
  renderAll();
  alert(`已批量补充 ${addedCount} 种字模`);
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
  clearSelection();
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
  clearSelection();
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

if (els.copySelectionBtn) {
  els.copySelectionBtn.addEventListener("click", () => {
    copySelection();
  });
}

if (els.pasteSelectionBtn) {
  els.pasteSelectionBtn.addEventListener("click", () => {
    if (selectionState.isPasteMode) {
      endPasteMode();
    } else {
      startPasteMode();
    }
  });
}

if (els.moveSelectionBtn) {
  els.moveSelectionBtn.addEventListener("click", () => {
    if (selectionState.isMoveMode) {
      endMoveMode();
    } else {
      startMoveMode();
    }
  });
}

if (els.clearSelectionBtn) {
  els.clearSelectionBtn.addEventListener("click", () => {
    clearSelectionContent();
  });
}

if (els.draftFromSelectionBtn) {
  els.draftFromSelectionBtn.addEventListener("click", () => {
    saveDraftFromSelection();
  });
}

if (els.cancelSelectionBtn) {
  els.cancelSelectionBtn.addEventListener("click", () => {
    clearSelection();
  });
}

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

function isEditingText(eventTarget) {
  return eventTarget instanceof HTMLElement && Boolean(eventTarget.closest("input, textarea, select, [contenteditable='true']"));
}

document.addEventListener("keydown", (event) => {
  if (isEditingText(event.target)) return;

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

  if (modKey && event.key.toLowerCase() === "c") {
    if (selectionState.selectedCells.size > 0) {
      event.preventDefault();
      copySelection();
      return;
    }
  }

  if (modKey && event.key.toLowerCase() === "v") {
    if (selectionState.clipboard) {
      event.preventDefault();
      if (selectionState.isPasteMode) {
        endPasteMode();
      } else {
        startPasteMode();
      }
      return;
    }
  }

  if (modKey && event.key.toLowerCase() === "a") {
    event.preventDefault();
    const { cols, rows } = getGrid();
    selectCellRange(0, 0, rows - 1, cols - 1, false);
    return;
  }

  if (event.key === "Escape") {
    if (selectionState.isMoveMode) {
      endMoveMode();
      return;
    }
    if (selectionState.isPasteMode) {
      endPasteMode();
      return;
    }
    if (selectionState.selectedCells.size > 0) {
      clearSelection();
      return;
    }
  }

  if (event.key === "Delete" || event.key === "Backspace") {
    if (selectionState.selectedCells.size > 0) {
      event.preventDefault();
      clearSelectionContent();
      return;
    }
  }

  if (selectionState.isMoveMode && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
    event.preventDefault();
    const bounds = getSelectionBounds();
    if (!bounds) return;

    let newRow = bounds.minRow;
    let newCol = bounds.minCol;

    switch (event.key) {
      case "ArrowUp":
        newRow = Math.max(0, bounds.minRow - 1);
        break;
      case "ArrowDown":
        newRow = Math.min(getGrid().rows - bounds.rows, bounds.minRow + 1);
        break;
      case "ArrowLeft":
        newCol = Math.max(0, bounds.minCol - 1);
        break;
      case "ArrowRight":
        newCol = Math.min(getGrid().cols - bounds.cols, bounds.minCol + 1);
        break;
    }

    if (newRow !== bounds.minRow || newCol !== bounds.minCol) {
      const check = canMoveSelectionTo(newRow, newCol);
      if (check.ok && !check.willOverwrite) {
        moveSelectionTo(newRow, newCol);
      }
    }
    return;
  }

  if (event.key === "Escape" && !els.textLayoutModal.hidden) closeTextLayoutModal();
  if (event.key === "Escape" && !els.importModal.hidden) closeImportModal();
  if (event.key === "Escape" && !els.templateLibraryModal.hidden) closeTemplateLibraryModal();
  if (event.key === "Escape" && !els.exportConfirmModal.hidden) closeExportConfirm();
  if (event.key === "Escape" && !els.shortageListModal.hidden) closeShortageListModal();
  if (event.key === "Escape" && !els.printPreviewModal.hidden) closePrintPreview();
});

els.ppClose.addEventListener("click", closePrintPreview);
els.ppCancel.addEventListener("click", closePrintPreview);

els.ppPageSelect.addEventListener("change", () => {
  printPreviewState.currentPageId = els.ppPageSelect.value;
  updatePrintPreviewPageSelect();
  renderPrintPreview();
});

document.querySelectorAll('input[name="ppPaperColor"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    if (radio.checked) {
      printPreviewState.paperColor = radio.value;
      if (!state.exportSettings) state.exportSettings = { ...printPreviewDefaults };
      state.exportSettings.paperColor = radio.value;
      saveState();
      renderPrintPreview();
    }
  });
});

els.ppInkDepth.addEventListener("input", () => {
  printPreviewState.inkDepth = Number(els.ppInkDepth.value);
  if (!state.exportSettings) state.exportSettings = { ...printPreviewDefaults };
  state.exportSettings.inkDepth = Number(els.ppInkDepth.value);
  els.ppInkValue.textContent = getInkDepthLabel(printPreviewState.inkDepth);
  saveState();
  renderPrintPreview();
});

els.ppBorderToggle.addEventListener("change", () => {
  printPreviewState.showBorder = els.ppBorderToggle.checked;
  if (!state.exportSettings) state.exportSettings = { ...printPreviewDefaults };
  state.exportSettings.showBorder = els.ppBorderToggle.checked;
  saveState();
  renderPrintPreview();
});

els.ppInnerGridToggle.addEventListener("change", () => {
  printPreviewState.showInnerGrid = els.ppInnerGridToggle.checked;
  if (!state.exportSettings) state.exportSettings = { ...printPreviewDefaults };
  state.exportSettings.showInnerGrid = els.ppInnerGridToggle.checked;
  saveState();
  renderPrintPreview();
});

els.ppExportCurrent.addEventListener("click", () => {
  const pageId = printPreviewState.currentPageId || state.currentPageId;
  downloadPrintPage(pageId);
});

els.ppExportAll.addEventListener("click", () => {
  const totalPages = state.pages.length;
  if (totalPages <= 1) {
    const pageId = printPreviewState.currentPageId || state.currentPageId;
    downloadPrintPage(pageId);
    return;
  }
  if (!confirm(`将使用当前预览设置（纸色、墨色、边框）导出全部 ${totalPages} 个页面，是否继续？`)) return;
  downloadPrintAllPages();
});

els.printPreviewModal.addEventListener("click", (event) => {
  if (event.target === els.printPreviewModal) closePrintPreview();
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
  openPrintPreview();
});

els.exportConfirmModal.addEventListener("click", (event) => {
  if (event.target === els.exportConfirmModal) closeExportConfirm();
});

els.shortageListBtn.addEventListener("click", openShortageListModal);
els.slClose.addEventListener("click", closeShortageListModal);
els.slCancel.addEventListener("click", closeShortageListModal);
els.slAnalyze.addEventListener("click", analyzeShortageText);
els.slAddAllMissing.addEventListener("click", addAllMissing);
els.slAddAllLow.addEventListener("click", addAllLow);

els.shortageListModal.addEventListener("click", (event) => {
  if (event.target === els.shortageListModal) closeShortageListModal();

  const addMissingBtn = event.target.closest("[data-sl-add-missing]");
  if (addMissingBtn) {
    addMissingToInventory(addMissingBtn.dataset.slAddMissing);
    return;
  }

  const addLowBtn = event.target.closest("[data-sl-add-low]");
  if (addLowBtn) {
    addLowToInventory(addLowBtn.dataset.slAddLow);
    return;
  }
});

els.slDefaultQuantity.addEventListener("input", batchUpdateQuantity);

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

let selectionDragState = {
  isDragging: false,
  startX: 0,
  startY: 0,
  startCell: null,
  additive: false,
  moved: false
};

els.stage.addEventListener("mousedown", (event) => {
  if (event.button !== 0) return;

  const cellInfo = getCellFromPoint(event.clientX, event.clientY);
  if (!cellInfo) return;

  selectionDragState.isDragging = true;
  selectionDragState.startX = event.clientX;
  selectionDragState.startY = event.clientY;
  selectionDragState.startCell = cellInfo;
  selectionDragState.additive = event.shiftKey;
  selectionDragState.moved = false;

  if (selectionState.isMoveMode || selectionState.isPasteMode) {
    return;
  }

  if (!event.shiftKey) {
    selectionState.selectedCells.clear();
  }
});

document.addEventListener("mousemove", (event) => {
  if (!selectionDragState.isDragging) {
    if (selectionState.isPasteMode) {
      const cellInfo = getCellFromPoint(event.clientX, event.clientY);
      if (cellInfo && (!selectionState.pastePreviewCell ||
          selectionState.pastePreviewCell.row !== cellInfo.row ||
          selectionState.pastePreviewCell.col !== cellInfo.col)) {
        selectionState.pastePreviewCell = cellInfo;
        showPastePreview(cellInfo.row, cellInfo.col);
      } else if (!cellInfo) {
        hidePastePreview();
        selectionState.pastePreviewCell = null;
      }
    }
    return;
  }

  if (selectionState.isMoveMode || selectionState.isPasteMode) {
    return;
  }

  const dx = event.clientX - selectionDragState.startX;
  const dy = event.clientY - selectionDragState.startY;
  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
    selectionDragState.moved = true;
    selectionState.isSelecting = true;
  }

  if (selectionState.isSelecting) {
    updateMarquee(selectionDragState.startX, selectionDragState.startY, event.clientX, event.clientY);

    const currentCell = getCellFromPoint(event.clientX, event.clientY);
    if (currentCell && selectionDragState.startCell) {
      selectCellRange(
        selectionDragState.startCell.row,
        selectionDragState.startCell.col,
        currentCell.row,
        currentCell.col,
        selectionDragState.additive
      );
    }
  }
});

document.addEventListener("mouseup", (event) => {
  if (!selectionDragState.isDragging) return;

  const wasSelecting = selectionState.isSelecting;

  selectionDragState.isDragging = false;
  selectionState.isSelecting = false;
  hideMarquee();

  if (!wasSelecting && selectionDragState.startCell) {
    const { row, col } = selectionDragState.startCell;
    handleStageCellClick(row, col, selectionDragState.additive);
  }

  selectionDragState.startCell = null;
});

function handleStageCellClick(row, col, additive) {
  if (selectionState.isMoveMode) {
    const check = canMoveSelectionTo(row, col);
    if (!check.ok) {
      alert(check.reason);
      return;
    }
    if (check.willOverwrite) {
      if (!confirm(`移动后会覆盖 ${check.overwrittenCount} 个已有落字，是否继续？`)) return;
    }
    moveSelectionTo(row, col);
    return;
  }

  if (selectionState.isPasteMode) {
    const check = canPasteSelection(row, col);
    if (!check.ok) {
      if (check.shortages) {
        const shortageText = check.shortages.map(s => `${s.char}(${s.style}): 需要${s.needed}，可用${s.available}`).join("\n");
        alert(`${check.reason}：\n${shortageText}`);
      } else {
        alert(check.reason);
      }
      return;
    }
    if (check.willOverwrite) {
      if (!confirm(`粘贴后会覆盖 ${check.overwrittenCount} 个已有落字，是否继续？`)) return;
    }
    pasteSelection(row, col);
    return;
  }

  if (additive) {
    const key = placementKey(row, col);
    if (selectionState.selectedCells.has(key)) {
      selectionState.selectedCells.delete(key);
    } else {
      selectionState.selectedCells.add(key);
    }
    updateSelectionUI();
    renderStageSelection();
    return;
  }

  if (selectionState.selectedCells.size > 0) {
    clearSelection();
  }

  placeType(row, col);
}

function canMoveSelectionTo(targetRow, targetCol) {
  if (!selectionState.isMoveMode || selectionState.moveOriginalPlacements.length === 0) {
    return { ok: false, reason: "未处于移动模式或选区内无落字" };
  }

  const bounds = getSelectionBounds();
  if (!bounds) return { ok: false, reason: "没有选区" };

  const offsetRow = targetRow - bounds.minRow;
  const offsetCol = targetCol - bounds.minCol;

  const { cols, rows } = getGrid();
  const outOfBounds = selectionState.moveOriginalPlacements.some((p) => {
    const r = p.row + offsetRow;
    const c = p.col + offsetCol;
    return r < 0 || r >= rows || c < 0 || c >= cols;
  });

  if (outOfBounds) {
    return { ok: false, reason: "移动位置越界" };
  }

  const currentPage = getCurrentPage();
  const originalKeys = new Set(
    selectionState.moveOriginalPlacements.map((p) => placementKey(p.row, p.col))
  );

  const targetPlacements = selectionState.moveOriginalPlacements.map((p) => ({
    row: p.row + offsetRow,
    col: p.col + offsetCol,
    typeId: p.typeId
  }));

  const targetKeys = new Set(targetPlacements.map((p) => placementKey(p.row, p.col)));

  const hasCollision = currentPage.placements.some((pl) => {
    const key = placementKey(pl.row, pl.col);
    return targetKeys.has(key) && !originalKeys.has(key);
  });

  const overwrittenCount = currentPage.placements.filter((pl) => {
    const key = placementKey(pl.row, pl.col);
    return targetKeys.has(key) && !originalKeys.has(key);
  }).length;

  return {
    ok: true,
    willOverwrite: hasCollision,
    overwrittenCount
  };
}

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

    if (draft.exportSettings) {
      state.exportSettings = structuredClone(draft.exportSettings);
    }

    clearSelection();
    renderAll();
  }
  if (deleteButton) {
    state.drafts = state.drafts.filter((item) => item.id !== deleteButton.dataset.deleteDraft);
    renderAll();
  }
});

const viewToggleBtn = document.getElementById("viewToggleArchive");
if (viewToggleBtn) {
  viewToggleBtn.addEventListener("click", () => {
    const nextView = archiveStore.currentView === "editor" ? "archive" : "editor";
    switchView(nextView);
  });
}

const newWorkBtn = document.getElementById("newWorkBtn");
if (newWorkBtn) {
  newWorkBtn.addEventListener("click", () => openWorkNameModal("create"));
}

const archiveGrid = document.getElementById("archiveGrid");
if (archiveGrid) {
  archiveGrid.addEventListener("click", handleArchiveCardClick);
}

const archiveSearch = document.getElementById("archiveSearch");
if (archiveSearch) {
  archiveSearch.addEventListener("input", (e) => {
    archiveStore.searchQuery = e.target.value;
    renderArchiveView();
  });
}

const archiveFilterTabs = document.querySelectorAll("[data-archive-filter]");
archiveFilterTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    archiveFilterTabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    archiveStore.filterMode = tab.dataset.archiveFilter;
    renderArchiveView();
  });
});

const workNameModalClose = document.getElementById("workNameModalClose");
if (workNameModalClose) workNameModalClose.addEventListener("click", closeWorkNameModal);

const workNameModalCancel = document.getElementById("workNameModalCancel");
if (workNameModalCancel) workNameModalCancel.addEventListener("click", closeWorkNameModal);

const workNameModalConfirm = document.getElementById("workNameModalConfirm");
if (workNameModalConfirm) workNameModalConfirm.addEventListener("click", confirmWorkNameModal);

const workNameInput = document.getElementById("workNameInput");
if (workNameInput) {
  workNameInput.addEventListener("input", (e) => {
    if (workNameModalConfirm) {
      workNameModalConfirm.disabled = !e.target.value.trim();
    }
  });
  workNameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && workNameModalConfirm && !workNameModalConfirm.disabled) {
      confirmWorkNameModal();
    }
  });
}

const workNameModal = document.getElementById("workNameModal");
if (workNameModal) {
  workNameModal.addEventListener("click", (e) => {
    if (e.target === workNameModal) closeWorkNameModal();
  });
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && workNameModal && !workNameModal.hidden) {
    closeWorkNameModal();
  }
});

renderAll();
