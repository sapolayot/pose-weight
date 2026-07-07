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

const productionMaterials = {
  C01: {
    chemical: [
      {
        name: "C CKD",
        code: "R001",
        lot: "R2406021",
        withdrawn: 3,
        total: 3,
        unit: "kg",
        status: "completed",
      },
      {
        name: "C TX70",
        withdrawn: 300,
        total: 500,
        unit: "g",
        status: "partial",
        rounds: [
          {
            round: 1,
            lot: "L2405010",
            code: "R002-A",
            amount: 300,
            unit: "g",
            status: "done",
          },
          {
            round: 2,
            needed: 200,
            unit: "g",
            status: "pending",
          },
        ],
      },
      {
        name: "C AMCL",
        withdrawn: 0,
        total: 20,
        unit: "kg",
        status: "pending",
      },
      {
        name: "C EUPL",
        withdrawn: 0,
        total: 5,
        unit: "kg",
        status: "pending",
      },
      {
        name: "DI water",
        withdrawn: 0,
        total: 500,
        unit: "kg",
        status: "pending",
      },
    ],
    packaging: [
      {
        name: "1.5P Pump สีชมพู",
        code: "P001",
        withdrawn: 0,
        total: 200,
        unit: "ชิ้น",
        status: "pending",
      },
      {
        name: "ฝาเกลียว",
        code: "P002",
        withdrawn: 0,
        total: 800,
        unit: "ใบ",
        status: "pending",
      },
      {
        name: "สติ๊กเกอร์",
        code: "P003",
        withdrawn: 0,
        total: 800,
        unit: "ใบ",
        status: "pending",
      },
    ],
  },
  D42: {
    chemical: [
      {
        name: "Sodium Chlorite",
        code: "R010",
        lot: "R2405102",
        withdrawn: 126.69,
        total: 126.69,
        unit: "kg",
        status: "completed",
      },
      {
        name: "DI water",
        withdrawn: 0,
        total: 50,
        unit: "kg",
        status: "pending",
      },
    ],
    packaging: [
      {
        name: "ถัง HDPE 25L",
        code: "P010",
        withdrawn: 0,
        total: 6,
        unit: "ใบ",
        status: "pending",
      },
    ],
  },
  "D27-1": {
    chemical: [
      {
        name: "Q-BAC 2A",
        code: "R020",
        withdrawn: 1200,
        total: 2000,
        unit: "Lt.",
        status: "partial",
        rounds: [
          {
            round: 1,
            lot: "R2406011",
            amount: 1200,
            unit: "Lt.",
            status: "done",
          },
          {
            round: 2,
            needed: 800,
            unit: "Lt.",
            status: "pending",
          },
        ],
      },
    ],
    packaging: [
      {
        name: "ถัง 200L",
        code: "P020",
        withdrawn: 0,
        total: 10,
        unit: "ใบ",
        status: "pending",
      },
    ],
  },
  "D27-2": {
    chemical: [
      {
        name: "Q-BAC 2A",
        code: "R020",
        withdrawn: 0,
        total: 2000,
        unit: "Lt.",
        status: "pending",
      },
    ],
    packaging: [
      {
        name: "ถัง 200L",
        code: "P020",
        withdrawn: 0,
        total: 10,
        unit: "ใบ",
        status: "pending",
      },
    ],
  },
};

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

function renderCompletedCard(item, type) {
  const detailLines = [];

  if (item.code) {
    detailLines.push(`รหัสคุม: ${item.code}`);
  }
  if (item.lot) {
    detailLines.push(`Lot: ${item.lot}`);
  }

  return `
    <div
      class="material-card material-card--completed"
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
        ${renderPrintButton()}
      </div>
    </div>
  `;
}

function renderPartialCard(item, type) {
  const roundsHtml = (item.rounds || [])
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
            data-round="${round.round}"
            data-round-needed="${round.needed}"
            data-item-unit="${round.unit}"
          >ชั่งรอบ ${round.round}</button>
        </div>
      `;
    })
    .join("");

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

function renderWithdrawContent(productId, filter = "all") {
  const data = productionMaterials[productId] || productionMaterials.C01;
  const sections = [];

  if (filter === "all" || filter === "R") {
    sections.push(renderSection("วัตถุดิบเคมี (R)", data.chemical, "R"));
  }

  if (filter === "all" || filter === "P") {
    sections.push(renderSection("บรรจุภัณฑ์ (P)", data.packaging, "P"));
  }

  return sections.join("");
}

function openWithdrawPanel(item) {
  const panel = document.getElementById("withdrawPanel");
  const productId =
    item.getAttribute("data-product-code") || item.getAttribute("data-id");
  const name = item.getAttribute("data-name");
  const lot = item.getAttribute("data-lot");
  const amount = item.getAttribute("data-amount");
  const unit = item.getAttribute("data-unit");

  document.getElementById("withdrawTitle").textContent = name;
  document.getElementById("withdrawMeta").textContent =
    `จำนวน: ${amount} ${unit} · Lot: ${lot}`;

  panel.dataset.productId = productId;
  panel.dataset.batchLot = lot;
  panel.dataset.docNo = item.getAttribute("data-doc") || "";
  panel.dataset.batchSize = amount || "";
  panel.dataset.batchUnit = unit || "";
  panel.dataset.productionDate = item.getAttribute("data-date") || "";

  panel.querySelectorAll(".withdraw-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.filter === "all");
  });

  document.getElementById("withdrawContent").innerHTML = renderWithdrawContent(
    productId,
    "all",
  );

  panel.classList.add("active");
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
}

function setWithdrawFilter(filter) {
  const panel = document.getElementById("withdrawPanel");
  const productId = panel.dataset.productId || "C01";

  panel.querySelectorAll(".withdraw-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.filter === filter);
  });

  document.getElementById("withdrawContent").innerHTML = renderWithdrawContent(
    productId,
    filter,
  );
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

function bindProductionListItems() {
  document.querySelectorAll(".production-list .list-item").forEach((item) => {
    item.addEventListener("click", () => openWithdrawPanel(item));
  });
}

let productionSearchTimer = null;

async function loadProductionList(query = "") {
  const listEl = document.getElementById("productionList");
  const emptyEl = document.getElementById("productionEmpty");
  const loadingEl = document.getElementById("productionLoading");

  if (!listEl) return;

  if (loadingEl) loadingEl.hidden = false;
  if (emptyEl) {
    emptyEl.textContent = "ไม่พบรายการที่ค้นหา";
    emptyEl.hidden = true;
  }

  try {
    const params = new URLSearchParams();
    if (query.trim()) {
      params.set("q", query.trim());
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

    listEl.querySelectorAll(".list-item").forEach((item) => item.remove());

    if (items.length === 0) {
      if (emptyEl) emptyEl.hidden = false;
    } else {
      listEl.insertAdjacentHTML(
        "beforeend",
        items.map((item) => renderProductionListItem(item)).join(""),
      );
      bindProductionListItems();
    }
  } catch (error) {
    console.error(error);
    if (emptyEl) {
      emptyEl.textContent = "ไม่สามารถโหลดรายการผลิตได้";
      emptyEl.hidden = false;
    }
  } finally {
    if (loadingEl) loadingEl.hidden = true;
  }
}

function handleProductionSearchInput() {
  clearTimeout(productionSearchTimer);
  productionSearchTimer = setTimeout(() => {
    const query =
      document.getElementById("productionSearch")?.value.trim() || "";
    loadProductionList(query);
  }, 300);
}

document.addEventListener("DOMContentLoaded", () => {
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
            itemCode: weighBtn.dataset.itemCode || "",
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
          itemCode: card.dataset.itemCode || "",
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
    });
  });

  document
    .getElementById("productionSearch")
    ?.addEventListener("input", handleProductionSearchInput);

  initWelcomeText();
});
