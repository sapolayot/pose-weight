const WEIGH_WORKFLOWS = {
  R: {
    label: "ชั่งน้ำหนักเคมี",
    scanTitle: "สแกน QR เคมี",
    scanDesc: "สแกน QR บนถุง/ขวดสารเคมี เพื่อยืนยัน Lot",
    steps: [
      { id: 1, title: "สแกน QR เคมี", kind: "scan" },
      {
        id: 2,
        title: "เลือกเครื่องชั่ง",
        kind: "scale",
        desc: "สแกน QR บนตัวเครื่องชั่ง เพื่อเชื่อมต่อ",
      },
      {
        id: 3,
        title: "ชั่งน้ำหนักภาชนะ",
        kind: "container",
        desc: "วางภาชนะเปล่าบนเครื่องชั่ง รอให้ค่านิ่ง แล้วบันทึก",
        unit: "g",
        mockWeight: 125.3,
      },
      {
        id: 4,
        title: "Tare",
        kind: "tare",
        desc: "น้ำหนักภาชนะ 125.30 g — กด Tare หักน้ำหนัก รอจนเครื่องแสดง 0.00",
        unit: "g",
      },
      {
        id: 5,
        title: "ชั่งน้ำหนักเคมี",
        kind: "net",
        desc: "ใส่เคมีลงในภาชนะ แล้วบันทึกน้ำหนัก",
      },
      {
        id: 6,
        title: "ชั่งน้ำหนักรวม",
        kind: "gross",
        desc: "ระบบส่งคำสั่ง Gross (Clear + Read) — กด Get รับค่าแล้วตรวจสอบ",
      },
    ],
    actions: [
      { id: "pass", label: "ผ่าน", tone: "neutral", advance: true },
      { id: "no_stock", label: "สต็อกไม่พอ", tone: "warning", advance: false },
      { id: "mismatch", label: "เคมีไม่ตรง", tone: "danger", advance: false },
      { id: "expired", label: "หมดอายุ", tone: "danger", advance: false },
    ],
  },
  P: {
    label: "ชั่งน้ำหนักบรรจุภัณฑ์",
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

const SCALE_OPTIONS = [
  { id: "PB-BL03.3", label: "PB-BL03.3 (6kg)" },
  { id: "PB-BL04.3", label: "PB-BL04.3 (60kg)" },
];

let weighState = null;
let scanBuffer = "";
let scanTimer = null;

function formatWeighAmount(value) {
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatQuantityAmount(value) {
  if (value == null || value === "") return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return "—";
  if (Number.isInteger(num)) {
    return num.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }
  return formatWeighAmount(num);
}

function formatQtyWithUnit(value, unit) {
  return `${formatQuantityAmount(value)} ${unit}`;
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
  itemCode = "",
  productCode = "",
  productName = "",
  batchNo = "",
  docNo = "PB-BL03.3",
  batchSize = "",
  batchUnit = "",
  productionDate = "",
}) {
  weighState = {
    type,
    itemName: name,
    itemCode,
    productCode,
    amount,
    unit,
    round,
    productName,
    batchNo,
    docNo,
    batchSize,
    batchUnit,
    productionDate,
    currentStep: 1,
    completedSteps: {},
    stepDraft: {},
    scanAlert: null,
    scaleAlert: null,
    stepAlert: null,
    quantityAlert: null,
    stockAcknowledged: false,
  };

  scanBuffer = "";
  clearScanTimer();

  hideSummaryPanels();

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
  closeQrScanner();
  clearScanTimer();
  scanBuffer = "";
  document.getElementById("scanInput")?.blur();
  hideSummaryPanels();
  document.getElementById("weighPanel")?.classList.remove("active");
  weighState = null;
}

function hideSummaryPanels() {
  document.getElementById("summaryPanel")?.classList.remove("active");
  document.getElementById("packagingSummaryPanel")?.classList.remove("active");
}

function closeSummaryPanel() {
  closeQrScanner();
  clearScanTimer();
  scanBuffer = "";
  document.getElementById("scanInput")?.blur();
  document.getElementById("printPreviewPanel")?.classList.remove("active");
  hideSummaryPanels();
  document.getElementById("weighPanel")?.classList.remove("active");
  document.getElementById("withdrawPanel")?.classList.remove("active");
  weighState = null;
}

function formatPrintWeight(value) {
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
}

function getInspectorName() {
  const isPackaging = document
    .getElementById("packagingSummaryPanel")
    ?.classList.contains("active");
  const select = document.getElementById(
    isPackaging ? "pkgSummaryInspector" : "summaryInspector",
  );
  if (!select?.value) return "—";
  return select.options[select.selectedIndex].text;
}

function clearSummaryInspectorError() {
  document.querySelectorAll(".summary-select--error").forEach((select) => {
    select.classList.remove("summary-select--error");
  });
  document.querySelectorAll(".summary-field-error").forEach((errorEl) => {
    errorEl.hidden = true;
  });
}

function validateSummaryInspector() {
  const isPackaging = document
    .getElementById("packagingSummaryPanel")
    ?.classList.contains("active");
  const selectId = isPackaging ? "pkgSummaryInspector" : "summaryInspector";
  const errorId = isPackaging
    ? "pkgSummaryInspectorError"
    : "summaryInspectorError";
  const select = document.getElementById(selectId);
  const errorEl = document.getElementById(errorId);

  if (!select) return false;

  if (select.value) {
    clearSummaryInspectorError();
    return true;
  }

  clearSummaryInspectorError();
  select.classList.add("summary-select--error");
  if (errorEl) errorEl.hidden = false;
  select.focus();
  return false;
}

let printPreviewReturnTo = null;

function formatTagProductName(name) {
  const match = String(name || "").match(/^[^:]+:\s*(.+)$/);
  return match ? match[1].trim() : name || "—";
}

function buildPrintTagData({
  type,
  itemName,
  amount,
  unit,
  round = null,
  lot = "",
  code = "",
  productName = "",
  batchNo = "",
  batchSize = "",
  batchUnit = "",
  productionDate = "",
  inspector = "—",
}) {
  const isP = type === "P";
  const net = isP ? amount : Number((amount * 0.998).toFixed(4));
  const gross = isP ? amount : Number((net + 125.3).toFixed(4));
  const materialLot = lot || code || batchNo || "—";
  const materialCode = round ? `${itemName} · รอบที่ ${round}` : itemName;

  return {
    productionDate: productionDate || "—",
    batchNo: batchNo || "—",
    qrCode: batchNo || "—",
    productName: formatTagProductName(productName || itemName),
    batchSize: batchSize && batchUnit ? `${batchSize} ${batchUnit}` : "—",
    materialCode,
    materialLot,
    controlCode: code || materialLot,
    appearance: isP ? "บรรจุภัณฑ์" : "ผงสีขาว ละเอียด",
    net,
    gross,
    unit: unit || "kg",
    isQuantity: isP,
    weigher: getWeigherName(),
    inspector,
  };
}

function populatePrintPreview(data) {
  document.getElementById("tagProductionDate").textContent =
    data.productionDate;
  document.getElementById("tagBatchNo").textContent = data.batchNo;
  document.getElementById("tagQrCode").textContent = data.qrCode;
  document.getElementById("tagProductName").textContent = data.productName;
  document.getElementById("tagBatchSize").textContent = data.batchSize;
  document.getElementById("tagMaterialCode").textContent = data.materialCode;
  document.getElementById("tagMaterialLot").textContent = data.materialLot;
  document.getElementById("tagControlCode").textContent = data.controlCode;
  document.getElementById("tagAppearance").textContent = data.appearance;
  document.getElementById("tagWeigher").textContent = data.weigher;
  document.getElementById("tagInspector").textContent = data.inspector;
  document.getElementById("tagNetWeight").textContent =
    `${formatPrintWeight(data.net)} ${data.unit}.`;
  document.getElementById("tagGrossWeight").textContent =
    `${formatPrintWeight(data.gross)} ${data.unit}.`;
}

function showPrintPreviewFromWithdraw(context) {
  if (!context) return;

  printPreviewReturnTo = "withdraw";
  populatePrintPreview(
    buildPrintTagData({
      ...context,
      inspector: "—",
    }),
  );

  document.getElementById("withdrawPanel")?.classList.remove("active");
  document.getElementById("printPreviewPanel")?.classList.add("active");
}

function showPrintPreviewPanel() {
  if (!weighState) return;

  const weights = getSummaryWeights();

  printPreviewReturnTo = "summary";
  populatePrintPreview(
    buildPrintTagData({
      type: weighState.type,
      itemName: weighState.itemName,
      amount: weights.net,
      unit: weighState.unit,
      round: weighState.round,
      lot: getMaterialLot(),
      code: getMaterialLot(),
      productName: weighState.productName,
      batchNo: weighState.batchNo,
      batchSize: weighState.batchSize,
      batchUnit: weighState.batchUnit,
      productionDate: weighState.productionDate,
      inspector: getInspectorName(),
    }),
  );

  document.getElementById("summaryPanel")?.classList.remove("active");
  document.getElementById("packagingSummaryPanel")?.classList.remove("active");
  document.getElementById("printPreviewPanel")?.classList.add("active");
}

function closePrintPreviewPanel() {
  document.getElementById("printPreviewPanel")?.classList.remove("active");

  if (printPreviewReturnTo === "withdraw") {
    document.getElementById("withdrawPanel")?.classList.add("active");
  } else if (printPreviewReturnTo === "summary") {
    if (weighState?.type === "P") {
      document.getElementById("packagingSummaryPanel")?.classList.add("active");
    } else {
      document.getElementById("summaryPanel")?.classList.add("active");
    }
  }

  printPreviewReturnTo = null;
}

function clearScanTimer() {
  if (scanTimer) {
    clearTimeout(scanTimer);
    scanTimer = null;
  }
}

function getActiveScanStep() {
  if (!weighState) return null;

  const workflow = getWorkflow(weighState.type);
  return (
    workflow.steps.find(
      (step) =>
        (step.kind === "scan" || step.kind === "scale") &&
        getStepStatus(step.id) === "active",
    ) || null
  );
}

function focusScanInput() {
  const input = document.getElementById("scanInput");
  if (!input || !weighState) return;

  const scanStep = getActiveScanStep();
  if (!scanStep) {
    input.blur();
    return;
  }

  clearScanTimer();
  scanBuffer = "";
  input.value = "";
  input.focus({ preventScroll: true });
}

function getStepStatus(stepId) {
  if (!weighState) return "locked";

  const stepData = weighState.completedSteps[stepId];
  if (stepData?.locked) return "done";
  if (stepId === weighState.currentStep) return "active";
  return "locked";
}

function canEditStep(stepId) {
  if (!weighState) return false;
  if (stepId !== 2) return false;

  const stepData = weighState.completedSteps[stepId];
  if (!stepData?.locked) return false;

  return weighState.currentStep === 3;
}

function reopenStep(stepId) {
  if (!weighState || !canEditStep(stepId)) return;

  const workflow = getWorkflow(weighState.type);

  workflow.steps.forEach((step) => {
    if (step.id >= stepId) {
      delete weighState.completedSteps[step.id];
      delete weighState.stepDraft[step.id];
    }
  });

  weighState.currentStep = stepId;
  weighState.scanAlert = null;
  weighState.scaleAlert = null;
  weighState.stepAlert = null;
  weighState.quantityAlert = null;
  weighState.stockAcknowledged = false;

  renderWeighSteps();
  focusScanInput();
}

function getScaleSummary(scaleId) {
  const maxMap = {
    "PB-BL03.3": "6 kg",
    "PB-BL04.3": "60 kg",
  };

  return `${scaleId} · Max ${maxMap[scaleId] || scaleId}`;
}

function getStepSummaryText(step) {
  const data = weighState.completedSteps[step.id] || {};
  const draft = weighState.stepDraft[step.id] || {};

  if (data.scale) return getScaleSummary(data.scale);
  if (data.scanCode) return data.scanCode;
  if (data.quantity != null) {
    return `${formatWeighAmount(data.quantity)} ${weighState.unit}`;
  }
  if (data.weight != null) {
    return `${formatWeighAmount(data.weight)} ${data.unit || step.unit || weighState.unit}`;
  }
  if (draft.recorded && draft.weight != null) {
    return `${formatWeighAmount(draft.weight)} ${step.unit || weighState.unit}`;
  }
  if (draft.tared) return `0.00 ${step.unit || "g"}`;
  if (data.actionLabel) return data.actionLabel;

  return "";
}

function getStepDescription(step) {
  const workflow = getWorkflow(weighState.type);

  if (step.desc) return step.desc;
  if (step.kind === "scan" && step.id === 1) return workflow.scanDesc;

  return "";
}

function renderStepStatusIcon(stepId, variant, clickable = false) {
  if (variant === "none") {
    return '<span class="weigh-step-status weigh-step-status--placeholder" aria-hidden="true"></span>';
  }

  if (variant === "lock") {
    return `
      <span class="weigh-step-status weigh-step-status--lock" aria-label="ยังไม่เปิด">
        <i class="fa-solid fa-lock"></i>
      </span>
    `;
  }

  if (variant === "check") {
    return `
      <span class="weigh-step-status weigh-step-status--done" aria-label="เสร็จแล้ว">
        <i class="fa-solid fa-check"></i>
      </span>
    `;
  }

  if (variant === "edit" && clickable) {
    return `
      <button
        type="button"
        class="weigh-step-status weigh-step-status--edit"
        data-edit-step="${stepId}"
        aria-label="แก้ไข"
      >
        <i class="fa-solid fa-pen-to-square"></i>
      </button>
    `;
  }

  return '<span class="weigh-step-status weigh-step-status--placeholder" aria-hidden="true"></span>';
}

function renderStepRow(step, { variant, summary = "" }) {
  let statusVariant = "none";

  if (variant === "done") statusVariant = "check";
  else if (variant === "editable") statusVariant = "edit";
  else if (variant === "locked") statusVariant = "lock";

  return `
    <div class="weigh-step-row">
      <span class="weigh-step-num">${step.id}</span>
      <div class="weigh-step-summary">
        <span class="weigh-step-title">${step.title}</span>
        ${summary ? `<span class="weigh-step-result">${summary}</span>` : ""}
      </div>
      ${renderStepStatusIcon(step.id, statusVariant, variant === "editable")}
    </div>
  `;
}

function areAllStepsCompleted() {
  const workflow = getWorkflow(weighState.type);
  return workflow.steps.every(
    (step) => weighState.completedSteps[step.id]?.locked,
  );
}

function canShowSummary() {
  if (!weighState || !areAllStepsCompleted()) return false;

  if (weighState.type === "P") {
    const quantityStep = getWorkflow("P").steps.find(
      (step) => step.kind === "quantity",
    );
    const stepData = quantityStep
      ? weighState.completedSteps[quantityStep.id]
      : null;
    return stepData?.locked && stepData.quantity != null;
  }

  return true;
}

function clearScanInput() {
  clearScanTimer();
  scanBuffer = "";
  const input = document.getElementById("scanInput");
  if (input) {
    input.value = "";
    input.blur();
  }
}

function completeStep(stepId, result = {}) {
  weighState.completedSteps[stepId] = { ...result, locked: true };
  weighState.currentStep = stepId + 1;
  weighState.scanAlert = null;
  weighState.scaleAlert = null;
  weighState.stepAlert = null;
  weighState.quantityAlert = null;
  weighState.stockAcknowledged = false;

  if (!canShowSummary()) {
    renderWeighSteps();
    if (getActiveScanStep()) {
      focusScanInput();
    } else {
      clearScanInput();
    }
    return;
  }

  clearScanInput();
  showSummaryPanel();
}

function getStepDraft(stepId) {
  if (!weighState.stepDraft[stepId]) {
    weighState.stepDraft[stepId] = {};
  }
  return weighState.stepDraft[stepId];
}

function getMockNetWeight() {
  return Number((weighState.amount * 0.998).toFixed(2));
}

function getMockGrossWeight() {
  return Number((getMockNetWeight() + 125.3).toFixed(2));
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

  const net = getMockNetWeight();
  const gross = getMockGrossWeight();

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

function getProductCodeFromContext() {
  if (weighState.productCode) return weighState.productCode;
  const match = String(weighState.productName || "").match(/^([^:]+)/);
  return match ? match[1].trim() : "C01";
}

function showPackagingSummaryPanel() {
  if (!canShowSummary()) return;

  clearScanTimer();
  scanBuffer = "";
  document.getElementById("scanInput")?.blur();

  const weights = getSummaryWeights();
  const materialLot = getMaterialLot();
  const batchNo = weighState.batchNo || "C01160626B";
  const productCode = getProductCodeFromContext();
  const itemCode = weighState.itemCode || "—";
  const lotRound = weighState.round || 1;
  const productTitle = formatTagProductName(
    weighState.productName || "POSE LIQUID SOAP",
  );
  const qtyText = formatQtyWithUnit(weights.net, weights.unit);
  const targetText = formatQtyWithUnit(weights.target, weights.unit);

  document.getElementById("weighPanel").classList.remove("active");
  hideSummaryPanels();

  document.getElementById("pkgSummaryItemName").textContent =
    weighState.itemName;
  document.getElementById("pkgSummaryMeta").textContent =
    `${productCode} · ${itemCode}`;
  document.getElementById("pkgSummaryTarget").textContent = targetText;
  document.getElementById("pkgSummaryLotLine").textContent =
    `Lot ${lotRound} — ${materialLot}`;
  document.getElementById("pkgSummaryLotQty").textContent = qtyText;
  document.getElementById("pkgSummaryProductName").textContent = productTitle;
  document.getElementById("pkgSummaryBatchNo").textContent = batchNo;
  document.getElementById("pkgSummaryPackagingLot").textContent = materialLot;
  document.getElementById("pkgSummaryControlCode").textContent = itemCode;
  document.getElementById("pkgSummaryRecorder").textContent = getWeigherName();
  document.getElementById("pkgSummaryTotal").textContent = qtyText;

  const inspector = document.getElementById("pkgSummaryInspector");
  if (inspector) inspector.value = "";
  clearSummaryInspectorError();

  document.getElementById("packagingSummaryPanel").classList.add("active");
}

function showSummaryPanel() {
  if (!canShowSummary()) return;

  if (weighState.type === "P") {
    showPackagingSummaryPanel();
    return;
  }

  clearScanTimer();
  scanBuffer = "";
  document.getElementById("scanInput")?.blur();
  hideSummaryPanels();

  const weights = getSummaryWeights();
  const materialLot = getMaterialLot();
  const docNo = weighState.docNo || "PB-BL03.3";
  const batchNo = weighState.batchNo || "C01160626B";
  const productTitle = weighState.productName || "POSE LIQUID SOAP";

  document.getElementById("weighPanel").classList.remove("active");
  document.getElementById("summaryItemName").textContent = weighState.itemName;
  document.getElementById("summaryMeta").textContent = `${docNo} · ${batchNo}`;

  const weightCard = document.querySelector(
    ".summary-content .summary-card:first-child",
  );
  const weightRows = weightCard?.querySelectorAll(
    ".summary-row span:first-child",
  );

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
  clearSummaryInspectorError();

  document.getElementById("summaryPanel").classList.add("active");
  document.getElementById("packagingSummaryPanel")?.classList.remove("active");
}

function canPassScanStep(stepId) {
  const stepData = weighState.completedSteps[stepId] || {};
  return Boolean(stepData.scanCode?.trim());
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
    const lot = weighState.completedSteps[stepId]?.scanCode?.trim() || "—";
    const required = formatWeighAmount(weighState.amount);
    const remaining = formatWeighAmount(getMockStockRemaining());
    const canContinue = canPassScanStep(stepId);

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
          <button
            type="button"
            class="stock-continue-btn"
            data-step="${stepId}"
            ${canContinue ? "" : "disabled"}
          >
            ดำเนินการต่อ
          </button>
        </div>
      </div>
    `;
  }

  return "";
}

function renderScanBoxButton({
  scannedCode,
  extraClass = "",
  waitingHint = "แตะที่กรอบเพื่อเปิดกล้องสแกน QR",
  successHint = "สแกน QR/Barcode สำเร็จ",
}) {
  const hasScan = Boolean(scannedCode);
  const boxClass = [
    "scan-box",
    "scan-box-btn",
    hasScan ? "scan-box--success" : "",
    extraClass,
  ]
    .filter(Boolean)
    .join(" ");

  return `
    <button type="button" class="${boxClass}" aria-label="เปิดกล้องสแกน QR">
      <i class="fa-solid fa-qrcode scan-box-icon"></i>
      <p class="scan-status">${hasScan ? scannedCode : "รอสแกน QR"}</p>
      <p class="scan-hint">${hasScan ? successHint : waitingHint}</p>
    </button>
  `;
}

function renderScanBox(stepId, scannedCode) {
  const workflow = getWorkflow(weighState.type);
  const isActive = getStepStatus(stepId) === "active";

  if (!isActive) return "";

  const canPass = canPassScanStep(stepId);

  return `
    <div class="weigh-step-scan">
      ${renderScanBoxButton({ scannedCode })}
      ${renderScanAlert(stepId)}
      <div class="weigh-actions weigh-actions--scan">
        ${workflow.actions
          .map((action) => {
            const isPass = action.id === "pass";
            const disabled = isPass ? !canPass : false;

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
    </div>
  `;
}

function renderWeightPanel({ value, unit, subLabel = "" }) {
  const display = value != null ? formatWeighAmount(value) : "—";

  return `
    <div class="weight-panel">
      <p class="weight-panel-label">ค่าปัจจุบัน</p>
      <p class="weight-panel-value">${display}</p>
      <p class="weight-panel-unit">${unit}${subLabel ? ` · ${subLabel}` : ""}</p>
    </div>
  `;
}

function renderStepActionButtons(stepId, buttons) {
  return `
    <div class="weigh-step-actions">
      ${buttons
        .map(
          (btn) => `
            <button
              type="button"
              class="weigh-step-action-btn weigh-step-action-btn--${btn.tone || "neutral"}"
              data-step-action="${btn.id}"
              data-step="${stepId}"
              ${btn.disabled ? "disabled" : ""}
            >
              <i class="fa-solid fa-circle-play"></i>
              ${btn.label}
            </button>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderStepAlert(message) {
  if (!message) return "";

  return `
    <div class="scan-alert scan-alert--danger">${message}</div>
  `;
}

function getStepAlertMessage() {
  if (weighState.stepAlert === "tare_fail") {
    return "Tare ไม่สำเร็จ — ตรวจสอบเครื่องชั่งแล้วลองใหม่";
  }
  if (weighState.stepAlert === "under") {
    return "น้ำหนักน้อยกว่าเป้าหมาย — ตรวจสอบและบันทึกใหม่";
  }
  if (weighState.stepAlert === "over") {
    return "น้ำหนักเกินเป้าหมาย — ตรวจสอบและบันทึกใหม่";
  }
  if (weighState.stepAlert === "weight_mismatch") {
    return "น้ำหนัก Gross ไม่ตรง — ตรวจสอบและบันทึกใหม่";
  }
  return "";
}

function renderScaleStep(stepId) {
  const stepData = weighState.completedSteps[stepId] || {};
  const scannedCode = stepData.scanCode || null;
  const hasScan = Boolean(scannedCode);
  const scaleAlert = weighState.scaleAlert;
  const scanBoxClass = hasScan
    ? "scan-box--success"
    : scaleAlert === "mismatch"
      ? "scan-box--error"
      : "";

  return `
    <div class="weigh-step-body">
      ${renderScanBoxButton({
        scannedCode,
        extraClass: scanBoxClass,
        waitingHint: "แตะที่กรอบเพื่อเปิดกล้องสแกน QR",
        successHint: "เชื่อมต่อเครื่องชั่งสำเร็จ",
      })}
      ${
        scaleAlert === "mismatch"
          ? `<div class="scan-alert scan-alert--danger"><strong>QR ไม่ตรง</strong> — สแกน QR บนเครื่องชั่งใหม่อีกครั้ง</div>`
          : ""
      }
      <div class="weigh-actions weigh-actions--scale">
        ${SCALE_OPTIONS.map(
          (scale) => `
            <button
              type="button"
              class="weigh-action-btn weigh-action-btn--scale"
              data-scale="${scale.id}"
              data-step="${stepId}"
            >
              <i class="fa-solid fa-circle-play"></i>
              ${scale.label}
            </button>
          `,
        ).join("")}
        <button
          type="button"
          class="weigh-action-btn weigh-action-btn--danger"
          data-step-action="scale_mismatch"
          data-step="${stepId}"
        >
          <i class="fa-solid fa-circle-play"></i>
          QR ไม่ตรง
        </button>
      </div>
    </div>
  `;
}

function renderContainerStep(step) {
  const draft = getStepDraft(step.id);
  const unit = step.unit || "g";
  const value = draft.recorded
    ? (draft.weight ?? step.mockWeight ?? 125.3)
    : null;

  return `
    <div class="weigh-step-body">
      <div class="weigh-warning-banner">
        <i class="fa-solid fa-triangle-exclamation"></i>
        อย่าลืมวางภาชนะ พร้อมฝา
      </div>
      ${renderWeightPanel({ value, unit })}
      <button
        type="button"
        class="weigh-primary-btn weigh-record-btn"
        data-step="${step.id}"
        ${draft.recorded ? "disabled" : ""}
      >
        บันทึกน้ำหนัก
      </button>
    </div>
  `;
}

function renderTareStep(step) {
  const draft = getStepDraft(step.id);
  const unit = step.unit || "g";
  const value = draft.tared ? 0 : null;

  return `
    <div class="weigh-step-body">
      ${renderWeightPanel({ value, unit })}
      ${renderStepAlert(getStepAlertMessage())}
      <button
        type="button"
        class="weigh-primary-btn weigh-tare-btn"
        data-step="${step.id}"
        ${draft.tared ? "disabled" : ""}
      >
        Tare เครื่องชั่ง
      </button>
      ${renderStepActionButtons(step.id, [
        {
          id: "tare_ok",
          label: "Tare OK (0.00)",
          tone: "neutral",
          disabled: !draft.tared,
        },
        { id: "tare_fail", label: "ไม่สำเร็จ", tone: "danger" },
      ])}
    </div>
  `;
}

function renderNetStep(step) {
  const draft = getStepDraft(step.id);
  const unit = weighState.unit;
  const target = weighState.amount;
  const value = draft.recorded ? (draft.weight ?? getMockNetWeight()) : null;
  const targetLabel = `เป้าหมาย ${formatWeighAmount(target)} ${unit}`;

  return `
    <div class="weigh-step-body">
      ${renderWeightPanel({ value, unit, subLabel: targetLabel })}
      ${renderStepAlert(getStepAlertMessage())}
      <button
        type="button"
        class="weigh-primary-btn weigh-record-btn"
        data-step="${step.id}"
        ${draft.recorded ? "disabled" : ""}
      >
        บันทึกน้ำหนัก
      </button>
      ${renderStepActionButtons(step.id, [
        {
          id: "pass",
          label: "ผ่าน",
          tone: "neutral",
          disabled: !draft.recorded,
        },
        { id: "under", label: "น้อยไป", tone: "danger" },
        { id: "over", label: "เกินไป", tone: "danger" },
      ])}
    </div>
  `;
}

function renderGrossStep(step) {
  const draft = getStepDraft(step.id);
  const unit = weighState.unit;
  const expected = getMockGrossWeight();
  const value = draft.recorded ? (draft.weight ?? expected) : null;

  return `
    <div class="weigh-step-body">
      <div class="weigh-expected-row">
        <span>คาดการณ์ Gross</span>
        <strong>${formatWeighAmount(expected)} ${unit}</strong>
      </div>
      ${renderWeightPanel({ value, unit })}
      ${renderStepAlert(getStepAlertMessage())}
      <button
        type="button"
        class="weigh-primary-btn weigh-record-btn"
        data-step="${step.id}"
        ${draft.recorded ? "disabled" : ""}
      >
        บันทึกน้ำหนัก
      </button>
      ${renderStepActionButtons(step.id, [
        {
          id: "pass",
          label: "ผ่าน",
          tone: "neutral",
          disabled: !draft.recorded,
        },
        { id: "weight_mismatch", label: "น้ำหนักไม่ตรง", tone: "danger" },
      ])}
    </div>
  `;
}

function renderQuantityStep(stepId) {
  const scanLot = weighState.completedSteps[1]?.scanCode || "—";
  const target = weighState.amount;
  const unit = weighState.unit;
  const draft = getStepDraft(stepId);
  const currentQty = draft.quantity;
  const hasError = weighState.quantityAlert === "incomplete";
  const inputValue = currentQty != null ? currentQty : "";

  return `
    <div class="weigh-step-body weigh-step-body--quantity">
      <div class="qty-lot-banner">
        <i class="fa-solid fa-circle-check"></i>
        <span>Lot: ${scanLot}</span>
      </div>
      <div class="qty-target-row">
        <span class="qty-target-label">จำนวน</span>
        <span class="qty-target-value">เป้าหมาย ${formatQtyWithUnit(target, unit)}</span>
      </div>
      <div class="qty-panel ${hasError ? "qty-panel--error" : ""}">
        <div class="qty-panel-main">
          <p class="qty-panel-label">ค่าปัจจุบัน</p>
          <input
            type="number"
            id="weighQtyInput"
            class="qty-panel-input"
            inputmode="numeric"
            min="0"
            step="1"
            value="${inputValue}"
            placeholder="—"
            aria-label="จำนวนที่เบิก"
          />
          <p class="qty-panel-unit">${unit}</p>
        </div>
        <div class="qty-stepper">
          <button
            type="button"
            class="qty-stepper-btn"
            data-qty-step="up"
            data-step="${stepId}"
            aria-label="เพิ่มจำนวน"
          >
            <i class="fa-solid fa-chevron-up"></i>
          </button>
          <button
            type="button"
            class="qty-stepper-btn"
            data-qty-step="down"
            data-step="${stepId}"
            aria-label="ลดจำนวน"
          >
            <i class="fa-solid fa-chevron-down"></i>
          </button>
        </div>
      </div>
      <button
        type="button"
        class="qty-full-btn"
        data-step="${stepId}"
        data-qty-full="${target}"
      >
        เต็มจำนวน (${formatQtyWithUnit(target, unit)})
      </button>
      ${
        hasError
          ? `<p class="qty-error-msg">จำนวนไม่ครบ — ต้องการ ${formatQtyWithUnit(target, unit)}</p>`
          : ""
      }
      <button
        type="button"
        class="qty-save-btn weigh-next-btn"
        data-step="${stepId}"
        data-kind="quantity"
      >
        บันทึกจำนวน
      </button>
    </div>
  `;
}

function renderDoneStep(step) {
  const summary = getStepSummaryText(step);
  const variant = canEditStep(step.id) ? "editable" : "done";

  return `
    <div class="weigh-step weigh-step--done">
      ${renderStepRow(step, { variant, summary })}
    </div>
  `;
}

function renderLockedStep(step) {
  return `
    <div class="weigh-step weigh-step--locked">
      ${renderStepRow(step, { variant: "locked" })}
    </div>
  `;
}

function getStepAlertClass(step) {
  if (step.kind === "scan" && weighState.scanAlert) {
    if (weighState.scanAlert === "no_stock") return "weigh-step--warn";
    return "weigh-step--alert";
  }

  if (step.kind === "scale" && weighState.scaleAlert === "mismatch") {
    return "weigh-step--alert";
  }

  return "";
}

function renderActiveStep(step) {
  const stepData = weighState.completedSteps[step.id] || {};
  const scannedCode = stepData.scanCode || null;

  let body = "";

  if (step.kind === "scan") {
    body = renderScanBox(step.id, scannedCode);
  } else if (step.kind === "scale") {
    body = renderScaleStep(step.id);
  } else if (step.kind === "container") {
    body = renderContainerStep(step);
  } else if (step.kind === "tare") {
    body = renderTareStep(step);
  } else if (step.kind === "net") {
    body = renderNetStep(step);
  } else if (step.kind === "gross") {
    body = renderGrossStep(step);
  } else if (step.kind === "quantity") {
    body = renderQuantityStep(step.id);
  }

  const summary = getStepSummaryText(step);
  const desc = getStepDescription(step);
  const rowSummary = step.kind === "scan" && !scannedCode ? "" : summary;

  return `
    <div class="weigh-step weigh-step--active ${step.kind === "quantity" ? "weigh-step--quantity" : ""} ${getStepAlertClass(step)}">
      ${renderStepRow(step, { variant: "active", summary: rowSummary })}
      ${step.kind !== "quantity" && desc ? `<p class="weigh-step-desc weigh-step-desc--highlight">${desc}</p>` : ""}
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
  document.querySelectorAll("[data-edit-step]").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      reopenStep(Number(btn.dataset.editStep));
    });
  });

  document.querySelectorAll(".weigh-action-btn").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.stopPropagation();

      if (btn.dataset.stepAction === "scale_mismatch") {
        weighState.scaleAlert = "mismatch";
        renderWeighSteps();
        return;
      }

      const stepId = Number(btn.dataset.step);
      const actionId = btn.dataset.action;
      const workflow = getWorkflow(weighState.type);
      const action = workflow.actions.find((item) => item.id === actionId);

      if (!action || btn.disabled) return;

      if (action.id === "pass") {
        if (!canPassScanStep(stepId)) return;

        const scanCode = weighState.completedSteps[stepId]?.scanCode?.trim();
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
      if (btn.disabled) return;

      const stepId = Number(btn.dataset.step);
      if (!canPassScanStep(stepId)) return;

      const scanCode = weighState.completedSteps[stepId]?.scanCode?.trim();

      completeStep(stepId, {
        scanCode: scanCode || null,
        actionLabel: "ดำเนินการต่อ",
        alertType: "no_stock",
      });
    });
  });

  document.querySelectorAll(".stock-cancel-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      weighState.scanAlert = null;
      weighState.stockAcknowledged = false;
      renderWeighSteps();
    });
  });

  document
    .querySelectorAll(".scale-option-btn, .weigh-action-btn[data-scale]")
    .forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.stopPropagation();
        weighState.scaleAlert = null;
        completeStep(Number(btn.dataset.step), { scale: btn.dataset.scale });
      });
    });

  document.querySelectorAll(".weigh-record-btn").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      const stepId = Number(btn.dataset.step);
      const step = getWorkflow(weighState.type).steps.find(
        (item) => item.id === stepId,
      );
      const draft = getStepDraft(stepId);

      if (step.kind === "container") {
        draft.weight = step.mockWeight ?? 125.3;
        draft.recorded = true;
        completeStep(stepId, {
          weight: draft.weight,
          unit: step.unit || "g",
          actionLabel: "บันทึกน้ำหนัก",
        });
        return;
      }

      if (step.kind === "net") {
        draft.weight = getMockNetWeight();
        draft.recorded = true;
        weighState.stepAlert = null;
        renderWeighSteps();
        return;
      }

      if (step.kind === "gross") {
        draft.weight = getMockGrossWeight();
        draft.recorded = true;
        weighState.stepAlert = null;
        renderWeighSteps();
        return;
      }
    });
  });

  document.querySelectorAll(".weigh-tare-btn").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      const stepId = Number(btn.dataset.step);
      const draft = getStepDraft(stepId);
      draft.tared = true;
      draft.weight = 0;
      renderWeighSteps();
    });
  });

  document.querySelectorAll(".weigh-step-action-btn").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      if (btn.disabled) return;

      const stepId = Number(btn.dataset.step);
      const action = btn.dataset.stepAction;
      const step = getWorkflow(weighState.type).steps.find(
        (item) => item.id === stepId,
      );
      const draft = getStepDraft(stepId);

      if (action === "scale_mismatch") {
        weighState.scaleAlert = "mismatch";
        renderWeighSteps();
        return;
      }

      if (action === "tare_ok") {
        completeStep(stepId, {
          weight: 0,
          unit: step.unit || "g",
          actionLabel: "Tare OK (0.00)",
        });
        return;
      }

      if (action === "tare_fail") {
        weighState.stepAlert = "tare_fail";
        renderWeighSteps();
        return;
      }

      if (action === "pass") {
        completeStep(stepId, {
          weight: draft.weight ?? getMockNetWeight(),
          unit: weighState.unit,
          actionLabel: "ผ่าน",
        });
        return;
      }

      if (action === "under") {
        weighState.stepAlert = "under";
        renderWeighSteps();
        return;
      }

      if (action === "over") {
        weighState.stepAlert = "over";
        renderWeighSteps();
        return;
      }

      if (action === "weight_mismatch") {
        weighState.stepAlert = "weight_mismatch";
        renderWeighSteps();
      }
    });
  });

  document.querySelectorAll(".weigh-next-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const stepId = Number(btn.dataset.step);

      if (btn.dataset.kind === "quantity") {
        const qtyInput = document.getElementById("weighQtyInput");
        const quantity = Number(qtyInput?.value);
        const target = weighState.amount;

        if (!quantity || quantity <= 0) return;

        if (quantity !== target) {
          weighState.quantityAlert = "incomplete";
          renderWeighSteps();
          return;
        }

        weighState.quantityAlert = null;
        completeStep(stepId, { quantity });
        return;
      }

      completeStep(stepId, { actionLabel: "ยืนยัน" });
    });
  });

  document.querySelectorAll("[data-qty-full]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const stepId = Number(btn.dataset.step);
      const draft = getStepDraft(stepId);
      draft.quantity = Number(btn.dataset.qtyFull);
      weighState.quantityAlert = null;
      renderWeighSteps();
    });
  });

  document.querySelectorAll("[data-qty-step]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const stepId = Number(btn.dataset.step);
      const draft = getStepDraft(stepId);
      let qty = Number(draft.quantity) || 0;

      if (btn.dataset.qtyStep === "up") {
        qty += 1;
      } else {
        qty = Math.max(0, qty - 1);
      }

      if (qty > 0) draft.quantity = qty;
      else delete draft.quantity;

      weighState.quantityAlert = null;
      renderWeighSteps();
    });
  });

  document
    .getElementById("weighQtyInput")
    ?.addEventListener("input", (event) => {
      const stepId = weighState.currentStep;
      const draft = getStepDraft(stepId);
      const value = event.target.value;

      if (value === "") {
        delete draft.quantity;
      } else {
        draft.quantity = Number(value);
      }

      weighState.quantityAlert = null;
    });
}

function handleScanInput(value) {
  if (!weighState) return;

  const scanStep = getActiveScanStep();
  if (!scanStep) return;

  weighState.completedSteps[scanStep.id] = {
    ...(weighState.completedSteps[scanStep.id] || {}),
    scanCode: value.trim(),
    locked: false,
  };

  if (scanStep.kind === "scale") {
    const matchedScale = SCALE_OPTIONS.find(
      (scale) =>
        value.trim().includes(scale.id) || scale.id.includes(value.trim()),
    );
    if (matchedScale) {
      weighState.scaleAlert = null;
    }
  }

  renderWeighSteps();
  focusScanInput();
}

function initWeighingPanel() {
  const scanInput = document.getElementById("scanInput");
  const closeBtn = document.getElementById("closeWeighPanel");

  closeBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    closeWeighPanel();
  });

  document.getElementById("summarySaveBtn")?.addEventListener("click", () => {
    if (!validateSummaryInspector()) return;
    closeSummaryPanel();
  });

  document
    .getElementById("pkgSummarySaveBtn")
    ?.addEventListener("click", () => {
      if (!validateSummaryInspector()) return;
      closeSummaryPanel();
    });

  document.getElementById("summaryPrintBtn")?.addEventListener("click", () => {
    if (!validateSummaryInspector()) return;
    showPrintPreviewPanel();
  });

  document
    .getElementById("summaryInspector")
    ?.addEventListener("change", () => {
      if (document.getElementById("summaryInspector")?.value) {
        clearSummaryInspectorError();
      }
    });

  document
    .getElementById("pkgSummaryInspector")
    ?.addEventListener("change", () => {
      if (document.getElementById("pkgSummaryInspector")?.value) {
        clearSummaryInspectorError();
      }
    });

  document
    .getElementById("backFromPrintPreview")
    ?.addEventListener("click", closePrintPreviewPanel);

  document.getElementById("sendPrintBtn")?.addEventListener("click", () => {
    window.print();
  });

  scanInput?.addEventListener("keydown", (event) => {
    if (!weighState || !getActiveScanStep()) return;

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
      clearScanTimer();
      scanTimer = setTimeout(() => {
        if (scanBuffer.trim()) {
          handleScanInput(scanBuffer.trim());
          scanBuffer = "";
          scanInput.value = "";
        }
      }, 120);
    }
  });

  document.getElementById("weighPanel")?.addEventListener("click", (event) => {
    if (event.target.closest("button, input, select, textarea, label")) return;
    focusScanInput();
  });

  document.getElementById("weighSteps")?.addEventListener("click", (event) => {
    const scanBtn = event.target.closest(".scan-box-btn");
    if (!scanBtn) return;

    event.stopPropagation();

    if (!weighState || !getActiveScanStep()) return;

    openQrScanner((value) => handleScanInput(value));
  });
}

document.addEventListener("DOMContentLoaded", initWeighingPanel);
