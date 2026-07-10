const API_URL = "/api";

const DAYS_GREETING = [
  "สวัสดีวันอาทิตย์",
  "สวัสดีวันจันทร์",
  "สวัสดีวันอังคาร",
  "สวัสดีวันพุธ",
  "สวัสดีวันพฤหัสบดี",
  "สวัสดีวันศุกร์",
  "สวัสดีวันเสาร์",
];

function setWelcomeText(user) {
  const welcomeEl = document.getElementById("welcome-text");
  if (!welcomeEl) return;

  const greeting = DAYS_GREETING[new Date().getDay()];
  const firstName = user?.firstName?.trim();

  welcomeEl.textContent = firstName ? `${greeting}, ${firstName}` : greeting;
}

function initWelcomeText() {
  if (window.__sessionUser) {
    setWelcomeText(window.__sessionUser);
    return;
  }

  document.addEventListener(
    "auth:ready",
    (event) => {
      setWelcomeText(event.detail);
    },
    { once: true },
  );
}

let withdrawMaterialsCache = null;

async function logout() {
  try {
    const proceed = confirm("ยืนยันออกจากระบบ?");
    if (proceed) {
      await fetch(`${API_URL}/logout`, {
        method: "POST",
        credentials: "include",
      });

      window.location.href = "/";
    }
  } catch (err) {
    console.error(err);
  }
}

function formatAmount(value) {
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function countCompleted(items) {
  return items.filter((item) => item.status === "completed").length;
}

function renderPrintButton() {
  return `<button class="print-btn" type="button" aria-label="พิมพ์"><i class="fa-solid fa-print"></i></button>`;
}

function renderRoundItems(item, type, { showPending = true } = {}) {
  return (item.rounds || [])
    .map((round) => {
      if (round.status === "done") {
        const detailLines = [
          round.lot ? `Lot: ${round.lot}` : "",
          round.code ? `รหัสคุม: ${round.code}` : "",
        ].filter(Boolean);

        return `
          <div
            class="round-item round-item--done"
            data-type="${type}"
            data-item-name="${item.name}"
            data-round="${round.round}"
            data-item-lot="${round.lot || ""}"
            data-item-code="${round.code || ""}"
            data-item-amount="${round.amount}"
            data-item-unit="${round.unit}"
          >
            <span class="round-dot round-dot--green"></span>
            <div class="round-info">
              <span class="round-label">รอบที่ ${round.round}</span>
              ${detailLines.map((line) => `<span class="round-detail">${line}</span>`).join("")}
              <span class="round-amount">${formatAmount(round.amount)} ${round.unit}</span>
            </div>
            ${renderPrintButton()}
          </div>
        `;
      }

      if (!showPending) return "";

      return `
        <div class="round-item round-item--pending">
          <span class="round-dot round-dot--yellow"></span>
          <div class="round-info">
            <span class="round-label">รอบที่ ${round.round}</span>
            <span class="round-detail">ต้องการ ${formatAmount(round.needed)} ${round.unit}</span>
          </div>
          <button
            class="weigh-btn"
            type="button"
            data-type="${type}"
            data-item-name="${item.name}"
            data-item-code="${item.code || ""}"
            data-material-item-code="${round.itemCode || item.itemCode || ""}"
            data-round="${round.round}"
            data-round-needed="${round.needed}"
            data-item-unit="${round.unit}"
          >ชั่งรอบ ${round.round}</button>
        </div>
      `;
    })
    .filter(Boolean)
    .join("");
}

function renderCompletedCard(item, type) {
  const hasRounds = item.rounds?.length > 0;
  const detailLines = [];

  if (item.code) {
    detailLines.push(`รหัสคุม: ${item.code}`);
  }
  if (!hasRounds && item.lot) {
    detailLines.push(`Lot: ${item.lot}`);
  }

  const roundsHtml = hasRounds
    ? `<div class="material-rounds">${renderRoundItems(item, type, { showPending: false })}</div>`
    : "";

  const cardClass = hasRounds
    ? "material-card material-card--completed material-card--completed-rounds"
    : "material-card material-card--completed";

  return `
    <div
      class="${cardClass}"
      data-type="${type}"
      data-item-name="${item.name}"
      data-item-code="${item.code || ""}"
      data-item-lot="${item.lot || ""}"
      data-item-amount="${item.withdrawn}"
      data-item-unit="${item.unit}"
    >
      <div class="material-card-main">
        <div class="material-icon material-icon--check">
          <i class="fa-solid fa-check"></i>
        </div>
        <div class="material-info">
          <span class="material-name">${item.name}</span>
          ${detailLines.map((line) => `<p class="material-detail">${line}</p>`).join("")}
          <p class="material-qty material-qty--green">
            ยอดเบิก ${formatAmount(item.withdrawn)} / ${formatAmount(item.total)} ${item.unit}
          </p>
        </div>
        ${hasRounds ? "" : renderPrintButton()}
      </div>
      ${roundsHtml}
    </div>
  `;
}

function renderPartialCard(item, type) {
  const roundsHtml = renderRoundItems(item, type);

  return `
    <div class="material-card material-card--partial" data-type="${type}">
      <div class="material-card-main">
        <div class="material-icon material-icon--type">${type}</div>
        <div class="material-info">
          <div class="material-name-row">
            <span class="material-name">${item.name}</span>
            <span class="status-badge status-badge--partial">บางส่วน</span>
          </div>
          <p class="material-qty">
            ยอดเบิก <span>${formatAmount(item.withdrawn)} / ${formatAmount(item.total)} ${item.unit}</span>
          </p>
        </div>
      </div>
      <div class="material-rounds">${roundsHtml}</div>
    </div>
  `;
}

function renderPendingCard(item, type) {
  const remain = item.total - (item.withdrawn || 0);

  return `
    <div
      class="material-card material-card--clickable"
      data-type="${type}"
      data-item-name="${item.name}"
      data-item-code="${item.code || ""}"
      data-material-item-code="${item.itemCode || ""}"
      data-item-total="${item.total}"
      data-item-withdrawn="${item.withdrawn || 0}"
      data-item-unit="${item.unit}"
    >
      <div class="material-card-main">
        <div class="material-icon material-icon--type">${type}</div>
        <div class="material-info">
          <span class="material-name">${item.name}</span>
          <p class="material-qty">
            ยอดเบิก <span>${formatAmount(item.withdrawn)} / ${formatAmount(item.total)} ${item.unit}</span>
          </p>
        </div>
      </div>
    </div>
  `;
}

function renderMaterialCard(item, type) {
  if (item.status === "completed") return renderCompletedCard(item, type);
  if (item.status === "partial") return renderPartialCard(item, type);
  return renderPendingCard(item, type);
}

function renderSection(title, items, type) {
  const completed = countCompleted(items);

  return `
    <section class="material-section" data-section="${type}">
      <div class="section-header">
        <h3>${title}</h3>
        <span class="section-counter">${completed} / ${items.length}</span>
      </div>
      <div class="material-list">
        ${items.map((item) => renderMaterialCard(item, type)).join("")}
      </div>
    </section>
  `;
}

function compareRowId(a, b) {
  const aNum = Number(a.id);
  const bNum = Number(b.id);

  if (
    Number.isFinite(aNum) &&
    Number.isFinite(bNum) &&
    String(a.id).trim() !== "" &&
    String(b.id).trim() !== ""
  ) {
    return aNum - bNum;
  }

  return String(a.id ?? "").localeCompare(String(b.id ?? ""), undefined, {
    numeric: true,
  });
}

function sortRowsById(rows) {
  return [...rows].sort(compareRowId);
}

function getMaterialGroupKey(row) {
  return `${row.itemCode ?? ""}\0${row.docNo ?? ""}\0${row.refCode ?? ""}`;
}

function groupRowsByMaterialKey(rows) {
  const groups = new Map();

  rows.forEach((row) => {
    const key = getMaterialGroupKey(row);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(row);
  });

  return groups;
}

function getRowAmount(row) {
  const qty = Number(row.qty);
  if (qty > 0) return qty;
  return 0;
}

function getRowNeeded(row, fallbackTotal) {
  const qty = Number(row.qtyTmp);
  if (qty > 0) return qty;

  const target = Number(row.bomQty) || Number(row.qtyImport);
  if (target > 0) return target;

  return fallbackTotal;
}

function mapRowToRound(row, roundNumber, unit, fallbackTotal) {
  if (Number(row.status) === 1) {
    return {
      round: roundNumber,
      lot: row.lotNo || "",
      code: row.refCode || row.itemCode || "",
      itemCode: row.itemCode || "",
      amount: getRowAmount(row),
      unit,
      status: "done",
    };
  }

  return {
    round: roundNumber,
    needed: getRowNeeded(row, fallbackTotal),
    itemCode: row.itemCode || "",
    unit,
    status: "pending",
  };
}

function buildRoundsFromRows(rows, total, unit, withdrawn) {
  const sorted = sortRowsById(rows);
  const doneRows = sorted.filter(
    (row) => Number(row.status) === 1 && (Number(row.qtyTmp) > 0 || row.lotNo),
  );

  let rounds = doneRows.map((row, index) => ({
    round: index + 1,
    lot: row.lotNo || "",
    code: row.refCode || row.itemCode || "",
    itemCode: row.itemCode || "",
    amount: getRowAmount(row),
    unit,
    status: "done",
  }));

  if (rounds.length === 0 && withdrawn > 0) {
    rounds = [
      {
        round: 1,
        lot: sorted[0]?.lotNo || "",
        code: sorted[0]?.refCode || sorted[0]?.itemCode || "",
        itemCode: sorted[0]?.itemCode || "",
        amount: withdrawn,
        unit,
        status: "done",
      },
    ];
  }

  const remain = Math.max(total - withdrawn, 0);
  if (remain > 0) {
    rounds.push({
      round: rounds.length + 1,
      needed: remain,
      unit,
      status: "pending",
    });
  }

  return rounds;
}

function buildMaterialItem(rows) {
  const sorted = sortRowsById(rows);
  const first = sorted[0];
  const name = first.barcode || "—";
  const code = first.refCode || first.itemCode || "";
  const unit = first.unitName || first.unitAltName || "—";
  const total = first.bomQty ? Number(first.bomQty) : 0;
  const effectiveTotal = total > 0 ? total : 0;

  if (sorted.length > 1) {
    const rounds = sorted.map((row, index) =>
      mapRowToRound(row, index + 1, unit, effectiveTotal),
    );
    const withdrawn = first.sumQty ? Number(first.sumQty) : 0;
    const allDone = rounds.every((row) => row.status === "done");

    return {
      name,
      code,
      itemCode: first.itemCode || "",
      withdrawn,
      total: effectiveTotal,
      unit,
      status: allDone ? "completed" : "partial",
      rounds,
    };
  }

  const withdrawn = Number(first.sumQty) || 0;

  if (effectiveTotal > 0 && withdrawn >= effectiveTotal) {
    return {
      name,
      code,
      itemCode: first.itemCode || "",
      lot: first.lotNo || first.refCode || "",
      withdrawn: effectiveTotal,
      total: effectiveTotal,
      unit,
      status: "completed",
    };
  }

  if (withdrawn > 0) {
    const allDone = sorted.every((row) => Number(row.status) === 1);

    return {
      name,
      code,
      itemCode: first.itemCode || "",
      withdrawn,
      total: effectiveTotal,
      unit,
      status: allDone ? "completed" : "partial",
      rounds: buildRoundsFromRows(sorted, effectiveTotal, unit, withdrawn),
    };
  }

  return {
    name,
    code,
    itemCode: first.itemCode || "",
    withdrawn: 0,
    total: effectiveTotal,
    unit,
    status: "pending",
  };
}

function mapSubItemsToMaterials(apiRows) {
  const chemicalRows = apiRows.filter((row) => Number(row.grp1) === 2);
  const packagingRows = apiRows.filter((row) => Number(row.grp1) !== 2);

  return {
    chemical: Array.from(groupRowsByMaterialKey(chemicalRows).values()).map(
      buildMaterialItem,
    ),
    packaging: Array.from(groupRowsByMaterialKey(packagingRows).values()).map(
      buildMaterialItem,
    ),
  };
}

async function fetchWithdrawMaterials(docNo) {
  const response = await fetch(
    `${API_URL}/wh-stock-transmit-iso-sub/${encodeURIComponent(docNo)}`,
    { credentials: "include" },
  );

  if (!response.ok) {
    throw new Error("Failed to load withdraw materials");
  }

  const payload = await response.json();
  const rows = Array.isArray(payload.data) ? payload.data : [];

  return mapSubItemsToMaterials(rows);
}

function renderWithdrawLoading() {
  return `<p class="withdraw-loading">กำลังโหลดรายการวัตถุดิบ...</p>`;
}

function renderWithdrawError(message) {
  return `<p class="withdraw-error">${escapeHtml(message)}</p>`;
}

function renderWithdrawContent(filter = "all") {
  const data = withdrawMaterialsCache;

  if (!data) {
    return renderWithdrawLoading();
  }

  const sections = [];

  if ((filter === "all" || filter === "R") && data.chemical.length > 0) {
    sections.push(renderSection("วัตถุดิบเคมี (R)", data.chemical, "R"));
  }

  if ((filter === "all" || filter === "P") && data.packaging.length > 0) {
    sections.push(renderSection("บรรจุภัณฑ์ (P)", data.packaging, "P"));
  }

  if (sections.length === 0) {
    return `<p class="withdraw-empty">ไม่พบรายการวัตถุดิบ</p>`;
  }

  return sections.join("");
}

async function openWithdrawPanel(item) {
  const panel = document.getElementById("withdrawPanel");
  const productId =
    item.getAttribute("data-product-code") || item.getAttribute("data-id");
  const name = item.getAttribute("data-name");
  const lot = item.getAttribute("data-lot");
  const amount = item.getAttribute("data-amount");
  const unit = item.getAttribute("data-unit");
  const docNo = item.getAttribute("data-doc") || "";

  document.getElementById("withdrawTitle").textContent = name;
  document.getElementById("withdrawMeta").textContent =
    `จำนวน: ${amount} ${unit} · Lot: ${lot}`;

  panel.dataset.productId = productId;
  panel.dataset.batchLot = lot;
  panel.dataset.docNo = docNo;
  panel.dataset.batchSize = amount || "";
  panel.dataset.batchUnit = unit || "";
  panel.dataset.productionDate = item.getAttribute("data-date") || "";

  panel.querySelectorAll(".withdraw-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.filter === "all");
  });

  panel.classList.add("active");
  document.getElementById("withdrawContent").innerHTML =
    renderWithdrawLoading();

  try {
    withdrawMaterialsCache = await fetchWithdrawMaterials(docNo);
    document.getElementById("withdrawContent").innerHTML =
      renderWithdrawContent("all");
  } catch (error) {
    console.error(error);
    withdrawMaterialsCache = null;
    document.getElementById("withdrawContent").innerHTML = renderWithdrawError(
      "ไม่สามารถโหลดรายการวัตถุดิบได้",
    );
  }
}

function getWithdrawProductContext() {
  const panel = document.getElementById("withdrawPanel");

  return {
    productName: document.getElementById("withdrawTitle").textContent,
    productCode: panel.dataset.productId || "",
    batchNo: panel.dataset.batchLot || "",
    docNo: panel.dataset.docNo || "PB-BL03.3",
    batchSize: panel.dataset.batchSize || "",
    batchUnit: panel.dataset.batchUnit || "",
    productionDate: panel.dataset.productionDate || "",
  };
}

function collectWithdrawPrintContext(printBtn) {
  const roundItem = printBtn.closest(".round-item--done");
  const completedCard = printBtn.closest(".material-card--completed");
  const product = getWithdrawProductContext();

  if (roundItem) {
    return {
      type: roundItem.dataset.type,
      itemName: roundItem.dataset.itemName,
      amount: Number(roundItem.dataset.itemAmount),
      unit: roundItem.dataset.itemUnit,
      round: Number(roundItem.dataset.round),
      lot: roundItem.dataset.itemLot,
      code: roundItem.dataset.itemCode,
      ...product,
    };
  }

  if (completedCard) {
    return {
      type: completedCard.dataset.type,
      itemName: completedCard.dataset.itemName,
      amount: Number(completedCard.dataset.itemAmount),
      unit: completedCard.dataset.itemUnit,
      round: null,
      lot: completedCard.dataset.itemLot,
      code: completedCard.dataset.itemCode,
      ...product,
    };
  }

  return null;
}

function closeWithdrawPanel() {
  document.getElementById("withdrawPanel").classList.remove("active");
  withdrawMaterialsCache = null;
}

function setWithdrawFilter(filter) {
  const panel = document.getElementById("withdrawPanel");

  panel.querySelectorAll(".withdraw-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.filter === filter);
  });

  document.getElementById("withdrawContent").innerHTML =
    renderWithdrawContent(filter);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderProductionListItem(item) {
  return `
    <div
      class="list-item"
      data-id="${escapeHtml(item.id)}"
      data-product-code="${escapeHtml(item.productCode)}"
      data-name="${escapeHtml(item.name)}"
      data-lot="${escapeHtml(item.lot)}"
      data-doc="${escapeHtml(item.doc)}"
      data-date="${escapeHtml(item.date)}"
      data-amount="${escapeHtml(item.amount)}"
      data-unit="${escapeHtml(item.unit)}"
      data-display-status="${escapeHtml(item.displayStatus)}"
    >
      <div class="item-icon">
        <i class="fa-regular fa-file-lines"></i>
      </div>
      <div class="item-details">
        <h3>${escapeHtml(item.name)}</h3>
        <p>Lot No. ${escapeHtml(item.lot)}</p>
        <p class="doc-no">Doc. ${escapeHtml(item.doc)}</p>
      </div>
      <div class="item-stats">
        <span class="date">${escapeHtml(item.date)}</span>
        <span class="amount">${escapeHtml(item.amount)}</span>
        <span class="unit">${escapeHtml(item.unit)}</span>
      </div>
    </div>
  `;
}

const PRODUCTION_PAGE_SIZE = 10;
const PRODUCTION_APPEND_DELAY_MS = 100;

let productionSearchTimer = null;
let productionStatusFilter = "all";
let productionPage = 1;
let productionHasMore = true;
let productionLoadingData = false;
let productionListObserver = null;
let productionLoadGeneration = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clearProductionListItems(listEl) {
  listEl.querySelectorAll(".list-item").forEach((item) => item.remove());
}

function updateProductionLoadMoreVisibility() {
  const loadMoreEl = document.getElementById("productionLoadMore");
  if (!loadMoreEl) return;

  loadMoreEl.hidden = !productionHasMore;
}

function appendProductionListItems(listEl, loadMoreEl, items) {
  const itemsHtml = items
    .map((item) => renderProductionListItem(item))
    .join("");

  if (loadMoreEl) {
    loadMoreEl.insertAdjacentHTML("beforebegin", itemsHtml);
  } else {
    listEl.insertAdjacentHTML("beforeend", itemsHtml);
  }
}

function initProductionListObserver() {
  const loadMoreEl = document.getElementById("productionLoadMore");
  if (!loadMoreEl) return;

  if (productionListObserver) {
    productionListObserver.disconnect();
  }

  productionListObserver = new IntersectionObserver(async (entries) => {
    if (
      entries[0]?.isIntersecting &&
      !productionLoadingData &&
      productionHasMore
    ) {
      const query =
        document.getElementById("productionSearch")?.value.trim() || "";
      await loadProductionList(query, productionStatusFilter, { append: true });
    }
  });

  productionListObserver.observe(loadMoreEl);
}

function initProductionListEvents() {
  const listEl = document.getElementById("productionList");
  if (!listEl || listEl.dataset.bound === "true") return;

  listEl.dataset.bound = "true";
  listEl.addEventListener("click", (event) => {
    const item = event.target.closest(".list-item");
    if (!item) return;
    openWithdrawPanel(item);
  });
}

async function loadProductionList(
  query = "",
  statusFilter = productionStatusFilter,
  { append = false } = {},
) {
  const listEl = document.getElementById("productionList");
  const emptyEl = document.getElementById("productionEmpty");
  const loadingEl = document.getElementById("productionLoading");
  const loadMoreEl = document.getElementById("productionLoadMore");

  if (!listEl || productionLoadingData) return;

  const loadGeneration = append
    ? productionLoadGeneration
    : ++productionLoadGeneration;

  productionStatusFilter = statusFilter;
  productionLoadingData = true;

  if (!append) {
    productionPage = 1;
    productionHasMore = true;
    clearProductionListItems(listEl);
    if (emptyEl) {
      emptyEl.textContent = "ไม่พบรายการที่ค้นหา";
      emptyEl.hidden = true;
    }
    if (loadingEl) loadingEl.hidden = false;
    if (loadMoreEl) loadMoreEl.hidden = true;
  } else if (loadMoreEl) {
    loadMoreEl.hidden = false;
  }

  try {
    const params = new URLSearchParams();
    params.set("limit", String(PRODUCTION_PAGE_SIZE));
    params.set("page", String(productionPage));

    if (query.trim()) {
      params.set("q", query.trim());
    }
    if (statusFilter === "0" || statusFilter === "1") {
      params.set("status", statusFilter);
    }

    const response = await fetch(
      `${API_URL}/wh-stock-transmit-iso?${params.toString()}`,
      { credentials: "include" },
    );

    if (!response.ok) {
      throw new Error("Failed to load production list");
    }

    const payload = await response.json();
    const items = Array.isArray(payload.data) ? payload.data : [];

    if (loadGeneration !== productionLoadGeneration) return;

    if (items.length === 0 && !append) {
      if (emptyEl) emptyEl.hidden = false;
      productionHasMore = false;
    } else if (items.length > 0) {
      if (append) {
        await sleep(PRODUCTION_APPEND_DELAY_MS);
        if (loadGeneration !== productionLoadGeneration) return;
      }

      appendProductionListItems(listEl, loadMoreEl, items);
      productionHasMore = items.length === PRODUCTION_PAGE_SIZE;
      productionPage += 1;
    } else {
      productionHasMore = false;
    }

    updateProductionLoadMoreVisibility();

    if (productionHasMore) {
      initProductionListObserver();
    } else if (productionListObserver) {
      productionListObserver.disconnect();
      productionListObserver = null;
    }
  } catch (error) {
    console.error(error);
    if (!append && emptyEl) {
      emptyEl.textContent = "ไม่สามารถโหลดรายการผลิตได้";
      emptyEl.hidden = false;
    }
    productionHasMore = false;
    updateProductionLoadMoreVisibility();
  } finally {
    productionLoadingData = false;
    if (loadingEl) loadingEl.hidden = true;
    if (!productionHasMore && loadMoreEl) loadMoreEl.hidden = true;
  }
}

function handleProductionSearchInput() {
  clearTimeout(productionSearchTimer);
  productionSearchTimer = setTimeout(() => {
    const query =
      document.getElementById("productionSearch")?.value.trim() || "";
    loadProductionList(query, productionStatusFilter);
  }, 300);
}

document.addEventListener("DOMContentLoaded", () => {
  initProductionListEvents();
  loadProductionList();

  document
    .getElementById("backToList")
    .addEventListener("click", closeWithdrawPanel);

  document.querySelectorAll(".withdraw-tab").forEach((tab) => {
    tab.addEventListener("click", () => setWithdrawFilter(tab.dataset.filter));
  });

  document
    .getElementById("withdrawContent")
    .addEventListener("click", (event) => {
      const weighBtn = event.target.closest(".weigh-btn");
      if (weighBtn) {
        event.stopPropagation();
        if (typeof openWeighPanel === "function") {
          openWeighPanel({
            type: weighBtn.dataset.type,
            name: weighBtn.dataset.itemName,
            itemCode:
              weighBtn.dataset.materialItemCode ||
              weighBtn.dataset.itemCode ||
              "",
            amount: Number(weighBtn.dataset.roundNeeded),
            unit: weighBtn.dataset.itemUnit,
            round: Number(weighBtn.dataset.round),
            ...getWithdrawProductContext(),
          });
        }
        return;
      }

      const printBtn = event.target.closest(".print-btn");
      if (printBtn) {
        event.stopPropagation();
        const context = collectWithdrawPrintContext(printBtn);
        if (context && typeof showPrintPreviewFromWithdraw === "function") {
          showPrintPreviewFromWithdraw(context);
        }
        return;
      }

      const card = event.target.closest(".material-card--clickable");
      if (!card) return;

      if (typeof openWeighPanel === "function") {
        const total = Number(card.dataset.itemTotal);
        const withdrawn = Number(card.dataset.itemWithdrawn);
        openWeighPanel({
          type: card.dataset.type,
          name: card.dataset.itemName,
          itemCode:
            card.dataset.materialItemCode || card.dataset.itemCode || "",
          amount: total - withdrawn,
          unit: card.dataset.itemUnit,
          ...getWithdrawProductContext(),
        });
      }
    });

  document.querySelectorAll(".filter-tabs .tab-btn").forEach((button) => {
    button.addEventListener("click", () => {
      document
        .querySelectorAll(".filter-tabs .tab-btn")
        .forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");

      const statusFilter = button.dataset.statusFilter || "all";
      const query =
        document.getElementById("productionSearch")?.value.trim() || "";
      loadProductionList(query, statusFilter);
    });
  });

  document
    .getElementById("productionSearch")
    ?.addEventListener("input", handleProductionSearchInput);

  initWelcomeText();
});
