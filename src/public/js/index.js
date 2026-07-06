const API_URL = "/api";

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

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");

  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      login();
    });
  }

  const passwordInput = document.getElementById("password");
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
