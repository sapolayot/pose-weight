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
    return "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน";
  }
  if (!trimmedUsername) {
    return "กรุณากรอกชื่อผู้ใช้";
  }
  if (!password) {
    return "กรุณากรอกรหัสผ่าน";
  }

  return null;
}

async function login() {
  hideLoginError();

  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const username = usernameInput?.value ?? "";
  const password = passwordInput?.value ?? "";
  const rememberMe = document.getElementById("rememberMe")?.checked;

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
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ username: trimmedUsername, password, rememberMe }),
    });

    let data = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }

    if (!res.ok) {
      showLoginError(data.message || "เข้าสู่ระบบไม่สำเร็จ");
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
    showLoginError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
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
    input?.addEventListener("input", hideLoginError);
  });
  const toggleIcon = document.querySelector(".toggle-password");

  if (toggleIcon && passwordInput) {
    toggleIcon.addEventListener("click", () => {
      const isHidden = passwordInput.type === "password";

      passwordInput.type = isHidden ? "text" : "password";

      toggleIcon.classList.toggle("fa-eye");
      toggleIcon.classList.toggle("fa-eye-slash");
    });
  }

  const savedUser = localStorage.getItem("rememberedUser");
  if (savedUser) {
    const usernameInput = document.getElementById("username");
    if (usernameInput) {
      usernameInput.value = savedUser;
    }

    const rememberMe = document.getElementById("rememberMe");
    if (rememberMe) {
      rememberMe.checked = true;
    }
  }
});
