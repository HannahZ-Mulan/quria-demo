// E2E smoke tests driven by the globally-installed `playwright-cli`
// (@playwright/cli). It is a session-based MCP command-line driver, NOT a test
// framework — so this script orchestrates it: open a named browser session,
// chain goto/click/fill/snapshot/eval actions, and assert on `--raw` output.
//
// Prereqs:
//   - `playwright-cli` on PATH (global @playwright/cli).
//   - System Chrome at the default location (used via `--browser chrome`).
//   - A dev server on BASE_URL (the npm script spawns `next dev` before this).

import { spawn, spawnSync, execSync } from "node:child_process";

const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3000";
const SESSION = "quria-e2e";
const BROWSER = "chrome";

let passed = 0;
let failed = 0;
const failures = [];

// Run a playwright-cli command against the named session, return trimmed stdout.
function cli(args) {
  try {
    return execSync(`playwright-cli -s=${SESSION} ${args}`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch (e) {
    // Surface stdout/stderr for debugging.
    throw new Error(
      `playwright-cli ${args} failed:\n${e.stdout || ""}\n${e.stderr || ""}`,
    );
  }
}

// `eval` with `--raw` returns the JS value JSON-encoded (e.g. "\"text\"", "2",
// "true", "[\"a\",\"b\"]"). Parse it back into a real JS value so assertions
// compare against the actual value rather than its serialized form.
function evalRaw(expr) {
  const out = cli(`eval ${JSON.stringify(expr)} --raw`);
  try {
    return JSON.parse(out);
  } catch {
    return out;
  }
}

function assertEq(actual, expected, label) {
  if (actual === expected) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    failures.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    console.log(`  ✗ ${label} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`);
  }
}

function assertTruthy(value, label) {
  if (value) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    failures.push(`${label}: expected truthy, got ${JSON.stringify(value)}`);
    console.log(`  ✗ ${label}`);
  }
}

function assertIncludes(haystack, needle, label) {
  if (haystack && haystack.includes(needle)) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    failures.push(`${label}: "${needle}" not in ${JSON.stringify(haystack)}`);
    console.log(`  ✗ ${label}`);
  }
}

// ---------------------------------------------------------------------------
// Lifecycle: spawn dev server, wait for it, run tests, always clean up.
// ---------------------------------------------------------------------------

function waitForServer(url, timeoutMs = 60000) {
  const start = Date.now();
  console.log(`Waiting for ${url} ...`);
  while (Date.now() - start < timeoutMs) {
    try {
      execSync(`node -e "require('http').get('${url}', r=>process.exit(r.statusCode<500?0:1)).on('error',()=>process.exit(1))"`, { stdio: "ignore" });
      console.log(`  server is up (${Math.round((Date.now() - start) / 1000)}s)`);
      return true;
    } catch {
      // not ready yet
    }
    spawnSync("sleep", ["1"], { shell: true });
  }
  return false;
}

function cleanup() {
  try {
    cli("close");
  } catch {
    /* session may already be gone */
  }
  try {
    execSync("playwright-cli close-all", { stdio: "ignore" });
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Test scenarios
// ---------------------------------------------------------------------------

function testHome() {
  console.log("\n[Home /]");
  cli(`goto ${BASE_URL}/`);
  const title = evalRaw("() => document.querySelector('h1')?.innerText || ''");
  assertTruthy(title.length > 0, "home h1 title is rendered");
  // Both project cards should link to their demo routes.
  const hrefs = evalRaw(
    "() => JSON.stringify([...document.querySelectorAll('a')].map(a=>a.getAttribute('href')).filter(Boolean))",
  );
  assertIncludes(hrefs, "/project1", "home links to /project1");
  assertIncludes(hrefs, "/project3", "home links to /project3");
}

function testProject1Flow() {
  console.log("\n[/project1 follow-up question generation]");
  cli(`goto ${BASE_URL}/project1`);
  const heading = evalRaw("() => document.querySelector('h1')?.innerText || ''");
  assertTruthy(heading.length > 0, "project1 h1 is rendered");

  // Find the textarea (answer input) and fill a price-related answer.
  const filled = evalRaw(
    "() => { const ta = document.querySelector('textarea'); if(!ta) return 'no-textarea'; ta.focus(); return 'found'; }",
  );
  assertEq(filled, "found", "answer textarea present");

  cli("fill textarea 我觉得这个产品还行，就是价格有点贵");
  // Click the "生成追问" button.
  const clicked = evalRaw(
    "() => { const btn=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('生成追问')); if(!btn) return 'no-btn'; btn.click(); return 'clicked'; }",
  );
  assertEq(clicked, "clicked", "generate-question button clicked");

  // After generation, a follow-up question appears in the blue output box.
  const question = evalRaw(
    "() => document.querySelector('.bg-blue-50 .text-blue-900')?.textContent?.trim() || ''",
  );
  assertTruthy(question.length > 0, "a follow-up question is generated");
  assertIncludes(question, "价位", "follow-up addresses price (keyword match)");
}

function testProject3Flow() {
  console.log("\n[/project3 requirement decomposition]");
  cli(`goto ${BASE_URL}/project3`);
  const heading = evalRaw("() => document.querySelector('h1')?.innerText || ''");
  assertTruthy(heading.length > 0, "project3 h1 is rendered");

  const filled = evalRaw(
    "() => { const ta = document.querySelector('textarea'); if(!ta) return 'no-textarea'; return 'found'; }",
  );
  assertEq(filled, "found", "requirement textarea present");

  // Large sample + deep interview + short timeline triggers a conflict in the
  // decomposition logic (numSample > 50 && depth === "L3 深度访谈" && numTime < 14).
  cli("fill textarea 我们想深入了解25-35岁白领的购买动机，需要300人，5天内交付");
  const clicked = evalRaw(
    "() => { const btn=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('智能拆解')); if(!btn) return 'no-btn'; btn.click(); return 'clicked'; }",
  );
  assertEq(clicked, "clicked", "decompose button clicked");

  // Decomposition should surface a research goal and the large-sample/short-time conflict.
  const goal = evalRaw(
    "() => document.querySelector('.bg-blue-50 .text-blue-900')?.textContent?.trim() || ''",
  );
  assertTruthy(goal.length > 0, "research goal is extracted");

  const bodyText = evalRaw("() => document.body.innerText");
  assertIncludes(bodyText, "大样本量", "conflict detection flags large sample + short timeline");
}

function testLanguageSwitch() {
  console.log("\n[language switch end-to-end]");
  cli(`goto ${BASE_URL}/`);
  // Open the language dropdown.
  const opened = evalRaw(
    "() => { const btn=[...document.querySelectorAll('button')].find(b=>b.querySelector('svg.lucide-languages') || b.getAttribute('aria-haspopup')==='menu'); if(!btn) return 'no-trigger'; btn.click(); return 'opened'; }",
  );
  assertEq(opened, "opened", "language dropdown trigger found and clicked");

  // Pick English.
  const picked = evalRaw(
    "() => { const item=[...document.querySelectorAll('[role=menuitemradio]')].find(b=>b.textContent.includes('English')); if(!item) return 'no-item'; item.click(); return 'picked'; }",
  );
  assertEq(picked, "picked", "English menu item selected");

  const htmlLang = evalRaw("() => document.documentElement.lang");
  assertEq(htmlLang, "en", "document lang switches to en");

  // Switch to Hebrew and assert RTL.
  const opened2 = evalRaw(
    "() => { const btn=[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-haspopup')==='menu'); if(!btn) return 'no-trigger'; btn.click(); return 'opened'; }",
  );
  assertEq(opened2, "opened", "language dropdown reopened");
  const pickedHe = evalRaw(
    "() => { const item=[...document.querySelectorAll('[role=menuitemradio]')].find(b=>b.textContent.includes('עברית')); if(!item) return 'no-item'; item.click(); return 'picked'; }",
  );
  assertEq(pickedHe, "picked", "Hebrew menu item selected");
  const dir = evalRaw("() => document.documentElement.dir");
  assertEq(dir, "rtl", "document dir switches to rtl for Hebrew");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  let devServer = null;
  let serverWasSpawned = false;

  // If no server is reachable, spawn `next dev` ourselves.
  if (!waitForServer(BASE_URL, 3000)) {
    console.log("No server detected — spawning `next dev` ...");
    devServer = spawn("npx", ["next", "dev"], {
      cwd: process.cwd(),
      shell: true,
      stdio: "ignore",
    });
    serverWasSpawned = true;
    if (!waitForServer(BASE_URL, 90000)) {
      console.error(`✗ dev server did not come up at ${BASE_URL}`);
      if (devServer) devServer.kill();
      process.exit(1);
    }
  }

  try {
    cli(`open ${BASE_URL}/ --browser ${BROWSER}`);

    testHome();
    testProject1Flow();
    testProject3Flow();
    testLanguageSwitch();

    console.log(
      `\n──────────────────────────────\n` +
        `E2E results: ${passed} passed, ${failed} failed`,
    );
    if (failed > 0) {
      console.log("\nFailures:");
      failures.forEach((f) => console.log("  - " + f));
    }
  } finally {
    cleanup();
    if (devServer) {
      console.log("\nStopping dev server ...");
      try {
        // Kill the whole process tree on Windows.
        spawnSync("taskkill", ["/PID", String(devServer.pid), "/T", "/F"], { stdio: "ignore" });
      } catch {
        devServer.kill();
      }
    }
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("E2E runner crashed:", e);
  cleanup();
  process.exit(1);
});
