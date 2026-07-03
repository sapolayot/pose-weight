// public/js/app.js

const API_URL = "http://localhost:3000/api";

// ===== LOGIN =====
async function login() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  try {
    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      document.getElementById("msg").innerText = data.message || "Login failed";
      document.getElementById("msg").className = "msg error";
      return;
    }

    document.getElementById("msg").innerText = "Login success";
    document.getElementById("msg").className = "msg success";

    window.location.href = "/dashboard.html";
  } catch (err) {
    console.error(err);
  }
}

// ===== LOGOUT =====
async function logout() {
  try {
    await fetch(`${API_URL}/logout`, {
      method: "POST",
      credentials: "include",
    });

    window.location.href = "/login.html";
  } catch (err) {
    console.error(err);
  }
}

// ===== CHECK SESSION =====
async function checkSession() {
  try {
    const res = await fetch(`${API_URL}/me`, {
      credentials: "include",
    });

    if (!res.ok) {
      window.location.href = "/login.html";
    }

    return await res.json();
  } catch (err) {
    window.location.href = "/login.html";
  }
}

// ===== EVENT HOOK =====
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");

  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      login();
    });
  }
});
