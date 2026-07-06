const SPLASH_STORAGE_KEY = "phc_splash_shown";

const SPLASH_HTML = `
  <div id="splashScreen" class="splash-screen">
    <div class="splash-logo-box">
      <img src="./img/Logo_Pose.png" alt="logo_pose" width="100%" />
    </div>
    <h2 class="splash-title">โพสเฮลท์แคร์</h2>
    <p class="splash-subtitle">Pose Health Care Co., Ltd.</p>
    <div class="splash-footer">
      <div class="progress-bar">
        <div class="progress-fill"></div>
      </div>
      <span class="loading-text">กำลังโหลด...</span>
    </div>
  </div>
`;

function hasSplashBeenShown() {
  return sessionStorage.getItem(SPLASH_STORAGE_KEY) === "1";
}

function markSplashAsShown() {
  sessionStorage.setItem(SPLASH_STORAGE_KEY, "1");
}

function getPhoneContainer() {
  return document.querySelector(".app-container, .mobile-container");
}

function mountSplash() {
  if (document.getElementById("splashScreen")) {
    return document.getElementById("splashScreen");
  }

  const container = getPhoneContainer();
  if (!container) return null;

  container.insertAdjacentHTML("afterbegin", SPLASH_HTML);
  return document.getElementById("splashScreen");
}

function initSplashScreen(onComplete) {
  if (hasSplashBeenShown()) {
    onComplete?.();
    return;
  }

  const splash = mountSplash();
  const fill = splash?.querySelector(".progress-fill");

  if (!splash || !fill) {
    markSplashAsShown();
    onComplete?.();
    return;
  }

  let progress = 0;

  const interval = setInterval(() => {
    progress += Math.floor(Math.random() * 8) + 2;

    if (progress >= 100) {
      progress = 100;
      fill.style.width = "100%";
      clearInterval(interval);

      setTimeout(() => {
        splash.classList.add("fade-out");
        splash.style.zIndex = "-1";
        markSplashAsShown();
        onComplete?.();
      }, 300);
      return;
    }

    fill.style.width = `${progress}%`;
  }, 80);
}

document.addEventListener("DOMContentLoaded", () => {
  initSplashScreen();
});
