import {
  getCurrentDriverSession,
  loginDriver,
} from "../../services/authApi.js";

const form = document.querySelector("#driver-login-form");
const accountIdInput = document.querySelector("#account-id");
const pinInput = document.querySelector("#pin");
const loginButton = document.querySelector("#login-button");
const message = document.querySelector("#login-message");

function showMessage(text, type = "error") {
  message.textContent = text;
  message.dataset.type = type;
}

function setLoading(isLoading) {
  loginButton.disabled = isLoading;
  loginButton.textContent = isLoading ? "로그인 중..." : "로그인";
}

async function redirectIfLoggedIn() {
  if (await getCurrentDriverSession()) {
    window.location.replace("../home/");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const accountId = accountIdInput.value.trim();
  const pin = pinInput.value.trim();

  if (!accountId) {
    showMessage("호차 계정 ID를 입력해주세요.");
    accountIdInput.focus();
    return;
  }

  if (!pin) {
    showMessage("비밀번호 또는 PIN을 입력해주세요.");
    pinInput.focus();
    return;
  }

  setLoading(true);
  showMessage("계정을 확인하고 있습니다.", "info");

  const result = await loginDriver({ accountId, pin });

  if (!result.success) {
    setLoading(false);
    showMessage(result.message);
    pinInput.select();
    return;
  }

  showMessage("로그인되었습니다. 오늘 운행 화면으로 이동합니다.", "success");
  window.location.replace("../home/");
});

redirectIfLoggedIn();
