const { test, expect } = require("@playwright/test");

const STORAGE_KEYS = [
  "zfl16-movable-type-workshop",
  "zfl16-movable-type-archive",
  "zfl16-movable-type-archive-meta",
  "zfl16-purchase-drafts"
];

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

test.describe("冒烟测试套件", () => {
  test.beforeEach(async ({ page }) => {
    await gotoFresh(page);
  });

  test("1. 应用启动并渲染核心UI", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("活字排版工坊");
    await expect(page.locator("#editorView")).toBeVisible();
    await expect(page.locator("#stage")).toBeVisible();
    await expect(page.locator("#typeList")).toBeVisible();
    await expect(page.locator("#workTitle")).toBeVisible();
  });

  test("2. 新增字模功能正常", async ({ page }) => {
    const initialCount = await page.evaluate(() => state.inventory.length);

    await page.fill("#charInput", "龍");
    await page.fill("#styleInput", "黑体篆刻");
    await page.fill("#sizeInput", "28");
    await page.fill("#quantityInput", "5");
    await page.selectOption("#wearInput", "新");
    await page.click("#typeForm button[type='submit']");

    await page.waitForTimeout(300);

    const newCount = await page.evaluate(() => state.inventory.length);
    expect(newCount).toBe(initialCount + 1);

    const latest = await page.evaluate(() => state.inventory[0]);
    expect(latest.char).toBe("龍");
    expect(latest.style).toBe("黑体篆刻");
    expect(latest.size).toBe(28);
    expect(latest.quantity).toBe(5);
    expect(latest.wear).toBe("新");

    const inventoryCount = await page.textContent("#inventoryCount");
    expect(inventoryCount).toContain(String(newCount));
  });

  test("3. 落字功能正常 - 点击网格放置字模", async ({ page }) => {
    const targetChar = await page.evaluate(() => {
      state.selectedTypeId = state.inventory[0].id;
      renderAll();
      return state.inventory[0].char;
    });
    await page.waitForTimeout(200);

    const firstCell = page.locator("#stage .cell").first();
    await expect(firstCell).toBeVisible();
    await firstCell.click();
    await page.waitForTimeout(300);

    const placements = await page.evaluate(() => getPagePlacements().length);
    expect(placements).toBeGreaterThanOrEqual(1);

    const firstCellText = await firstCell.textContent();
    expect(firstCellText?.trim()).toBe(targetChar);

    await expect(firstCell).toHaveClass(/used/);

    await firstCell.click();
    await page.waitForTimeout(200);
    const placementsAfter = await page.evaluate(() => getPagePlacements().length);
    expect(placementsAfter).toBe(0);
  });

  test("4. 多页面切换功能正常", async ({ page }) => {
    const initialPages = await page.evaluate(() => state.pages.length);
    expect(initialPages).toBe(1);

    const currentPageLabel = await page.textContent("#currentPageCount");
    expect(currentPageLabel).toBeDefined();

    const firstPageId = await page.evaluate(() => state.pages[0].id);

    await page.click("#addPageBtn");
    await page.waitForTimeout(400);

    const afterAddPages = await page.evaluate(() => state.pages.length);
    expect(afterAddPages).toBe(initialPages + 1);

    const tabs = page.locator("#pagesTabs .page-tab");
    await expect(tabs).toHaveCount(2);

    const currentIdAfterAdd = await page.evaluate(() => state.currentPageId);
    const secondPageId = await page.evaluate(() => state.pages[1].id);
    expect(currentIdAfterAdd).toBe(secondPageId);

    const secondTab = tabs.nth(1);
    await expect(secondTab).toHaveClass(/active/);

    const firstTab = tabs.first();
    await firstTab.click();
    await page.waitForTimeout(300);

    const currentIdAfterSwitch = await page.evaluate(() => state.currentPageId);
    expect(currentIdAfterSwitch).toBe(firstPageId);

    const activeAfter = await page.evaluate(() => {
      const tab = document.querySelector("#pagesTabs .page-tab:first-child");
      return tab?.classList.contains("active");
    });
    expect(activeAfter).toBe(true);

    await secondTab.click();
    await page.waitForTimeout(300);

    const backToSecond = await page.evaluate(() => state.currentPageId);
    expect(backToSecond).toBe(secondPageId);
  });

  test("5. 保存作品（存档）功能正常", async ({ page }) => {
    await page.fill("#workTitle", "自动化测试作品");
    await page.waitForTimeout(100);

    await page.evaluate(() => {
      state.selectedTypeId = state.inventory[0].id;
      renderAll();
    });
    await page.locator("#stage .cell").first().click();
    await page.waitForTimeout(200);

    await page.click("#viewToggleArchive");
    await page.waitForTimeout(400);

    await expect(page.locator("#archiveView")).toBeVisible();
    await expect(page.locator("#editorView")).toBeHidden();

    const cards = page.locator("#archiveGrid .work-card");
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThanOrEqual(1);

    const firstCardTitle = cards.first().locator(".work-card-title");
    await expect(firstCardTitle).toContainText("自动化测试作品");

    await page.click("#viewToggleArchive");
    await page.waitForTimeout(300);
    await expect(page.locator("#editorView")).toBeVisible();
  });

  test("6. 打开排版校对中心正常", async ({ page }) => {
    const proofreadTab = page.locator('.panel-tab[data-right-tab="proofread"]');

    await page.click("#proofreadBtn");
    await page.waitForTimeout(300);

    await expect(proofreadTab).toHaveClass(/active/);
    await expect(page.locator("#proofreadSummary")).toBeVisible();

    const summaryText = await page.textContent("#proofreadSummary");
    expect(summaryText).toBeDefined();

    const refreshBtn = page.locator("#proofreadRefreshBtn");
    await expect(refreshBtn).toBeVisible();
    await refreshBtn.click();
    await page.waitForTimeout(300);

    await expect(page.locator("#proofreadIssues")).toBeVisible();
  });

  test("7. 字模库导出功能正常", async ({ page }) => {
    const downloadPromise = page.waitForEvent("download");
    await page.click("#exportInventoryBtn");
    const download = await downloadPromise;

    const filename = download.suggestedFilename();
    expect(filename).toMatch(/字模库_.*\.json$/);

    const content = await download.createReadStream();
    const chunks = [];
    for await (const chunk of content) {
      chunks.push(chunk);
    }
    const jsonStr = Buffer.concat(chunks).toString("utf-8");
    const parsed = JSON.parse(jsonStr);

    expect(parsed).toHaveProperty("version", 1);
    expect(parsed).toHaveProperty("exportedAt");
    expect(parsed).toHaveProperty("count");
    expect(parsed).toHaveProperty("inventory");
    expect(Array.isArray(parsed.inventory)).toBe(true);
    expect(parsed.count).toBe(parsed.inventory.length);
    expect(parsed.count).toBeGreaterThan(0);

    const firstItem = parsed.inventory[0];
    expect(firstItem).toHaveProperty("char");
    expect(firstItem).toHaveProperty("style");
    expect(firstItem).toHaveProperty("size");
    expect(firstItem).toHaveProperty("quantity");
    expect(firstItem).toHaveProperty("wear");
  });

  test("8. 字模库导入功能正常", async ({ page }) => {
    const initialCount = await page.evaluate(() => state.inventory.length);

    const testData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      count: 2,
      inventory: [
        { char: "驥", style: "魏碑", size: 32, quantity: 2, wear: "微磨" },
        { char: "驊", style: "魏碑", size: 32, quantity: 3, wear: "新" }
      ]
    };

    await page.evaluate(() => {
      window.__pendingImportMode = "merge";
    });

    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.click("#importInventoryBtn");
    const fileChooser = await fileChooserPromise;

    const file = {
      name: "test-inventory.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(testData))
    };
    await fileChooser.setFiles([file]);
    await page.waitForTimeout(600);

    const modalVisible = await page.locator("#importModal").isVisible();
    if (modalVisible) {
      await page.check('input[name="importMode"][value="merge"]');
      await page.waitForTimeout(100);
      await page.click("#importConfirm");
      await page.waitForTimeout(400);
    }

    const newCount = await page.evaluate(() => state.inventory.length);
    expect(newCount).toBeGreaterThan(initialCount);

    const hasNewChar = await page.evaluate(() =>
      state.inventory.some((item) => item.char === "驥" && item.style === "魏碑")
    );
    expect(hasNewChar).toBe(true);
  });
});
