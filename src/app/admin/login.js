import {
  getCurrentAdminSession,
  loginAdmin,
} from "../../services/adminAuthApi.js";

const form = document.querySelector("#admin-login-form");
const accountIdInput = document.querySelector("#account-id");
const passwordInput = document.querySelector("#password");
const loginButton = document.querySelector("#login-button");
const message = document.querySelector("#login-message");

function showMessage(text, type = "error") {
  message.textContent = text;
  message.dataset.type = type;
}

function setLoading(isLoading) {
  loginButton.disabled = isLoading;
  loginButton.textContent = isLoading ? "로그인 중입니다." : "로그인";
}

async function redirectIfLoggedIn() {
  if (await getCurrentAdminSession()) {
    window.location.replace("../students/");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const accountId = accountIdInput.value.trim();
  const password = passwordInput.value.trim();

  if (!accountId) {
    showMessage("계정 ID를 입력해주세요.");
    accountIdInput.focus();
    return;
  }

  if (!password) {
    showMessage("비밀번호를 입력해주세요.");
    passwordInput.focus();
    return;
  }

  setLoading(true);
  showMessage("로그인 중입니다.", "info");

  const result = await loginAdmin({ accountId, password });

  if (!result.success) {
    setLoading(false);
    showMessage(result.message || "로그인에 실패했습니다. 계정 정보를 확인해주세요.");
    passwordInput.select();
    return;
  }

  showMessage("로그인되었습니다. 원생 관리 화면으로 이동합니다.", "success");
  window.location.replace("../students/");
});

redirectIfLoggedIn();
