const CLASS3_MAX = 3;

// Fusion gold per target tier, per class
const FUSION_GOLD = {
  3: [4e6, 10e6, 20e6], // T1,T2,T3 only
  4: [8e6, 20e6, 40e6, 65e6, 100e6, 250e6, 750e6, 2500e6, 8000e6, 15000e6],
};
const CONVFUSION_GOLD = [55e6, 110e6, 170e6, 300e6, 875e6, 2350e6, 6950e6, 21250e6, 50000e6, 125000e6];
const TRANSFER_CORES = [1, 2, 5, 10, 15, 25, 35, 50, 60, 85];
const TRANSFER_GOLD = {
  3: [10e6, 20e6, 0, 0, 0, 0, 0, 0, 0],
  4: [20e6, 40e6, 65e6, 100e6, 250e6, 750e6, 2500e6, 8000e6, 15000e6],
};
const CONVTRANSFER_GOLD = [65e6, 165e6, 375e6, 800e6, 2000e6, 5250e6, 14500e6, 42500e6, 100000e6, 300000e6];
const CONVTRANSFER_CORES = [1, 2, 5, 10, 15, 25, 35, 50, 60, 85];

let items = [],
  activeId = null,
  activeMethod = "fusion",
  nextId = 1;

function maxTier(cls) {
  return cls === 3 ? CLASS3_MAX : 10;
}
function createItem(slot, cls, tier, price) {
  return {
    id: nextId++,
    name: `${slot}`,
    defaultName: `${slot}`,
    slot,
    cls,
    tier: Math.min(tier, maxTier(cls)),
    price,
    gold: 0,
    itemGold: 0,
    dust: 0,
    cores: 0,
    itemsUsed: 0,
    successes: 0,
    fails: 0,
    log: [],
    method: "fusion",
  };
}
function active() {
  return items.find((i) => i.id === activeId) || null;
}
function fmt(n) {
  if (n === 0) return "0";
  if (n >= 1e9) return (n / 1e9).toFixed(2).replace(/\.?0+$/, "") + "KKK";
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.?0+$/, "") + "KK";
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.?0+$/, "") + "K";
  return n.toString();
}
function fmtFull(n) {
  return n.toLocaleString();
}
function parsePrice(v) {
  if (!v && v !== 0) return 0;
  const s = String(v).trim().toLowerCase().replace(/\s+/g, "").replace(/,/g, "");
  let multiplier = 1;
  let num = s;
  if (s.endsWith("kk")) {
    multiplier = 1_000_000;
    num = s.slice(0, -2);
  } else if (s.endsWith("k")) {
    multiplier = 1_000;
    num = s.slice(0, -1);
  }
  const n = parseFloat(num);
  return isNaN(n) || n < 0 ? 0 : Math.round(n * multiplier);
}
function isCapped(item) {
  return item.tier >= maxTier(item.cls);
}
function blockedMsg(item) {
  return `<strong>For item of a classification ${item.cls} max tier (T${maxTier(item.cls)}) reached.</strong> <br> No further upgrades available.`;
}
function itemCostLine(count, price) {
  if (!price) return "";
  return `<div class="item-cost-line">+ ${count} item${count > 1 ? "s" : ""} × ${fmtFull(price)} = <strong style="color:#BA7517">${fmtFull(count * price)} gold</strong></div>`;
}

function addItem() {
  const slot = document.getElementById("newSlot").value;
  const cls = parseInt(document.getElementById("newClassification").value);
  const tier = parseInt(document.getElementById("newTier").value);
  const price = parsePrice(document.getElementById("newPrice").value);
  items.push(createItem(slot, cls, tier, price));
  document.getElementById("newTier").value = "0";
  document.getElementById("newPrice").value = "";
  selectItem(items[items.length - 1].id);
}

function removeActiveItem() {
  if (!activeId || !confirm("Remove this item and all its data?")) return;
  items = items.filter((i) => i.id !== activeId);
  activeId = items.length ? items[items.length - 1].id : null;
  refresh();
}

function selectItem(id) {
  activeId = id;
  const restored = items.find(i => i.id === id);
  activeMethod = restored ? restored.method : "fusion";
  document.getElementById("core-chance").checked = false;
  document.getElementById("core-protect").checked = false;
  refresh();
}

function updateItemName() {
  const item = active();
  if (!item) return;
  const val = document.getElementById("itemNameInput").value.trim();
  item.name = val || item.defaultName;
  renderItemList();
}

function updateItemPrice() {
  const item = active();
  if (!item) return;
  item.price = parsePrice(document.getElementById("itemPriceInput").value);
  updateAllCosts();
  renderItemList();
}

function formatItemPriceInput() {
  const item = active();
  if (!item) return;
  const input = document.getElementById("itemPriceInput");
  if (item.price > 0) input.value = item.price.toLocaleString();
  else input.value = "";
}

function setMethod(method) {
  const item = active();
  if (!item) return;
  if ((method === "convtransfer" || method === "convfusion") && item.cls !== 4) return;
  activeMethod = method;
  if (item) item.method = method;
  document.querySelectorAll(".tab").forEach((t, i) => {
    t.classList.toggle("active", ["fusion", "convfusion", "transfer", "convtransfer"][i] === method);
  });
  document.querySelectorAll(".method-panel").forEach((p) => p.classList.remove("active"));
  document.getElementById("panel-" + method).classList.add("active");
  updateAllCosts();
}

function updateTabStates() {
  const item = active();
  if (!item) return;
  document.getElementById("tab-convtransfer").classList.toggle("disabled", item.cls !== 4);
  document.getElementById("tab-convfusion").classList.toggle("disabled", item.cls !== 4);
  if (item.cls === 3 && (activeMethod === "convtransfer" || activeMethod === "convfusion")) {
    activeMethod = "fusion";
    setMethod("fusion");
  }
}

function updateFusionCosts() {
  const item = active();
  const el = document.getElementById("fusion-costs");
  const act = document.getElementById("fusion-actions");
  const tog = document.getElementById("fusion-toggles");
  if (!item) {
    el.innerHTML = "";
    act.innerHTML = "";
    return;
  }
  if (isCapped(item)) {
    el.innerHTML = blockedMsg(item);
    tog.style.display = "none";
    act.innerHTML = "";
    return;
  }
  tog.style.display = "";
  act.innerHTML = `<button class="btn success" onclick="doFusion(true)">Success</button><button class="btn fail" onclick="doFusion(false)">Fail</button>`;
  const uc = document.getElementById("core-chance").checked;
  const up = document.getElementById("core-protect").checked;
  const cores = (uc ? 1 : 0) + (up ? 1 : 0);
  const gold = FUSION_GOLD[item.cls][item.tier];
  el.innerHTML =
    `<div class="note purple">Requires two identical items (including the same tier). Source item gets consumed in the process. Bonus effect can kick in during fusion, but it won't. Forget about it.</div>` +
    `<strong>Merging 2 x T${item.tier} identical items to create a <b>T${item.tier + 1}</b> item</strong><br>` +
    `Success chance: <strong>${uc ? 65 : 50}%</strong><br>` +
    `Fail protection (Tier reduction/item destruction chance): <strong>${up ? "50%" : "100%"}</strong><br>` +
    `Fee: <strong>${fmtFull(gold)} gold</strong> + <strong>100 Dust</strong> ${cores ? `+ <strong>${cores} core${cores > 1 ? "s" : ""}</strong>` : ""} + <strong>1 source item (T${item.tier})</strong>` +
    itemCostLine(1, item.price);
}

function updateConvergenceFusionCosts() {
  const item = active();
  const el = document.getElementById("conv-costs");
  const act = document.getElementById("conv-actions");
  if (!item) {
    el.innerHTML = "";
    act.innerHTML = "";
    return;
  }
  if (isCapped(item)) {
    el.innerHTML = blockedMsg(item);
    act.innerHTML = "";
    return;
  }
  el.innerHTML =
    `<div class="note purple">Requires items of the same body slot and same tier. Source item gets consumed in the process. For items of classification 4 only. No cores needed. Always succeeds. </div>` +
    `<strong>Merging 2 x T${item.tier} items of the same body slot to create a <b>T${item.tier + 1}</b> item</strong><br>` +
    `Fee: <strong>${fmtFull(CONVFUSION_GOLD[item.tier])} gold</strong> + <strong>130 Dust</strong> + <strong>1 source item (T${item.tier})</strong>` +
    itemCostLine(1, item.price);
  act.innerHTML = `<button class="btn guaranteed" onclick="doConvergenceFusion()">Convergence Transfer</button>`;
}

function updateTransferCosts() {
  const item = active();
  const el = document.getElementById("transfer-costs");
  const act = document.getElementById("transfer-actions");
  if (!item) {
    el.innerHTML = "";
    act.innerHTML = "";
    return;
  }

  if (item.tier < 2) {
    el.innerHTML = `<strong>Requires the source item to be at least <b>T2</b></strong>`;
    act.innerHTML = "";
    return;
  }
  const cores = TRANSFER_CORES[item.tier - 2];
  const gold = (TRANSFER_GOLD[item.cls] && TRANSFER_GOLD[item.cls][item.tier - 2]) || 0;
  const extrap = item.tier >= 8 ? " <em>(extrapolated)</em>" : "";
  const goldStr = gold > 0 ? `<strong>${fmtFull(gold)} gold</strong> + ` : "<em>no gold fee</em> + ";
  el.innerHTML =
    `<div class="note purple">Requires the target item to be <b> T0</b>. Both items have to be of the same classification. It transfers the source item's Tier - 1. Source item gets consumed in the process. Always succeeds.</div>` +
    `<strong>Source item T${item.tier} consumed. Target item becomes <b>T${item.tier - 1}</b></strong><br>` +
    `Fee: ${goldStr}<strong>${cores} core${cores > 1 ? "s" : ""}</strong> + <strong>100 Dust</strong> + <strong>1 source item</strong>${extrap}` +
    itemCostLine(1, item.price);
  act.innerHTML = `<button class="btn guaranteed" onclick="doTransfer()">Transfer</button>`;
}

function updateConvTransferCosts() {
  const item = active();
  const el = document.getElementById("convtransfer-costs");
  const act = document.getElementById("convtransfer-actions");
  const note = document.getElementById("convtransfer-note");
  if (!item) {
    el.innerHTML = "";
    act.innerHTML = "";
    return;
  }
  if (item.cls !== 4) {
    el.innerHTML = "<strong>Only available for classification 4 items.</strong>";
    note.innerHTML = "";
    act.innerHTML = "";
    return;
  }
  if (item.tier < 1) {
    el.innerHTML = `<strong>Requires the source item to be at least <b>T1</b></strong>`;
    act.innerHTML = "";
    return;
  }
  el.innerHTML =
    `<div class="note purple">Transfers the Tier of the source item without Tier loss. Allows for a transfer from different body slots. For items of classification 4 only. Source item gets consumed in the process. Always succeeds.</div>` +
    `<strong>Source item T${item.tier} consumed. Target item becomes <b>T${item.tier}</b></strong><br>` +
    `Fee: <strong>${fmtFull(CONVTRANSFER_GOLD[item.tier - 1])} gold</strong> + <strong>${CONVTRANSFER_CORES[item.tier - 1]} core${CONVTRANSFER_CORES[item.tier - 1] > 1 ? "s" : ""}</strong> + <strong>160 Dust</strong> + <strong>1 source item</strong>` +
    itemCostLine(1, item.price);
  note.innerHTML = "";
  act.innerHTML = `<button class="btn conv-tr" onclick="doConvTransfer()">Convergence Transfer</button>`;
}

function doFusion(success) {
  const item = active();
  if (!item || isCapped(item)) return;
  const upgradeCore = document.getElementById("core-chance").checked;
  const failCore = document.getElementById("core-protect").checked;
  const cores = (upgradeCore ? 1 : 0) + (failCore ? 1 : 0);
  const gold = FUSION_GOLD[item.cls][item.tier];
  item.gold += gold;
  item.dust += 100;
  item.cores += cores;
  consumeItems(item, 1);
  const itemCost = item.price ? `1 source item (${fmtFull(item.price)} gold)` : null;
  const costs = [fmtFull(gold) + " gold", itemCost, "100 dust", cores ? cores + " core(s)" : null];
  if (success) {
    item.tier = item.tier + 1;
    item.successes++;
    addLog(item, "✓", "s", `Fusion T${item.tier - 1}+T${item.tier - 1} → T${item.tier}`, costs);
  } else {
    item.fails++;
    addLog(item, "✗", "f", `Fusion T${item.tier - 1}+T${item.tier - 1} failed (tier reduction chance: ${failCore ? "50%" : "100%"})`, costs);
    if (item.tier === 0) {
      consumeItems(item, 1);
      addLog(item, "-", "n", "One item destroyed", []);
    } else {
      item.tier = Math.max(0, item.tier - 1);
      addLog(item, "-", "n", `One item dropped to T${item.tier}`, []);
    }
  }
  refresh();
}

function doConvergenceFusion() {
  const item = active();
  if (!item || isCapped(item)) return;
  const gold = CONVFUSION_GOLD[item.tier];
  item.gold += gold;
  item.dust += 130;
  consumeItems(item, 1);
  const itemCost = item.price ? `1 source item (${fmtFull(item.price)} gold)` : null;
  item.tier = item.tier + 1;
  item.successes++;
  addLog(item, "✓", "g", `Convergence fusion → T${item.tier - 1}`, [fmtFull(gold) + " gold", itemCost, "130 dust"].filter(Boolean));
  refresh();
}

function doTransfer() {
  const item = active();
  if (!item || item.tier + 1 < 2) return;
  const cores = TRANSFER_CORES[item.tier - 1];
  const gold = (TRANSFER_GOLD[item.cls] && TRANSFER_GOLD[item.cls][item.tier - 2]) || 0;
  item.gold += gold;
  item.dust += 100;
  item.cores += cores;
  consumeItems(item, 1);
  if (!isCapped(item)) {
    item.tier = item.tier + 1;
  }
  item.successes++;
  const itemCost = item.price ? `1 item (${fmtFull(item.price)} gold)` : null;
  addLog(item, "↔", "g", `Transfer T${item.tier + 1} → receiver T${item.tier + 1}`, [gold ? fmtFull(gold) + " gold" : null, itemCost, cores ? cores + " core(s)" : null, "100 dust"].filter(Boolean));
  refresh();
}

function doConvTransfer() {
  const item = active();
  if (!item || item.cls !== 4) return;
  const gold = CONVTRANSFER_GOLD[item.tier - 1];
  const cores = CONVTRANSFER_CORES[item.tier - 1];
  item.gold += gold;
  item.dust += 160;
  item.cores += cores;
  consumeItems(item, 1);
  if (!isCapped(item)) {
    item.tier = item.tier + 1;
  }
  item.successes++;
  const itemCost = item.price ? `1 item (${fmtFull(item.price)} gold)` : null;
  addLog(item, "↔", "p", `Conv. transfer T${item.tier - 1} → receiver T${item.tier + 1} (no loss)`, [fmtFull(gold) + " gold", itemCost, cores + " core(s)", "160 dust"].filter(Boolean));
  refresh();
}

function updateAllCosts() {
  updateFusionCosts();
  updateConvergenceFusionCosts();
  updateTransferCosts();
  updateConvTransferCosts();
}

function addLog(item, badge, bt, detail, costs) {
  item.log.unshift({ badge, bt, detail, costsStr: costs.filter(Boolean).join(" · ") });
}

function renderItemList() {
  const el = document.getElementById("itemList");
  if (!items.length) {
    el.innerHTML = '<div class="item-list-entry">No items yet.</div>';
    return;
  }
  const slots = [...new Set(items.map((i) => i.slot))];
  let html = "";
  slots.forEach((slot, si) => {
    if (si > 0) html += `<div class="slot-divider"></div>`;
    html += `<div class="slot-group-label">${slot}</div>`;
    items
      .filter((i) => i.slot === slot)
      .forEach((item) => {
        const atMax = isCapped(item);
        html += `<div class="item-entry${item.id === activeId ? " active" : ""}" onclick="selectItem(${item.id})">
        <div class="item-entry-name">${item.name}</div>
        <div class="item-entry-meta">
          <span class="tier-badge${atMax ? " max" : ""}">T${item.tier}</span>
          <span class="class-badge">Classification ${item.cls}</span>
          <span>Spent: ${fmt(item.gold + item.itemGold)} gold</span>
        </div>
      </div>`;
      });
  });
  el.innerHTML = html;
}

function renderDetail() {
  const item = active();
  document.getElementById("emptyState").style.display = item ? "none" : "block";
  document.getElementById("itemDetail").style.display = item ? "block" : "none";
  if (!item) return;
  document.getElementById("itemNameInput").value = item.name === item.defaultName ? item.defaultName : item.name;
  document.getElementById("itemPriceInput").value = item.price > 0 ? item.price.toLocaleString() : "";
  updateTabStates();
  setMethod(activeMethod);
  renderTierBar(item);
  renderItemMetrics(item);
  renderItemLog(item);
}

function renderTierBar(item) {
  const bar = document.getElementById("detailTierBar");
  bar.innerHTML = "";
  const cap = maxTier(item.cls);
  for (let i = 0; i <= 10; i++) {
    const d = document.createElement("div");
    if (i > cap) {
      d.className = "tier-pip capped";
      d.textContent = "-";
      d.title = `Classification ${item.cls} cap: T${cap}`;
    } else {
      d.className = "tier-pip" + (i < item.tier ? " done" : i === item.tier ? " current" : " locked");
      d.textContent = `T${i}`;
      d.onclick = () => setTierManual(i);
    }
    bar.appendChild(d);
  }
}

function setTierManual(t) {
  const item = active();
  if (!item) return;
  item.tier = Math.min(t, maxTier(item.cls));
  renderDetail();
  renderItemList();
}

function renderItemMetrics(item) {
  const total = item.gold + item.itemGold;
  document.getElementById("itemMetrics").innerHTML = `
    <div class="metric"><div class="metric-label">Total gold</div><div class="metric-val gold" title="${fmtFull(total)} gold">${fmt(total)}</div><div class="metric-sub">fees: ${fmt(item.gold)} + cost of items: ${fmt(item.itemGold)}</div></div>
    <div class="metric"><div class="metric-label">Dust</div><div class="metric-val blue">${item.dust}</div></div>
    <div class="metric"><div class="metric-label">Cores</div><div class="metric-val blue">${item.cores}</div></div>
    <div class="metric"><div class="metric-label">Items used</div><div class="metric-val">${item.itemsUsed}</div></div>
    <div class="metric"><div class="metric-label">Successes</div><div class="metric-val green">${item.successes}</div></div>
    <div class="metric"><div class="metric-label">Fails</div><div class="metric-val red">${item.fails}</div></div>`;
}

function renderItemLog(item) {
  const w = document.getElementById("itemLog");
  if (!item.log.length) {
    w.innerHTML = '<div class="log-empty">No attempts yet.</div>';
    return;
  }
  1;
  w.innerHTML = item.log.map((e) => `<div class="log-entry"><span class="log-badge ${e.bt}">${e.badge}</span><span class="log-detail">${e.detail}</span><span class="log-costs">${e.costsStr}</span></div>`).join("");
}

function renderGlobalMetrics() {
  const fees = items.reduce((a, i) => a + i.gold, 0);
  const itemGold = items.reduce((a, i) => a + i.itemGold, 0);
  const total = fees + itemGold;
  const dust = items.reduce((a, i) => a + i.dust, 0);
  const cores = items.reduce((a, i) => a + i.cores, 0);
  const itemsUsed = items.reduce((a, i) => a + i.itemsUsed, 0);
  const successes = items.reduce((a, i) => a + i.successes, 0);
  const fails = items.reduce((a, i) => a + i.fails, 0);
  document.getElementById("globalMetrics").innerHTML = `
    <div class="metric"><div class="metric-label">Total gold</div><div class="metric-val gold" title="${fmtFull(total)} gold">${fmt(total)}</div><div class="metric-sub">fees: ${fmt(fees)} + cost of items: ${fmt(itemGold)}</div></div>
    <div class="metric"><div class="metric-label">Dust</div><div class="metric-val blue">${dust.toLocaleString()}</div></div>
    <div class="metric"><div class="metric-label">Cores</div><div class="metric-val blue">${cores.toLocaleString()}</div></div>
    <div class="metric"><div class="metric-label">Items used</div><div class="metric-val">${itemsUsed.toLocaleString()}</div></div>
    <div class="metric"><div class="metric-label">Successes</div><div class="metric-val green">${successes}</div></div>
    <div class="metric"><div class="metric-label">Fails</div><div class="metric-val red">${fails}</div></div>
    <div class="metric"><div class="metric-label">Items tracked</div><div class="metric-val purple">${items.length}</div></div>`;
}

function refresh() {
  renderItemList();
  renderDetail();
  renderGlobalMetrics();
}
function consumeItems(item, count) {
  item.itemsUsed += count;
  item.itemGold += count * item.price;
}

function resetAll() {
  if (!confirm("Reset everything?")) return;
  items = [];
  activeId = null;
  activeMethod = "fusion";
  refresh();
}

function updateTierOptions() {
  const cls = parseInt(document.getElementById("newClassification").value);
  const tierSelect = document.getElementById("newTier");

  const maxTier = cls === 3 ? 3 : 10;
  const currentValue = parseInt(tierSelect.value) || 0;

  tierSelect.innerHTML = "";

  for (let i = 0; i <= maxTier; i++) {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = i === 0 ? "T0" : `T${i}`;

    if (i === Math.min(currentValue, maxTier)) {
      option.selected = true;
    }

    tierSelect.appendChild(option);
  }
}
function applyTheme(dark) {
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  document.getElementById("themeLabel").textContent = dark ? "Light mode" : "Dark mode";
}
function toggleTheme() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  localStorage.setItem("tibiaTheme", isDark ? "light" : "dark");
  applyTheme(!isDark);
}
(function initTheme() {
  const saved = localStorage.getItem("tibiaTheme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(saved ? saved === "dark" : prefersDark);
})();

renderGlobalMetrics();
renderItemList();
updateTierOptions();