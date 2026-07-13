const API_URL = "/api";
function showLoginError(message) {
  const errorBox = document.getElementById("login-error");
  const errorText = document.getElementById("login-error-text");
  if (!errorBox || !errorText) return;
  errorText.textContent = message;
  errorBox.hidden = false;
}
function hideLoginError() {
  const errorBox = document.getElementById("login-error");
  if (!errorBox) return;
  errorBox.hidden = true;
}
function getLoginValidationError(username, password) {
  const trimmedUsername = username.trim();
  if (!trimmedUsername && !password) {
    return "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01\u0E0A\u0E37\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E41\u0E25\u0E30\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19";
  }
  if (!trimmedUsername) {
    return "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01\u0E0A\u0E37\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49";
  }
  if (!password) {
    return "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19";
  }
  return null;
}
async function login() {
  var _a, _b, _c;
  hideLoginError();
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const username = (_a = usernameInput == null ? void 0 : usernameInput.value) != null ? _a : "";
  const password = (_b = passwordInput == null ? void 0 : passwordInput.value) != null ? _b : "";
  const rememberMe = (_c = document.getElementById("rememberMe")) == null ? void 0 : _c.checked;
  const validationError = getLoginValidationError(username, password);
  if (validationError) {
    showLoginError(validationError);
    return;
  }
  const trimmedUsername = username.trim();
  try {
    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({ username: trimmedUsername, password, rememberMe })
    });
    let data = {};
    try {
      data = await res.json();
    } catch (e) {
      data = {};
    }
    if (!res.ok) {
      showLoginError(data.message || "\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08");
      return;
    }
    if (rememberMe) {
      localStorage.setItem("rememberedUser", trimmedUsername);
    } else {
      localStorage.removeItem("rememberedUser");
    }
    window.location.href = "/main.html";
  } catch (err) {
    console.error(err);
    showLoginError("\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D\u0E40\u0E0B\u0E34\u0E23\u0E4C\u0E1F\u0E40\u0E27\u0E2D\u0E23\u0E4C\u0E44\u0E14\u0E49");
  }
}
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      login();
    });
  }
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  [usernameInput, passwordInput].forEach((input) => {
    input == null ? void 0 : input.addEventListener("input", hideLoginError);
  });
  const toggleIcon = document.querySelector(".toggle-password");
  if (toggleIcon && passwordInput) {
    toggleIcon.addEventListener("click", () => {
      const isHidden = passwordInput.type === "password";
      passwordInput.type = isHidden ? "text" : "password";
      if (isHidden) {
        toggleIcon.classList.remove("fa-regular", "fa-eye");
        toggleIcon.classList.add("fa-solid", "fa-eye-slash");
      } else {
        toggleIcon.classList.remove("fa-solid", "fa-eye-slash");
        toggleIcon.classList.add("fa-regular", "fa-eye");
      }
    });
  }
  const savedUser = localStorage.getItem("rememberedUser");
  if (savedUser) {
    const usernameInput2 = document.getElementById("username");
    if (usernameInput2) {
      usernameInput2.value = savedUser;
    }
    const rememberMe = document.getElementById("rememberMe");
    if (rememberMe) {
      rememberMe.checked = true;
    }
  }
});
