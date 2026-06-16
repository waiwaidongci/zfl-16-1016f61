const storageKey = "zfl16-movable-type-workshop";
const archiveStorageKey = "zfl16-movable-type-archive";
const archiveMetaKey = "zfl16-movable-type-archive-meta";
const purchaseDraftKey = "zfl16-purchase-drafts";

const printPreviewDefaults = {
  paperColor: "#fffaf1",
  inkDepth: 70,
  showBorder: true,
  showInnerGrid: false
};

const archiveStore = {
  works: {},
  currentWorkId: null,
  currentView: "editor",
  searchQuery: "",
  filterMode: "active",
  sortMode: "updatedAt"
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
    exportSettings: structuredClone(printPreviewDefaults)
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
      newState.exportSettings = structuredClone(printPreviewDefaults);
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
      workState.exportSettings = structuredClone(printPreviewDefaults);
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
  newState.exportSettings = structuredClone(
    workId === archiveStore.currentWorkId && state.exportSettings
      ? state.exportSettings
      : (sourceState.exportSettings || printPreviewDefaults)
  );

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

const WORK_EXPORT_VERSION = 1;

function exportWork(workId) {
  const sourceMeta = archiveStore.works[workId];
  if (!sourceMeta) return;
  const sourceState = loadWorkFromArchive(workId);
  if (!sourceState) return;

  const exportData = {
    version: WORK_EXPORT_VERSION,
    type: "work",
    exportedAt: new Date().toISOString(),
    metadata: {
      name: sourceMeta.name,
      createdAt: sourceMeta.createdAt,
      updatedAt: sourceMeta.updatedAt,
      archived: sourceMeta.archived
    },
    workState: {
      inventory: structuredClone(sourceState.inventory),
      drafts: structuredClone(sourceState.drafts || []),
      workTitle: sourceState.workTitle,
      pages: structuredClone(sourceState.pages),
      exportSettings: structuredClone(sourceState.exportSettings || printPreviewDefaults),
      usageTab: sourceState.usageTab || "current"
    }
  };

  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const safeName = sourceMeta.name.replace(/[\\/:*?"<>|]/g, "_");
  link.download = `作品_${safeName}_${stamp}.json`;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

let pendingWorkImport = null;
let workImportFileInput = null;

function getWorkImportFileInput() {
  if (!workImportFileInput) {
    workImportFileInput = document.createElement("input");
    workImportFileInput.type = "file";
    workImportFileInput.accept = "application/json,.json";
    workImportFileInput.hidden = true;
    workImportFileInput.addEventListener("change", handleWorkImportFile);
    document.body.appendChild(workImportFileInput);
  }
  return workImportFileInput;
}

function openWorkImportModal() {
  const input = getWorkImportFileInput();
  input.value = "";
  input.click();
}

function handleWorkImportFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      processWorkImportData(parsed, file.name);
    } catch {
      alert("文件解析失败：不是有效的JSON格式");
    }
  };
  reader.onerror = () => {
    alert("文件读取失败");
  };
  reader.readAsText(file, "utf-8");
}

function normalizeLegacyWorkData(data) {
  const workState = { ...structuredClone(defaultState), ...data };

  if (!workState.pages || workState.pages.length === 0) {
    const migratedPage = createDefaultPage("第1页");
    if (data.settings) {
      migratedPage.settings = {
        paperSize: data.settings.paperSize || "postcard",
        flowMode: data.settings.flowMode || "horizontal",
        gridGap: data.settings.gridGap || 8
      };
      workState.workTitle = data.settings.workTitle || "晚风小笺";
    }
    if (data.placements) {
      migratedPage.placements = data.placements;
    }
    if (data.activeTemplateId !== undefined) {
      migratedPage.activeTemplateId = data.activeTemplateId;
    }
    workState.pages = [migratedPage];
    workState.currentPageId = migratedPage.id;
  }

  if (!workState.usageTab) workState.usageTab = "current";
  if (!workState.exportSettings) {
    workState.exportSettings = structuredClone(printPreviewDefaults);
  }
  if (!workState.drafts) workState.drafts = [];

  return workState;
}

function processWorkImportData(data, fileName) {
  let importData;
  let isLegacy = false;

  if (data && data.type === "work" && data.version && data.workState && data.metadata) {
    importData = {
      metadata: data.metadata,
      workState: data.workState
    };
  } else if (data && (data.inventory || data.pages || data.placements || data.settings)) {
    isLegacy = true;
    const workState = normalizeLegacyWorkData(data);
    importData = {
      metadata: {
        name: workState.workTitle || "导入的作品",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        archived: false
      },
      workState
    };
  } else {
    alert("JSON格式不正确：无法识别的作品数据格式");
    return;
  }

  const errors = validateWorkImportData(importData.workState);

  const stats = {
    pages: importData.workState.pages?.length || 0,
    types: importData.workState.inventory?.length || 0,
    chars: importData.workState.pages?.reduce((sum, p) => sum + (p.placements?.length || 0), 0) || 0,
    drafts: importData.workState.drafts?.length || 0
  };

  pendingWorkImport = {
    importData,
    isLegacy,
    errors,
    stats,
    fileName
  };

  renderWorkImportModal();
  const modal = document.getElementById("workImportModal");
  if (modal) modal.hidden = false;
}

function validateWorkImportData(workState) {
  const errors = [];

  if (!workState.inventory || !Array.isArray(workState.inventory)) {
    errors.push("字模库数据无效");
  } else {
    workState.inventory.forEach((item, idx) => {
      if (!item.char || !item.style) {
        errors.push(`字模库第${idx + 1}条缺少必要字段（字、风格）`);
      }
    });
  }

  if (!workState.pages || !Array.isArray(workState.pages) || workState.pages.length === 0) {
    errors.push("页面数据无效或为空");
  } else {
    workState.pages.forEach((page, idx) => {
      if (!page.id) errors.push(`第${idx + 1}页缺少页面ID`);
      if (!page.settings) errors.push(`第${idx + 1}页缺少设置信息`);
      if (!Array.isArray(page.placements)) errors.push(`第${idx + 1}页落字数据无效`);
    });
  }

  return errors;
}

function remapWorkIds(workState) {
  const newState = structuredClone(workState);
  const typeIdMap = new Map();

  const remapPlacements = (placements = []) => placements.map(p => {
    const newPlacement = { ...p };
    if (typeIdMap.has(newPlacement.typeId)) {
      newPlacement.typeId = typeIdMap.get(newPlacement.typeId);
    }
    return newPlacement;
  });

  newState.inventory = (newState.inventory || []).map(item => {
    const newItem = { ...item, id: crypto.randomUUID() };
    typeIdMap.set(item.id, newItem.id);
    return newItem;
  });

  if (newState.selectedTypeId && typeIdMap.has(newState.selectedTypeId)) {
    newState.selectedTypeId = typeIdMap.get(newState.selectedTypeId);
  } else if (newState.inventory.length > 0) {
    newState.selectedTypeId = newState.inventory[0].id;
  }

  const oldCurrentPageId = newState.currentPageId;
  const oldPages = newState.pages || [];
  const oldCurrentIndex = oldCurrentPageId
    ? oldPages.findIndex(p => p.id === oldCurrentPageId)
    : -1;

  newState.pages = oldPages.map(page => {
    const newPage = { ...page, id: crypto.randomUUID() };
    newPage.placements = remapPlacements(page.placements);
    return newPage;
  });

  if (newState.pages.length > 0) {
    if (oldCurrentIndex >= 0 && oldCurrentIndex < newState.pages.length) {
      newState.currentPageId = newState.pages[oldCurrentIndex].id;
    } else {
      newState.currentPageId = newState.pages[0].id;
    }
  } else {
    newState.currentPageId = null;
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

  return newState;
}

function renderWorkImportModal() {
  if (!pendingWorkImport) return;
  const { importData, isLegacy, errors, stats, fileName } = pendingWorkImport;

  const summaryEl = document.getElementById("workImportSummary");
  const errorsEl = document.getElementById("workImportErrors");
  const confirmBtn = document.getElementById("workImportConfirm");

  let summaryHtml = `<p>文件：<strong>${escapeHtml(fileName)}</strong></p>`;
  if (isLegacy) {
    summaryHtml += `<p class="import-hint" style="color:var(--gold);">📜 检测为旧版单作品数据格式，已自动迁移</p>`;
  }
  summaryHtml += `<div class="import-stats">`;
  summaryHtml += `<span class="stat-item"><strong>${stats.pages}</strong>页面</span>`;
  summaryHtml += `<span class="stat-item"><strong>${stats.types}</strong>字模</span>`;
  summaryHtml += `<span class="stat-item"><strong>${stats.chars}</strong>落字</span>`;
  summaryHtml += `<span class="stat-item"><strong>${stats.drafts}</strong>草稿</span>`;
  summaryHtml += `</div>`;
  summaryHtml += `<p class="import-hint">作品名称：${escapeHtml(importData.metadata.name || "未命名")}</p>`;
  summaryHtml += `<p class="import-hint">导入后将生成新的作品，不会覆盖现有作品</p>`;

  if (summaryEl) summaryEl.innerHTML = summaryHtml;

  if (errors.length > 0) {
    if (errorsEl) {
      errorsEl.hidden = false;
      errorsEl.innerHTML = `
        <h4>数据警告</h4>
        <ul>${errors.map(e => `<li>${escapeHtml(e)}</li>`).join("")}</ul>
      `;
    }
  } else {
    if (errorsEl) {
      errorsEl.hidden = true;
      errorsEl.innerHTML = "";
    }
  }

  if (confirmBtn) {
    confirmBtn.disabled = stats.pages === 0 || stats.types === 0;
  }
}

function closeWorkImportModal() {
  const modal = document.getElementById("workImportModal");
  if (modal) modal.hidden = true;
  pendingWorkImport = null;
}

function confirmWorkImport() {
  if (!pendingWorkImport) return;

  const { importData } = pendingWorkImport;
  const remappedState = remapWorkIds(importData.workState);

  const workName = importData.metadata.name || "导入的作品";
  const metadata = createWorkMetadata(workName);
  const workId = metadata.id;

  if (importData.metadata.createdAt) {
    metadata.createdAt = importData.metadata.createdAt;
  }
  metadata.updatedAt = Date.now();
  if (importData.metadata.archived !== undefined) {
    metadata.archived = importData.metadata.archived;
  }

  archiveStore.works[workId] = metadata;
  localStorage.setItem(`${archiveStorageKey}-${workId}`, JSON.stringify(remappedState));
  localStorage.setItem(archiveStorageKey, JSON.stringify({ works: archiveStore.works }));

  closeWorkImportModal();
  renderArchiveView();
  alert(`作品「${workName}」导入成功！`);
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
  const sortMode = archiveStore.sortMode || "updatedAt";
  if (sortMode === "pages" || sortMode === "chars") {
    const worksWithStats = works.map(work => ({
      work,
      stats: getWorkStats(work.id)
    }));
    worksWithStats.sort((a, b) => {
      return sortMode === "pages"
        ? b.stats.pages - a.stats.pages
        : b.stats.chars - a.stats.chars;
    });
    return worksWithStats.map(item => item.work);
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
          <button class="work-card-btn" data-action="export" type="button">导出</button>
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
    case "export":
      exportWork(workId);
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
  exportSettings: structuredClone(printPreviewDefaults)
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
  const clipboardCount = selectionState.clipboard && selectionState.clipboard.placements
    ? selectionState.clipboard.placements.length
    : 0;
  if (els.selectionToolbar) {
    els.selectionToolbar.hidden = count === 0 && !selectionState.isPasteMode && !selectionState.clipboard;
  }
  if (els.selectionInfo) {
    if (selectionState.isPasteMode) {
      els.selectionInfo.textContent = `粘贴模式：剪贴板 ${clipboardCount} 个字，点击格子选择粘贴位置`;
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
  if (!selectionState.clipboard || !selectionState.clipboard.placements || selectionState.clipboard.placements.length === 0) return;

  hidePastePreview();

  const check = canPasteSelection(row, col);
  const pasteablePlacements = check.pasteablePlacements || [];
  const invalidPlacements = check.invalidPlacements || [];

  pasteablePlacements.forEach((p) => {
    const r = row + p.offsetRow;
    const c = col + p.offsetCol;
    const cell = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
    if (cell) {
      cell.classList.add("paste-preview");
    }
  });

  invalidPlacements.forEach((p) => {
    const r = row + p.offsetRow;
    const c = col + p.offsetCol;
    const cell = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
    if (cell) {
      cell.classList.add("paste-preview", "paste-preview-invalid");
      if (p.reason === "templateBlocked") {
        cell.classList.add("paste-preview-template-blocked");
      }
    }
  });

  if (els.selectionInfo) {
    if (check.ok) {
      if (check.isPartial) {
        const parts = [];
        parts.push(`可粘贴 ${check.pasteableCount}/${check.totalCount} 个`);
        if (check.outOfBoundsCount > 0) parts.push(`${check.outOfBoundsCount}个越界`);
        if (check.templateBlockedCount > 0) parts.push(`${check.templateBlockedCount}个禁用格`);
        if (check.overwrittenCount > 0) parts.push(`${check.overwrittenCount}个覆盖`);
        els.selectionInfo.textContent = `粘贴模式：${parts.join("，")}`;
      } else {
        let info = `粘贴模式：可粘贴 ${check.pasteableCount} 个`;
        if (check.overwrittenCount > 0) info += `（覆盖 ${check.overwrittenCount} 个）`;
        els.selectionInfo.textContent = info;
      }
    } else {
      els.selectionInfo.textContent = `粘贴模式：${check.reason}`;
    }
  }
}

function hidePastePreview() {
  document.querySelectorAll(".cell.paste-preview").forEach((cell) => {
    cell.classList.remove("paste-preview", "paste-preview-invalid", "paste-preview-template-blocked");
  });
  if (els.selectionInfo && selectionState.isPasteMode) {
    const clipboardCount = selectionState.clipboard && selectionState.clipboard.placements
      ? selectionState.clipboard.placements.length
      : 0;
    els.selectionInfo.textContent = `粘贴模式：剪贴板 ${clipboardCount} 个字，点击格子选择粘贴位置`;
  }
}

function startPasteMode() {
  if (!selectionState.clipboard || !selectionState.clipboard.placements || selectionState.clipboard.placements.length === 0) return;
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

  if (clipboard.length === 0) {
    alert("选区内没有落字，无法复制");
    return;
  }

  selectionState.clipboard = {
    placements: clipboard,
    bounds: { rows: bounds.rows, cols: bounds.cols }
  };

  updateSelectionUI();
}

function canPasteSelection(targetRow, targetCol) {
  if (!selectionState.clipboard || !selectionState.clipboard.placements || selectionState.clipboard.placements.length === 0) {
    return { ok: false, reason: "剪贴板为空", totalCount: 0, pasteableCount: 0, pasteablePlacements: [], invalidPlacements: [] };
  }

  const { cols, rows } = getGrid();
  const { placements, bounds } = selectionState.clipboard;
  const currentPage = getCurrentPage();
  const existingMap = new Map(currentPage.placements.map((item) => [placementKey(item.row, item.col), item]));

  let outOfBoundsCount = 0;
  let templateBlockedCount = 0;
  let overwrittenCount = 0;
  const pasteablePlacements = [];
  const invalidPlacements = [];

  for (const p of placements) {
    const r = targetRow + p.offsetRow;
    const c = targetCol + p.offsetCol;
    const key = placementKey(r, c);

    const outOfBounds = r < 0 || r >= rows || c < 0 || c >= cols;
    const templateBlocked = !outOfBounds && !isTemplateCell(r, c, currentPage);
    const hasExisting = !outOfBounds && !templateBlocked && existingMap.has(key);

    if (outOfBounds) {
      outOfBoundsCount += 1;
      invalidPlacements.push({ ...p, reason: "outOfBounds" });
    } else if (templateBlocked) {
      templateBlockedCount += 1;
      invalidPlacements.push({ ...p, reason: "templateBlocked" });
    } else {
      pasteablePlacements.push(p);
      if (hasExisting) {
        overwrittenCount += 1;
      }
    }
  }

  const totalCount = placements.length;
  const pasteableCount = pasteablePlacements.length;

  if (pasteableCount === 0) {
    let reason = "无法粘贴：";
    const reasons = [];
    if (outOfBoundsCount > 0) reasons.push(`${outOfBoundsCount}个位置越界`);
    if (templateBlockedCount > 0) reasons.push(`${templateBlockedCount}个位置为模板禁用格`);
    if (reasons.length > 0) reason += reasons.join("，");
    return {
      ok: false,
      reason,
      totalCount,
      pasteableCount: 0,
      outOfBoundsCount,
      templateBlockedCount,
      overwrittenCount,
      pasteablePlacements: [],
      invalidPlacements
    };
  }

  const usage = getUsage();
  const needed = {};
  for (const p of pasteablePlacements) {
    needed[p.typeId] = (needed[p.typeId] || 0) + 1;
  }

  const targetKeys = pasteablePlacements.map((p) => placementKey(targetRow + p.offsetRow, targetCol + p.offsetCol));
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
      shortages,
      totalCount,
      pasteableCount,
      outOfBoundsCount,
      templateBlockedCount,
      overwrittenCount,
      pasteablePlacements,
      invalidPlacements
    };
  }

  const isPartial = pasteableCount < totalCount;

  return {
    ok: true,
    isPartial,
    willOverwrite: overwrittenCount > 0,
    totalCount,
    pasteableCount,
    outOfBoundsCount,
    templateBlockedCount,
    overwrittenCount,
    pasteablePlacements,
    invalidPlacements
  };
}

function pasteSelection(targetRow, targetCol) {
  if (!selectionState.clipboard || !selectionState.clipboard.placements || selectionState.clipboard.placements.length === 0) return { success: false, count: 0 };

  const check = canPasteSelection(targetRow, targetCol);
  if (!check.ok) return { success: false, count: 0 };

  const { pasteablePlacements } = check;
  if (pasteablePlacements.length === 0) return { success: false, count: 0 };

  const currentPage = getCurrentPage();
  const targetKeys = pasteablePlacements.map((p) => placementKey(targetRow + p.offsetRow, targetCol + p.offsetCol));

  pushHistory();

  currentPage.placements = currentPage.placements.filter(
    (pl) => !targetKeys.includes(placementKey(pl.row, pl.col))
  );

  for (const p of pasteablePlacements) {
    currentPage.placements.push({
      row: targetRow + p.offsetRow,
      col: targetCol + p.offsetCol,
      typeId: p.typeId
    });
  }

  const newSelection = new Set();
  for (const p of pasteablePlacements) {
    newSelection.add(placementKey(targetRow + p.offsetRow, targetCol + p.offsetCol));
  }
  selectionState.selectedCells = newSelection;
  selectionState.isPasteMode = false;
  selectionState.pastePreviewCell = null;

  renderAll();
  return { success: true, count: pasteablePlacements.length, total: check.totalCount };
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
  wearFilter: document.querySelector("#wearFilter"),
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
  tlSelectionHint: document.querySelector("#tlSelectionHint"),
  tlSelectionInfo: document.querySelector("#tlSelectionInfo"),
  slpPreview: document.querySelector("#slPreview"),
  slpTotalChars: document.querySelector("#slTotalChars"),
  slpPlacedChars: document.querySelector("#slPlacedChars"),
  slpMissingChars: document.querySelector("#slMissingChars"),
  slpShortageChars: document.querySelector("#slShortageChars"),
  slpPagesCount: document.querySelector("#slPagesCount"),
  slpNewPagesBadge: document.querySelector("#slNewPagesBadge"),
  slpNewPagesCount: document.querySelector("#slNewPagesCount"),
  slpPagesList: document.querySelector("#slPagesList"),
  slpMissingList: document.querySelector("#slMissingList"),
  slpShortageList: document.querySelector("#slShortageList"),
  slpAllocationList: document.querySelector("#slAllocationList"),
  slpTabs: document.querySelectorAll(".sl-tab"),
  slpTabContents: document.querySelectorAll(".sl-tab-content"),
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
  slSaveDraft: document.querySelector("#slSaveDraft"),
  slDraftList: document.querySelector("#slDraftList"),
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
  stageContainer: document.querySelector(".stage-container"),
  templateApplyConfirmModal: document.querySelector("#templateApplyConfirmModal"),
  templateApplyConfirmTitle: document.querySelector("#templateApplyConfirmTitle"),
  templateApplyConfirmContent: document.querySelector("#templateApplyConfirmContent"),
  templateApplyConfirmClose: document.querySelector("#templateApplyConfirmClose"),
  templateApplyConfirmCancel: document.querySelector("#templateApplyConfirmCancel"),
  templateApplyConfirmOk: document.querySelector("#templateApplyConfirmOk"),
  testRunner: document.querySelector("#testRunner"),
  testRunnerClose: document.querySelector("#testRunnerClose"),
  runTestsBtn: document.querySelector("#runTestsBtn"),
  testSummary: document.querySelector("#testSummary"),
  testResults: document.querySelector("#testResults")
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
      newState.exportSettings = structuredClone(printPreviewDefaults);
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

function getWearBadgeClass(wear) {
  switch (wear) {
    case "新":
      return "wear-badge wear-new";
    case "微磨":
      return "wear-badge wear-worn";
    case "旧痕":
      return "wear-badge wear-old";
    default:
      return "wear-badge";
  }
}

function renderInventory() {
  const keyword = els.inventorySearch.value.trim();
  const style = els.styleFilter.value;
  const wear = els.wearFilter.value;
  const usage = getUsage();
  const items = state.inventory.filter((item) => {
    const matchesKeyword = !keyword || `${item.char}${item.style}${item.wear}`.includes(keyword);
    const matchesStyle = style === "all" || item.style === style;
    const matchesWear = wear === "all" || item.wear === wear;
    return matchesKeyword && matchesStyle && matchesWear;
  });

  els.inventoryCount.textContent = `${state.inventory.length}枚字模`;
  els.typeList.innerHTML = items
    .map((item) => {
      const used = usage[item.id] || 0;
      const selected = item.id === state.selectedTypeId ? "selected" : "";
      const wearBadgeClass = getWearBadgeClass(item.wear);
      return `
        <article class="type-card ${selected}" draggable="true" data-type-id="${item.id}">
          <div class="glyph" style="font-size:${Math.min(item.size, 36)}px">${escapeHtml(item.char)}</div>
          <div class="type-meta">
            <strong>${escapeHtml(item.char)} · ${escapeHtml(item.style)}</strong>
            <span>${item.size}px · <span class="${wearBadgeClass}">${escapeHtml(item.wear)}</span> · 已用${used}/${item.quantity}</span>
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

let pendingTemplateApply = null;

function openTemplateApplyConfirmModal(templateId, mode) {
  const template = layoutTemplates.find((t) => t.id === templateId);
  if (!template) return;

  pendingTemplateApply = { templateId, mode };

  if (mode === "clear") {
    const currentCount = getCurrentPage().placements.length;
    els.templateApplyConfirmTitle.textContent = "确认清空应用";
    els.templateApplyConfirmContent.innerHTML = `
      <div class="template-apply-confirm">
        <p>即将应用模板：<strong>${escapeHtml(template.name)}</strong></p>
        <p>当前页共有 <strong>${currentCount}</strong> 个落字，应用后将全部清空。</p>
        <p class="warning-text">此操作不可撤销（但可通过撤销功能恢复）。</p>
      </div>
    `;
  } else {
    const compatibility = calculateTemplateCompatibility(templateId, template.recommended.paperSize);
    els.templateApplyConfirmTitle.textContent = "确认保留兼容落字";

    let contentHtml = `
      <div class="template-apply-confirm">
        <p>即将应用模板：<strong>${escapeHtml(template.name)}</strong></p>
        <p>当前页共有 <strong>${compatibility.totalCount}</strong> 个落字。</p>
        <p class="keep-text">✓ 可保留 <strong>${compatibility.keptCount}</strong> 个落在新模板有效位置内的字</p>
    `;

    if (compatibility.removedCount > 0) {
      const removedSummary = generatePositionSummary(compatibility.removed);
      contentHtml += `
        <p class="remove-text">✗ 将移除 <strong>${compatibility.removedCount}</strong> 个超出模板位置的字：</p>
        <p class="position-summary">${escapeHtml(removedSummary)}</p>
      `;
    } else {
      contentHtml += `
        <p class="info-text">所有落字都在新模板有效位置内，将全部保留。</p>
      `;
    }

    contentHtml += `</div>`;
    els.templateApplyConfirmContent.innerHTML = contentHtml;
  }

  els.templateApplyConfirmModal.hidden = false;
}

function closeTemplateApplyConfirmModal() {
  els.templateApplyConfirmModal.hidden = true;
  pendingTemplateApply = null;
}

function confirmTemplateApply() {
  if (!pendingTemplateApply) return;

  applyTemplate(pendingTemplateApply.templateId, pendingTemplateApply.mode);
  closeTemplateApplyConfirmModal();
}

function renderTemplateList() {
  const activeTemplateId = getPageTemplateId();
  const currentPlacementCount = getCurrentPage().placements.length;
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
          <div class="template-apply-buttons">
            <button class="apply-template-clear-btn" type="button" data-apply-template-clear="${template.id}" title="清空当前页所有落字后应用模板">
              ${isActive ? "清空后重新应用" : "清空后应用"}
            </button>
            <button class="primary apply-template-keep-btn" type="button" data-apply-template-keep="${template.id}" title="尽量保留落在新模板有效位置内的字" ${currentPlacementCount === 0 ? "disabled" : ""}>
              ${isActive ? "保留落字重新应用" : "保留兼容落字"}
            </button>
          </div>
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

function applyTemplate(templateId, mode = "clear") {
  const template = layoutTemplates.find((t) => t.id === templateId);
  if (!template) return;

  pushHistory();

  const currentPage = getCurrentPage();
  currentPage.activeTemplateId = templateId;
  currentPage.settings.paperSize = template.recommended.paperSize;
  currentPage.settings.flowMode = template.recommended.flowMode;
  currentPage.settings.gridGap = template.recommended.gridGap;

  if (mode === "keep") {
    const compatibility = calculateTemplateCompatibility(templateId, template.recommended.paperSize);
    currentPage.placements = compatibility.kept;
  } else {
    currentPage.placements = [];
  }

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
let smartLayoutPlan = null;

function getAvailableCellsForLayout(mode, direction) {
  const currentPage = getCurrentPage();
  const { cols, rows } = getGrid(currentPage.settings.paperSize);
  const occupied = new Set(currentPage.placements.map((p) => placementKey(p.row, p.col)));
  const emptyCells = [];

  if (mode === "fillPage") {
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
    return { cells: emptyCells, startCell: null };
  }

  const selectedCells = getSelectedCellsArray();
  if (selectedCells.length === 0) {
    return { cells: [], startCell: null, error: "未选中起始格" };
  }

  const sorted = selectedCells.sort((a, b) => a.row - b.row || a.col - b.col);
  const startCell = sorted[0];

  if (occupied.has(placementKey(startCell.row, startCell.col))) {
    return { cells: [], startCell, error: "起始格已被占用" };
  }
  if (!isTemplateCell(startCell.row, startCell.col, currentPage)) {
    return { cells: [], startCell, error: "起始格不在模板可用区域" };
  }

  const visited = new Set();

  if (direction === "horizontal") {
    for (let row = startCell.row; row < rows; row += 1) {
      const startCol = (row === startCell.row) ? startCell.col : 0;
      for (let col = startCol; col < cols; col += 1) {
        const key = placementKey(row, col);
        if (visited.has(key)) continue;
        visited.add(key);
        if (!occupied.has(key) && isTemplateCell(row, col, currentPage)) {
          emptyCells.push({ row, col });
        }
      }
    }
  } else {
    for (let col = startCell.col; col < cols; col += 1) {
      const startRow = (col === startCell.col) ? startCell.row : 0;
      for (let row = startRow; row < rows; row += 1) {
        const key = placementKey(row, col);
        if (visited.has(key)) continue;
        visited.add(key);
        if (!occupied.has(key) && isTemplateCell(row, col, currentPage)) {
          emptyCells.push({ row, col });
        }
      }
    }
  }

  return { cells: emptyCells, startCell };
}

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
  els.slpPreview.hidden = true;
  els.tlConfirm.disabled = true;
  tlPlan = null;
  smartLayoutPlan = null;
  document.querySelector('input[name="tlDir"][value="horizontal"]').checked = true;
  document.querySelector('input[name="tlMode"][value="fillPage"]').checked = true;
  updateSelectionHint();
  switchSlpTab("pages");
  els.tlText.focus();
}

function updateSelectionHint() {
  const mode = document.querySelector('input[name="tlMode"]:checked').value;
  if (mode !== "fromSelection") {
    els.tlSelectionHint.hidden = true;
    return;
  }

  const selectedCells = getSelectedCellsArray();
  if (selectedCells.length === 0) {
    els.tlSelectionHint.hidden = false;
    els.tlSelectionInfo.textContent = "未检测到选中格，请先在版面上选择一个起始空格。";
    return;
  }

  if (selectedCells.length > 1) {
    const sorted = selectedCells.sort((a, b) => a.row - b.row || a.col - b.col);
    const start = sorted[0];
    els.tlSelectionHint.hidden = false;
    els.tlSelectionInfo.textContent = `检测到多格选中，将从最左上角的格（第${start.row + 1}行，第${start.col + 1}列）开始填充。`;
    return;
  }

  const cell = selectedCells[0];
  const currentPage = getCurrentPage();
  const occupied = new Set(currentPage.placements.map((p) => placementKey(p.row, p.col)));
  const isOccupied = occupied.has(placementKey(cell.row, cell.col));
  const isTemplateOk = isTemplateCell(cell.row, cell.col, currentPage);

  if (isOccupied) {
    els.tlSelectionHint.hidden = false;
    els.tlSelectionInfo.textContent = `选中格（第${cell.row + 1}行，第${cell.col + 1}列）已被占用，请选择一个空格。`;
    return;
  }

  if (!isTemplateOk) {
    els.tlSelectionHint.hidden = false;
    els.tlSelectionInfo.textContent = `选中格（第${cell.row + 1}行，第${cell.col + 1}列）不在模板可用区域内。`;
    return;
  }

  els.tlSelectionHint.hidden = false;
  els.tlSelectionInfo.textContent = `起始位置：第${cell.row + 1}行，第${cell.col + 1}列。将从此格按方向依次填充可用空格。`;
}

function closeTextLayoutModal() {
  els.textLayoutModal.hidden = true;
  tlPlan = null;
  smartLayoutPlan = null;
}

function getCurrentPageIndex() {
  return getPageIndex(state.currentPageId);
}

function analyzeText() {
  const text = els.tlText.value;
  if (!text || !text.trim()) {
    alert("请输入要排版的文本");
    return;
  }

  const direction = document.querySelector('input[name="tlDir"]:checked').value;
  const mode = document.querySelector('input[name="tlMode"]:checked').value;

  let startCell = null;
  const startPageIndex = getCurrentPageIndex();

  if (mode === "fromSelection") {
    const selectedCells = getSelectedCellsArray();
    if (selectedCells.length === 0) {
      alert("请先在版面上选择一个起始空格");
      return;
    }
    const sorted = selectedCells.sort((a, b) => a.row - b.row || a.col - b.col);
    startCell = sorted[0];
    const currentPage = getCurrentPage();
    const occupied = new Set(currentPage.placements.map((p) => placementKey(p.row, p.col)));
    if (occupied.has(placementKey(startCell.row, startCell.col))) {
      alert("起始格已被占用，请选择一个空格");
      return;
    }
    if (!isTemplateCell(startCell.row, startCell.col, currentPage)) {
      alert("起始格不在模板可用区域内");
      return;
    }
  }

  smartLayoutPlan = computeSmartLayout(text, direction, mode, startPageIndex, startCell);
  renderSmartLayoutPreview();

  els.slpPreview.hidden = false;
  els.tlConfirm.disabled = smartLayoutPlan.totalPlaced === 0;

  switchSlpTab("pages");
}

function switchSlpTab(tabName) {
  if (els.slpTabs && els.slpTabs.length) {
    els.slpTabs.forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.slTab === tabName);
    });
  }
  if (els.slpTabContents && els.slpTabContents.length) {
    els.slpTabContents.forEach((content) => {
      content.hidden = content.dataset.slTabContent !== tabName;
    });
  }
}

function renderSmartLayoutPreview() {
  if (!smartLayoutPlan) return;

  const plan = smartLayoutPlan;

  els.slpTotalChars.textContent = plan.totalEffectiveChars;
  els.slpPlacedChars.textContent = plan.totalPlaced;
  els.slpMissingChars.textContent = plan.totalMissing;
  els.slpShortageChars.textContent = plan.totalShortage;
  els.slpPagesCount.textContent = plan.pages.length;

  if (plan.newPagesCount > 0) {
    els.slpNewPagesBadge.hidden = false;
    els.slpNewPagesCount.textContent = plan.newPagesCount;
  } else {
    els.slpNewPagesBadge.hidden = true;
  }

  renderSlpPagesList();
  renderSlpMissingList();
  renderSlpShortageList();
  renderSlpAllocationList();
}

function renderSlpPagesList() {
  if (!smartLayoutPlan || !els.slpPagesList) return;

  const pages = smartLayoutPlan.pages;

  if (pages.length === 0) {
    els.slpPagesList.innerHTML = `<div class="sl-empty">没有可排版的页面</div>`;
    return;
  }

  let html = "";
  for (const page of pages) {
    const paperSizeLabel = page.paperSize === "bookmark" ? "书签" : page.paperSize === "square" ? "方形" : "明信片";
    const newBadge = page.isNew ? `<span class="sl-page-new-badge">新增</span>` : "";
    const missingInfo = page.missingCount > 0 ? `<span class="sl-page-stat sl-stat-missing">跳过缺字 ${page.missingCount}</span>` : "";
    const shortageInfo = page.shortageCount > 0 ? `<span class="sl-page-stat sl-stat-shortage">库存不足 ${page.shortageCount}</span>` : "";

    html += `
      <div class="sl-page-card">
        <div class="sl-page-card-head">
          <span class="sl-page-name">${escapeHtml(page.pageName)}${newBadge}</span>
          <span class="sl-page-size">${paperSizeLabel}</span>
        </div>
        <div class="sl-page-stats">
          <span class="sl-page-stat sl-stat-ok">预计落字 <strong>${page.placementCount}</strong></span>
          ${missingInfo}
          ${shortageInfo}
        </div>
        <div class="sl-page-preview">
          ${renderMiniPagePreview(page)}
        </div>
      </div>
    `;
  }

  els.slpPagesList.innerHTML = html;
}

function renderMiniPagePreview(page) {
  const { cols, rows } = getGrid(page.paperSize);
  const cellSize = Math.min(8, Math.floor(200 / cols));
  const gap = 1;

  const placedMap = new Map(page.placements.map((p) => [placementKey(p.row, p.col), p]));

  let svg = `<svg width="${cols * (cellSize + gap) + gap}" height="${rows * (cellSize + gap) + gap}" class="sl-mini-grid">`;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const x = c * (cellSize + gap) + gap;
      const y = r * (cellSize + gap) + gap;
      const key = placementKey(r, c);
      const isPlaced = placedMap.has(key);
      const fill = isPlaced ? "var(--gold)" : "rgba(139, 119, 101, 0.12)";
      svg += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${fill}" rx="1"/>`;
    }
  }
  svg += `</svg>`;

  return svg;
}

function renderSlpMissingList() {
  if (!smartLayoutPlan || !els.slpMissingList) return;

  const missingChars = smartLayoutPlan.missingChars;

  if (missingChars.length === 0) {
    els.slpMissingList.innerHTML = `<div class="sl-empty">🎉 没有缺字，字模库中包含所有文字</div>`;
    return;
  }

  let html = `<div class="sl-missing-header">共 <strong>${missingChars.length}</strong> 个缺字，排版时将自动跳过</div>`;
  html += `<div class="sl-missing-chars">`;
  for (const ch of missingChars) {
    html += `<span class="sl-missing-char">${escapeHtml(ch)}</span>`;
  }
  html += `</div>`;

  els.slpMissingList.innerHTML = html;
}

function renderSlpShortageList() {
  if (!smartLayoutPlan || !els.slpShortageList) return;

  const shortages = smartLayoutPlan.inventoryShortages;

  if (shortages.length === 0) {
    els.slpShortageList.innerHTML = `<div class="sl-empty">✅ 字模库存充足，所有可落字都有足够库存</div>`;
    return;
  }

  let html = `<div class="sl-shortage-header">共 <strong>${shortages.length}</strong> 种字库存不足，超出部分将自动跳过</div>`;
  html += `<div class="sl-shortage-list">`;
  for (const item of shortages) {
    html += `
      <div class="sl-shortage-item">
        <div class="sl-shortage-char">${escapeHtml(item.char)}</div>
        <div class="sl-shortage-info">
          <div>需要 <strong>${item.needed}</strong> 枚，可用 <strong>${item.available}</strong> 枚</div>
          <div class="sl-shortage-styles">${item.styles.map(s => escapeHtml(s)).join("、")}</div>
        </div>
        <span class="sl-shortage-tag">缺 ${item.needed - item.available} 枚</span>
      </div>
    `;
  }
  html += `</div>`;

  els.slpShortageList.innerHTML = html;
}

function renderSlpAllocationList() {
  if (!smartLayoutPlan || !els.slpAllocationList) return;

  const results = smartLayoutPlan.perCharResults;

  if (results.length === 0) {
    els.slpAllocationList.innerHTML = `<div class="sl-empty">没有字模分配数据</div>`;
    return;
  }

  let html = `<div class="sl-allocation-header">共涉及 <strong>${results.length}</strong> 种文字，优先使用剩余库存多的字模</div>`;
  html += `<div class="sl-allocation-list">`;

  for (const r of results) {
    const statusClass = r.status === "ok" ? "status-ok" : r.status === "low" ? "status-low" : "status-missing";
    const tagClass = r.status === "ok" ? "ok" : r.status === "low" ? "low" : "missing";
    const tagText = r.status === "ok" ? "充足" : r.status === "low" ? "不足" : "缺失";

    let allocHtml = "";
    if (r.status === "missing") {
      allocHtml = `<span class="sl-alloc-none">字模库中无此字</span>`;
    } else {
      const allocatedCount = r.allocations.reduce((sum, a) => sum + a.count, 0);
      allocHtml = `<div class="sl-alloc-total">总可用 ${r.totalAvailable} / 需 ${r.needed}（分配 ${allocatedCount}）</div>`;
      if (r.allocations.length > 0) {
        allocHtml += `<div class="sl-alloc-items">`;
        for (const alloc of r.allocations) {
          allocHtml += `<span class="sl-alloc-item">${escapeHtml(alloc.style)} · ${alloc.count}/${alloc.quantity}</span>`;
        }
        allocHtml += `</div>`;
      }
      if (allocatedCount < r.needed) {
        const short = r.needed - allocatedCount;
        allocHtml += `<div class="sl-alloc-short">缺 ${short} 枚</div>`;
      }
    }

    html += `
      <div class="sl-alloc-row ${statusClass}">
        <div class="sl-alloc-glyph">${escapeHtml(r.char)}</div>
        <div class="sl-alloc-info">
          <div class="sl-alloc-title">${escapeHtml(r.char)}（需${r.needed}枚）</div>
          ${allocHtml}
        </div>
        <span class="sl-alloc-tag ${tagClass}">${tagText}</span>
      </div>
    `;
  }

  html += `</div>`;
  els.slpAllocationList.innerHTML = html;
}

function confirmTextLayout() {
  if (!smartLayoutPlan) return;

  const plan = smartLayoutPlan;

  if (plan.totalPlaced === 0) {
    alert("没有可写入的落字，请检查输入文本和字模库存");
    return;
  }

  const confirmMsg = `确认将排版方案写入版面？\n\n` +
    `• 预计落字：${plan.totalPlaced} 字\n` +
    `• 涉及页面：${plan.pages.length} 页` +
    (plan.newPagesCount > 0 ? `（新增 ${plan.newPagesCount} 页）` : "") +
    `\n• 跳过缺字：${plan.totalMissing} 种\n` +
    `• 库存不足：${plan.totalShortage} 种\n\n` +
    `此操作可通过撤销按钮完整撤回。`;

  if (!confirm(confirmMsg)) return;

  pushHistory();

  const existingPagesCount = state.pages.length;

  for (let i = 0; i < plan.pages.length; i += 1) {
    const pagePlan = plan.pages[i];

    if (pagePlan.isNew) {
      const newIndex = state.pages.length + 1;
      const newPage = {
        id: crypto.randomUUID(),
        name: `第${newIndex}页`,
        settings: { ...state.pages[state.pages.length - 1]?.settings || { paperSize: "postcard", flowMode: "horizontal", gridGap: 8 } },
        placements: [],
        activeTemplateId: state.pages[state.pages.length - 1]?.activeTemplateId || null
      };
      state.pages.push(newPage);
    }
  }

  let pageIdx = 0;
  for (const pagePlan of plan.pages) {
    let targetPage;

    if (pagePlan.isNew) {
      const newPagesBefore = plan.pages.slice(0, pageIdx).filter(p => p.isNew).length;
      const targetIndex = existingPagesCount + newPagesBefore;
      targetPage = state.pages[targetIndex];
    } else {
      targetPage = state.pages[pagePlan.pageIndex];
    }

    if (targetPage) {
      for (const placement of pagePlan.placements) {
        targetPage.placements.push({
          row: placement.row,
          col: placement.col,
          typeId: placement.typeId
        });
      }
    }

    pageIdx += 1;
  }

  const lastPageIndex = plan.pages.length - 1;
  const lastPlan = plan.pages[lastPageIndex];
  if (lastPlan) {
    if (lastPlan.isNew) {
      const newPagesBefore = plan.pages.filter(p => p.isNew).length - 1;
      state.currentPageId = state.pages[existingPagesCount + newPagesBefore].id;
    } else {
      state.currentPageId = state.pages[lastPlan.pageIndex].id;
    }
  }

  closeTextLayoutModal();
  clearSelection();
  renderAll();

  setTimeout(() => {
    alert(`排版完成！\n\n已写入 ${plan.totalPlaced} 字，分布在 ${plan.pages.length} 页上。\n如有需要，可点击撤销按钮撤回全部操作。`);
  }, 100);
}

function getPageAvailableCells(page, direction) {
  const { cols, rows } = getGrid(page.settings.paperSize);
  const occupied = new Set(page.placements.map((p) => placementKey(p.row, p.col)));
  const emptyCells = [];

  if (direction === "horizontal") {
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        if (!occupied.has(placementKey(row, col)) && isTemplateCell(row, col, page)) {
          emptyCells.push({ row, col });
        }
      }
    }
  } else {
    for (let col = 0; col < cols; col += 1) {
      for (let row = 0; row < rows; row += 1) {
        if (!occupied.has(placementKey(row, col)) && isTemplateCell(row, col, page)) {
          emptyCells.push({ row, col });
        }
      }
    }
  }

  return emptyCells;
}

function getPageAvailableCellsFromStart(page, direction, startCell) {
  const { cols, rows } = getGrid(page.settings.paperSize);
  const occupied = new Set(page.placements.map((p) => placementKey(p.row, p.col)));
  const emptyCells = [];
  const visited = new Set();

  if (direction === "horizontal") {
    for (let row = startCell.row; row < rows; row += 1) {
      const startCol = (row === startCell.row) ? startCell.col : 0;
      for (let col = startCol; col < cols; col += 1) {
        const key = placementKey(row, col);
        if (visited.has(key)) continue;
        visited.add(key);
        if (!occupied.has(key) && isTemplateCell(row, col, page)) {
          emptyCells.push({ row, col });
        }
      }
    }
  } else {
    for (let col = startCell.col; col < cols; col += 1) {
      const startRow = (col === startCell.col) ? startCell.row : 0;
      for (let row = startRow; row < rows; row += 1) {
        const key = placementKey(row, col);
        if (visited.has(key)) continue;
        visited.add(key);
        if (!occupied.has(key) && isTemplateCell(row, col, page)) {
          emptyCells.push({ row, col });
        }
      }
    }
  }

  return emptyCells;
}

function computeSmartLayout(text, direction, mode, startPageIndex = 0, startCell = null) {
  const totalUsage = getTotalUsage();
  const usedTypeIds = { ...totalUsage };
  const charCount = {};

  for (const ch of text) {
    if (ch.trim()) {
      charCount[ch] = (charCount[ch] || 0) + 1;
    }
  }

  const pagesPlan = [];
  const missingChars = new Set();
  const inventoryShortages = {};
  const charAllocations = {};

  let charIndex = 0;
  let currentPageIdx = startPageIndex;
  let remainingCells = [];
  let pagesExtended = 0;
  const maxExtraPages = 50;
  const previewPageCache = new Map();

  const getOrCreatePage = (idx) => {
    if (idx < state.pages.length) {
      return state.pages[idx];
    }
    if (previewPageCache.has(idx)) {
      return previewPageCache.get(idx);
    }
    const newIdx = state.pages.length + pagesExtended + 1;
    pagesExtended += 1;
    const newPage = {
      id: `preview-${crypto.randomUUID()}`,
      name: `第${newIdx}页（预排）`,
      settings: { ...state.pages[state.pages.length - 1]?.settings || { paperSize: "postcard", flowMode: "horizontal", gridGap: 8 } },
      placements: [],
      activeTemplateId: state.pages[state.pages.length - 1]?.activeTemplateId || null,
      _isNew: true
    };
    previewPageCache.set(idx, newPage);
    return newPage;
  };

  const initRemainingCells = () => {
    const page = getOrCreatePage(currentPageIdx);
    if (mode === "fromSelection" && currentPageIdx === startPageIndex && startCell) {
      remainingCells = getPageAvailableCellsFromStart(page, direction, startCell);
    } else {
      remainingCells = getPageAvailableCells(page, direction);
    }
  };

  initRemainingCells();

  const charAssignments = [];

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (!ch.trim()) {
      charAssignments.push({ char: ch, typeId: null, status: "whitespace" });
      continue;
    }

    const matchingTypes = state.inventory.filter((item) => item.char === ch);
    if (matchingTypes.length === 0) {
      missingChars.add(ch);
      charAssignments.push({ char: ch, typeId: null, status: "missing" });
      continue;
    }

    const sorted = [...matchingTypes].sort((a, b) => {
      const availA = a.quantity - (usedTypeIds[a.id] || 0);
      const availB = b.quantity - (usedTypeIds[b.id] || 0);
      return availB - availA;
    });

    let assigned = null;
    for (const type of sorted) {
      const currentUsed = usedTypeIds[type.id] || 0;
      if (currentUsed < type.quantity) {
        assigned = type;
        break;
      }
    }

    if (!assigned) {
      if (!inventoryShortages[ch]) {
        const remainingAvailable = matchingTypes.reduce(
          (sum, t) => sum + Math.max(0, t.quantity - (totalUsage[t.id] || 0)), 0
        );
        inventoryShortages[ch] = { char: ch, needed: charCount[ch], available: remainingAvailable, styles: [] };
        inventoryShortages[ch].styles = matchingTypes.map(t => t.style);
      }
      charAssignments.push({ char: ch, typeId: null, status: "shortage" });
      continue;
    }

    usedTypeIds[assigned.id] = (usedTypeIds[assigned.id] || 0) + 1;
    charAssignments.push({ char: ch, typeId: assigned.id, style: assigned.style, status: "ok" });

    if (!charAllocations[ch]) {
      charAllocations[ch] = [];
    }
    const existingAlloc = charAllocations[ch].find(a => a.typeId === assigned.id);
    if (existingAlloc) {
      existingAlloc.count += 1;
    } else {
      charAllocations[ch].push({
        typeId: assigned.id,
        char: assigned.char,
        style: assigned.style,
        count: 1,
        quantity: assigned.quantity
      });
    }
  }

  let cellIdx = 0;
  let pagePlacements = [];
  let pageMissingCount = 0;
  let pageShortageCount = 0;

  const finalizePage = () => {
    const page = getOrCreatePage(currentPageIdx);
    pagesPlan.push({
      pageIndex: currentPageIdx,
      pageId: page.id,
      pageName: page.name,
      isNew: !!page._isNew,
      placements: pagePlacements,
      placementCount: pagePlacements.length,
      missingCount: pageMissingCount,
      shortageCount: pageShortageCount,
      paperSize: page.settings.paperSize
    });
  };

  for (let i = 0; i < charAssignments.length; i += 1) {
    const assignment = charAssignments[i];

    if (assignment.status === "missing") {
      pageMissingCount += 1;
      continue;
    }
    if (assignment.status === "shortage") {
      pageShortageCount += 1;
      continue;
    }
    if (assignment.status === "whitespace") {
      continue;
    }

    if (cellIdx >= remainingCells.length) {
      finalizePage();
      currentPageIdx += 1;

      if (currentPageIdx >= state.pages.length + pagesExtended && pagesExtended >= maxExtraPages) {
        break;
      }

      pagePlacements = [];
      pageMissingCount = 0;
      pageShortageCount = 0;
      cellIdx = 0;
      initRemainingCells();

      if (remainingCells.length === 0) {
        break;
      }
    }

    const cell = remainingCells[cellIdx];
    pagePlacements.push({
      row: cell.row,
      col: cell.col,
      typeId: assignment.typeId,
      char: assignment.char,
      style: assignment.style
    });
    cellIdx += 1;
  }

  if (pagePlacements.length > 0 || pageMissingCount > 0 || pageShortageCount > 0) {
    finalizePage();
  }

  const totalPlaceableChars = charAssignments.filter(a => a.status === "ok").length;
  const totalMissing = missingChars.size;
  const totalShortage = Object.keys(inventoryShortages).length;
  const totalPlaced = pagesPlan.reduce((sum, p) => sum + p.placementCount, 0);
  const newPagesCount = pagesPlan.filter(p => p.isNew).length;

  const perCharResults = [];
  for (const [ch, needed] of Object.entries(charCount)) {
    const matchingTypes = state.inventory.filter((item) => item.char === ch);
    if (matchingTypes.length === 0) {
      perCharResults.push({ char: ch, needed, status: "missing", allocations: [], totalAvailable: 0 });
      continue;
    }
    const totalAvailable = matchingTypes.reduce(
      (sum, t) => sum + Math.max(0, t.quantity - (totalUsage[t.id] || 0)), 0
    );
    const allocations = charAllocations[ch] || [];
    const allocatedCount = allocations.reduce((sum, a) => sum + a.count, 0);
    const status = allocatedCount >= needed ? "ok" : "low";
    perCharResults.push({ char: ch, needed, status, allocations, totalAvailable });
  }

  return {
    text,
    direction,
    mode,
    startPageIndex,
    startCell,
    pages: pagesPlan,
    totalChars: text.length,
    totalEffectiveChars: Object.values(charCount).reduce((s, n) => s + n, 0),
    totalPlaceableChars,
    totalPlaced,
    totalMissing,
    totalShortage,
    newPagesCount,
    missingChars: Array.from(missingChars).sort(),
    inventoryShortages: Object.values(inventoryShortages),
    perCharResults,
    usedTypeIds
  };
}

function renderAll() {
  saveState();
  renderSettings();
  renderStyleFilter();
  renderInventory();
  renderPages();
  renderStage();
  restoreProofreadHighlights();
  renderStageSelection();
  renderUsage();
  renderDrafts();
  renderActiveTemplateLabel();
  updateHistoryButtons();
  updateSelectionUI();
  const proofreadTab = document.querySelector('.panel-tab[data-right-tab="proofread"]');
  if (proofreadTab && proofreadTab.classList.contains("active")) {
    if (cachedProofreadIssues) {
      refreshProofreadFromCache();
    } else {
      renderProofread();
    }
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

function calculateTemplateCompatibility(templateId, paperSize) {
  const template = layoutTemplates.find((t) => t.id === templateId);
  if (!template) return { kept: [], removed: [], keptCount: 0, removedCount: 0 };

  const { cols, rows } = getGrid(paperSize);
  const templatePositions = template.getPositions(cols, rows);
  const templatePositionSet = new Set(templatePositions.map((p) => placementKey(p.row, p.col)));

  const currentPage = getCurrentPage();
  const kept = [];
  const removed = [];

  for (const placement of currentPage.placements) {
    const key = placementKey(placement.row, placement.col);
    if (placement.row < rows && placement.col < cols && templatePositionSet.has(key)) {
      kept.push(placement);
    } else {
      removed.push(placement);
    }
  }

  return {
    kept,
    removed,
    keptCount: kept.length,
    removedCount: removed.length,
    totalCount: currentPage.placements.length
  };
}

function generatePositionSummary(placements, maxDisplay = 8) {
  if (placements.length === 0) return "";

  const summaries = placements.slice(0, maxDisplay).map((p) => {
    const type = state.inventory.find((item) => item.id === p.typeId);
    const char = type ? type.char : "?";
    return `「${char}」(${p.row + 1}行${p.col + 1}列)`;
  });

  if (placements.length > maxDisplay) {
    summaries.push(`...等${placements.length}个`);
  }

  return summaries.join("、");
}

let proofreadHighlightTimer = null;
let activeProofreadHighlight = null;

function clearProofreadHighlights() {
  document.querySelectorAll(".cell.proofread-highlight, .cell.proofread-highlight-warning").forEach((cell) => {
    cell.classList.remove("proofread-highlight", "proofread-highlight-warning");
  });
  if (proofreadHighlightTimer) {
    clearTimeout(proofreadHighlightTimer);
    proofreadHighlightTimer = null;
  }
  activeProofreadHighlight = null;
}

function restoreProofreadHighlights() {
  if (!activeProofreadHighlight) return;
  const { cells, warning } = activeProofreadHighlight;
  const className = warning ? "proofread-highlight-warning" : "proofread-highlight";
  let firstVisibleCell = null;
  cells.forEach(({ row, col, pageId }) => {
    if (pageId !== state.currentPageId) return;
    const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    if (cell) {
      cell.classList.add(className);
      if (!firstVisibleCell) firstVisibleCell = cell;
    }
  });
  if (firstVisibleCell) {
    firstVisibleCell.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
  }
  if (proofreadHighlightTimer) {
    clearTimeout(proofreadHighlightTimer);
  }
  proofreadHighlightTimer = setTimeout(() => {
    clearProofreadHighlights();
  }, 4000);
}

function highlightCells(cells, warning = false) {
  clearProofreadHighlights();
  const className = warning ? "proofread-highlight-warning" : "proofread-highlight";
  activeProofreadHighlight = { cells, warning };
  const firstCell = cells[0];
  const needsPageSwitch = firstCell && firstCell.pageId && firstCell.pageId !== state.currentPageId;
  if (needsPageSwitch) {
    state.currentPageId = firstCell.pageId;
    clearSelection();
    renderAll();
    return;
  }
  requestAnimationFrame(() => {
    cells.forEach(({ row, col }) => {
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
        category: "shortage",
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
        category: "blank",
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
              category: "duplicate",
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
          category: "duplicate",
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
              category: "duplicate",
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
          category: "duplicate",
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
        category: "edge",
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
      category: "empty-title",
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
        category: "export-size",
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
        category: "export-size",
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
        category: "export-size",
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

let cachedProofreadIssues = null;
let proofreadFilterCategory = "all";
let proofreadNavIndex = -1;

function getFilteredIssues() {
  if (!cachedProofreadIssues) return [];
  if (proofreadFilterCategory === "all") return cachedProofreadIssues;
  return cachedProofreadIssues.filter((i) => i.category === proofreadFilterCategory);
}

function runAndCacheProofread() {
  cachedProofreadIssues = runProofread();
  return cachedProofreadIssues;
}

const PROOFREAD_CATEGORY_LABELS = {
  shortage: "库存超量",
  blank: "空白过多",
  duplicate: "连续重复",
  edge: "边缘过密",
  "empty-title": "标题为空",
  "export-size": "导出尺寸异常"
};

function renderProofreadSummary(issues) {
  const errorCount = issues.filter((i) => i.type === "error").length;
  const warningCount = issues.filter((i) => i.type === "warning").length;
  const errorClass = errorCount > 0 ? "error" : "ok";
  const warningClass = warningCount > 0 ? "warning" : "ok";

  const categoryBreakdown = Object.entries(PROOFREAD_CATEGORY_LABELS).map(([cat, label]) => {
    const count = issues.filter((i) => i.category === cat).length;
    if (count === 0) return "";
    const type = issues.find((i) => i.category === cat)?.type || "warning";
    return `<div class="proofread-summary-item ${type === "error" ? "error" : "warning"}" style="font-size:11px;padding:8px 10px;">
      <span class="label">${label}</span>
      <span class="value" style="font-size:14px;">${count}</span>
    </div>`;
  }).join("");

  els.proofreadSummary.innerHTML = `
    <div class="proofread-summary-item ${errorClass}">
      <span class="label">严重问题</span>
      <span class="value">${errorCount} 项</span>
    </div>
    <div class="proofread-summary-item ${warningClass}">
      <span class="label">提示警告</span>
      <span class="value">${warningCount} 项</span>
    </div>
    ${categoryBreakdown}
  `;
}

function renderProofread() {
  const issues = runAndCacheProofread();
  renderProofreadSummary(issues);

  renderProofreadFilterBar(issues);

  const filtered = getFilteredIssues();

  if (filtered.length === 0) {
    els.proofreadIssues.innerHTML = `
      <div class="proofread-empty">
        <div class="proofread-empty-icon">✓</div>
        <div class="proofread-empty-text">排版校对通过</div>
        <div class="proofread-empty-hint">未发现异常问题，可以放心导出</div>
      </div>
    `;
    document.getElementById("proofreadNavBar").hidden = true;
    proofreadNavIndex = -1;
  } else {
    proofreadNavIndex = Math.min(proofreadNavIndex, filtered.length - 1);
    if (proofreadNavIndex < 0) proofreadNavIndex = 0;
    els.proofreadIssues.innerHTML = filtered
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "error" ? -1 : 1;
        return 0;
      })
      .map((issue, idx) => renderProofreadIssueCard(issue, idx))
      .join("");
    updateProofreadNavBar(filtered);
  }

  return issues;
}

function renderProofreadFilterBar(issues) {
  const categoryCounts = { all: issues.length };
  const categories = ["shortage", "blank", "duplicate", "edge", "empty-title", "export-size"];
  categories.forEach((cat) => {
    categoryCounts[cat] = issues.filter((i) => i.category === cat).length;
  });

  document.querySelectorAll("#proofreadFilterBar .proofread-filter-btn").forEach((btn) => {
    const cat = btn.dataset.filterCategory;
    const count = categoryCounts[cat] || 0;
    btn.classList.toggle("active", cat === proofreadFilterCategory);
    if (count > 0 && cat !== "all") {
      btn.setAttribute("data-count", count);
    } else {
      btn.removeAttribute("data-count");
    }
  });
}

function updateProofreadNavBar(filtered) {
  const navBar = document.getElementById("proofreadNavBar");
  const navInfo = document.getElementById("proofreadNavInfo");
  if (filtered.length === 0) {
    navBar.hidden = true;
    return;
  }
  navBar.hidden = false;
  navInfo.textContent = `${proofreadNavIndex + 1} / ${filtered.length}`;
}

function navigateProofreadIssue(direction) {
  const filtered = getFilteredIssues();
  if (filtered.length === 0) return;
  if (direction === "next") {
    proofreadNavIndex = (proofreadNavIndex + 1) % filtered.length;
  } else {
    proofreadNavIndex = (proofreadNavIndex - 1 + filtered.length) % filtered.length;
  }
  const issue = filtered[proofreadNavIndex];

  if (issue.focusElement) {
    const target = document.getElementById(issue.focusElement);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.style.transition = "box-shadow 0.3s";
      target.style.boxShadow = "0 0 0 3px rgba(166, 64, 55, 0.3)";
      setTimeout(() => { target.style.boxShadow = ""; }, 2000);
    }
  }
  if (issue.locations && issue.locations.length > 0) {
    highlightCells(issue.locations, issue.type === "warning");
  }

  updateProofreadActiveItem();
  updateProofreadNavBar(filtered);
}

function renderProofreadIssueCard(issue, idx) {
  const categoryLabel = PROOFREAD_CATEGORY_LABELS[issue.category] || issue.category;
  return `
    <article class="proofread-issue ${issue.type} ${idx === proofreadNavIndex ? "proofread-active" : ""}" data-proofread-id="${issue.id}" data-proofread-idx="${idx}">
      <div class="proofread-issue-head">
        <span class="proofread-issue-title">${escapeHtml(issue.title)}</span>
        <div class="proofread-issue-tags">
          <span class="proofread-issue-category">${escapeHtml(categoryLabel)}</span>
          <span class="proofread-issue-tag ${issue.type}">${issue.type === "error" ? "严重" : "提示"}</span>
        </div>
      </div>
      <div class="proofread-issue-desc">${escapeHtml(issue.desc)}</div>
      <span class="proofread-issue-loc">📍 ${escapeHtml(issue.locText)}</span>
    </article>
  `;
}

function updateProofreadActiveItem() {
  document.querySelectorAll(".proofread-issue.proofread-active").forEach((el) => {
    el.classList.remove("proofread-active");
  });
  const activeEl = document.querySelector(`.proofread-issue[data-proofread-idx="${proofreadNavIndex}"]`);
  if (activeEl) {
    activeEl.classList.add("proofread-active");
    activeEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function refreshProofreadFromCache() {
  if (!cachedProofreadIssues) {
    renderProofread();
    return;
  }
  renderProofreadSummary(cachedProofreadIssues);
  renderProofreadFilterBar(cachedProofreadIssues);
  const filtered = getFilteredIssues();
  if (filtered.length === 0) {
    els.proofreadIssues.innerHTML = `
      <div class="proofread-empty">
        <div class="proofread-empty-icon">✓</div>
        <div class="proofread-empty-text">排版校对通过</div>
        <div class="proofread-empty-hint">未发现异常问题，可以放心导出</div>
      </div>
    `;
    document.getElementById("proofreadNavBar").hidden = true;
    proofreadNavIndex = -1;
    return;
  }
  proofreadNavIndex = Math.min(proofreadNavIndex, filtered.length - 1);
  if (proofreadNavIndex < 0) proofreadNavIndex = 0;
  els.proofreadIssues.innerHTML = filtered
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === "error" ? -1 : 1;
      return 0;
    })
    .map((issue, idx) => renderProofreadIssueCard(issue, idx))
    .join("");
  updateProofreadNavBar(filtered);
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
    if (cachedProofreadIssues) {
      refreshProofreadFromCache();
    } else {
      renderProofread();
    }
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

function loadPurchaseDrafts() {
  const saved = localStorage.getItem(purchaseDraftKey);
  if (!saved) return [];
  try {
    return JSON.parse(saved);
  } catch {
    return [];
  }
}

function savePurchaseDrafts(drafts) {
  localStorage.setItem(purchaseDraftKey, JSON.stringify(drafts));
}

function saveShortageAsDraft() {
  if (!slAnalysisResult) {
    alert("请先分析字模需求");
    return;
  }

  const style = els.slDefaultStyle.value.trim();
  if (!style) {
    alert("请先设置默认风格");
    els.slDefaultStyle.focus();
    return;
  }

  const purchasableItems = slAnalysisResult.filter((r) => r.status === "missing" || r.status === "low");
  if (purchasableItems.length === 0) {
    alert("当前没有缺字或库存不足的字，无需保存草稿");
    return;
  }

  const size = Number(els.slDefaultSize.value) || 24;
  const quantity = Number(els.slDefaultQuantity.value) || 3;
  const wear = els.slDefaultWear.value;
  const sourceText = els.slText.value.trim();
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const draft = {
    id: crypto.randomUUID(),
    name: `采购草稿 ${dateStr}`,
    createdAt: Date.now(),
    defaultStyle: style,
    defaultSize: size,
    defaultWear: wear,
    defaultQuantity: quantity,
    sourceText: sourceText,
    items: purchasableItems.map((item) => {
      const quantityInput = item.status === "missing"
        ? document.querySelector(`[data-sl-quantity-missing="${item.char}"]`)
        : document.querySelector(`[data-sl-quantity-low="${item.char}"]`);
      const itemQty = quantityInput ? Number(quantityInput.value) : (item.status === "missing" ? item.needed : item.shortage);
      return {
        char: item.char,
        status: item.status,
        needed: item.needed,
        quantity: itemQty
      };
    })
  };

  const drafts = loadPurchaseDrafts();
  drafts.unshift(draft);
  savePurchaseDrafts(drafts);
  renderPurchaseDrafts();
  alert(`已保存采购草稿「${draft.name}」，包含 ${draft.items.length} 种字`);
}

function deletePurchaseDraft(draftId) {
  if (!confirm("确定删除此采购草稿？")) return;
  const drafts = loadPurchaseDrafts().filter((d) => d.id !== draftId);
  savePurchaseDrafts(drafts);
  renderPurchaseDrafts();
}

function renamePurchaseDraft(draftId) {
  const drafts = loadPurchaseDrafts();
  const draft = drafts.find((d) => d.id === draftId);
  if (!draft) return;

  const newName = prompt("请输入新的草稿名称：", draft.name);
  if (!newName || !newName.trim()) return;

  draft.name = newName.trim();
  draft.updatedAt = Date.now();
  savePurchaseDrafts(drafts);
  renderPurchaseDrafts();
}

function showDraftDetail(draftId) {
  const drafts = loadPurchaseDrafts();
  const draft = drafts.find((d) => d.id === draftId);
  if (!draft) return;

  const date = new Date(draft.createdAt);
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

  const missingItems = draft.items.filter((i) => i.status === "missing");
  const lowItems = draft.items.filter((i) => i.status === "low");

  const itemsHtml = draft.items
    .map((item) => {
      const statusLabel = item.status === "missing" ? "缺字" : "不足";
      const statusClass = item.status === "missing" ? "red" : "gold";
      return `
        <div class="sl-detail-item">
          <span class="sl-detail-char">${escapeHtml(item.char)}</span>
          <span class="sl-detail-status" style="color:var(--${statusClass})">${statusLabel}</span>
          <span class="sl-detail-qty">需${item.needed}枚</span>
          <span class="sl-detail-qty">采购${item.quantity}枚</span>
        </div>
      `;
    })
    .join("");

  const totalQty = draft.items.reduce((sum, i) => sum + i.quantity, 0);

  const detailHtml = `
    <div class="sl-draft-detail">
      <div class="sl-detail-head">
        <h3>${escapeHtml(draft.name)}</h3>
        <span class="sl-detail-date">创建于 ${dateStr}</span>
      </div>
      <div class="sl-detail-meta">
        <div class="sl-detail-meta-row">
          <span>默认风格：</span><strong>${escapeHtml(draft.defaultStyle)}</strong>
        </div>
        <div class="sl-detail-meta-row">
          <span>字号：</span><strong>${draft.defaultSize}</strong>
        </div>
        <div class="sl-detail-meta-row">
          <span>磨损状态：</span><strong>${escapeHtml(draft.defaultWear)}</strong>
        </div>
        <div class="sl-detail-meta-row">
          <span>默认数量：</span><strong>${draft.defaultQuantity}</strong>
        </div>
      </div>
      <div class="sl-detail-summary">
        <span>共 ${draft.items.length} 种字，${totalQty} 枚</span>
        ${missingItems.length ? `<span style="color:var(--red)">缺字 ${missingItems.length} 种</span>` : ""}
        ${lowItems.length ? `<span style="color:var(--gold)">不足 ${lowItems.length} 种</span>` : ""}
      </div>
      <div class="sl-detail-items-title">采购明细</div>
      <div class="sl-detail-items">${itemsHtml}</div>
      ${draft.sourceText ? `
        <div class="sl-detail-source-title">源文本</div>
        <div class="sl-detail-source">${escapeHtml(draft.sourceText)}</div>
      ` : ""}
    </div>
  `;

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal sl-detail-modal">
      <div class="modal-head">
        <h2>采购草稿详情</h2>
        <button class="mini-btn sl-detail-close" type="button">×</button>
      </div>
      <div class="modal-body">${detailHtml}</div>
      <div class="modal-foot">
        <button class="sl-detail-close" type="button">关闭</button>
        <button class="primary sl-detail-apply" type="button">一键加入字模库</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });
  overlay.querySelectorAll(".sl-detail-close").forEach((btn) => {
    btn.addEventListener("click", () => overlay.remove());
  });
  overlay.querySelector(".sl-detail-apply").addEventListener("click", () => {
    overlay.remove();
    applyPurchaseDraft(draftId);
  });
}

function applyPurchaseDraft(draftId) {
  const drafts = loadPurchaseDrafts();
  const draft = drafts.find((d) => d.id === draftId);
  if (!draft) return;

  const style = draft.defaultStyle;
  const size = draft.defaultSize;
  const wear = draft.defaultWear;

  if (!style) {
    alert("此草稿缺少默认风格设置");
    return;
  }

  pushHistory();
  let addedCount = 0;

  for (const item of draft.items) {
    const existingItem = state.inventory.find((i) => i.char === item.char && i.style === style && i.size === size && i.wear === wear);
    if (existingItem) {
      existingItem.quantity += item.quantity;
    } else {
      const newItem = {
        id: crypto.randomUUID(),
        char: item.char,
        style,
        size,
        quantity: item.quantity,
        wear
      };
      state.inventory.unshift(newItem);
    }
    addedCount++;
  }

  renderAll();
  alert(`已将草稿「${draft.name}」中的 ${addedCount} 种字一键加入字模库`);
}

function renderPurchaseDrafts() {
  const drafts = loadPurchaseDrafts();
  if (!els.slDraftList) return;

  if (drafts.length === 0) {
    els.slDraftList.innerHTML = "";
    return;
  }

  els.slDraftList.innerHTML = drafts
    .map((draft) => {
      const date = new Date(draft.createdAt);
      const timeStr = `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
      const missingCount = draft.items.filter((i) => i.status === "missing").length;
      const lowCount = draft.items.filter((i) => i.status === "low").length;
      const charsPreview = draft.items.map((i) => i.char).join("");

      return `
        <div class="sl-draft-card" data-draft-id="${draft.id}">
          <div class="sl-draft-card-head">
            <span class="sl-draft-card-name">${escapeHtml(draft.name)}</span>
            <span class="sl-draft-card-date">${timeStr}</span>
          </div>
          <div class="sl-draft-card-meta">
            <span>风格 <strong>${escapeHtml(draft.defaultStyle)}</strong></span>
            <span>字号 <strong>${draft.defaultSize}</strong></span>
            <span>磨损 <strong>${escapeHtml(draft.defaultWear)}</strong></span>
            <span>数量 <strong>${draft.defaultQuantity}</strong></span>
          </div>
          <div class="sl-draft-card-chars">${escapeHtml(charsPreview)}</div>
          <div class="sl-draft-card-summary">
            ${missingCount ? `<span style="color:var(--red)">缺字${missingCount}种</span>` : ""}
            ${lowCount ? `<span style="color:var(--gold)">不足${lowCount}种</span>` : ""}
          </div>
          <div class="sl-draft-card-actions">
            <button class="mini-btn primary" type="button" data-draft-apply="${draft.id}">一键加入</button>
            <button class="mini-btn" type="button" data-draft-detail="${draft.id}">详情</button>
            <button class="mini-btn" type="button" data-draft-rename="${draft.id}">重命名</button>
            <button class="mini-btn" type="button" data-draft-delete="${draft.id}">删除</button>
          </div>
        </div>
      `;
    })
    .join("");
}

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
  renderPurchaseDrafts();
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
els.wearFilter.addEventListener("change", renderInventory);
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

document.querySelectorAll('input[name="tlMode"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    updateSelectionHint();
    if (smartLayoutPlan) {
      analyzeText();
    }
  });
});

document.querySelectorAll('input[name="tlDir"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    if (smartLayoutPlan) {
      analyzeText();
    }
  });
});

document.querySelectorAll(".sl-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    const tabName = tab.dataset.slTab;
    if (tabName) {
      switchSlpTab(tabName);
    }
  });
});

els.exportInventoryBtn.addEventListener("click", exportInventory);
els.importInventoryBtn.addEventListener("click", openImportModal);
els.importFileInput.addEventListener("change", handleImportFile);
els.importClose.addEventListener("click", closeImportModal);
els.importCancel.addEventListener("click", closeImportModal);
els.importConfirm.addEventListener("click", confirmImport);

const importWorkBtn = document.getElementById("importWorkBtn");
if (importWorkBtn) {
  importWorkBtn.addEventListener("click", openWorkImportModal);
}
const workImportClose = document.getElementById("workImportClose");
if (workImportClose) {
  workImportClose.addEventListener("click", closeWorkImportModal);
}
const workImportCancel = document.getElementById("workImportCancel");
if (workImportCancel) {
  workImportCancel.addEventListener("click", closeWorkImportModal);
}
const workImportConfirm = document.getElementById("workImportConfirm");
if (workImportConfirm) {
  workImportConfirm.addEventListener("click", confirmWorkImport);
}
const workImportModal = document.getElementById("workImportModal");
if (workImportModal) {
  workImportModal.addEventListener("click", (event) => {
    if (event.target === workImportModal) closeWorkImportModal();
  });
}

els.templateLibraryBtn.addEventListener("click", openTemplateLibraryModal);
els.tlLibraryClose.addEventListener("click", closeTemplateLibraryModal);
els.tlLibraryCancel.addEventListener("click", closeTemplateLibraryModal);
els.clearTemplateBtn.addEventListener("click", clearTemplate);

els.templateList.addEventListener("click", (event) => {
  const applyClearButton = event.target.closest("[data-apply-template-clear]");
  if (applyClearButton) {
    const templateId = applyClearButton.dataset.applyTemplateClear;
    openTemplateApplyConfirmModal(templateId, "clear");
    return;
  }

  const applyKeepButton = event.target.closest("[data-apply-template-keep]");
  if (applyKeepButton && !applyKeepButton.disabled) {
    const templateId = applyKeepButton.dataset.applyTemplateKeep;
    openTemplateApplyConfirmModal(templateId, "keep");
    return;
  }
});

els.templateApplyConfirmClose.addEventListener("click", closeTemplateApplyConfirmModal);
els.templateApplyConfirmCancel.addEventListener("click", closeTemplateApplyConfirmModal);
els.templateApplyConfirmOk.addEventListener("click", confirmTemplateApply);

els.textLayoutModal.addEventListener("click", (event) => {
  if (event.target === els.textLayoutModal) closeTextLayoutModal();
});

els.templateLibraryModal.addEventListener("click", (event) => {
  if (event.target === els.templateLibraryModal) closeTemplateLibraryModal();
});

els.templateApplyConfirmModal.addEventListener("click", (event) => {
  if (event.target === els.templateApplyConfirmModal) closeTemplateApplyConfirmModal();
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
  cachedProofreadIssues = null;
  renderProofread();
});

document.getElementById("proofreadFilterBar").addEventListener("click", (event) => {
  const btn = event.target.closest("[data-filter-category]");
  if (!btn) return;
  proofreadFilterCategory = btn.dataset.filterCategory;
  proofreadNavIndex = 0;
  refreshProofreadFromCache();
});

document.getElementById("proofreadNextBtn").addEventListener("click", () => {
  navigateProofreadIssue("next");
});

document.getElementById("proofreadPrevBtn").addEventListener("click", () => {
  navigateProofreadIssue("prev");
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
  const idx = parseInt(issueEl.dataset.proofreadIdx, 10);
  if (!isNaN(idx)) {
    proofreadNavIndex = idx;
  }
  const filtered = getFilteredIssues();
  const issue = filtered.find((i) => i.id === issueId);
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
  } else {
    updateProofreadActiveItem();
  }
  updateProofreadNavBar(filtered);
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
els.slSaveDraft.addEventListener("click", saveShortageAsDraft);

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

  const applyDraftBtn = event.target.closest("[data-draft-apply]");
  if (applyDraftBtn) {
    applyPurchaseDraft(applyDraftBtn.dataset.draftApply);
    return;
  }

  const deleteDraftBtn = event.target.closest("[data-draft-delete]");
  if (deleteDraftBtn) {
    deletePurchaseDraft(deleteDraftBtn.dataset.draftDelete);
    return;
  }

  const renameDraftBtn = event.target.closest("[data-draft-rename]");
  if (renameDraftBtn) {
    renamePurchaseDraft(renameDraftBtn.dataset.draftRename);
    return;
  }

  const detailDraftBtn = event.target.closest("[data-draft-detail]");
  if (detailDraftBtn) {
    showDraftDetail(detailDraftBtn.dataset.draftDetail);
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
        let detail = "";
        const details = [];
        if (check.outOfBoundsCount > 0) details.push(`${check.outOfBoundsCount}个位置越界`);
        if (check.templateBlockedCount > 0) details.push(`${check.templateBlockedCount}个位置为模板禁用格`);
        if (details.length > 0) detail = `\n详情：${details.join("，")}`;
        alert(check.reason + detail);
      }
      return;
    }
    let confirmed = true;
    let confirmMsg = "";
    if (check.isPartial) {
      const parts = [];
      parts.push(`共${check.totalCount}个字，可粘贴${check.pasteableCount}个`);
      if (check.outOfBoundsCount > 0) parts.push(`${check.outOfBoundsCount}个越界`);
      if (check.templateBlockedCount > 0) parts.push(`${check.templateBlockedCount}个为模板禁用格`);
      confirmMsg = parts.join("，") + "。\n是否粘贴可用部分？";
      confirmed = confirm(confirmMsg);
    } else if (check.willOverwrite) {
      confirmed = confirm(`粘贴后会覆盖 ${check.overwrittenCount} 个已有落字，是否继续？`);
    }
    if (!confirmed) return;
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

const archiveSortTabs = document.querySelectorAll("[data-archive-sort]");
archiveSortTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    archiveSortTabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    archiveStore.sortMode = tab.dataset.archiveSort;
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

(function initTestRunner() {
  const shouldShowTests = new URLSearchParams(window.location.search).get("test") === "1";
  if (!shouldShowTests || !els.testRunner) return;

  els.testRunner.hidden = false;

  const testCases = [];
  function registerTest(name, fn) {
    testCases.push({ name, fn, status: "pending", asserts: [], error: null });
  }

  function createAssert(ctx) {
    return {
      equal(actual, expected, msg) {
        const pass = actual === expected;
        ctx.asserts.push({
          pass,
          msg: msg || `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
        });
        if (!pass) throw new Error(msg || `Assertion failed: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      },
      deepEqual(actual, expected, msg) {
        const pass = JSON.stringify(actual) === JSON.stringify(expected);
        ctx.asserts.push({
          pass,
          msg: msg || `expected deep equal`
        });
        if (!pass) throw new Error(msg || `Assertion failed: deep equal`);
      },
      true(cond, msg) {
        const pass = !!cond;
        ctx.asserts.push({ pass, msg: msg || `expected truthy, got ${JSON.stringify(cond)}` });
        if (!pass) throw new Error(msg || `Assertion failed: expected truthy`);
      },
      false(cond, msg) {
        const pass = !cond;
        ctx.asserts.push({ pass, msg: msg || `expected falsy, got ${JSON.stringify(cond)}` });
        if (!pass) throw new Error(msg || `Assertion failed: expected falsy`);
      },
      includes(arr, item, msg) {
        const pass = Array.isArray(arr) && arr.includes(item);
        ctx.asserts.push({ pass, msg: msg || `expected array to include item` });
        if (!pass) throw new Error(msg || `Assertion failed: array does not include item`);
      },
      gt(a, b, msg) {
        const pass = a > b;
        ctx.asserts.push({ pass, msg: msg || `expected ${a} > ${b}` });
        if (!pass) throw new Error(msg || `Assertion failed: ${a} <= ${b}`);
      }
    };
  }

  function snapshotState() {
    return {
      state: deepCloneState(state),
      historyStack: historyStack.map(deepCloneState),
      redoStack: redoStack.map(deepCloneState),
      pendingImport: pendingImport ? JSON.parse(JSON.stringify(pendingImport, (k, v) => k === "validItems" ? v.map(i => ({ ...i })) : v)) : null
    };
  }

  function restoreState(snap) {
    state = deepCloneState(snap.state);
    historyStack = snap.historyStack.map(deepCloneState);
    redoStack = snap.redoStack.map(deepCloneState);
    pendingImport = snap.pendingImport;
    updateHistoryButtons();
  }

  function buildExportPayload(items) {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      count: items.length,
      inventory: items.map(i => ({
        char: i.char,
        style: i.style,
        size: i.size,
        quantity: i.quantity,
        wear: i.wear
      }))
    };
  }

  function signatureSet(inv) {
    return new Set(inv.map(itemSignature));
  }

  function renderTestResults() {
    let passCount = 0;
    let failCount = 0;
    let html = "";

    testCases.forEach((tc, idx) => {
      if (tc.status === "pass") passCount++;
      if (tc.status === "fail") failCount++;

      const statusLabel = tc.status === "pending" ? "待运行" : tc.status === "pass" ? "通过" : "失败";
      const assertsHtml = tc.asserts.map(a =>
        `<div class="test-assert ${a.pass ? "pass" : "fail"}"><span class="assert-msg">${escapeHtml(a.msg)}</span></div>`
      ).join("");
      const errorHtml = tc.error ? `<div class="test-error">${escapeHtml(tc.error.message || String(tc.error))}</div>` : "";

      html += `
        <div class="test-case" data-idx="${idx}">
          <div class="test-case-head">
            <span class="test-case-name">${escapeHtml(tc.name)}</span>
            <span class="test-case-status ${tc.status}">${statusLabel}</span>
          </div>
          <div class="test-case-body" hidden>
            ${assertsHtml}
            ${errorHtml}
          </div>
        </div>
      `;
    });

    els.testResults.innerHTML = html;
    els.testResults.querySelectorAll(".test-case-head").forEach((head) => {
      head.addEventListener("click", () => {
        const body = head.nextElementSibling;
        if (body) body.hidden = !body.hidden;
      });
    });

    if (passCount + failCount > 0) {
      const total = testCases.length;
      els.testSummary.textContent = `${passCount}/${total} 通过，${failCount} 失败`;
      els.testSummary.className = "test-summary " + (failCount === 0 ? "pass" : "fail");
    } else {
      els.testSummary.textContent = `共 ${testCases.length} 个测试`;
      els.testSummary.className = "test-summary";
    }
  }

  async function runAllTests() {
    for (const tc of testCases) {
      tc.status = "pending";
      tc.asserts = [];
      tc.error = null;
    }
    renderTestResults();

    for (const tc of testCases) {
      const snap = snapshotState();
      const ctx = { asserts: tc.asserts };
      const assert = createAssert(ctx);
      try {
        await tc.fn(assert);
        tc.status = "pass";
      } catch (e) {
        tc.status = "fail";
        tc.error = e;
      } finally {
        restoreState(snap);
        saveState();
        renderAll();
        renderTestResults();
      }
    }
  }

  // ========= 测试用例 1：导出格式回读 =========
  registerTest("1. 导出格式回读：导出→再导入，数据一致性", async (assert) => {
    const seedItems = [
      { char: "春", style: "宋体旧字", size: 28, quantity: 5, wear: "新" },
      { char: "夏", style: "楷体木刻", size: 24, quantity: 3, wear: "微磨" },
      { char: "秋", style: "黑体铅字", size: 32, quantity: 2, wear: "旧痕" }
    ];

    const payload = buildExportPayload(seedItems);
    assert.equal(payload.version, 1, "导出payload.version === 1");
    assert.equal(payload.count, 3, "导出count === 3");
    assert.equal(payload.inventory.length, 3, "导出inventory数组长度正确");
    assert.true(typeof payload.exportedAt === "string", "exportedAt字段存在");

    processImportData(payload, "字模库_test.json");
    assert.true(pendingImport !== null, "pendingImport被设置");
    assert.equal(pendingImport.validItems.length, 3, "3条均为有效条目");
    assert.equal(pendingImport.allErrors.length, 0, "无校验错误");

    const exportedSigs = new Set(seedItems.map(itemSignature));
    const importedSigs = new Set(pendingImport.validItems.map(itemSignature));
    assert.equal(importedSigs.size, exportedSigs.size, "签名集合大小一致");
    for (const s of exportedSigs) assert.true(importedSigs.has(s), `导入后存在签名 ${s}`);

    pendingImport.validItems.forEach((it) => {
      assert.true(typeof it.id === "string" && it.id.length > 0, "每个导入条目分配了id");
    });
  });

  // ========= 测试用例 2：数组格式导入 =========
  registerTest("2. 数组格式导入：直接传数组而非带inventory字段的对象", async (assert) => {
    const rawArray = [
      { char: "甲", style: "宋体旧字", size: 26, quantity: 4, wear: "新" },
      { char: "乙", style: "楷体木刻", size: 22, quantity: 2, wear: "微磨" }
    ];

    processImportData(rawArray, "array_format.json");
    assert.true(pendingImport !== null, "数组格式也能触发pendingImport");
    assert.equal(pendingImport.validItems.length, 2, "数组格式两条均有效");
    assert.equal(pendingImport.allErrors.length, 0, "数组格式无校验错误");
    assert.equal(pendingImport.validItems[0].char, "甲", "第一条内容正确：甲");
    assert.equal(pendingImport.validItems[1].char, "乙", "第二条内容正确：乙");
  });

  // ========= 测试用例 3：非法字段被跳过 =========
  registerTest("3. 非法char/size/quantity/wear被正确跳过", async (assert) => {
    const mixed = [
      { char: "好", style: "宋体旧字", size: 24, quantity: 3, wear: "新" },
      { char: "", style: "宋体旧字", size: 24, quantity: 3, wear: "新" },
      { char: "太长超过两字", style: "宋体旧字", size: 24, quantity: 3, wear: "新" },
      { char: "字", style: "", size: 24, quantity: 3, wear: "新" },
      { char: "字", style: "风格", size: 7, quantity: 3, wear: "新" },
      { char: "字", style: "风格", size: 100, quantity: 3, wear: "新" },
      { char: "字", style: "风格", size: 24.5, quantity: 3, wear: "新" },
      { char: "字", style: "风格", size: 24, quantity: 0, wear: "新" },
      { char: "字", style: "风格", size: 24, quantity: 100, wear: "新" },
      { char: "字", style: "风格", size: 24, quantity: 1.5, wear: "新" },
      { char: "字", style: "风格", size: 24, quantity: 3, wear: "完美" },
      { char: "字", style: "风格", size: 24, quantity: 3, wear: null },
      "not an object",
      null,
      { char: "正", style: "楷体木刻", size: 28, quantity: 5, wear: "旧痕" }
    ];

    processImportData(mixed, "mixed_invalid.json");
    assert.true(pendingImport !== null, "处理完成");
    assert.equal(pendingImport.validItems.length, 2, "仅2条合法条目被保留");
    assert.gt(pendingImport.allErrors.length, 0, "产生了校验错误");
    assert.equal(pendingImport.validItems[0].char, "好", "合法条目1：好");
    assert.equal(pendingImport.validItems[1].char, "正", "合法条目2：正");

    const errText = pendingImport.allErrors.join("|");
    assert.true(errText.includes("字"), "错误信息包含「字」字段提示");
    assert.true(errText.includes("字号"), "错误信息包含「字号」字段提示");
    assert.true(errText.includes("数量"), "错误信息包含「数量」字段提示");
    assert.true(errText.includes("磨损状态"), "错误信息包含「磨损状态」字段提示");
  });

  // ========= 测试用例 4：合并模式去重 =========
  registerTest("4. 合并模式去重：与现有重复、导入内部重复均被跳过", async (assert) => {
    state.inventory = [
      { id: crypto.randomUUID(), char: "天", style: "宋体旧字", size: 24, quantity: 3, wear: "新" },
      { id: crypto.randomUUID(), char: "地", style: "楷体木刻", size: 28, quantity: 2, wear: "微磨" }
    ];
    state.selectedTypeId = state.inventory[0].id;
    const beforeCount = state.inventory.length;
    const beforeSigs = signatureSet(state.inventory);

    const importData = [
      { char: "天", style: "宋体旧字", size: 24, quantity: 3, wear: "新" },
      { char: "天", style: "宋体旧字", size: 24, quantity: 3, wear: "新" },
      { char: "人", style: "黑体铅字", size: 26, quantity: 4, wear: "旧痕" },
      { char: "人", style: "黑体铅字", size: 26, quantity: 4, wear: "旧痕" },
      { char: "和", style: "仿宋细字", size: 22, quantity: 2, wear: "新" }
    ];

    processImportData(importData, "dedup_test.json");
    assert.equal(pendingImport.validItems.length, 5, "5条数据本身都合法");
    assert.equal(pendingImport.newUniqueCount, 2, "真正新增的只有2条（人、和）");
    assert.equal(pendingImport.duplicateCount, 3, "3条被识别为重复（1条现有重复 + 2条内部重复）");

    const savedModeRadio = document.querySelector('input[name="importMode"][value="merge"]');
    const savedChecked = savedModeRadio.checked;
    savedModeRadio.checked = true;
    try {
      confirmImport();
    } finally {
      savedModeRadio.checked = savedChecked;
    }

    assert.equal(state.inventory.length, beforeCount + 2, "合并后仅净增2条");
    const afterSigs = signatureSet(state.inventory);
    for (const s of beforeSigs) assert.true(afterSigs.has(s), `原有签名 ${s} 仍然存在`);
    assert.true(afterSigs.has(itemSignature({ char: "人", style: "黑体铅字", size: 26, quantity: 4, wear: "旧痕" })), "新增「人」存在");
    assert.true(afterSigs.has(itemSignature({ char: "和", style: "仿宋细字", size: 22, quantity: 2, wear: "新" })), "新增「和」存在");
  });

  // ========= 测试用例 5：覆盖模式清空版面落字 =========
  registerTest("5. 覆盖模式：清空版面落字 + 替换字模库", async (assert) => {
    state.inventory = [
      { id: crypto.randomUUID(), char: "旧", style: "宋体旧字", size: 24, quantity: 3, wear: "新" }
    ];
    state.selectedTypeId = state.inventory[0].id;
    const pageA = createDefaultPage("页A");
    const pageB = createDefaultPage("页B");
    pageA.placements = [
      { typeId: state.inventory[0].id, row: 0, col: 0 },
      { typeId: state.inventory[0].id, row: 0, col: 1 }
    ];
    pageB.placements = [
      { typeId: state.inventory[0].id, row: 1, col: 0 }
    ];
    state.pages = [pageA, pageB];
    state.currentPageId = pageA.id;

    const overwriteData = [
      { char: "新", style: "黑体铅字", size: 30, quantity: 5, wear: "微磨" },
      { char: "来", style: "楷体木刻", size: 28, quantity: 2, wear: "新" }
    ];

    processImportData(overwriteData, "overwrite_test.json");
    assert.equal(pendingImport.validItems.length, 2, "覆盖导入：2条有效");

    const savedModeRadio = document.querySelector('input[name="importMode"][value="overwrite"]');
    const savedChecked = savedModeRadio.checked;
    const mergeRadio = document.querySelector('input[name="importMode"][value="merge"]');
    const mergeWasChecked = mergeRadio.checked;
    mergeRadio.checked = false;
    savedModeRadio.checked = true;
    try {
      confirmImport();
    } finally {
      savedModeRadio.checked = savedChecked;
      mergeRadio.checked = mergeWasChecked;
    }

    assert.equal(state.inventory.length, 2, "覆盖后字模库仅含导入的2条");
    const overwriteSigs = signatureSet(state.inventory);
    assert.true(overwriteSigs.has(itemSignature({ char: "新", style: "黑体铅字", size: 30, quantity: 5, wear: "微磨" })), "覆盖后存在「新」");
    assert.true(overwriteSigs.has(itemSignature({ char: "来", style: "楷体木刻", size: 28, quantity: 2, wear: "新" })), "覆盖后存在「来」");
    assert.false(overwriteSigs.has(itemSignature({ char: "旧", style: "宋体旧字", size: 24, quantity: 3, wear: "新" })), "覆盖后「旧」被移除");

    state.pages.forEach((p, i) => {
      assert.equal(p.placements.length, 0, `覆盖模式：第${i + 1}页(${p.name}) placements被清空`);
    });

    if (state.inventory.length > 0) {
      assert.true(state.inventory.some(i => i.id === state.selectedTypeId), "覆盖后selectedTypeId指向新字模之一");
    }
  });

  // ========= 初始化UI =========
  els.testRunnerClose.addEventListener("click", () => {
    els.testRunner.hidden = true;
  });
  els.runTestsBtn.addEventListener("click", () => {
    runAllTests();
  });

  renderTestResults();
})();
