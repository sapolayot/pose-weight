function isFirstMaterialScanStep(step) {
  return (
    (weighState?.type === "R" || weighState?.type === "P") &&
    step?.kind === "scan" &&
    Number(step.id) === 1
  );
}

function isScaleScanStep(step) {
  return weighState?.type === "R" && step?.kind === "scale";
}

function isApiValidatedScanStep(stepId) {
  return (weighState?.type === "R" || weighState?.type === "P") && stepId === 1;
}

function isApiValidatedScaleStep(stepId) {
  return weighState?.type === "R" && stepId === 2;
}

function isInventoryExpired(inventory) {
  if (Number(inventory?.dayDiff) < 0) return true;

  const expDate = inventory?.expDate;
  if (!expDate) return false;

  const parts = expDate.split("-").map(Number);
  if (parts.length !== 3) return false;

  const [day, month, year] = parts;
  const exp = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return exp < today;
}

function getStockRemainingQty() {
  if (weighState?.scanInventory?.qty != null) {
    return Number(weighState.scanInventory.qty) || 0;
  }

  return getMockStockRemaining();
}

function getScanDisplayCode(stepId, scannedCode) {
  if (weighState?.scanInventory?.lotNo) return weighState.scanInventory.lotNo;
  if (weighState?.scanInventory?.invCode)
    return weighState.scanInventory.invCode;
  return scannedCode;
}

function getScaleDisplayCode(scannedCode) {
  if (weighState?.scaleMachine?.machineName) {
    return weighState.scaleMachine.machineName;
  }
  return scannedCode;
}

function getScanHighlightAction(stepId) {
  if (!isApiValidatedScanStep(stepId) || !weighState.scanValidated) {
    return null;
  }

  return weighState.scanAlert || "pass";
}

function isScanActionDisabled(action, stepId) {
  if (isApiValidatedScanStep(stepId)) {
    if (!weighState.scanValidated || weighState.scanLoading) return true;
    if (action.id === "pass") return !canPassScanStep(stepId);
    return true;
  }

  if (isApiValidatedScaleStep(stepId)) {
    if (!weighState.scaleValidated || weighState.scaleLoading) return true;
    if (action.id === "pass") return !canPassScanStep(stepId);
    return true;
  }

  const isPass = action.id === "pass";
  return isPass ? !canPassScanStep(stepId) : false;
}

async function fetchInventoryByQrCode(invCode, itemCode) {
  const params = new URLSearchParams({
    invCode,
    itemCode: itemCode || "",
  });

  const response = await fetch(
    `${API_URL}/wh-inventory/qrcode?${params.toString()}`,
    { credentials: "include" },
  );

  if (!response.ok) {
    throw new Error("Failed to validate QR code");
  }

  return response.json();
}

function resolveMaterialScanAlert(inventory) {
  if (isInventoryExpired(inventory)) return "expired";

  const qty = Number(inventory.qty) || 0;
  const required = Number(weighState.amount) || 0;

  if (qty < required) return "no_stock";

  return null;
}

async function handleMaterialQrScan(invCode) {
  const stepId = 1;

  weighState.scanAlert = null;
  weighState.scanValidated = false;
  weighState.scanInventory = null;
  weighState.scanLoading = true;
  weighState.completedSteps[stepId] = {
    ...(weighState.completedSteps[stepId] || {}),
    scanCode: invCode,
    locked: false,
  };

  renderWeighSteps();

  try {
    const payload = await fetchInventoryByQrCode(invCode, weighState.itemCode);
    const inventory = Array.isArray(payload.data) ? payload.data[0] : null;

    if (!payload.success || !inventory) {
      weighState.scanAlert = "mismatch";
      weighState.scanValidated = true;
      return;
    }

    weighState.scanInventory = inventory;
    weighState.scanAlert = resolveMaterialScanAlert(inventory);
    weighState.scanValidated = true;

    if (!weighState.scanAlert) {
      weighState.completedSteps[stepId].scanCode =
        inventory.lotNo || inventory.invCode || invCode;
    }
  } catch (error) {
    console.error(error);
    weighState.scanAlert = "mismatch";
    weighState.scanValidated = true;
  } finally {
    weighState.scanLoading = false;
    renderWeighSteps();
    focusScanInput();
  }
}

async function fetchWeighingMachineByQrCode(qrCode) {
  const response = await fetch(
    `${API_URL}/weighing-machine/${encodeURIComponent(qrCode)}`,
    { credentials: "include" },
  );

  if (!response.ok) {
    throw new Error("Failed to validate scale QR code");
  }

  return response.json();
}

async function handleScaleQrScan(qrCode) {
  const stepId = 2;

  weighState.scaleAlert = null;
  weighState.scaleValidated = false;
  weighState.scaleMachine = null;
  weighState.scaleLoading = true;
  weighState.completedSteps[stepId] = {
    ...(weighState.completedSteps[stepId] || {}),
    scanCode: qrCode,
    locked: false,
  };

  renderWeighSteps();

  try {
    const payload = await fetchWeighingMachineByQrCode(qrCode);
    const machine = Array.isArray(payload.data) ? payload.data[0] : null;

    if (!payload.success || !machine) {
      weighState.scaleAlert = "mismatch";
      weighState.scaleValidated = true;
      return;
    }

    weighState.scaleMachine = machine;
    weighState.scaleAlert = null;
    weighState.scaleValidated = true;
    weighState.completedSteps[stepId].scanCode = machine.machineName || qrCode;
  } catch (error) {
    console.error(error);
    weighState.scaleAlert = "mismatch";
    weighState.scaleValidated = true;
  } finally {
    weighState.scaleLoading = false;
    renderWeighSteps();
    focusScanInput();
  }
}

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
      { id: "expired", label: "หมดอายุ", tone: "danger", advance: false },
    ],
  },
};

// เปิด true เพื่อข้าม step สแกน QR (เคมี/บรรจุภัณฑ์) อัตโนมัติ
const WEIGH_SKIP_SCAN_STEP = true;
const WEIGH_SKIP_SCAN_CODE = "BYPASS-SCAN";
const NET_WEIGHT_TOLERANCE = 0.01;

let weighState = null;
let scanBuffer = "";
let scanTimer = null;
const SCAN_SUBMIT_DELAY_MS = 500;

function getMqttLiveWeight() {
  if (typeof MqttScale === "undefined") return null;
  return MqttScale.getLiveWeight();
}

function hasLiveScaleWeight() {
  const live = getMqttLiveWeight();
  return live != null && Number.isFinite(Number(live));
}

function isMqttWeightStepKind(kind) {
  return (
    kind === "container" ||
    kind === "tare" ||
    kind === "net" ||
    kind === "gross"
  );
}

function getActiveWeightStep() {
  if (!weighState) return null;
  const workflow = getWorkflow(weighState.type);
  const step = workflow.steps.find(
    (item) => item.id === weighState.currentStep,
  );
  if (!step || !isMqttWeightStepKind(step.kind)) return null;
  return step;
}

function getDisplayWeightForStep(step, draft) {
  if (step.kind === "tare" && draft.tared) return 0;
  if (draft.recorded && draft.weight != null) return draft.weight;

  const live = getMqttLiveWeight();
  if (live != null) return live;

  return null;
}

function refreshMqttWeightPanel() {
  if (!weighState) return;

  const step = getActiveWeightStep();
  if (!step) return;

  if (
    (step.kind === "container" ||
      step.kind === "net" ||
      step.kind === "gross") &&
    !getStepDraft(step.id).recorded
  ) {
    renderWeighSteps();
    return;
  }

  const draft = getStepDraft(step.id);
  const value = getDisplayWeightForStep(step, draft);
  const panel = document.querySelector(
    ".weigh-step--active .weight-panel-value",
  );

  if (!panel) return;
  panel.textContent = value != null ? formatWeighAmount(value) : "—";
}

function evaluateNetWeightStatus(actual, target) {
  const weight = Number(actual);
  const goal = Number(target);

  if (!Number.isFinite(weight) || !Number.isFinite(goal) || goal <= 0) {
    return "waiting";
  }

  const tolerance = goal * NET_WEIGHT_TOLERANCE;
  const min = goal - tolerance;
  const max = goal + tolerance;

  if (weight < min) return "under";
  if (weight > max) return "over";
  return "within";
}

function canRecordNetWeight(actual, target) {
  return evaluateNetWeightStatus(actual, target) === "within";
}

function syncNetStepAlert(liveWeight, target, recorded) {
  if (recorded) {
    if (weighState.stepAlert === "under" || weighState.stepAlert === "over") {
      weighState.stepAlert = null;
    }
    return;
  }

  const status = evaluateNetWeightStatus(liveWeight, target);
  if (status === "under") {
    weighState.stepAlert = "under";
  } else if (status === "over") {
    weighState.stepAlert = "over";
  } else if (
    weighState.stepAlert === "under" ||
    weighState.stepAlert === "over"
  ) {
    weighState.stepAlert = null;
  }
}

function syncGrossStepAlert(liveWeight, expected, recorded) {
  if (recorded) {
    if (weighState.stepAlert === "weight_mismatch") {
      weighState.stepAlert = null;
    }
    return;
  }

  const status = evaluateNetWeightStatus(liveWeight, expected);
  if (status === "under" || status === "over") {
    weighState.stepAlert = "weight_mismatch";
  } else if (weighState.stepAlert === "weight_mismatch") {
    weighState.stepAlert = null;
  }
}

function initMqttScaleIntegration() {
  if (typeof MqttScale === "undefined") return;
  MqttScale.onUpdate(refreshMqttWeightPanel);
}

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

function autoSkipScanStep() {
  if (!WEIGH_SKIP_SCAN_STEP || !weighState || weighState.currentStep !== 1) {
    return false;
  }

  const workflow = getWorkflow(weighState.type);
  const scanStep = workflow.steps.find(
    (step) => step.kind === "scan" && step.id === 1,
  );

  if (!scanStep) return false;

  weighState.scanValidated = true;
  weighState.scanAlert = null;
  weighState.scanInventory = null;
  weighState.scanLoading = false;

  completeStep(1, {
    scanCode: WEIGH_SKIP_SCAN_CODE,
    actionLabel: "ผ่าน",
  });

  return true;
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
    scanValidated: false,
    scanInventory: null,
    scanLoading: false,
    scaleValidated: false,
    scaleMachine: null,
    scaleLoading: false,
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

  panel.classList.add("active");

  // if (!autoSkipScanStep()) {
  renderWeighSteps();
  focusScanInput();
  // }
}

function closeWeighPanel() {
  clearScanTimer();
  scanBuffer = "";
  document.getElementById("scanInput")?.blur();
  hideSummaryPanels();
  document.getElementById("weighPanel")?.classList.remove("active");
  MqttScale?.clearActiveScale();
  weighState = null;
}

function hideSummaryPanels() {
  document.getElementById("summaryPanel")?.classList.remove("active");
  document.getElementById("packagingSummaryPanel")?.classList.remove("active");
}

function closeSummaryPanel() {
  clearScanTimer();
  scanBuffer = "";
  document.getElementById("scanInput")?.blur();
  document.getElementById("printPreviewPanel")?.classList.remove("active");
  hideSummaryPanels();
  document.getElementById("weighPanel")?.classList.remove("active");
  document.getElementById("withdrawPanel")?.classList.remove("active");
  MqttScale?.clearActiveScale();
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

function flushScanBuffer() {
  if (!weighState || !getActiveScanStep()) return;

  const input = document.getElementById("scanInput");
  const value = input?.value?.trim() || scanBuffer.trim();
  if (!value) return;

  handleScanInput(value);
  scanBuffer = "";
  if (input) input.value = "";
}

function updateScanPreview(value) {
  const statusEl = document.querySelector(".weigh-step--active .scan-status");
  if (!statusEl) return;

  const trimmed = String(value ?? "").trim();
  statusEl.textContent = trimmed || "รอสแกน QR";
}

function scheduleScanSubmit() {
  clearScanTimer();
  scanTimer = setTimeout(flushScanBuffer, SCAN_SUBMIT_DELAY_MS);
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
  weighState.scanValidated = false;
  weighState.scanInventory = null;
  weighState.scanLoading = false;
  weighState.scaleValidated = false;
  weighState.scaleMachine = null;
  weighState.scaleLoading = false;

  renderWeighSteps();
  focusScanInput();
}

function getStepSummaryText(step) {
  const data = weighState.completedSteps[step.id] || {};
  const draft = weighState.stepDraft[step.id] || {};

  if (data.machineName) return data.machineName;
  if (data.scale && data.scanCode) return data.scanCode;
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

function getContainerStepWeight() {
  if (!weighState) return null;

  const containerStep = getWorkflow(weighState.type).steps.find(
    (item) => item.kind === "container",
  );
  if (!containerStep) return null;

  const completed = weighState.completedSteps[containerStep.id];
  if (completed?.weight != null) {
    return {
      weight: completed.weight,
      unit: completed.unit || containerStep.unit || "g",
    };
  }

  const draft = weighState.stepDraft[containerStep.id];
  if (draft?.weight != null) {
    return {
      weight: draft.weight,
      unit: containerStep.unit || "g",
    };
  }

  return null;
}

function getNetStepWeight() {
  if (!weighState) return null;

  const netStep = getWorkflow(weighState.type).steps.find(
    (item) => item.kind === "net",
  );
  if (!netStep) return null;

  const completed = weighState.completedSteps[netStep.id];
  if (completed?.weight != null) {
    return {
      weight: completed.weight,
      unit: completed.unit || weighState.unit,
    };
  }

  const draft = weighState.stepDraft[netStep.id];
  if (draft?.weight != null) {
    return {
      weight: draft.weight,
      unit: weighState.unit,
    };
  }

  return null;
}

function getExpectedGrossWeight() {
  return getMockGrossWeight();
}

function getStepDescription(step) {
  const workflow = getWorkflow(weighState.type);

  if (step.kind === "tare") {
    const container = getContainerStepWeight();
    if (container) {
      return `น้ำหนักภาชนะ ${formatWeighAmount(container.weight)} ${container.unit} — กด Tare หักน้ำหนัก รอจนเครื่องแสดง 0.00`;
    }
    return "กด Tare หักน้ำหนัก รอจนเครื่องแสดง 0.00";
  }

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
  weighState.scaleValidated = false;
  weighState.scaleMachine = null;
  weighState.scaleLoading = false;

  if (result.scale) {
    MqttScale?.setActiveScale(result.scale);
  }

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
  const expected = getExpectedGrossWeightFromParts();
  if (expected != null) return expected;

  return Number((getMockNetWeight() + 125.3).toFixed(2));
}

function getExpectedGrossWeightFromParts() {
  const container = getContainerStepWeight();
  const net = getNetStepWeight();

  if (container?.weight != null && net?.weight != null) {
    return Number((Number(container.weight) + Number(net.weight)).toFixed(2));
  }

  return null;
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

  const net = getNetStepWeight()?.weight ?? getMockNetWeight();
  const gross = getExpectedGrossWeightFromParts() ?? getMockGrossWeight();

  return {
    target,
    net,
    gross,
    unit: weighState.unit,
    isQuantity: false,
  };
}

function getMaterialLot() {
  if (weighState.scanInventory?.lotNo) return weighState.scanInventory.lotNo;

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
  if (!stepData.scanCode?.trim()) return false;

  if (isApiValidatedScaleStep(stepId)) {
    return (
      weighState.scaleValidated &&
      !weighState.scaleLoading &&
      weighState.scaleAlert === null
    );
  }

  if (isApiValidatedScanStep(stepId)) {
    return (
      weighState.scanValidated &&
      !weighState.scanLoading &&
      weighState.scanAlert === null
    );
  }

  return true;
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
      weighState.scanInventory?.lotNo ||
      weighState.completedSteps[stepId]?.scanCode?.trim() ||
      "—";
    const required = formatWeighAmount(weighState.amount);
    const remaining = formatWeighAmount(getStockRemainingQty());
    const stockUnit = weighState.unit;
    const canContinue =
      canPassScanStep(stepId) ||
      Boolean(weighState.completedSteps[stepId]?.scanCode?.trim());

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
          <strong>${required} ${stockUnit}</strong>
        </div>
        <div class="scan-alert-stock-row">
          <span>สต็อกคงเหลือ</span>
          <strong class="scan-alert-stock-low">${remaining} ${stockUnit}</strong>
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
  successHint = "สแกน QR/Barcode สำเร็จ",
  loading = false,
}) {
  const hasScan = Boolean(scannedCode);
  const boxClass = [
    "scan-box",
    hasScan ? "scan-box--success" : "",
    loading ? "scan-box--loading" : "",
    extraClass,
  ]
    .filter(Boolean)
    .join(" ");

  const statusText = loading
    ? "กำลังตรวจสอบ QR..."
    : hasScan
      ? scannedCode
      : "รอสแกน QR";

  const hint = loading
    ? "กรุณารอสักครู่"
    : hasScan
      ? successHint
      : "กดปุ่มด้านข้างเครื่องเพื่อสแกน";

  return `
    <div class="${boxClass}" aria-live="polite">
      <i class="fa-solid fa-qrcode scan-box-icon"></i>
      <p class="scan-status">${statusText}</p>
      <p class="scan-hint">${hint}</p>
    </div>
  `;
}

function renderScanBox(stepId, scannedCode) {
  const workflow = getWorkflow(weighState.type);
  const isActive = getStepStatus(stepId) === "active";

  if (!isActive) return "";

  const displayCode = getScanDisplayCode(stepId, scannedCode);
  const highlightAction = getScanHighlightAction(stepId);

  return `
    <div class="weigh-step-scan">
      ${renderScanBoxButton({
        scannedCode: displayCode,
        loading: weighState.scanLoading,
        successHint:
          weighState.scanAlert === null && weighState.scanValidated
            ? "ตรวจสอบ QR ผ่าน"
            : "สแกน QR/Barcode สำเร็จ",
      })}
      ${renderScanAlert(stepId)}
      <div class="weigh-actions weigh-actions--scan">
        ${workflow.actions
          .map((action) => {
            const disabled = isScanActionDisabled(action, stepId);
            const highlight = highlightAction === action.id;

            return `
              <button
                type="button"
                class="weigh-action-btn weigh-action-btn--${action.tone}${highlight ? " weigh-action-btn--highlight" : ""}"
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
  const displayCode = getScaleDisplayCode(stepData.scanCode || null);
  const hasScan = Boolean(displayCode);
  const scaleAlert = weighState.scaleAlert;
  const scanBoxClass =
    hasScan && weighState.scaleValidated && !scaleAlert
      ? "scan-box--success"
      : scaleAlert === "mismatch"
        ? "scan-box--error"
        : "";
  const passDisabled = isScanActionDisabled({ id: "pass" }, stepId);

  return `
    <div class="weigh-step-body">
      ${renderScanBoxButton({
        scannedCode: displayCode,
        extraClass: scanBoxClass,
        loading: weighState.scaleLoading,
        successHint: "เชื่อมต่อเครื่องชั่งสำเร็จ",
      })}
      ${
        scaleAlert === "mismatch"
          ? `<div class="scan-alert scan-alert--danger"><strong>QR ไม่ตรง</strong> — สแกน QR บนเครื่องชั่งใหม่อีกครั้ง</div>`
          : ""
      }
      <div class="weigh-actions weigh-actions--scale">
        <button
          type="button"
          class="weigh-action-btn weigh-action-btn--neutral${!passDisabled && weighState.scaleValidated && !scaleAlert ? " weigh-action-btn--highlight" : ""}"
          data-action="pass"
          data-step="${stepId}"
          ${passDisabled ? "disabled" : ""}
        >
          <i class="fa-solid fa-circle-play"></i>
          ผ่าน
        </button>
        <button
          type="button"
          class="weigh-action-btn weigh-action-btn--danger${scaleAlert === "mismatch" ? " weigh-action-btn--highlight" : ""}"
          data-step-action="scale_mismatch"
          data-step="${stepId}"
          disabled
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
    ? draft.weight
    : getDisplayWeightForStep(step, draft);
  const canRecord = !draft.recorded && hasLiveScaleWeight();

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
        ${draft.recorded ? "disabled" : canRecord ? "" : "disabled"}
      >
        บันทึกน้ำหนัก
      </button>
    </div>
  `;
}

function renderTareStep(step) {
  const draft = getStepDraft(step.id);
  const unit = step.unit || "g";
  const value = getDisplayWeightForStep(step, draft);

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
  const liveWeight = draft.recorded ? draft.weight : getMqttLiveWeight();
  const value = draft.recorded
    ? (draft.weight ?? getMockNetWeight())
    : getDisplayWeightForStep(step, draft);
  const targetLabel = `เป้าหมาย ${formatWeighAmount(target)} ${unit}`;
  const canRecord = !draft.recorded && canRecordNetWeight(liveWeight, target);

  syncNetStepAlert(liveWeight, target, draft.recorded);

  return `
    <div class="weigh-step-body">
      ${renderWeightPanel({ value, unit, subLabel: targetLabel })}
      ${renderStepAlert(getStepAlertMessage())}
      <button
        type="button"
        class="weigh-primary-btn weigh-record-btn"
        data-step="${step.id}"
        ${draft.recorded ? "disabled" : canRecord ? "" : "disabled"}
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
        { id: "under", label: "น้อยไป", tone: "danger", disabled: true },
        { id: "over", label: "เกินไป", tone: "danger", disabled: true },
      ])}
    </div>
  `;
}

function renderGrossStep(step) {
  const draft = getStepDraft(step.id);
  const unit = weighState.unit;
  const expected = getExpectedGrossWeight();
  const liveWeight = draft.recorded ? draft.weight : getMqttLiveWeight();
  const value = draft.recorded
    ? (draft.weight ?? expected)
    : getDisplayWeightForStep(step, draft);
  const canRecord = !draft.recorded && canRecordNetWeight(liveWeight, expected);

  syncGrossStepAlert(liveWeight, expected, draft.recorded);

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
        ${draft.recorded ? "disabled" : canRecord ? "" : "disabled"}
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
        {
          id: "weight_mismatch",
          label: "น้ำหนักไม่ตรง",
          tone: "danger",
          disabled: true,
        },
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
  const rowSummary =
    (step.kind === "scan" && !scannedCode) ||
    (step.kind === "scale" &&
      !getScaleDisplayCode(
        weighState.completedSteps[step.id]?.scanCode || null,
      ))
      ? ""
      : summary;

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
        if (isApiValidatedScaleStep(stepId)) {
          const machine = weighState.scaleMachine;
          completeStep(stepId, {
            scanCode: machine?.machineName || scanCode || null,
            machineName: machine?.machineName || null,
            scale: machine?.qrCode || null,
            scaleId: machine?.id ?? null,
          });
          return;
        }

        completeStep(stepId, {
          scanCode: scanCode || null,
          actionLabel: action.label,
          alertType: weighState.scanAlert || null,
        });
        return;
      }

      if (actionId === "no_stock") {
        if (isApiValidatedScanStep(stepId)) return;
        weighState.scanAlert = "no_stock";
        weighState.stockAcknowledged = false;
      } else if (actionId === "mismatch") {
        if (isApiValidatedScanStep(stepId)) return;
        weighState.scanAlert = "mismatch";
        weighState.stockAcknowledged = false;
      } else if (actionId === "expired") {
        if (isApiValidatedScanStep(stepId)) return;
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
      if (weighState.type === "R" || weighState.type === "P") {
        weighState.scanValidated = false;
        weighState.scanInventory = null;
      }
      renderWeighSteps();
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
        const liveWeight = getMqttLiveWeight();
        if (liveWeight == null) return;

        draft.weight = liveWeight;
        draft.recorded = true;
        completeStep(stepId, {
          weight: draft.weight,
          unit: step.unit || "g",
          actionLabel: "บันทึกน้ำหนัก",
        });
        return;
      }

      if (step.kind === "net") {
        const liveWeight = getMqttLiveWeight();
        if (!canRecordNetWeight(liveWeight, weighState.amount)) return;

        draft.weight = liveWeight ?? getMockNetWeight();
        draft.recorded = true;
        weighState.stepAlert = null;
        renderWeighSteps();
        return;
      }

      if (step.kind === "gross") {
        const expected = getExpectedGrossWeight();
        const liveWeight = getMqttLiveWeight();
        if (!canRecordNetWeight(liveWeight, expected)) return;

        draft.weight = liveWeight ?? expected;
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
      MqttScale?.publishTare();
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
        if ((step.kind === "net" || step.kind === "gross") && !draft.recorded) {
          return;
        }

        completeStep(stepId, {
          weight:
            draft.weight ??
            (step.kind === "gross"
              ? getExpectedGrossWeight()
              : getMockNetWeight()),
          unit: weighState.unit,
          actionLabel: "ผ่าน",
        });
        return;
      }

      if (action === "under" || action === "over") {
        return;
      }

      if (action === "weight_mismatch") {
        return;
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

  const trimmedValue = value.trim();
  if (!trimmedValue) return;

  if (isFirstMaterialScanStep(scanStep)) {
    handleMaterialQrScan(trimmedValue);
    return;
  }

  if (isScaleScanStep(scanStep)) {
    handleScaleQrScan(trimmedValue);
    return;
  }

  weighState.completedSteps[scanStep.id] = {
    ...(weighState.completedSteps[scanStep.id] || {}),
    scanCode: trimmedValue,
    locked: false,
  };

  renderWeighSteps();
  focusScanInput();
}

async function fetchCoaApproveList() {
  const response = await fetch(`${API_URL}/coa-approve`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to load coa approve list");
  }

  const payload = await response.json();
  return Array.isArray(payload.data) ? payload.data : [];
}

function populateInspectorSelect(select, list) {
  if (!select) return;

  const placeholder = select.querySelector('option[value=""]');
  select.innerHTML = "";
  if (placeholder) {
    select.appendChild(placeholder);
  } else {
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "เลือกผู้ตรวจสอบ...";
    select.appendChild(defaultOption);
  }

  list.forEach((item) => {
    const option = document.createElement("option");
    option.value = String(item.id ?? "");
    option.textContent = item.fNameTh || item.fName || "—";
    select.appendChild(option);
  });
}

async function loadCoaApproveInspectors() {
  const selectIds = ["summaryInspector", "pkgSummaryInspector"];

  try {
    const list = await fetchCoaApproveList();
    selectIds.forEach((id) => {
      populateInspectorSelect(document.getElementById(id), list);
    });
  } catch (err) {
    console.error(err);
  }
}

function initWeighingPanel() {
  initMqttScaleIntegration();
  loadCoaApproveInspectors();

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

  scanInput?.addEventListener("input", (event) => {
    if (!weighState || !getActiveScanStep()) return;

    scanBuffer = event.target.value;
    updateScanPreview(scanBuffer);
    scheduleScanSubmit();
  });

  scanInput?.addEventListener("keydown", (event) => {
    if (!weighState || !getActiveScanStep()) return;

    if (event.key === "Enter") {
      event.preventDefault();
      scanBuffer = event.target.value || scanBuffer;
      updateScanPreview(scanBuffer);
      scheduleScanSubmit();
      return;
    }

    if (
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      scanBuffer += event.key;
      updateScanPreview(scanBuffer);
      scheduleScanSubmit();
    }
  });

  document.getElementById("weighPanel")?.addEventListener("click", (event) => {
    if (event.target.closest("button, input, select, textarea, label")) return;
    focusScanInput();
  });
}

document.addEventListener("DOMContentLoaded", initWeighingPanel);
