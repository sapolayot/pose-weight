const API_URL = "http://localhost:3000/api";

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
        name: "ขวด PET 500ml",
        code: "P001",
        withdrawn: 0,
        total: 800,
        unit: "ใบ",
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
    <div class="material-card material-card--completed" data-type="${type}">
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
          <div class="round-item round-item--done">
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
          <button class="weigh-btn" type="button">ชั่งรอบ ${round.round}</button>
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
  return `
    <div class="material-card" data-type="${type}">
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
  const productId = item.getAttribute("data-id");
  const name = item.getAttribute("data-name");
  const lot = item.getAttribute("data-lot");
  const amount = item.getAttribute("data-amount");
  const unit = item.getAttribute("data-unit");

  document.getElementById("withdrawTitle").textContent = name;
  document.getElementById("withdrawMeta").textContent =
    `จำนวน: ${amount} ${unit} · Lot: ${lot}`;

  panel.dataset.productId = productId;

  panel.querySelectorAll(".withdraw-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.filter === "all");
  });

  document.getElementById("withdrawContent").innerHTML = renderWithdrawContent(
    productId,
    "all",
  );

  panel.classList.add("active");
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

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".list-item").forEach((item) => {
    item.addEventListener("click", () => openWithdrawPanel(item));
  });

  document.getElementById("backToList").addEventListener("click", closeWithdrawPanel);

  document.querySelectorAll(".withdraw-tab").forEach((tab) => {
    tab.addEventListener("click", () => setWithdrawFilter(tab.dataset.filter));
  });

  document.querySelectorAll(".filter-tabs .tab-btn").forEach((button) => {
    button.addEventListener("click", () => {
      document
        .querySelectorAll(".filter-tabs .tab-btn")
        .forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
    });
  });

  const daysGreeting = [
    "สวัสดีวันอาทิตย์",
    "สวัสดีวันจันทร์",
    "สวัสดีวันอังคาร",
    "สวัสดีวันพุธ",
    "สวัสดีวันพฤหัสบดี",
    "สวัสดีวันศุกร์",
    "สวัสดีวันเสาร์",
  ];

  document.getElementById("welcome-text").innerText =
    daysGreeting[new Date().getDay()];
});
