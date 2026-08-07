import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");
const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const targetUrl = pathToFileURL(path.join(projectRoot, "index.html")).href;
const viewports = [
  { name: "1024x768", width: 1024, height: 768 },
  { name: "1366x768", width: 1366, height: 768 },
  { name: "390x844", width: 390, height: 844 },
  { name: "360x640", width: 360, height: 640 }
];

const browser = await chromium.launch({ headless: true, executablePath: edgePath });
const failures = [];

for (const viewport of viewports) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => { if (message.type() === "error") errors.push(`console: ${message.text()}`); });
  await page.goto(targetUrl, { waitUntil: "load" });

  const stepCount = await page.locator(".step-button").count();
  if (stepCount !== 14) failures.push(`${viewport.name}: ${stepCount} étapes au lieu de 14`);

  for (let step = 0; step < stepCount; step += 1) {
    await page.locator(`[data-step="${step}"]`).click();
    const metrics = await page.evaluate(() => {
      const root = document.documentElement;
      const boxes = [".app-shell", ".course-grid", ".lesson", ".lesson-copy", ".visual-card", ".visual-root", ".bottom-nav"]
        .map((selector) => {
          const element = document.querySelector(selector);
          if (!element) return null;
          const rect = element.getBoundingClientRect();
          return { selector, left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
        }).filter(Boolean);
      return {
        viewport: { width: innerWidth, height: innerHeight },
        document: { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth, scrollHeight: root.scrollHeight, clientHeight: root.clientHeight },
        boxes
      };
    });
    if (metrics.document.scrollWidth > metrics.document.clientWidth + 1 || metrics.document.scrollHeight > metrics.document.clientHeight + 1) {
      failures.push(`${viewport.name} étape ${step + 1}: document déborde ${JSON.stringify(metrics.document)}`);
    }
    for (const box of metrics.boxes) {
      if (box.left < -1 || box.top < -1 || box.right > metrics.viewport.width + 1 || box.bottom > metrics.viewport.height + 1) {
        failures.push(`${viewport.name} étape ${step + 1}: ${box.selector} hors écran ${JSON.stringify(box)}`);
      }
    }
  }

  await page.locator('[data-step="0"]').click();
  await page.locator("#reveal-parts").click();
  if (!((await page.locator("#visual-readout").textContent()) || "").includes("tube plongeur")) failures.push(`${viewport.name}: repères non révélés`);

  await page.locator('[data-step="1"]').click();
  await page.locator('[data-place="correct"]').click();
  if (!((await page.locator('[data-place="correct"]').getAttribute("class")) || "").includes("correct")) failures.push(`${viewport.name}: placement non validé`);

  await page.locator('[data-step="4"]').click();
  await page.locator("#run-flow").click();
  if (!((await page.locator(".diagram").getAttribute("class")) || "").includes("flowing")) failures.push(`${viewport.name}: trajet liquide non lancé`);

  await page.locator('[data-step="6"]').click();
  await page.locator('[data-valve="closed"]').click();
  if (!((await page.locator("#visual-readout").textContent()) || "").includes("isolé")) failures.push(`${viewport.name}: vanne fermée non expliquée`);

  await page.locator('[data-step="8"]').click();
  await page.locator("#pump-next").click();
  await page.locator("#pump-next").click();
  await page.locator("#pump-next").click();
  if (!((await page.locator("#visual-readout").textContent()) || "").includes("pressostat BP arrête le compresseur")) failures.push(`${viewport.name}: pump-down incomplet`);

  await page.locator('[data-step="11"]').click();
  await page.locator('[data-mount="horizontal"]').click();
  if (!((await page.locator("#visual-readout").textContent()) || "").includes("horizontale")) failures.push(`${viewport.name}: montage horizontal absent`);

  await page.locator('[data-step="13"]').click();
  for (const answer of [1, 0, 2, 0, 0, 0]) {
    await page.locator(`[data-answer="${answer}"]`).click();
    await page.locator("#next-question").click();
  }
  if ((await page.locator(".quiz-score").textContent())?.trim() !== "6/6") failures.push(`${viewport.name}: score final incorrect`);
  if (await page.locator("#next-button").isDisabled()) failures.push(`${viewport.name}: reprise finale verrouillée`);

  await page.locator("#source-button").click();
  if (!(await page.locator("#sources-dialog").evaluate((element) => element.open))) failures.push(`${viewport.name}: dialogue Sources fermé`);
  await page.locator(".close-button").click();
  if (errors.length) failures.push(`${viewport.name}: ${errors.join(" | ")}`);
  await page.close();
}

await browser.close();
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("QA OK — 14 étapes × 4 formats, activités, quiz et mode hors ligne.");
