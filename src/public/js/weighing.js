const WEIGH_WORKFLOWS = {
  R: {
    label: "ชั่งน้ำหนักเคมี",
    scanTitle: "สแกน QR เคมี",
    scanDesc: "สแกน QR บนถุง/ขวดสารเคมี เพื่อยืนยัน Lot",
    steps: [
      { id: 1, title: "สแกน QR เคมี", kind: "scan" },
      { id: 2, title: "เลือกเครื่องชั่ง", kind: "scale" },
      { id: 3, title: "ชั่งน้ำหนักภาชนะ", kind: "confirm" },
      { id: 4, title: "Tare", kind: "confirm" },
      { id: 5, title: "ชั่งน้ำหนักเคมี", kind: "confirm" },
      { id: 6, title: "ชั่งน้ำหนักรวม", kind: "confirm" },
    ],
    actions: [
      { id: "pass", label: "ผ่าน", tone: "neutral", advance: true },
      { id: "no_stock", label: "สต็อกไม่พอ", tone: "warning", advance: false },
      { id: "mismatch", label: "เคมีไม่ตรง", tone: "danger", advance: false },
      { id: "expired", label: "หมดอายุ", tone: "danger", advance: false },
    ],
  },
  P: {
    label: "ชั่งน้ำหนักเคมี",
    scanTitle: "สแกน QR บรรจุภัณฑ์",
    scanDesc: "สแกน QR บนกล่อง/ถุงบรรจุภัณฑ์ เพื่อยืนยัน Lot",
    steps: [
      { id: 1, title: "สแกน QR บรรจุภัณฑ์", kind: "scan" },
      { id: 2, title: "ใส่จำนวน", kind: "quantity" },
    ],
    actions: [
      { id: "pass", label: "ผ่าน", tone: "neutral", advance: true },
      { id: "no_stock", label: "สต็อกไม่พอ", tone: "warning", advance: false },
      { id: "mismatch", label: "ไม่ตรง", tone: "danger", advance: false },
    ],
  },
};

const SCALE_OPTIONS = ["เครื่องชั่ง 1", "เครื่องชั่ง 2", "เครื่องชั่ง 3"];

let weighState = null;
let scanBuffer = "";
let scanTimer = null;

function formatWeighAmount(value) {
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getWorkflow(type) {
  return WEIGH_WORKFLOWS[type] || WEIGH_WORKFLOWS.R;
}

function openWeighPanel({
  type,
  name,
  amount,
  unit,
  round = null,
  productName = "",
  batchNo = "",
  docNo = "PB-BL03.3",
}) {
  weighState = {
    type,
    itemName: name,
    amount,
    unit,
    round,
    productName,
    batchNo,
    docNo,
    currentStep: 1,
    completedSteps: {},
    scanAlert: null,
    stockAcknowledged: false,
  };

  scanBuffer = "";

  document.getElementById("summaryPanel")?.classList.remove("active");

  const panel = document.getElementById("weighPanel");
  document.getElementById("weighLabel").textContent = getWorkflow(type).label;
  document.getElementById("weighItemName").textContent = name;

  const roundLabel = round ? ` (รอบที่ ${round})` : "";
  document.getElementById("weighAmount").textContent =
    `ยอดเบิก: ${formatWeighAmount(amount)} ${unit}${roundLabel}`;

  renderWeighSteps();
  panel.classList.add("active");
  focusScanInput();
}

function closeWeighPanel() {
  document.getElementById("weighPanel").classList.remove("active");
  weighState = null;
  scanBuffer = "";
}

function focusScanInput() {
  const input = document.getElementById("scanInput");
  if (!input || !weighState) return;
  input.value = "";
  input.focus();
}

function getStepStatus(stepId) {
  if (!weighState) return "locked";
  if (weighState.completedSteps[stepId]) return "done";
  if (stepId === weighState.currentStep) return "active";
  if (stepId < weighState.currentStep) return "done";
  return "locked";
}

function completeStep(stepId, result = {}) {
  weighState.completedSteps[stepId] = { ...result, locked: true };
  weighState.currentStep = stepId + 1;
  weighState.scanAlert = null;
  weighState.stockAcknowledged = false;

  const workflow = getWorkflow(weighState.type);
  if (weighState.currentStep > workflow.steps.length) {
    showSummaryPanel();
    return;
  }

  renderWeighSteps();
  focusScanInput();
}

function getMockStockRemaining() {
  return Math.max(weighState.amount * 0.71, 0);
}

function getSummaryWeights() {
  const target = weighState.amount;
  const quantityStep = Object.values(weighState.completedSteps).find(
    (step) => step.quantity != null,
  );

  if (weighState.type === "P") {
    const qty = quantityStep?.quantity ?? target;
    return {
      target,
      net: qty,
      gross: qty,
      unit: weighState.unit,
      isQuantity: true,
    };
  }

  const net = Number((target * 0.998).toFixed(2));
  const gross = Number((net + 125.3).toFixed(2));

  return {
    target,
    net,
    gross,
    unit: weighState.unit,
    isQuantity: false,
  };
}

function getMaterialLot() {
  const scanStep = weighState.completedSteps[1];
  return scanStep?.scanCode || "L26070608";
}

function getWeigherName() {
  const user = window.__sessionUser;
  if (user?.firstName) return user.firstName;
  if (user?.username) return user.username;
  return "Admin";
}

function showSummaryPanel() {
  const weights = getSummaryWeights();
  const materialLot = getMaterialLot();
  const docNo = weighState.docNo || "PB-BL03.3";
  const batchNo = weighState.batchNo || "C01160626B";
  const productTitle = weighState.productName || "POSE LIQUID SOAP";

  document.getElementById("weighPanel").classList.remove("active");
  document.getElementById("summaryItemName").textContent = weighState.itemName;
  document.getElementById("summaryMeta").textContent =
    `${docNo} · ${batchNo}`;

  const weightCard = document.querySelector(
    ".summary-content .summary-card:first-child",
  );
  const weightRows = weightCard?.querySelectorAll(".summary-row span:first-child");

  if (weights.isQuantity) {
    weightCard.querySelector(".summary-card-head").textContent = "จำนวน";
    if (weightRows?.[1]) weightRows[1].textContent = "จำนวนที่เบิก";
    if (weightRows?.[2]) weightRows[2].textContent = "จำนวนรวม";
  } else {
    weightCard.querySelector(".summary-card-head").textContent = "น้ำหนัก";
    if (weightRows?.[1]) weightRows[1].textContent = "น้ำหนักสุทธิ (Net)";
    if (weightRows?.[2]) weightRows[2].textContent = "น้ำหนักรวม (Gross)";
  }

  document.getElementById("summaryTarget").textContent =
    `${formatWeighAmount(weights.target)} ${weights.unit}`;
  document.getElementById("summaryNet").textContent =
    `${formatWeighAmount(weights.net)} ${weights.unit}`;
  document.getElementById("summaryGross").textContent =
    `${formatWeighAmount(weights.gross)} ${weights.unit}`;

  document.getElementById("summaryProductName").textContent = productTitle;
  document.getElementById("summaryBatchNo").textContent = batchNo;
  document.getElementById("summaryMaterialLot").textContent = materialLot;
  document.getElementById("summaryControlCode").textContent = materialLot;
  document.getElementById("summaryWeigher").textContent = getWeigherName();

  const inspector = document.getElementById("summaryInspector");
  if (inspector) inspector.value = "";

  document.getElementById("summaryPanel").classList.add("active");
}

function closeSummaryPanel() {
  document.getElementById("summaryPanel").classList.remove("active");
  document.getElementById("weighPanel").classList.remove("active");
  document.getElementById("withdrawPanel").classList.remove("active");
  weighState = null;
  scanBuffer = "";
}

function closeWeighPanel() {
  return Math.max(weighState.amount * 0.71, 0);
}

function canPassScanStep(stepId) {
  const stepData = weighState.completedSteps[stepId] || {};

  if (stepData.scanCode) return true;
  if (weighState.scanAlert === "mismatch" || weighState.scanAlert === "expired") {
    return true;
  }
  if (weighState.scanAlert === "no_stock" && weighState.stockAcknowledged) {
    return true;
  }

  return false;
}

function renderScanAlert(stepId) {
  const alert = weighState.scanAlert;
  if (!alert) return "";

  if (alert === "expired") {
    return `
      <div class="scan-alert scan-alert--danger">
        วัตถุดิบหมดอายุ — ติดต่อ QC ก่อนดำเนินการ
      </div>
    `;
  }

  if (alert === "mismatch") {
    const label = weighState.type === "P" ? "ไม่ตรง" : "เคมีไม่ตรง";
    const target =
      weighState.type === "P"
        ? `กล่อง ${weighState.itemName}`
        : `ถุง ${weighState.itemName}`;

    return `
      <div class="scan-alert scan-alert--danger">
        <strong>${label}</strong> — สแกน QR บน${target} ใหม่อีกครั้ง
      </div>
    `;
  }

  if (alert === "no_stock") {
    const lot =
      weighState.completedSteps[stepId]?.scanCode || "L26070609";
    const required = formatWeighAmount(weighState.amount);
    const remaining = formatWeighAmount(getMockStockRemaining());

    return `
      <div class="scan-alert scan-alert--stock">
        <div class="scan-alert-stock-title">
          <i class="fa-solid fa-triangle-exclamation"></i>
          สต็อกไม่เพียงพอ
        </div>
        <div class="scan-alert-stock-row">
          <span>Lot</span>
          <strong>${lot}</strong>
        </div>
        <div class="scan-alert-stock-row">
          <span>ยอดที่ต้องการ</span>
          <strong>${required} ${weighState.unit}</strong>
        </div>
        <div class="scan-alert-stock-row">
          <span>สต็อกคงเหลือ</span>
          <strong class="scan-alert-stock-low">${remaining} ${weighState.unit}</strong>
        </div>
        <p class="scan-alert-stock-question">
          ต้องการดำเนินการต่อด้วยสต็อกที่มีอยู่?
        </p>
        <div class="scan-alert-stock-actions">
          <button type="button" class="stock-cancel-btn" data-step="${stepId}">
            ยกเลิก
          </button>
          <button type="button" class="stock-continue-btn" data-step="${stepId}">
            ดำเนินการต่อ
          </button>
        </div>
      </div>
    `;
  }

  return "";
}

function renderScanBox(stepId, scannedCode) {
  const workflow = getWorkflow(weighState.type);
  const isActive = getStepStatus(stepId) === "active";

  if (!isActive) return "";

  const hasScan = Boolean(scannedCode);
  const canPass = canPassScanStep(stepId);

  return `
    <div class="scan-box ${hasScan ? "scan-box--success" : ""}">
      <i class="fa-solid fa-qrcode scan-box-icon"></i>
      <p class="scan-status">${hasScan ? scannedCode : "รอสแกน QR"}</p>
      <p class="scan-hint">${
        hasScan
          ? "สแกน QR/Barcode สำเร็จ"
          : "กดปุ่มด้านข้างเครื่องเพื่อสแกน"
      }</p>
    </div>
    ${renderScanAlert(stepId)}
    <div class="weigh-actions">
      ${workflow.actions
        .map((action) => {
          const disabled = action.advance && !canPass;
          return `
            <button
              type="button"
              class="weigh-action-btn weigh-action-btn--${action.tone}"
              data-action="${action.id}"
              data-step="${stepId}"
              ${disabled ? "disabled" : ""}
            >
              <i class="fa-solid fa-circle-play"></i>
              ${action.label}
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderScaleStep(stepId) {
  return `
    <div class="weigh-step-body">
      <p class="weigh-step-desc">เลือกเครื่องชั่งที่ใช้งาน</p>
      <div class="scale-options">
        ${SCALE_OPTIONS.map(
          (scale) => `
            <button type="button" class="scale-option-btn" data-scale="${scale}" data-step="${stepId}">
              ${scale}
            </button>
          `,
        ).join("")}
      </div>
    </div>
  `;
}

function renderConfirmStep(stepId, stepTitle) {
  return `
    <div class="weigh-step-body">
      <p class="weigh-step-desc">${stepTitle}</p>
      <button type="button" class="weigh-next-btn" data-step="${stepId}">
        ยืนยันและไปขั้นถัดไป
      </button>
    </div>
  `;
}

function renderQuantityStep(stepId) {
  return `
    <div class="weigh-step-body">
      <label class="qty-label" for="weighQtyInput">จำนวนที่เบิก</label>
      <input
        type="number"
        id="weighQtyInput"
        class="qty-input"
        min="0"
        step="0.01"
        value="${weighState.amount}"
      />
      <span class="qty-unit">${weighState.unit}</span>
      <button type="button" class="weigh-next-btn" data-step="${stepId}" data-kind="quantity">
        ยืนยันจำนวน
      </button>
    </div>
  `;
}

function renderDoneStep(step) {
  const data = weighState.completedSteps[step.id];
  let summary = "";

  if (data?.scanCode) summary = data.scanCode;
  else if (data?.scale) summary = data.scale;
  else if (data?.quantity != null)
    summary = `${formatWeighAmount(data.quantity)} ${weighState.unit}`;
  else if (data?.actionLabel) summary = data.actionLabel;
  else summary = "เสร็จสิ้น";

  return `
    <div class="weigh-step weigh-step--done">
      <div class="weigh-step-row">
        <span class="weigh-step-num weigh-step-num--done">
          <i class="fa-solid fa-check"></i>
        </span>
        <div class="weigh-step-summary">
          <span class="weigh-step-title">${step.title}</span>
          <span class="weigh-step-result">${summary}</span>
        </div>
      </div>
    </div>
  `;
}

function renderLockedStep(step) {
  return `
    <div class="weigh-step weigh-step--locked">
      <div class="weigh-step-row">
        <span class="weigh-step-num">${step.id}</span>
        <span class="weigh-step-title">${step.title}</span>
        <i class="fa-solid fa-lock weigh-step-lock"></i>
      </div>
    </div>
  `;
}

function getScanStepAlertClass(step) {
  if (step.kind !== "scan" || !weighState.scanAlert) return "";

  if (weighState.scanAlert === "no_stock") return "weigh-step--warn";
  return "weigh-step--alert";
}

function renderActiveStep(step) {
  const workflow = getWorkflow(weighState.type);
  const stepData = weighState.completedSteps[step.id] || {};
  const scannedCode = stepData.scanCode || null;

  let body = "";

  if (step.kind === "scan") {
    body = renderScanBox(step.id, scannedCode);
  } else if (step.kind === "scale") {
    body = renderScaleStep(step.id);
  } else if (step.kind === "quantity") {
    body = renderQuantityStep(step.id);
  } else {
    body = renderConfirmStep(step.id, step.title);
  }

  const desc =
    step.kind === "scan"
      ? step.id === 1
        ? workflow.scanDesc
        : ""
      : "";

  return `
    <div class="weigh-step weigh-step--active ${getScanStepAlertClass(step)}">
      <div class="weigh-step-header">
        <span class="weigh-step-num weigh-step-num--active">${step.id}</span>
        <div>
          <h4 class="weigh-step-title">${step.title}</h4>
          ${desc ? `<p class="weigh-step-desc">${desc}</p>` : ""}
        </div>
      </div>
      ${body}
    </div>
  `;
}

function renderWeighSteps() {
  if (!weighState) return;

  const workflow = getWorkflow(weighState.type);
  const container = document.getElementById("weighSteps");

  container.innerHTML = workflow.steps
    .map((step) => {
      const status = getStepStatus(step.id);

      if (status === "done") return renderDoneStep(step);
      if (status === "locked") return renderLockedStep(step);
      return renderActiveStep(step);
    })
    .join("");

  bindWeighStepEvents();
}

function bindWeighStepEvents() {
  document.querySelectorAll(".weigh-action-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const stepId = Number(btn.dataset.step);
      const actionId = btn.dataset.action;
      const workflow = getWorkflow(weighState.type);
      const action = workflow.actions.find((item) => item.id === actionId);

      if (!action || btn.disabled) return;

      if (action.advance) {
        const scanCode =
          weighState.completedSteps[stepId]?.scanCode || scanBuffer.trim();
        completeStep(stepId, {
          scanCode: scanCode || null,
          actionLabel: action.label,
          alertType: weighState.scanAlert || null,
        });
        return;
      }

      if (actionId === "no_stock") {
        weighState.scanAlert = "no_stock";
        weighState.stockAcknowledged = false;
      } else if (actionId === "mismatch") {
        weighState.scanAlert = "mismatch";
        weighState.stockAcknowledged = false;
      } else if (actionId === "expired") {
        weighState.scanAlert = "expired";
        weighState.stockAcknowledged = false;
      }

      renderWeighSteps();
    });
  });

  document.querySelectorAll(".stock-continue-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      weighState.stockAcknowledged = true;
      renderWeighSteps();
    });
  });

  document.querySelectorAll(".stock-cancel-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      weighState.scanAlert = null;
      weighState.stockAcknowledged = false;
      renderWeighSteps();
    });
  });

  document.querySelectorAll(".scale-option-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      completeStep(Number(btn.dataset.step), { scale: btn.dataset.scale });
    });
  });

  document.querySelectorAll(".weigh-next-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const stepId = Number(btn.dataset.step);

      if (btn.dataset.kind === "quantity") {
        const qtyInput = document.getElementById("weighQtyInput");
        const quantity = Number(qtyInput?.value);
        if (!quantity || quantity <= 0) return;
        completeStep(stepId, { quantity });
        return;
      }

      completeStep(stepId, { actionLabel: "ยืนยัน" });
    });
  });
}

function handleScanInput(value) {
  if (!weighState) return;

  const workflow = getWorkflow(weighState.type);
  const scanStep = workflow.steps.find((step) => step.kind === "scan");
  if (!scanStep || getStepStatus(scanStep.id) !== "active") return;

  weighState.completedSteps[scanStep.id] = {
    ...(weighState.completedSteps[scanStep.id] || {}),
    scanCode: value.trim(),
    locked: false,
  };

  renderWeighSteps();
  focusScanInput();
}

function initWeighingPanel() {
  const scanInput = document.getElementById("scanInput");
  const closeBtn = document.getElementById("closeWeighPanel");

  closeBtn?.addEventListener("click", closeWeighPanel);

  document.getElementById("summarySaveBtn")?.addEventListener("click", () => {
    closeSummaryPanel();
  });

  document.getElementById("summaryPrintBtn")?.addEventListener("click", () => {
    window.print();
  });

  scanInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (scanBuffer.trim()) {
        handleScanInput(scanBuffer.trim());
        scanBuffer = "";
        scanInput.value = "";
      }
      return;
    }

    if (event.key.length === 1) {
      scanBuffer += event.key;
      clearTimeout(scanTimer);
      scanTimer = setTimeout(() => {
        if (scanBuffer.trim()) {
          handleScanInput(scanBuffer.trim());
          scanBuffer = "";
          scanInput.value = "";
        }
      }, 120);
    }
  });

  document.getElementById("weighPanel")?.addEventListener("click", () => {
    focusScanInput();
  });
}

document.addEventListener("DOMContentLoaded", initWeighingPanel);
