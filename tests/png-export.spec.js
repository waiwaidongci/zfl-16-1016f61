const { test, expect } = require("@playwright/test");
const { PNG } = require("pngjs");
const fs = require("fs");
const path = require("path");
const os = require("os");

const STORAGE_KEYS = [
  "zfl16-movable-type-workshop",
  "zfl16-movable-type-archive",
  "zfl16-movable-type-archive-meta",
  "zfl16-purchase-drafts"
];

const SNAPSHOT_DIR = path.join(__dirname, "snapshots");

async function ensureSnapshotDir() {
  if (!fs.existsSync(SNAPSHOT_DIR)) {
    fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  }
}

async function resetStorage(page) {
  await page.goto("/index.html");
  await page.evaluate((keys) => {
    keys.forEach((k) => localStorage.removeItem(k));
  }, STORAGE_KEYS);
  await page.waitForTimeout(100);
}

async function gotoFresh(page) {
  await resetStorage(page);
  await page.goto("/index.html");
  await page.waitForSelector("#stage");
  await page.waitForTimeout(300);
}

function parsePng(buffer) {
  return new Promise((resolve, reject) => {
    new PNG().parse(buffer, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

async function readDownloadBuffer(download) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pw-download-"));
  const savePath = path.join(tmpDir, download.suggestedFilename());
  await download.saveAs(savePath);
  const buffer = fs.readFileSync(savePath);
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch (_) {}
  return buffer;
}

async function openPrintPreview(page) {
  await page.click("#exportBtn");
  await page.waitForTimeout(300);

  const confirmVisible = await page.locator("#exportConfirmModal").isVisible();
  if (confirmVisible) {
    await page.click("#exportConfirmOk");
    await page.waitForTimeout(300);
  }

  await expect(page.locator("#printPreviewModal")).toBeVisible({ timeout: 10000 });
}

async function closePrintPreview(page) {
  const visible = await page.locator("#printPreviewModal").isVisible();
  if (visible) {
    await page.click("#ppClose");
    await page.waitForTimeout(200);
  }
}

test.describe("PNG导出验证套件", () => {
  test.beforeAll(async () => {
    await ensureSnapshotDir();
  });

  test.beforeEach(async ({ page }) => {
    await gotoFresh(page);
  });

  test.afterEach(async ({ page }) => {
    try {
      await closePrintPreview(page);
    } catch (_) {}
  });

  test("1. 导出预览图 - 空白版面PNG生成验证", async ({ page }) => {
    test.setTimeout(30000);

    await page.fill("#workTitle", "PNG测试空白版");
    await page.waitForTimeout(100);

    await openPrintPreview(page);

    const canvas = page.locator("#ppPreviewCanvas");
    await expect(canvas).toBeVisible();

    const canvasSize = await page.evaluate(() => ({
      width: document.getElementById("ppPreviewCanvas").width,
      height: document.getElementById("ppPreviewCanvas").height
    }));
    expect(canvasSize.width).toBeGreaterThan(0);
    expect(canvasSize.height).toBeGreaterThan(0);
    expect(canvasSize.width).toBeGreaterThanOrEqual(320);
    expect(canvasSize.height).toBeGreaterThanOrEqual(320);

    const downloadPromise = page.waitForEvent("download");
    await page.click("#ppExportCurrent");
    const download = await downloadPromise;

    const filename = download.suggestedFilename();
    expect(filename).toMatch(/\.png$/i);
    expect(filename).toContain("PNG测试空白版");

    const buffer = await readDownloadBuffer(download);
    expect(buffer.length).toBeGreaterThan(1000);

    const pngData = await parsePng(buffer);
    expect(pngData.width).toBe(canvasSize.width);
    expect(pngData.height).toBe(canvasSize.height);
    expect(pngData.data.length).toBe(pngData.width * pngData.height * 4);

    const snapshotPath = path.join(SNAPSHOT_DIR, "empty-board.png");
    if (!fs.existsSync(snapshotPath)) {
      fs.writeFileSync(snapshotPath, buffer);
      console.log(`  ℹ️  已保存基准快照: ${snapshotPath}`);
    } else {
      const baselineBuffer = fs.readFileSync(snapshotPath);
      const baselinePng = await parsePng(baselineBuffer);
      expect(baselinePng.width).toBe(pngData.width);
      expect(baselinePng.height).toBe(pngData.height);
    }
  });

  test("2. 导出预览图 - 带字模的版面PNG验证", async ({ page }) => {
    test.setTimeout(30000);

    await page.fill("#workTitle", "PNG测试带字版");
    await page.waitForTimeout(100);

    await page.evaluate(() => {
      state.selectedTypeId = state.inventory[0].id;
      renderAll();
    });
    await page.waitForTimeout(200);

    const cells = page.locator("#stage .cell");
    const cellCount = await cells.count();
    const positions = [0, 1, 10, 11, 20];
    for (const pos of positions) {
      if (pos < cellCount) {
        await cells.nth(pos).click({ timeout: 2000 }).catch(() => {});
        await page.waitForTimeout(100);
      }
    }
    await page.waitForTimeout(200);

    const placementCount = await page.evaluate(() => getPagePlacements().length);
    expect(placementCount).toBeGreaterThanOrEqual(3);

    await openPrintPreview(page);

    const downloadPromise = page.waitForEvent("download");
    await page.click("#ppExportCurrent");
    const download = await downloadPromise;

    const filename = download.suggestedFilename();
    expect(filename).toMatch(/\.png$/i);

    const buffer = await readDownloadBuffer(download);
    expect(buffer.length).toBeGreaterThan(2000);

    const pngData = await parsePng(buffer);
    expect(pngData.width).toBeGreaterThan(320);
    expect(pngData.height).toBeGreaterThan(320);

    let nonEmptyPixels = 0;
    const step = 4;
    for (let i = 0; i < pngData.data.length; i += step * 4) {
      const r = pngData.data[i];
      const g = pngData.data[i + 1];
      const b = pngData.data[i + 2];
      if (r < 250 || g < 245 || b < 235) {
        nonEmptyPixels++;
      }
    }
    expect(nonEmptyPixels).toBeGreaterThan(10);

    const snapshotPath = path.join(SNAPSHOT_DIR, "filled-board.png");
    if (!fs.existsSync(snapshotPath)) {
      fs.writeFileSync(snapshotPath, buffer);
      console.log(`  ℹ️  已保存基准快照: ${snapshotPath}`);
    }
  });

  test("3. 导出预览图 - 打印预览Canvas参数完整性", async ({ page }) => {
    test.setTimeout(30000);

    await page.fill("#workTitle", "Canvas渲染测试");
    await page.waitForTimeout(100);

    await page.evaluate(() => {
      state.selectedTypeId = state.inventory[2]?.id || state.inventory[0].id;
      renderAll();
    });
    await page.waitForTimeout(200);

    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 2; c++) {
        const idx = r * 5 + c;
        const cell = page.locator("#stage .cell").nth(idx);
        if (await cell.isVisible({ timeout: 1000 })) {
          await cell.click({ timeout: 2000 }).catch(() => {});
          await page.waitForTimeout(100);
        }
      }
    }
    await page.waitForTimeout(200);

    await openPrintPreview(page);

    const previewInfo = await page.evaluate(() => ({
      paperColor: document.querySelector('input[name="ppPaperColor"]:checked')?.value,
      hasBorderToggle: !!document.getElementById("ppBorderToggle"),
      hasInnerGridToggle: !!document.getElementById("ppInnerGridToggle"),
      pageInfo: document.getElementById("ppPageInfo")?.textContent || ""
    }));

    expect(previewInfo.paperColor).toBeDefined();
    expect(previewInfo.hasBorderToggle).toBe(true);
    expect(previewInfo.hasInnerGridToggle).toBe(true);

    const paperRadios = await page.$$('input[name="ppPaperColor"]');
    expect(paperRadios.length).toBeGreaterThan(0);

    const downloadPromise = page.waitForEvent("download");
    await page.click("#ppExportCurrent");
    const download = await downloadPromise;

    const buffer = await readDownloadBuffer(download);
    const pngData = await parsePng(buffer);

    expect(pngData.width).toBeGreaterThan(0);
    expect(pngData.height).toBeGreaterThan(0);

    let inkPixels = 0;
    for (let i = 0; i < pngData.data.length; i += 16) {
      const r = pngData.data[i];
      const g = pngData.data[i + 1];
      const b = pngData.data[i + 2];
      const avg = (r + g + b) / 3;
      if (avg < 180) {
        inkPixels++;
      }
    }
    expect(inkPixels).toBeGreaterThan(5);

    const snapshotPath = path.join(SNAPSHOT_DIR, "styled-board.png");
    if (!fs.existsSync(snapshotPath)) {
      fs.writeFileSync(snapshotPath, buffer);
      console.log(`  ℹ️  已保存基准快照: ${snapshotPath}`);
    }
  });

  test("4. 导出预览图 - 多纸张尺寸PNG导出", async ({ page }) => {
    test.setTimeout(45000);

    const paperSizes = [
      { value: "postcard", label: "明信片" },
      { value: "bookmark", label: "书签" },
      { value: "square", label: "方形小笺" }
    ];

    const results = [];

    for (const size of paperSizes) {
      await page.selectOption("#paperSize", size.value);
      await page.waitForTimeout(300);

      await page.fill("#workTitle", `PNG-${size.label}`);
      await page.waitForTimeout(100);

      await openPrintPreview(page);

      const canvasSize = await page.evaluate(() => ({
        width: document.getElementById("ppPreviewCanvas").width,
        height: document.getElementById("ppPreviewCanvas").height
      }));

      results.push({ size: size.label, ...canvasSize });

      await closePrintPreview(page);
      await page.waitForTimeout(200);
    }

    expect(results.length).toBe(3);
    results.forEach((r) => {
      expect(r.width).toBeGreaterThan(300);
      expect(r.height).toBeGreaterThan(300);
    });

    const bookmark = results.find((r) => r.size === "书签");
    if (bookmark) {
      expect(bookmark.height).toBeGreaterThan(bookmark.width);
    }
  });
});
