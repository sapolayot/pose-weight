// public/js/app.js

const API_URL = "http://localhost:3000/api";

// ===== LOGIN =====
async function login() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const rememberMe = document.getElementById("rememberMe")?.checked;

  try {
    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ username, password, rememberMe }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Login failed");
      return;
    }

    alert("Login success");

    // ===== จำ username (optional UI convenience)
    if (rememberMe) {
      localStorage.setItem("rememberedUser", username);
    } else {
      localStorage.removeItem("rememberedUser");
    }

    window.location.href = "/main.html";
  } catch (err) {
    console.error(err);
  }
}

// ===== CHECK SESSION =====
async function requireAuth(redirectIfLoggedIn = false) {
  try {
    const res = await fetch(`${API_URL}/me`, {
      credentials: "include",
    });

    const isLoggedIn = res.ok;

    if (redirectIfLoggedIn && isLoggedIn) {
      window.location.href = "/main.html";
    }

    if (!redirectIfLoggedIn && !isLoggedIn) {
      window.location.href = "/";
    }
  } catch (err) {
    window.location.href = "/";
  }
}

// ===== EVENT HOOK =====
document.addEventListener("DOMContentLoaded", () => {
  //form submit
  const loginForm = document.getElementById("login-form");

  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      login();
    });
  }
  //toggle visible input
  const passwordInput = document.getElementById("password");
  const toggleIcon = document.querySelector(".toggle-password");

  if (toggleIcon) {
    toggleIcon.addEventListener("click", () => {
      const isHidden = passwordInput.type === "password";

      passwordInput.type = isHidden ? "text" : "password";

      // เปลี่ยน icon (ถ้าใช้ Font Awesome)
      toggleIcon.classList.toggle("fa-eye");
      toggleIcon.classList.toggle("fa-eye-slash");
    });
  }

  //remember
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
