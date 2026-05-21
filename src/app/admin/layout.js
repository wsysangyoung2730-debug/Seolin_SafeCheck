import {
  getCurrentAdminSession,
  logoutAdmin,
} from "../../services/adminAuthApi.js";

export async function requireAdminSession() {
  const session = await getCurrentAdminSession();

  if (!session) {
    window.location.replace("../login/");
    return null;
  }

  renderAdminIdentity(session);
  bindLogout();
  return session;
}

function renderAdminIdentity(session) {
  const displayName = document.querySelector("#admin-display-name");
  const accountId = document.querySelector("#admin-account-id");

  if (displayName) {
    displayName.textContent = session.user.displayName || "관리자";
  }

  if (accountId) {
    accountId.textContent = `${session.user.accountId} 계정`;
  }
}

function bindLogout() {
  const logoutButton = document.querySelector("#logout-button");

  if (!logoutButton || logoutButton.dataset.bound === "true") {
    return;
  }

  logoutButton.dataset.bound = "true";
  logoutButton.addEventListener("click", () => {
    logoutButton.disabled = true;
    logoutButton.textContent = "로그아웃 중";

    logoutAdmin().finally(() => {
      window.location.replace("../login/");
    });
  });
}

export function bindPlannedNavigation() {
  document.querySelectorAll("[data-planned-nav]").forEach((item) => {
    item.addEventListener("click", (event) => {
      event.preventDefault();
    });
  });
}
