function isFirstMaterialScanStep(step) {
  return ((weighState == null ? void 0 : weighState.type) === "R" || (weighState == null ? void 0 : weighState.type) === "P") && (step == null ? void 0 : step.kind) === "scan" && Number(step.id) === 1;
}
function isScaleScanStep(step) {
  return (weighState == null ? void 0 : weighState.type) === "R" && (step == null ? void 0 : step.kind) === "scale";
}
function isApiValidatedScanStep(stepId) {
  return ((weighState == null ? void 0 : weighState.type) === "R" || (weighState == null ? void 0 : weighState.type) === "P") && stepId === 1;
}
function isApiValidatedScaleStep(stepId) {
  return (weighState == null ? void 0 : weighState.type) === "R" && stepId === 2;
}
function isInventoryExpired(inventory) {
  if (Number(inventory == null ? void 0 : inventory.dayDiff) < 0) return true;
  const expDate = inventory == null ? void 0 : inventory.expDate;
  if (!expDate) return false;
  const parts = expDate.split("-").map(Number);
  if (parts.length !== 3) return false;
  const [day, month, year] = parts;
  const exp = new Date(year, month - 1, day);
  const today = /* @__PURE__ */ new Date();
  today.setHours(0, 0, 0, 0);
  return exp < today;
}
function getStockRemainingQty() {
  var _a;
  if (((_a = weighState == null ? void 0 : weighState.scanInventory) == null ? void 0 : _a.qty) != null) {
    return Number(weighState.scanInventory.qty) || 0;
  }
  return getMockStockRemaining();
}
function getScanDisplayCode(stepId, scannedCode) {
  var _a, _b;
  if ((_a = weighState == null ? void 0 : weighState.scanInventory) == null ? void 0 : _a.lotNo) return weighState.scanInventory.lotNo;
  if ((_b = weighState == null ? void 0 : weighState.scanInventory) == null ? void 0 : _b.invCode)
    return weighState.scanInventory.invCode;
  return scannedCode;
}
function getScaleDisplayCode(scannedCode) {
  var _a;
  if ((_a = weighState == null ? void 0 : weighState.scaleMachine) == null ? void 0 : _a.machineName) {
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
    itemCode: itemCode || ""
  });
  const response = await fetch(
    `${API_URL}/wh-inventory/qrcode?${params.toString()}`,
    { credentials: "include" }
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
    ...weighState.completedSteps[stepId] || {},
    scanCode: invCode,
    locked: false
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
      weighState.completedSteps[stepId].scanCode = inventory.lotNo || inventory.invCode || invCode;
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
    { credentials: "include" }
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
    ...weighState.completedSteps[stepId] || {},
    scanCode: qrCode,
    locked: false
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
    label: "\u0E0A\u0E31\u0E48\u0E07\u0E19\u0E49\u0E33\u0E2B\u0E19\u0E31\u0E01\u0E40\u0E04\u0E21\u0E35",
    scanTitle: "\u0E2A\u0E41\u0E01\u0E19 QR \u0E40\u0E04\u0E21\u0E35",
    scanDesc: "\u0E2A\u0E41\u0E01\u0E19 QR \u0E1A\u0E19\u0E16\u0E38\u0E07/\u0E02\u0E27\u0E14\u0E2A\u0E32\u0E23\u0E40\u0E04\u0E21\u0E35 \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E22\u0E37\u0E19\u0E22\u0E31\u0E19 Lot",
    steps: [
      { id: 1, title: "\u0E2A\u0E41\u0E01\u0E19 QR \u0E40\u0E04\u0E21\u0E35", kind: "scan" },
      {
        id: 2,
        title: "\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E0A\u0E31\u0E48\u0E07",
        kind: "scale",
        desc: "\u0E2A\u0E41\u0E01\u0E19 QR \u0E1A\u0E19\u0E15\u0E31\u0E27\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E0A\u0E31\u0E48\u0E07 \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D"
      },
      {
        id: 3,
        title: "\u0E0A\u0E31\u0E48\u0E07\u0E19\u0E49\u0E33\u0E2B\u0E19\u0E31\u0E01\u0E20\u0E32\u0E0A\u0E19\u0E30",
        kind: "container",
        desc: "\u0E27\u0E32\u0E07\u0E20\u0E32\u0E0A\u0E19\u0E30\u0E40\u0E1B\u0E25\u0E48\u0E32\u0E1A\u0E19\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E0A\u0E31\u0E48\u0E07 \u0E23\u0E2D\u0E43\u0E2B\u0E49\u0E04\u0E48\u0E32\u0E19\u0E34\u0E48\u0E07 \u0E41\u0E25\u0E49\u0E27\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01",
        unit: "g",
        mockWeight: 125.3
      },
      {
        id: 4,
        title: "Tare",
        kind: "tare",
        unit: "g"
      },
      {
        id: 5,
        title: "\u0E0A\u0E31\u0E48\u0E07\u0E19\u0E49\u0E33\u0E2B\u0E19\u0E31\u0E01\u0E40\u0E04\u0E21\u0E35",
        kind: "net",
        desc: "\u0E43\u0E2A\u0E48\u0E40\u0E04\u0E21\u0E35\u0E25\u0E07\u0E43\u0E19\u0E20\u0E32\u0E0A\u0E19\u0E30 \u0E41\u0E25\u0E49\u0E27\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E19\u0E49\u0E33\u0E2B\u0E19\u0E31\u0E01"
      },
      {
        id: 6,
        title: "\u0E0A\u0E31\u0E48\u0E07\u0E19\u0E49\u0E33\u0E2B\u0E19\u0E31\u0E01\u0E23\u0E27\u0E21",
        kind: "gross",
        desc: "\u0E23\u0E30\u0E1A\u0E1A\u0E2A\u0E48\u0E07\u0E04\u0E33\u0E2A\u0E31\u0E48\u0E07 Gross (Clear + Read) \u2014 \u0E01\u0E14 Get \u0E23\u0E31\u0E1A\u0E04\u0E48\u0E32\u0E41\u0E25\u0E49\u0E27\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A"
      }
    ],
    actions: [
      { id: "pass", label: "\u0E1C\u0E48\u0E32\u0E19", tone: "neutral", advance: true },
      { id: "no_stock", label: "\u0E2A\u0E15\u0E47\u0E2D\u0E01\u0E44\u0E21\u0E48\u0E1E\u0E2D", tone: "warning", advance: false },
      { id: "mismatch", label: "\u0E40\u0E04\u0E21\u0E35\u0E44\u0E21\u0E48\u0E15\u0E23\u0E07", tone: "danger", advance: false },
      { id: "expired", label: "\u0E2B\u0E21\u0E14\u0E2D\u0E32\u0E22\u0E38", tone: "danger", advance: false }
    ]
  },
  P: {
    label: "\u0E0A\u0E31\u0E48\u0E07\u0E19\u0E49\u0E33\u0E2B\u0E19\u0E31\u0E01\u0E1A\u0E23\u0E23\u0E08\u0E38\u0E20\u0E31\u0E13\u0E11\u0E4C",
    scanTitle: "\u0E2A\u0E41\u0E01\u0E19 QR \u0E1A\u0E23\u0E23\u0E08\u0E38\u0E20\u0E31\u0E13\u0E11\u0E4C",
    scanDesc: "\u0E2A\u0E41\u0E01\u0E19 QR \u0E1A\u0E19\u0E01\u0E25\u0E48\u0E2D\u0E07/\u0E16\u0E38\u0E07\u0E1A\u0E23\u0E23\u0E08\u0E38\u0E20\u0E31\u0E13\u0E11\u0E4C \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E22\u0E37\u0E19\u0E22\u0E31\u0E19 Lot",
    steps: [
      { id: 1, title: "\u0E2A\u0E41\u0E01\u0E19 QR \u0E1A\u0E23\u0E23\u0E08\u0E38\u0E20\u0E31\u0E13\u0E11\u0E4C", kind: "scan" },
      { id: 2, title: "\u0E43\u0E2A\u0E48\u0E08\u0E33\u0E19\u0E27\u0E19", kind: "quantity" }
    ],
    actions: [
      { id: "pass", label: "\u0E1C\u0E48\u0E32\u0E19", tone: "neutral", advance: true },
      { id: "no_stock", label: "\u0E2A\u0E15\u0E47\u0E2D\u0E01\u0E44\u0E21\u0E48\u0E1E\u0E2D", tone: "warning", advance: false },
      { id: "mismatch", label: "\u0E44\u0E21\u0E48\u0E15\u0E23\u0E07", tone: "danger", advance: false },
      { id: "expired", label: "\u0E2B\u0E21\u0E14\u0E2D\u0E32\u0E22\u0E38", tone: "danger", advance: false }
    ]
  }
};
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
  return kind === "container" || kind === "tare" || kind === "net" || kind === "gross";
}
function getActiveWeightStep() {
  if (!weighState) return null;
  const workflow = getWorkflow(weighState.type);
  const step = workflow.steps.find(
    (item) => item.id === weighState.currentStep
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
  if ((step.kind === "container" || step.kind === "net" || step.kind === "gross") && !getStepDraft(step.id).recorded) {
    renderWeighSteps();
    return;
  }
  const draft = getStepDraft(step.id);
  const value = getDisplayWeightForStep(step, draft);
  const panel = document.querySelector(
    ".weigh-step--active .weight-panel-value"
  );
  if (!panel) return;
  panel.textContent = value != null ? formatWeighAmount(value) : "\u2014";
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
  } else if (weighState.stepAlert === "under" || weighState.stepAlert === "over") {
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
    maximumFractionDigits: 2
  });
}
function formatQuantityAmount(value) {
  if (value == null || value === "") return "\u2014";
  const num = Number(value);
  if (Number.isNaN(num)) return "\u2014";
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
    (step) => step.kind === "scan" && step.id === 1
  );
  if (!scanStep) return false;
  weighState.scanValidated = true;
  weighState.scanAlert = null;
  weighState.scanInventory = null;
  weighState.scanLoading = false;
  completeStep(1, {
    scanCode: WEIGH_SKIP_SCAN_CODE,
    actionLabel: "\u0E1C\u0E48\u0E32\u0E19"
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
  productionDate = ""
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
    scaleLoading: false
  };
  scanBuffer = "";
  clearScanTimer();
  hideSummaryPanels();
  const panel = document.getElementById("weighPanel");
  document.getElementById("weighLabel").textContent = getWorkflow(type).label;
  document.getElementById("weighItemName").textContent = name;
  const roundLabel = round ? ` (\u0E23\u0E2D\u0E1A\u0E17\u0E35\u0E48 ${round})` : "";
  document.getElementById("weighAmount").textContent = `\u0E22\u0E2D\u0E14\u0E40\u0E1A\u0E34\u0E01: ${formatWeighAmount(amount)} ${unit}${roundLabel}`;
  panel.classList.add("active");
  renderWeighSteps();
  focusScanInput();
}
function closeWeighPanel() {
  var _a, _b;
  clearScanTimer();
  scanBuffer = "";
  (_a = document.getElementById("scanInput")) == null ? void 0 : _a.blur();
  hideSummaryPanels();
  (_b = document.getElementById("weighPanel")) == null ? void 0 : _b.classList.remove("active");
  MqttScale == null ? void 0 : MqttScale.clearActiveScale();
  weighState = null;
}
function hideSummaryPanels() {
  var _a, _b;
  (_a = document.getElementById("summaryPanel")) == null ? void 0 : _a.classList.remove("active");
  (_b = document.getElementById("packagingSummaryPanel")) == null ? void 0 : _b.classList.remove("active");
}
function closeSummaryPanel() {
  var _a, _b, _c, _d;
  clearScanTimer();
  scanBuffer = "";
  (_a = document.getElementById("scanInput")) == null ? void 0 : _a.blur();
  (_b = document.getElementById("printPreviewPanel")) == null ? void 0 : _b.classList.remove("active");
  hideSummaryPanels();
  (_c = document.getElementById("weighPanel")) == null ? void 0 : _c.classList.remove("active");
  (_d = document.getElementById("withdrawPanel")) == null ? void 0 : _d.classList.remove("active");
  MqttScale == null ? void 0 : MqttScale.clearActiveScale();
  weighState = null;
}
function formatPrintWeight(value) {
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
  });
}
function getInspectorName() {
  var _a;
  const isPackaging = (_a = document.getElementById("packagingSummaryPanel")) == null ? void 0 : _a.classList.contains("active");
  const select = document.getElementById(
    isPackaging ? "pkgSummaryInspector" : "summaryInspector"
  );
  if (!(select == null ? void 0 : select.value)) return "\u2014";
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
  var _a;
  const isPackaging = (_a = document.getElementById("packagingSummaryPanel")) == null ? void 0 : _a.classList.contains("active");
  const selectId = isPackaging ? "pkgSummaryInspector" : "summaryInspector";
  const errorId = isPackaging ? "pkgSummaryInspectorError" : "summaryInspectorError";
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
  return match ? match[1].trim() : name || "\u2014";
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
  inspector = "\u2014"
}) {
  const isP = type === "P";
  const net = isP ? amount : Number((amount * 0.998).toFixed(4));
  const gross = isP ? amount : Number((net + 125.3).toFixed(4));
  const materialLot = lot || code || batchNo || "\u2014";
  const materialCode = round ? `${itemName} \xB7 \u0E23\u0E2D\u0E1A\u0E17\u0E35\u0E48 ${round}` : itemName;
  return {
    productionDate: productionDate || "\u2014",
    batchNo: batchNo || "\u2014",
    qrCode: batchNo || "\u2014",
    productName: formatTagProductName(productName || itemName),
    batchSize: batchSize && batchUnit ? `${batchSize} ${batchUnit}` : "\u2014",
    materialCode,
    materialLot,
    controlCode: code || materialLot,
    appearance: isP ? "\u0E1A\u0E23\u0E23\u0E08\u0E38\u0E20\u0E31\u0E13\u0E11\u0E4C" : "\u0E1C\u0E07\u0E2A\u0E35\u0E02\u0E32\u0E27 \u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14",
    net,
    gross,
    unit: unit || "kg",
    isQuantity: isP,
    weigher: getWeigherName(),
    inspector
  };
}
function populatePrintPreview(data) {
  document.getElementById("tagProductionDate").textContent = data.productionDate;
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
  document.getElementById("tagNetWeight").textContent = `${formatPrintWeight(data.net)} ${data.unit}.`;
  document.getElementById("tagGrossWeight").textContent = `${formatPrintWeight(data.gross)} ${data.unit}.`;
}
function showPrintPreviewFromWithdraw(context) {
  var _a, _b;
  if (!context) return;
  printPreviewReturnTo = "withdraw";
  populatePrintPreview(
    buildPrintTagData({
      ...context,
      inspector: "\u2014"
    })
  );
  (_a = document.getElementById("withdrawPanel")) == null ? void 0 : _a.classList.remove("active");
  (_b = document.getElementById("printPreviewPanel")) == null ? void 0 : _b.classList.add("active");
}
function showPrintPreviewPanel() {
  var _a, _b, _c;
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
      inspector: getInspectorName()
    })
  );
  (_a = document.getElementById("summaryPanel")) == null ? void 0 : _a.classList.remove("active");
  (_b = document.getElementById("packagingSummaryPanel")) == null ? void 0 : _b.classList.remove("active");
  (_c = document.getElementById("printPreviewPanel")) == null ? void 0 : _c.classList.add("active");
}
function closePrintPreviewPanel() {
  var _a, _b, _c, _d;
  (_a = document.getElementById("printPreviewPanel")) == null ? void 0 : _a.classList.remove("active");
  if (printPreviewReturnTo === "withdraw") {
    (_b = document.getElementById("withdrawPanel")) == null ? void 0 : _b.classList.add("active");
  } else if (printPreviewReturnTo === "summary") {
    if ((weighState == null ? void 0 : weighState.type) === "P") {
      (_c = document.getElementById("packagingSummaryPanel")) == null ? void 0 : _c.classList.add("active");
    } else {
      (_d = document.getElementById("summaryPanel")) == null ? void 0 : _d.classList.add("active");
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
  var _a;
  if (!weighState || !getActiveScanStep()) return;
  const input = document.getElementById("scanInput");
  const value = ((_a = input == null ? void 0 : input.value) == null ? void 0 : _a.trim()) || scanBuffer.trim();
  if (!value) return;
  handleScanInput(value);
  scanBuffer = "";
  if (input) input.value = "";
}
function updateScanPreview(value) {
  const statusEl = document.querySelector(".weigh-step--active .scan-status");
  if (!statusEl) return;
  const trimmed = String(value != null ? value : "").trim();
  statusEl.textContent = trimmed || "\u0E23\u0E2D\u0E2A\u0E41\u0E01\u0E19 QR";
}
function scheduleScanSubmit() {
  clearScanTimer();
  scanTimer = setTimeout(flushScanBuffer, SCAN_SUBMIT_DELAY_MS);
}
function getActiveScanStep() {
  if (!weighState) return null;
  const workflow = getWorkflow(weighState.type);
  return workflow.steps.find(
    (step) => (step.kind === "scan" || step.kind === "scale") && getStepStatus(step.id) === "active"
  ) || null;
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
  if (stepData == null ? void 0 : stepData.locked) return "done";
  if (stepId === weighState.currentStep) return "active";
  return "locked";
}
function canEditStep(stepId) {
  if (!weighState) return false;
  if (stepId !== 2) return false;
  const stepData = weighState.completedSteps[stepId];
  if (!(stepData == null ? void 0 : stepData.locked)) return false;
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
    (item) => item.kind === "container"
  );
  if (!containerStep) return null;
  const completed = weighState.completedSteps[containerStep.id];
  if ((completed == null ? void 0 : completed.weight) != null) {
    return {
      weight: completed.weight,
      unit: completed.unit || containerStep.unit || "g"
    };
  }
  const draft = weighState.stepDraft[containerStep.id];
  if ((draft == null ? void 0 : draft.weight) != null) {
    return {
      weight: draft.weight,
      unit: containerStep.unit || "g"
    };
  }
  return null;
}
function getNetStepWeight() {
  if (!weighState) return null;
  const netStep = getWorkflow(weighState.type).steps.find(
    (item) => item.kind === "net"
  );
  if (!netStep) return null;
  const completed = weighState.completedSteps[netStep.id];
  if ((completed == null ? void 0 : completed.weight) != null) {
    return {
      weight: completed.weight,
      unit: completed.unit || weighState.unit
    };
  }
  const draft = weighState.stepDraft[netStep.id];
  if ((draft == null ? void 0 : draft.weight) != null) {
    return {
      weight: draft.weight,
      unit: weighState.unit
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
      return `\u0E19\u0E49\u0E33\u0E2B\u0E19\u0E31\u0E01\u0E20\u0E32\u0E0A\u0E19\u0E30 ${formatWeighAmount(container.weight)} ${container.unit} \u2014 \u0E01\u0E14 Tare \u0E2B\u0E31\u0E01\u0E19\u0E49\u0E33\u0E2B\u0E19\u0E31\u0E01 \u0E23\u0E2D\u0E08\u0E19\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E41\u0E2A\u0E14\u0E07 0.00`;
    }
    return "\u0E01\u0E14 Tare \u0E2B\u0E31\u0E01\u0E19\u0E49\u0E33\u0E2B\u0E19\u0E31\u0E01 \u0E23\u0E2D\u0E08\u0E19\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E41\u0E2A\u0E14\u0E07 0.00";
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
      <span class="weigh-step-status weigh-step-status--lock" aria-label="\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E40\u0E1B\u0E34\u0E14">
        <i class="fa-solid fa-lock"></i>
      </span>
    `;
  }
  if (variant === "check") {
    return `
      <span class="weigh-step-status weigh-step-status--done" aria-label="\u0E40\u0E2A\u0E23\u0E47\u0E08\u0E41\u0E25\u0E49\u0E27">
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
        aria-label="\u0E41\u0E01\u0E49\u0E44\u0E02"
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
    (step) => {
      var _a;
      return (_a = weighState.completedSteps[step.id]) == null ? void 0 : _a.locked;
    }
  );
}
function canShowSummary() {
  if (!weighState || !areAllStepsCompleted()) return false;
  if (weighState.type === "P") {
    const quantityStep = getWorkflow("P").steps.find(
      (step) => step.kind === "quantity"
    );
    const stepData = quantityStep ? weighState.completedSteps[quantityStep.id] : null;
    return (stepData == null ? void 0 : stepData.locked) && stepData.quantity != null;
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
    MqttScale == null ? void 0 : MqttScale.setActiveScale(result.scale);
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
  if ((container == null ? void 0 : container.weight) != null && (net == null ? void 0 : net.weight) != null) {
    return Number((Number(container.weight) + Number(net.weight)).toFixed(2));
  }
  return null;
}
function getMockStockRemaining() {
  return Math.max(weighState.amount * 0.71, 0);
}
function getSummaryWeights() {
  var _a, _b, _c, _d;
  const target = weighState.amount;
  const quantityStep = Object.values(weighState.completedSteps).find(
    (step) => step.quantity != null
  );
  if (weighState.type === "P") {
    const qty = (_a = quantityStep == null ? void 0 : quantityStep.quantity) != null ? _a : target;
    return {
      target,
      net: qty,
      gross: qty,
      unit: weighState.unit,
      isQuantity: true
    };
  }
  const net = (_c = (_b = getNetStepWeight()) == null ? void 0 : _b.weight) != null ? _c : getMockNetWeight();
  const gross = (_d = getExpectedGrossWeightFromParts()) != null ? _d : getMockGrossWeight();
  return {
    target,
    net,
    gross,
    unit: weighState.unit,
    isQuantity: false
  };
}
function getMaterialLot() {
  var _a;
  if ((_a = weighState.scanInventory) == null ? void 0 : _a.lotNo) return weighState.scanInventory.lotNo;
  const scanStep = weighState.completedSteps[1];
  return (scanStep == null ? void 0 : scanStep.scanCode) || "L26070608";
}
function getWeigherName() {
  const user = window.__sessionUser;
  if (user == null ? void 0 : user.firstName) return user.firstName;
  if (user == null ? void 0 : user.username) return user.username;
  return "Admin";
}
function getProductCodeFromContext() {
  if (weighState.productCode) return weighState.productCode;
  const match = String(weighState.productName || "").match(/^([^:]+)/);
  return match ? match[1].trim() : "C01";
}
function showPackagingSummaryPanel() {
  var _a;
  if (!canShowSummary()) return;
  clearScanTimer();
  scanBuffer = "";
  (_a = document.getElementById("scanInput")) == null ? void 0 : _a.blur();
  const weights = getSummaryWeights();
  const materialLot = getMaterialLot();
  const batchNo = weighState.batchNo || "C01160626B";
  const productCode = getProductCodeFromContext();
  const itemCode = weighState.itemCode || "\u2014";
  const lotRound = weighState.round || 1;
  const productTitle = formatTagProductName(
    weighState.productName || "POSE LIQUID SOAP"
  );
  const qtyText = formatQtyWithUnit(weights.net, weights.unit);
  const targetText = formatQtyWithUnit(weights.target, weights.unit);
  document.getElementById("weighPanel").classList.remove("active");
  hideSummaryPanels();
  document.getElementById("pkgSummaryItemName").textContent = weighState.itemName;
  document.getElementById("pkgSummaryMeta").textContent = `${productCode} \xB7 ${itemCode}`;
  document.getElementById("pkgSummaryTarget").textContent = targetText;
  document.getElementById("pkgSummaryLotLine").textContent = `Lot ${lotRound} \u2014 ${materialLot}`;
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
  var _a, _b;
  if (!canShowSummary()) return;
  if (weighState.type === "P") {
    showPackagingSummaryPanel();
    return;
  }
  clearScanTimer();
  scanBuffer = "";
  (_a = document.getElementById("scanInput")) == null ? void 0 : _a.blur();
  hideSummaryPanels();
  const weights = getSummaryWeights();
  const materialLot = getMaterialLot();
  const docNo = weighState.docNo || "PB-BL03.3";
  const batchNo = weighState.batchNo || "C01160626B";
  const productTitle = weighState.productName || "POSE LIQUID SOAP";
  document.getElementById("weighPanel").classList.remove("active");
  document.getElementById("summaryItemName").textContent = weighState.itemName;
  document.getElementById("summaryMeta").textContent = `${docNo} \xB7 ${batchNo}`;
  const weightCard = document.querySelector(
    ".summary-content .summary-card:first-child"
  );
  const weightRows = weightCard == null ? void 0 : weightCard.querySelectorAll(
    ".summary-row span:first-child"
  );
  if (weights.isQuantity) {
    weightCard.querySelector(".summary-card-head").textContent = "\u0E08\u0E33\u0E19\u0E27\u0E19";
    if (weightRows == null ? void 0 : weightRows[1]) weightRows[1].textContent = "\u0E08\u0E33\u0E19\u0E27\u0E19\u0E17\u0E35\u0E48\u0E40\u0E1A\u0E34\u0E01";
    if (weightRows == null ? void 0 : weightRows[2]) weightRows[2].textContent = "\u0E08\u0E33\u0E19\u0E27\u0E19\u0E23\u0E27\u0E21";
  } else {
    weightCard.querySelector(".summary-card-head").textContent = "\u0E19\u0E49\u0E33\u0E2B\u0E19\u0E31\u0E01";
    if (weightRows == null ? void 0 : weightRows[1]) weightRows[1].textContent = "\u0E19\u0E49\u0E33\u0E2B\u0E19\u0E31\u0E01\u0E2A\u0E38\u0E17\u0E18\u0E34 (Net)";
    if (weightRows == null ? void 0 : weightRows[2]) weightRows[2].textContent = "\u0E19\u0E49\u0E33\u0E2B\u0E19\u0E31\u0E01\u0E23\u0E27\u0E21 (Gross)";
  }
  document.getElementById("summaryTarget").textContent = `${formatWeighAmount(weights.target)} ${weights.unit}`;
  document.getElementById("summaryNet").textContent = `${formatWeighAmount(weights.net)} ${weights.unit}`;
  document.getElementById("summaryGross").textContent = `${formatWeighAmount(weights.gross)} ${weights.unit}`;
  document.getElementById("summaryProductName").textContent = productTitle;
  document.getElementById("summaryBatchNo").textContent = batchNo;
  document.getElementById("summaryMaterialLot").textContent = materialLot;
  document.getElementById("summaryControlCode").textContent = materialLot;
  document.getElementById("summaryWeigher").textContent = getWeigherName();
  const inspector = document.getElementById("summaryInspector");
  if (inspector) inspector.value = "";
  clearSummaryInspectorError();
  document.getElementById("summaryPanel").classList.add("active");
  (_b = document.getElementById("packagingSummaryPanel")) == null ? void 0 : _b.classList.remove("active");
}
function canPassScanStep(stepId) {
  var _a;
  const stepData = weighState.completedSteps[stepId] || {};
  if (!((_a = stepData.scanCode) == null ? void 0 : _a.trim())) return false;
  if (isApiValidatedScaleStep(stepId)) {
    return weighState.scaleValidated && !weighState.scaleLoading && weighState.scaleAlert === null;
  }
  if (isApiValidatedScanStep(stepId)) {
    return weighState.scanValidated && !weighState.scanLoading && weighState.scanAlert === null;
  }
  return true;
}
function renderScanAlert(stepId) {
  var _a, _b, _c, _d, _e;
  const alert = weighState.scanAlert;
  if (!alert) return "";
  if (alert === "expired") {
    return `
      <div class="scan-alert scan-alert--danger">
        \u0E27\u0E31\u0E15\u0E16\u0E38\u0E14\u0E34\u0E1A\u0E2B\u0E21\u0E14\u0E2D\u0E32\u0E22\u0E38 \u2014 \u0E15\u0E34\u0E14\u0E15\u0E48\u0E2D QC \u0E01\u0E48\u0E2D\u0E19\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23
      </div>
    `;
  }
  if (alert === "mismatch") {
    const label = weighState.type === "P" ? "\u0E44\u0E21\u0E48\u0E15\u0E23\u0E07" : "\u0E40\u0E04\u0E21\u0E35\u0E44\u0E21\u0E48\u0E15\u0E23\u0E07";
    const target = weighState.type === "P" ? `\u0E01\u0E25\u0E48\u0E2D\u0E07 ${weighState.itemName}` : `\u0E16\u0E38\u0E07 ${weighState.itemName}`;
    return `
      <div class="scan-alert scan-alert--danger">
        <strong>${label}</strong> \u2014 \u0E2A\u0E41\u0E01\u0E19 QR \u0E1A\u0E19${target} \u0E43\u0E2B\u0E21\u0E48\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07
      </div>
    `;
  }
  if (alert === "no_stock") {
    const lot = ((_a = weighState.scanInventory) == null ? void 0 : _a.lotNo) || ((_c = (_b = weighState.completedSteps[stepId]) == null ? void 0 : _b.scanCode) == null ? void 0 : _c.trim()) || "\u2014";
    const required = formatWeighAmount(weighState.amount);
    const remaining = formatWeighAmount(getStockRemainingQty());
    const stockUnit = weighState.unit;
    const canContinue = canPassScanStep(stepId) || Boolean((_e = (_d = weighState.completedSteps[stepId]) == null ? void 0 : _d.scanCode) == null ? void 0 : _e.trim());
    return `
      <div class="scan-alert scan-alert--stock">
        <div class="scan-alert-stock-title">
          <i class="fa-solid fa-triangle-exclamation"></i>
          \u0E2A\u0E15\u0E47\u0E2D\u0E01\u0E44\u0E21\u0E48\u0E40\u0E1E\u0E35\u0E22\u0E07\u0E1E\u0E2D
        </div>
        <div class="scan-alert-stock-row">
          <span>Lot</span>
          <strong>${lot}</strong>
        </div>
        <div class="scan-alert-stock-row">
          <span>\u0E22\u0E2D\u0E14\u0E17\u0E35\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23</span>
          <strong>${required} ${stockUnit}</strong>
        </div>
        <div class="scan-alert-stock-row">
          <span>\u0E2A\u0E15\u0E47\u0E2D\u0E01\u0E04\u0E07\u0E40\u0E2B\u0E25\u0E37\u0E2D</span>
          <strong class="scan-alert-stock-low">${remaining} ${stockUnit}</strong>
        </div>
        <p class="scan-alert-stock-question">
          \u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23\u0E15\u0E48\u0E2D\u0E14\u0E49\u0E27\u0E22\u0E2A\u0E15\u0E47\u0E2D\u0E01\u0E17\u0E35\u0E48\u0E21\u0E35\u0E2D\u0E22\u0E39\u0E48?
        </p>
        <div class="scan-alert-stock-actions">
          <button type="button" class="stock-cancel-btn" data-step="${stepId}">
            \u0E22\u0E01\u0E40\u0E25\u0E34\u0E01
          </button>
          <button
            type="button"
            class="stock-continue-btn"
            data-step="${stepId}"
            ${canContinue ? "" : "disabled"}
          >
            \u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23\u0E15\u0E48\u0E2D
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
  successHint = "\u0E2A\u0E41\u0E01\u0E19 QR/Barcode \u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08",
  loading = false
}) {
  const hasScan = Boolean(scannedCode);
  const boxClass = [
    "scan-box",
    hasScan ? "scan-box--success" : "",
    loading ? "scan-box--loading" : "",
    extraClass
  ].filter(Boolean).join(" ");
  const statusText = loading ? "\u0E01\u0E33\u0E25\u0E31\u0E07\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A QR..." : hasScan ? scannedCode : "\u0E23\u0E2D\u0E2A\u0E41\u0E01\u0E19 QR";
  const hint = loading ? "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E2D\u0E2A\u0E31\u0E01\u0E04\u0E23\u0E39\u0E48" : hasScan ? successHint : "\u0E01\u0E14\u0E1B\u0E38\u0E48\u0E21\u0E14\u0E49\u0E32\u0E19\u0E02\u0E49\u0E32\u0E07\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E2A\u0E41\u0E01\u0E19";
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
    successHint: weighState.scanAlert === null && weighState.scanValidated ? "\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A QR \u0E1C\u0E48\u0E32\u0E19" : "\u0E2A\u0E41\u0E01\u0E19 QR/Barcode \u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08"
  })}
      ${renderScanAlert(stepId)}
      <div class="weigh-actions weigh-actions--scan">
        ${workflow.actions.map((action) => {
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
  }).join("")}
      </div>
    </div>
  `;
}
function renderWeightPanel({ value, unit, subLabel = "" }) {
  const display = value != null ? formatWeighAmount(value) : "\u2014";
  return `
    <div class="weight-panel">
      <p class="weight-panel-label">\u0E04\u0E48\u0E32\u0E1B\u0E31\u0E08\u0E08\u0E38\u0E1A\u0E31\u0E19</p>
      <p class="weight-panel-value">${display}</p>
      <p class="weight-panel-unit">${unit}${subLabel ? ` \xB7 ${subLabel}` : ""}</p>
    </div>
  `;
}
function renderStepActionButtons(stepId, buttons) {
  return `
    <div class="weigh-step-actions">
      ${buttons.map(
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
          `
  ).join("")}
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
    return "Tare \u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08 \u2014 \u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E0A\u0E31\u0E48\u0E07\u0E41\u0E25\u0E49\u0E27\u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48";
  }
  if (weighState.stepAlert === "under") {
    return "\u0E19\u0E49\u0E33\u0E2B\u0E19\u0E31\u0E01\u0E19\u0E49\u0E2D\u0E22\u0E01\u0E27\u0E48\u0E32\u0E40\u0E1B\u0E49\u0E32\u0E2B\u0E21\u0E32\u0E22 \u2014 \u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E41\u0E25\u0E30\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E43\u0E2B\u0E21\u0E48";
  }
  if (weighState.stepAlert === "over") {
    return "\u0E19\u0E49\u0E33\u0E2B\u0E19\u0E31\u0E01\u0E40\u0E01\u0E34\u0E19\u0E40\u0E1B\u0E49\u0E32\u0E2B\u0E21\u0E32\u0E22 \u2014 \u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E41\u0E25\u0E30\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E43\u0E2B\u0E21\u0E48";
  }
  if (weighState.stepAlert === "weight_mismatch") {
    return "\u0E19\u0E49\u0E33\u0E2B\u0E19\u0E31\u0E01 Gross \u0E44\u0E21\u0E48\u0E15\u0E23\u0E07 \u2014 \u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E41\u0E25\u0E30\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E43\u0E2B\u0E21\u0E48";
  }
  return "";
}
function renderScaleStep(stepId) {
  const stepData = weighState.completedSteps[stepId] || {};
  const displayCode = getScaleDisplayCode(stepData.scanCode || null);
  const hasScan = Boolean(displayCode);
  const scaleAlert = weighState.scaleAlert;
  const scanBoxClass = hasScan && weighState.scaleValidated && !scaleAlert ? "scan-box--success" : scaleAlert === "mismatch" ? "scan-box--error" : "";
  const passDisabled = isScanActionDisabled({ id: "pass" }, stepId);
  return `
    <div class="weigh-step-body">
      ${renderScanBoxButton({
    scannedCode: displayCode,
    extraClass: scanBoxClass,
    loading: weighState.scaleLoading,
    successHint: "\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E0A\u0E31\u0E48\u0E07\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08"
  })}
      ${scaleAlert === "mismatch" ? `<div class="scan-alert scan-alert--danger"><strong>QR \u0E44\u0E21\u0E48\u0E15\u0E23\u0E07</strong> \u2014 \u0E2A\u0E41\u0E01\u0E19 QR \u0E1A\u0E19\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E0A\u0E31\u0E48\u0E07\u0E43\u0E2B\u0E21\u0E48\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07</div>` : ""}
      <div class="weigh-actions weigh-actions--scale">
        <button
          type="button"
          class="weigh-action-btn weigh-action-btn--neutral${!passDisabled && weighState.scaleValidated && !scaleAlert ? " weigh-action-btn--highlight" : ""}"
          data-action="pass"
          data-step="${stepId}"
          ${passDisabled ? "disabled" : ""}
        >
          <i class="fa-solid fa-circle-play"></i>
          \u0E1C\u0E48\u0E32\u0E19
        </button>
        <button
          type="button"
          class="weigh-action-btn weigh-action-btn--danger${scaleAlert === "mismatch" ? " weigh-action-btn--highlight" : ""}"
          data-step-action="scale_mismatch"
          data-step="${stepId}"
          disabled
        >
          <i class="fa-solid fa-circle-play"></i>
          QR \u0E44\u0E21\u0E48\u0E15\u0E23\u0E07
        </button>
      </div>
    </div>
  `;
}
function renderContainerStep(step) {
  const draft = getStepDraft(step.id);
  const unit = step.unit || "g";
  const value = draft.recorded ? draft.weight : getDisplayWeightForStep(step, draft);
  const canRecord = !draft.recorded && hasLiveScaleWeight();
  return `
    <div class="weigh-step-body">
      <div class="weigh-warning-banner">
        <i class="fa-solid fa-triangle-exclamation"></i>
        \u0E2D\u0E22\u0E48\u0E32\u0E25\u0E37\u0E21\u0E27\u0E32\u0E07\u0E20\u0E32\u0E0A\u0E19\u0E30 \u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E1D\u0E32
      </div>
      ${renderWeightPanel({ value, unit })}
      <button
        type="button"
        class="weigh-primary-btn weigh-record-btn"
        data-step="${step.id}"
        ${draft.recorded ? "disabled" : canRecord ? "" : "disabled"}
      >
        \u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E19\u0E49\u0E33\u0E2B\u0E19\u0E31\u0E01
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
        Tare \u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E0A\u0E31\u0E48\u0E07
      </button>
      ${renderStepActionButtons(step.id, [
    {
      id: "tare_ok",
      label: "Tare OK (0.00)",
      tone: "neutral",
      disabled: !draft.tared
    },
    { id: "tare_fail", label: "\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08", tone: "danger" }
  ])}
    </div>
  `;
}
function renderNetStep(step) {
  var _a;
  const draft = getStepDraft(step.id);
  const unit = weighState.unit;
  const target = weighState.amount;
  const liveWeight = draft.recorded ? draft.weight : getMqttLiveWeight();
  const value = draft.recorded ? (_a = draft.weight) != null ? _a : getMockNetWeight() : getDisplayWeightForStep(step, draft);
  const targetLabel = `\u0E40\u0E1B\u0E49\u0E32\u0E2B\u0E21\u0E32\u0E22 ${formatWeighAmount(target)} ${unit}`;
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
        \u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E19\u0E49\u0E33\u0E2B\u0E19\u0E31\u0E01
      </button>
      ${renderStepActionButtons(step.id, [
    {
      id: "pass",
      label: "\u0E1C\u0E48\u0E32\u0E19",
      tone: "neutral",
      disabled: !draft.recorded
    },
    { id: "under", label: "\u0E19\u0E49\u0E2D\u0E22\u0E44\u0E1B", tone: "danger", disabled: true },
    { id: "over", label: "\u0E40\u0E01\u0E34\u0E19\u0E44\u0E1B", tone: "danger", disabled: true }
  ])}
    </div>
  `;
}
function renderGrossStep(step) {
  var _a;
  const draft = getStepDraft(step.id);
  const unit = weighState.unit;
  const expected = getExpectedGrossWeight();
  const liveWeight = draft.recorded ? draft.weight : getMqttLiveWeight();
  const value = draft.recorded ? (_a = draft.weight) != null ? _a : expected : getDisplayWeightForStep(step, draft);
  const canRecord = !draft.recorded && canRecordNetWeight(liveWeight, expected);
  syncGrossStepAlert(liveWeight, expected, draft.recorded);
  return `
    <div class="weigh-step-body">
      <div class="weigh-expected-row">
        <span>\u0E04\u0E32\u0E14\u0E01\u0E32\u0E23\u0E13\u0E4C Gross</span>
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
        \u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E19\u0E49\u0E33\u0E2B\u0E19\u0E31\u0E01
      </button>
      ${renderStepActionButtons(step.id, [
    {
      id: "pass",
      label: "\u0E1C\u0E48\u0E32\u0E19",
      tone: "neutral",
      disabled: !draft.recorded
    },
    {
      id: "weight_mismatch",
      label: "\u0E19\u0E49\u0E33\u0E2B\u0E19\u0E31\u0E01\u0E44\u0E21\u0E48\u0E15\u0E23\u0E07",
      tone: "danger",
      disabled: true
    }
  ])}
    </div>
  `;
}
function renderQuantityStep(stepId) {
  var _a;
  const scanLot = ((_a = weighState.completedSteps[1]) == null ? void 0 : _a.scanCode) || "\u2014";
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
        <span class="qty-target-label">\u0E08\u0E33\u0E19\u0E27\u0E19</span>
        <span class="qty-target-value">\u0E40\u0E1B\u0E49\u0E32\u0E2B\u0E21\u0E32\u0E22 ${formatQtyWithUnit(target, unit)}</span>
      </div>
      <div class="qty-panel ${hasError ? "qty-panel--error" : ""}">
        <div class="qty-panel-main">
          <p class="qty-panel-label">\u0E04\u0E48\u0E32\u0E1B\u0E31\u0E08\u0E08\u0E38\u0E1A\u0E31\u0E19</p>
          <input
            type="number"
            id="weighQtyInput"
            class="qty-panel-input"
            inputmode="numeric"
            min="0"
            step="1"
            value="${inputValue}"
            placeholder="\u2014"
            aria-label="\u0E08\u0E33\u0E19\u0E27\u0E19\u0E17\u0E35\u0E48\u0E40\u0E1A\u0E34\u0E01"
          />
          <p class="qty-panel-unit">${unit}</p>
        </div>
        <div class="qty-stepper">
          <button
            type="button"
            class="qty-stepper-btn"
            data-qty-step="up"
            data-step="${stepId}"
            aria-label="\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E08\u0E33\u0E19\u0E27\u0E19"
          >
            <i class="fa-solid fa-chevron-up"></i>
          </button>
          <button
            type="button"
            class="qty-stepper-btn"
            data-qty-step="down"
            data-step="${stepId}"
            aria-label="\u0E25\u0E14\u0E08\u0E33\u0E19\u0E27\u0E19"
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
        \u0E40\u0E15\u0E47\u0E21\u0E08\u0E33\u0E19\u0E27\u0E19 (${formatQtyWithUnit(target, unit)})
      </button>
      ${hasError ? `<p class="qty-error-msg">\u0E08\u0E33\u0E19\u0E27\u0E19\u0E44\u0E21\u0E48\u0E04\u0E23\u0E1A \u2014 \u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23 ${formatQtyWithUnit(target, unit)}</p>` : ""}
      <button
        type="button"
        class="qty-save-btn weigh-next-btn"
        data-step="${stepId}"
        data-kind="quantity"
      >
        \u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E08\u0E33\u0E19\u0E27\u0E19
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
  var _a;
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
  const rowSummary = step.kind === "scan" && !scannedCode || step.kind === "scale" && !getScaleDisplayCode(
    ((_a = weighState.completedSteps[step.id]) == null ? void 0 : _a.scanCode) || null
  ) ? "" : summary;
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
  container.innerHTML = workflow.steps.map((step) => {
    const status = getStepStatus(step.id);
    if (status === "done") return renderDoneStep(step);
    if (status === "locked") return renderLockedStep(step);
    return renderActiveStep(step);
  }).join("");
  bindWeighStepEvents();
}
function bindWeighStepEvents() {
  var _a;
  document.querySelectorAll("[data-edit-step]").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      reopenStep(Number(btn.dataset.editStep));
    });
  });
  document.querySelectorAll(".weigh-action-btn").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      var _a2, _b, _c;
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
        const scanCode = (_b = (_a2 = weighState.completedSteps[stepId]) == null ? void 0 : _a2.scanCode) == null ? void 0 : _b.trim();
        if (isApiValidatedScaleStep(stepId)) {
          const machine = weighState.scaleMachine;
          completeStep(stepId, {
            scanCode: (machine == null ? void 0 : machine.machineName) || scanCode || null,
            machineName: (machine == null ? void 0 : machine.machineName) || null,
            scale: (machine == null ? void 0 : machine.qrCode) || null,
            scaleId: (_c = machine == null ? void 0 : machine.id) != null ? _c : null
          });
          return;
        }
        completeStep(stepId, {
          scanCode: scanCode || null,
          actionLabel: action.label,
          alertType: weighState.scanAlert || null
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
      var _a2, _b;
      if (btn.disabled) return;
      const stepId = Number(btn.dataset.step);
      if (!canPassScanStep(stepId)) return;
      const scanCode = (_b = (_a2 = weighState.completedSteps[stepId]) == null ? void 0 : _a2.scanCode) == null ? void 0 : _b.trim();
      completeStep(stepId, {
        scanCode: scanCode || null,
        actionLabel: "\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23\u0E15\u0E48\u0E2D",
        alertType: "no_stock"
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
        (item) => item.id === stepId
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
          actionLabel: "\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E19\u0E49\u0E33\u0E2B\u0E19\u0E31\u0E01"
        });
        return;
      }
      if (step.kind === "net") {
        const liveWeight = getMqttLiveWeight();
        if (!canRecordNetWeight(liveWeight, weighState.amount)) return;
        draft.weight = liveWeight != null ? liveWeight : getMockNetWeight();
        draft.recorded = true;
        weighState.stepAlert = null;
        renderWeighSteps();
        return;
      }
      if (step.kind === "gross") {
        const expected = getExpectedGrossWeight();
        const liveWeight = getMqttLiveWeight();
        if (!canRecordNetWeight(liveWeight, expected)) return;
        draft.weight = liveWeight != null ? liveWeight : expected;
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
      MqttScale == null ? void 0 : MqttScale.publishTare();
      draft.tared = true;
      draft.weight = 0;
      renderWeighSteps();
    });
  });
  document.querySelectorAll(".weigh-step-action-btn").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      var _a2;
      event.stopPropagation();
      if (btn.disabled) return;
      const stepId = Number(btn.dataset.step);
      const action = btn.dataset.stepAction;
      const step = getWorkflow(weighState.type).steps.find(
        (item) => item.id === stepId
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
          actionLabel: "Tare OK (0.00)"
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
          weight: (_a2 = draft.weight) != null ? _a2 : step.kind === "gross" ? getExpectedGrossWeight() : getMockNetWeight(),
          unit: weighState.unit,
          actionLabel: "\u0E1C\u0E48\u0E32\u0E19"
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
        const quantity = Number(qtyInput == null ? void 0 : qtyInput.value);
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
      completeStep(stepId, { actionLabel: "\u0E22\u0E37\u0E19\u0E22\u0E31\u0E19" });
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
  (_a = document.getElementById("weighQtyInput")) == null ? void 0 : _a.addEventListener("input", (event) => {
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
    ...weighState.completedSteps[scanStep.id] || {},
    scanCode: trimmedValue,
    locked: false
  };
  renderWeighSteps();
  focusScanInput();
}
async function fetchCoaApproveList() {
  const response = await fetch(`${API_URL}/coa-approve`, {
    credentials: "include"
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
    defaultOption.textContent = "\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E1C\u0E39\u0E49\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A...";
    select.appendChild(defaultOption);
  }
  list.forEach((item) => {
    var _a;
    const option = document.createElement("option");
    option.value = String((_a = item.id) != null ? _a : "");
    option.textContent = item.fNameTh || item.fName || "\u2014";
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
  var _a, _b, _c, _d, _e, _f, _g, _h;
  initMqttScaleIntegration();
  loadCoaApproveInspectors();
  const scanInput = document.getElementById("scanInput");
  const closeBtn = document.getElementById("closeWeighPanel");
  closeBtn == null ? void 0 : closeBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    closeWeighPanel();
  });
  (_a = document.getElementById("summarySaveBtn")) == null ? void 0 : _a.addEventListener("click", () => {
    if (!validateSummaryInspector()) return;
    closeSummaryPanel();
  });
  (_b = document.getElementById("pkgSummarySaveBtn")) == null ? void 0 : _b.addEventListener("click", () => {
    if (!validateSummaryInspector()) return;
    closeSummaryPanel();
  });
  (_c = document.getElementById("summaryPrintBtn")) == null ? void 0 : _c.addEventListener("click", () => {
    if (!validateSummaryInspector()) return;
    showPrintPreviewPanel();
  });
  (_d = document.getElementById("summaryInspector")) == null ? void 0 : _d.addEventListener("change", () => {
    var _a2;
    if ((_a2 = document.getElementById("summaryInspector")) == null ? void 0 : _a2.value) {
      clearSummaryInspectorError();
    }
  });
  (_e = document.getElementById("pkgSummaryInspector")) == null ? void 0 : _e.addEventListener("change", () => {
    var _a2;
    if ((_a2 = document.getElementById("pkgSummaryInspector")) == null ? void 0 : _a2.value) {
      clearSummaryInspectorError();
    }
  });
  (_f = document.getElementById("backFromPrintPreview")) == null ? void 0 : _f.addEventListener("click", closePrintPreviewPanel);
  (_g = document.getElementById("sendPrintBtn")) == null ? void 0 : _g.addEventListener("click", () => {
    window.print();
  });
  scanInput == null ? void 0 : scanInput.addEventListener("input", (event) => {
    if (!weighState || !getActiveScanStep()) return;
    scanBuffer = event.target.value;
    updateScanPreview(scanBuffer);
    scheduleScanSubmit();
  });
  scanInput == null ? void 0 : scanInput.addEventListener("keydown", (event) => {
    if (!weighState || !getActiveScanStep()) return;
    if (event.key === "Enter") {
      event.preventDefault();
      scanBuffer = event.target.value || scanBuffer;
      updateScanPreview(scanBuffer);
      scheduleScanSubmit();
      return;
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      scanBuffer += event.key;
      updateScanPreview(scanBuffer);
      scheduleScanSubmit();
    }
  });
  (_h = document.getElementById("weighPanel")) == null ? void 0 : _h.addEventListener("click", (event) => {
    if (event.target.closest("button, input, select, textarea, label")) return;
    focusScanInput();
  });
}
document.addEventListener("DOMContentLoaded", initWeighingPanel);
