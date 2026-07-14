var DAYS_GREETING = [
  "\u0E2A\u0E27\u0E31\u0E2A\u0E14\u0E35\u0E27\u0E31\u0E19\u0E2D\u0E32\u0E17\u0E34\u0E15\u0E22\u0E4C",
  "\u0E2A\u0E27\u0E31\u0E2A\u0E14\u0E35\u0E27\u0E31\u0E19\u0E08\u0E31\u0E19\u0E17\u0E23\u0E4C",
  "\u0E2A\u0E27\u0E31\u0E2A\u0E14\u0E35\u0E27\u0E31\u0E19\u0E2D\u0E31\u0E07\u0E04\u0E32\u0E23",
  "\u0E2A\u0E27\u0E31\u0E2A\u0E14\u0E35\u0E27\u0E31\u0E19\u0E1E\u0E38\u0E18",
  "\u0E2A\u0E27\u0E31\u0E2A\u0E14\u0E35\u0E27\u0E31\u0E19\u0E1E\u0E24\u0E2B\u0E31\u0E2A\u0E1A\u0E14\u0E35",
  "\u0E2A\u0E27\u0E31\u0E2A\u0E14\u0E35\u0E27\u0E31\u0E19\u0E28\u0E38\u0E01\u0E23\u0E4C",
  "\u0E2A\u0E27\u0E31\u0E2A\u0E14\u0E35\u0E27\u0E31\u0E19\u0E40\u0E2A\u0E32\u0E23\u0E4C"
];
function setWelcomeText(user) {
  var welcomeEl = document.getElementById("welcome-text");
  if (!welcomeEl) return;
  var greeting = DAYS_GREETING[(/* @__PURE__ */ new Date()).getDay()];
  var firstName = user && user.firstName ? String(user.firstName).trim() : "";
  welcomeEl.textContent = firstName ? greeting + ", " + firstName : greeting;
}
function initWelcomeText() {
  if (window.__sessionUser) {
    setWelcomeText(window.__sessionUser);
    return;
  }
  document.addEventListener(
    "auth:ready",
    function(event) {
      setWelcomeText(event.detail);
    },
    { once: true }
  );
}
async function logout() {
  try {
    var proceed = confirm(
      "\u0E22\u0E37\u0E19\u0E22\u0E31\u0E19\u0E2D\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E23\u0E30\u0E1A\u0E1A?"
    );
    if (proceed) {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include"
      });
      window.location.href = "/";
    }
  } catch (err) {
    console.error(err);
  }
}
