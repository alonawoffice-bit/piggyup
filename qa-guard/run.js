/* PiggyUp Guarded-v1 — automated jsdom tests (read-only; no commits, no pushes).
 * Run: node qa-guard/run.js   (from ~/workspace/piggyup-guard)
 */
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("/home/hatch/workspace/.jsdom-qa/node_modules/jsdom");

const HTML = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const DATA_KEY = "piggyup_v1";

const V1_STATE = {
  v: 1, mode: "parent", tab: "home", children: [], activeChildId: null,
  goals: [], tasks: [], activity: [],
  sub: { trialStart: null, plan: "none", subs: 0 }, dark: false,
};
const V2_STATE = {
  v: 2, mode: "parent", tab: "home", children: [{ id: "c1", name: "Test" }],
  goals: [], tasks: [], activity: [],
  sub: { trialStart: 1720000000000, plan: "monthly", subs: 3 }, dark: false,
};
const V1_JSON = JSON.stringify(V1_STATE);
const V2_JSON = JSON.stringify(V2_STATE);

async function boot(seeds) {
  const dom = new JSDOM(HTML, {
    url: "https://piggyup.test/",
    runScripts: "dangerously",
    beforeParse(window) {
      for (const [k, v] of Object.entries(seeds || {})) window.localStorage.setItem(k, v);
      window.fetch = () => Promise.resolve({ ok: true }); // neutralize ping beacon
      window.confirm = () => true; // A.resetAll asks for confirmation
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
function guarded(dom) { return !!dom.window.__PIGGYUP_GUARDED_V1__; }
function appHTML(dom) { return dom.window.document.getElementById("app").innerHTML; }

(async () => {
  // (1) v1 data boots unguarded
  await test("v1 data {v:1} boots unguarded", async () => {
    const dom = await boot({ [DATA_KEY]: V1_JSON });
    assert(!guarded(dom), "flag set for v1 data");
    assert(!appHTML(dom).includes("גרסה חדשה של PiggyUp זמינה"), "update screen shown for v1");
    return dom;
  });

  // (2) v1 data: save() persists a mutation (write path intact)
  await test("v1 data: save() persists mutation", async () => {
    const dom = await boot({ [DATA_KEY]: V1_JSON });
    assert(!guarded(dom), "unexpected guard");
    const before = rawOf(dom);
    dom.window.eval("S.dark = true; save();");
    const after = rawOf(dom);
    assert(before !== after, "save() did not change stored data");
    assert(JSON.parse(after).dark === true, "mutation not persisted");
    return dom;
  });

  // (3) no stored data boots unguarded
  await test("no stored data boots unguarded", async () => {
    const dom = await boot({});
    assert(!guarded(dom), "flag set with no data");
    assert(rawOf(dom) !== null, "app did not initialize storage on boot");
    return dom;
  });

  // (4) corrupt JSON boots unguarded (v1 behavior preserved)
  await test("corrupt JSON boots unguarded", async () => {
    const dom = await boot({ [DATA_KEY]: "{this is not valid json!!!" });
    assert(!guarded(dom), "flag set for corrupt data");
    assert(!appHTML(dom).includes("גרסה חדשה של PiggyUp זמינה"), "update screen shown for corrupt data");
    return dom;
  });

  // (5) explicit {v:1} unguarded
  await test("explicit {v:1} boots unguarded", async () => {
    const dom = await boot({ [DATA_KEY]: JSON.stringify({ v: 1 }) });
    assert(!guarded(dom), "flag set for explicit v:1");
    return dom;
  });

  // (6) v2 data: guarded, Hebrew update message, dir=rtl
  await test("v2 data: guarded, Hebrew message, dir=rtl", async () => {
    const dom = await boot({ [DATA_KEY]: V2_JSON });
    assert(guarded(dom), "guard flag not set for v2 data");
    assert(appHTML(dom).includes("גרסה חדשה של PiggyUp זמינה. יש לעדכן כדי להמשיך."),
      "Hebrew update message missing from #app");
    assert(dom.window.document.dir === "rtl", "document.dir is not rtl, got: " + dom.window.document.dir);
    return dom;
  });

  // (7) v2 data + lang=ru: Russian message, dir=ltr
  await test("v2 data + lang=ru: Russian message, dir=ltr", async () => {
    const dom = await boot({ [DATA_KEY]: V2_JSON, piggyup_lang: "ru" });
    assert(guarded(dom), "guard flag not set for v2 data (ru)");
    assert(appHTML(dom).includes("Доступна новая версия PiggyUp. Обновите приложение, чтобы продолжить."),
      "Russian update message missing from #app");
    assert(dom.window.document.dir === "ltr", "document.dir is not ltr, got: " + dom.window.document.dir);
    return dom;
  });

  // (8) v2: S mutation + save() leaves raw storage byte-identical
  await test("v2 data: save() blocked, storage byte-identical", async () => {
    const dom = await boot({ [DATA_KEY]: V2_JSON });
    assert(guarded(dom), "guard flag not set");
    const before = rawOf(dom);
    assert(before === V2_JSON, "boot altered the stored v2 bytes");
    dom.window.eval('S.dark = true; S.mode = "kids"; save();');
    const after = rawOf(dom);
    assert(after === before, "storage changed after save() in guarded mode");
    return dom;
  });

  // (9) v2: A.resetAll() does not delete the key
  await test("v2 data: A.resetAll() does not delete key", async () => {
    const dom = await boot({ [DATA_KEY]: V2_JSON });
    assert(guarded(dom), "guard flag not set");
    const before = rawOf(dom);
    dom.window.A.resetAll();
    const after = rawOf(dom);
    assert(after === before, "resetAll changed the stored v2 data");
    assert(after !== null, "data key was deleted by resetAll");
    return dom;
  });

  // (10) v2: piggyup_lang key remains writable
  await test("v2 data: piggyup_lang key remains writable", async () => {
    const dom = await boot({ [DATA_KEY]: V2_JSON });
    assert(guarded(dom), "guard flag not set");
    dom.window.localStorage.setItem("piggyup_lang", "ru");
    assert(dom.window.localStorage.getItem("piggyup_lang") === "ru", "piggyup_lang not writable in guarded mode");
    return dom;
  });

  // (11) piggyup_data_version="2" with v1-shaped state: guarded (fail-closed)
  await test('piggyup_data_version="2" with v1 state: guarded', async () => {
    const dom = await boot({ [DATA_KEY]: V1_JSON, piggyup_data_version: "2" });
    assert(guarded(dom), "guard flag not set for secondary v2 signal");
    assert(appHTML(dom).includes("גרסה חדשה של PiggyUp זמינה"), "update message missing for secondary signal");
    return dom;
  });

  // (12) late upgrade: boot v1, set v2 + storage event -> guard engages, save blocked
  await test("late upgrade via storage event engages guard", async () => {
    const dom = await boot({ [DATA_KEY]: V1_JSON });
    assert(!guarded(dom), "guarded at boot with v1 data");
    dom.window.localStorage.setItem(DATA_KEY, V2_JSON);
    dom.window.dispatchEvent(new dom.window.StorageEvent("storage", { key: DATA_KEY }));
    assert(guarded(dom), "guard did not engage on storage event");
    assert(appHTML(dom).includes("גרסה חדשה של PiggyUp זמינה"), "update message missing after late engage");
    dom.window.eval("S.dark = true; save();");
    assert(rawOf(dom) === V2_JSON, "save() wrote v2 data after late guard engage");
    return dom;
  });

  // (13) focus recheck: boot v1, set v2, dispatch focus -> guard engages
  await test("focus recheck engages guard after data upgrade", async () => {
    const dom = await boot({ [DATA_KEY]: V1_JSON });
    assert(!guarded(dom), "guarded at boot with v1 data");
    dom.window.localStorage.setItem(DATA_KEY, V2_JSON);
    dom.window.dispatchEvent(new dom.window.Event("focus"));
    assert(guarded(dom), "guard did not engage on focus recheck");
    assert(appHTML(dom).includes("גרסה חדשה של PiggyUp זמינה"), "update message missing after focus engage");
    return dom;
  });

  const passed = results.filter((r) => r[1] === "PASS").length;
  console.log("\nAutomated jsdom: " + passed + "/" + results.length + " PASS");
  process.exitCode = passed === results.length ? 0 : 1;
})().catch((e) => { console.error("SUITE ERROR:", e); process.exitCode = 2; });
