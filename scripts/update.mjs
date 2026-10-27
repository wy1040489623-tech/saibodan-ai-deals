#!/usr/bin/env node
// 从赛博鸡蛋公开快照生成 GitHub 仓库的 README、DEALS.md 与 data/*.json
// 用法：node scripts/update.mjs [YYYY-MM-DD]
import fs from "node:fs";
import path from "node:path";

const SITE = "https://saibodan.com";
const DATE = process.argv[2] || new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date());
const URL = `${SITE}/data/daily-${DATE}.json`;

const cell = (s = "") => String(s).replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
const statusLabel = (s) => ({ active: "可用", changed: "有更新", unverified: "待核验", ended: "已结束" }[s] || s || "—");

async function main() {
  const res = await fetch(`${URL}?v=${Date.now()}`, { headers: { "cache-control": "no-cache" } });
  if (!res.ok) {
    console.error(`没有 ${DATE} 的快照：HTTP ${res.status}，跳过本轮`);
    return;
  }
  const raw = await res.json();
  if (raw.schemaVersion !== 1 || !raw.date) {
    console.error("快照格式不对，跳过");
    process.exitCode = 1;
    return;
  }

  const active = (raw.library || []).filter((x) => x.status !== "ended");
  const highlights = (raw.highlights || []).map((x) => ({
    name: x.name || "",
    platform: x.platform || "",
    value: x.value || "",
    conditions: x.conditions || "",
    expires: x.expires || "",
    entry: x.entry || "",
  }));

  const payload = {
    schemaVersion: 1,
    date: raw.date,
    title: raw.title || raw.headline || "",
    headline: raw.headline || "",
    counts: raw.counts || {},
    highlights,
    library: (raw.library || []).map((x) => ({
      id: x.id || "",
      name: x.name || "",
      platform: x.platform || "",
      listName: x.listName || "",
      listText: x.listText || "",
      region: x.region || "",
      status: x.status || "",
      valueTier: x.valueTier || "",
      verifiedAt: x.verifiedAt || "",
      expires: x.expires || "",
      entry: x.entry || "",
    })),
    source: URL,
    homepage: SITE,
    generatedAt: new Date().toISOString(),
    license: "CC BY 4.0",
  };

  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync(path.join("data", `${DATE}.json`), JSON.stringify(payload, null, 2) + "\n");
  fs.writeFileSync(path.join("data", "latest.json"), JSON.stringify(payload, null, 2) + "\n");

  const hlRows = (highlights.length ? highlights.slice(0, 5) : active.slice(0, 5).map((x) => ({
    name: x.name,
    platform: x.platform,
    value: x.listText,
    conditions: "",
    expires: x.expires,
    entry: x.entry,
  }))).map((x) => `| ${cell(x.platform || "—")} | ${cell(x.name)} | ${cell(x.value)} | ${cell(x.expires || "—")} |`).join("\n");

  const readme = `# 赛博鸡蛋 · 每日 AI 免费福利

> 每天核验、每天更新的 AI 免费福利台账。只收录公开可领的免费额度、试用、折扣与活动，链接直达官方页面。

**今日：${DATE}** · 可用福利 **${active.length}** 条

- 网站：${SITE}
- RSS 订阅：${SITE}/rss/
- 最新数据：[data/latest.json](data/latest.json)
- 今日数据：[data/${DATE}.json](data/${DATE}.json)

## 今日重点

| 平台 | 福利 | 能拿到 | 截止 |
| :-- | :-- | :-- | :-- |
${hlRows || "| — | 今天没有重点条目 | — | — |"}

## 全部福利

见 [DEALS.md](DEALS.md)（${active.length} 条可用）。

## 怎么用

\`\`\`bash
curl -s https://raw.githubusercontent.com/wy1040489623-tech/saibodan-ai-deals/main/data/latest.json
\`\`\`

数据每天 08:40（北京时间）自动更新。链接均指向官方活动页；仅作信息汇总，领取条件与截止时间以官方页面为准。

## 说明

- 只收录公开的免费额度、试用、折扣与活动。
- 每条都带核验日期和官方入口；已结束的条目不进入“可用”列表。
- 数据以 [赛博鸡蛋](https://saibodan.com) 当日快照为准。

---

数据来源：[赛博鸡蛋](https://saibodan.com) · 每天两分钟，看看今天能领哪些 AI 福利。
`;

  const rows = active.map((x) => `| ${cell(x.platform || x.listName || "—")} | ${cell(x.name)} | ${cell(x.listText || x.name)} | ${cell(x.region === "cn" ? "国内" : "海外")} | ${cell(statusLabel(x.status))} | ${cell(x.expires || "—")} | ${cell(x.verifiedAt || "—")} | ${x.entry ? `[官方](${x.entry})` : "—"} |`).join("\n");

  const deals = `# 全部可用 AI 福利（${DATE}）

> 共 ${active.length} 条。状态、条件与截止时间以官方页面为准。数据来源：[赛博鸡蛋](${SITE})

| 平台 | 福利 | 能拿到 | 地区 | 状态 | 截止 | 核验 | 入口 |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
${rows || "| — | 今天没有可用条目 | — | — | — | — | — | — |"}
`;

  fs.writeFileSync("README.md", readme);
  fs.writeFileSync("DEALS.md", deals);
  console.log(`已更新 ${DATE}：可用 ${active.length} 条，重点 ${highlights.length} 条`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
