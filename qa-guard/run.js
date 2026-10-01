/* PiggyUp data-safety — automated jsdom tests (read-only; no commits, no pushes).
 * Run: node qa-guard/run.js   (from ~/workspace/pgq-repo)
 *
 * History: this suite started as "Guarded-v1" tests for the legacy v1 build.
 * After the parent-child merge (2026-10-01) the GUARDED-v1 block was removed
 * from index.html because this file IS the v2 build — the guard treated valid
 * v2 data as legacy and silently blocked all writes (data loss). All tests
 * asserting the guard engages were removed as obsolete. What remains are the
 * data-safety properties that are still real for this build:
 *   - v1 data is migrated to v2 on boot, never wiped
 *   - save() persists mutations (write path intact)
 *   - fresh boot initializes storage
 *   - corrupt stored JSON boots without crashing
 */
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("/home/hatch/workspace/.jsdom-qa/node_modules/jsdom");

const HTML = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const DATA_KEY = "piggyup_v1";

const V1_STATE = {
  v: 1, mode: "parent", tab: "home",
  children: [{ id: "c1", name: "Test" }], activeChildId: "c1",
  goals: [], tasks: [], activity: [],
  sub: { trialStart: null, plan: "none", subs: 0 }, dark: false,
};
const V1_JSON = JSON.stringify(V1_STATE);

async function boot(seeds) {
  const dom = new JSDOM(HTML, {
    url: "https://piggyup.test/",
    runScripts: "dangerously",
    beforeParse(window) {
      for (const [k, v] of Object.entries(seeds || {})) window.localStorage.setItem(k, v);
      window.fetch = () => Promise.resolve({ ok: true }); // neutralize ping beacon
    },
  });
  await new Promise((resolve) => {
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    if (dom.window.document.readyState === "complete") return finish();
    dom.window.addEventListener("load", finish);
    setTimeout(finish, 5000); // safety net, never blocks the suite
  });
  await new Promise((r) => setTimeout(r, 400)); // post-DOMContentLoaded settle
  return dom;
}

const results = [];
async function test(name, fn) {
  let dom = null;
  try {
    dom = await fn();
    results.push([name, "PASS", ""]);
    console.log("PASS  " + name);
  } catch (e) {
    results.push([name, "FAIL", String((e && e.message) || e)]);
    console.log("FAIL  " + name + " — " + ((e && e.message) || e));
  } finally {
    try { if (dom && dom.window) dom.window.close(); } catch (e) {}
  }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || "assertion failed"); }
function rawOf(dom) { return dom.window.localStorage.getItem(DATA_KEY); }
function appHTML(dom) { return dom.window.document.getElementById("app").innerHTML; }

(async () => {
  // (1) v1 data is migrated to v2 on boot — never wiped, never blocked.
  // Regression pin for the 2026-10-01 incident: valid data must survive boot.
  await test("v1 data migrates to v2 on boot, data preserved", async () => {
    const dom = await boot({ [DATA_KEY]: V1_JSON });
    const raw = rawOf(dom);
    assert(raw !== null, "data key missing after boot with v1 data");
    const st = JSON.parse(raw);
    assert(st.v === 2, "v1 data was not migrated to v2, got v=" + st.v);
    assert(st.children && st.children[0] && st.children[0].id === "c1",
      "child data lost during migration");
    assert(!dom.window.__PIGGYUP_GUARDED_V1__, "guard flag set on valid data");
    assert(!appHTML(dom).includes("נדרש עדכון"), "update screen shown for valid data");
    return dom;
  });

  // (2) save() persists a mutation (write path intact)
  await test("save() persists mutation", async () => {
    const dom = await boot({ [DATA_KEY]: V1_JSON });
    const before = rawOf(dom);
    dom.window.eval("S.dark = true; save();");
    const after = rawOf(dom);
    assert(before !== after, "save() did not change stored data");
    assert(JSON.parse(after).dark === true, "mutation not persisted");
    return dom;
  });

  // (3) fresh boot initializes storage
  await test("fresh boot initializes storage", async () => {
    const dom = await boot({});
    assert(rawOf(dom) !== null, "app did not initialize storage on boot");
    return dom;
  });

  // (4) corrupt stored JSON boots without crashing
  await test("corrupt JSON boots without crashing", async () => {
    const dom = await boot({ [DATA_KEY]: "{this is not valid json!!!" });
    assert(!appHTML(dom).includes("נדרש עדכון"), "update screen shown for corrupt data");
    assert(rawOf(dom) !== null, "storage not initialized after corrupt-data boot");
    return dom;
  });

  const passed = results.filter((r) => r[1] === "PASS").length;
  console.log("\nAutomated jsdom: " + passed + "/" + results.length + " PASS");
  process.exitCode = passed === results.length ? 0 : 1;
})().catch((e) => { console.error("SUITE ERROR:", e); process.exitCode = 2; });
