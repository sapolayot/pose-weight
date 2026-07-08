let qrScannerInstance = null;
let qrScannerActive = false;

function isQrScannerSupported() {
  return typeof Html5Qrcode !== "undefined";
}

async function getRearCameraConfig() {
  if (!isQrScannerSupported()) return { facingMode: "environment" };

  try {
    const cameras = await Html5Qrcode.getCameras();
    const rearCamera = cameras.find((camera) =>
      /back|rear|environment|หลัง/i.test(camera.label),
    );

    if (rearCamera) return rearCamera.id;
  } catch {
    // fall through to facingMode
  }

  return { facingMode: "environment" };
}

function setQrScannerError(message) {
  const errorEl = document.getElementById("qrScannerError");
  if (!errorEl) return;

  if (message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
    return;
  }

  errorEl.textContent = "";
  errorEl.hidden = true;
}

async function closeQrScanner() {
  const panel = document.getElementById("qrScannerPanel");
  const viewport = document.getElementById("qrScannerViewport");

  if (qrScannerInstance) {
    try {
      await qrScannerInstance.stop();
    } catch {
      // ignore stop errors during cleanup
    }

    try {
      qrScannerInstance.clear();
    } catch {
      // ignore clear errors during cleanup
    }

    qrScannerInstance = null;
  }

  if (viewport) viewport.innerHTML = "";
  qrScannerActive = false;
  setQrScannerError("");
  if (panel) panel.hidden = true;
}

async function openQrScanner(onSuccess) {
  if (qrScannerActive) return;

  const panel = document.getElementById("qrScannerPanel");
  const viewport = document.getElementById("qrScannerViewport");

  if (!panel || !viewport) return;

  if (!isQrScannerSupported()) {
    window.alert("ไม่สามารถเปิดกล้องสแกน QR ได้บนอุปกรณ์นี้");
    return;
  }

  qrScannerActive = true;
  setQrScannerError("");
  panel.hidden = false;
  viewport.innerHTML = "";

  qrScannerInstance = new Html5Qrcode("qrScannerViewport");

  try {
    const cameraConfig = await getRearCameraConfig();

    await qrScannerInstance.start(
      cameraConfig,
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1,
      },
      async (decodedText) => {
        const value = decodedText.trim();
        if (!value) return;

        await closeQrScanner();
        onSuccess?.(value);
      },
      () => {},
    );
  } catch (error) {
    console.error(error);
    setQrScannerError("ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการใช้กล้องหลัง");
    qrScannerActive = false;
  }
}

function initQrScannerPanel() {
  document
    .getElementById("closeQrScanner")
    ?.addEventListener("click", () => closeQrScanner());

  document.getElementById("qrScannerPanel")?.addEventListener("click", (event) => {
    if (event.target.id === "qrScannerPanel") {
      closeQrScanner();
    }
  });
}

document.addEventListener("DOMContentLoaded", initQrScannerPanel);
