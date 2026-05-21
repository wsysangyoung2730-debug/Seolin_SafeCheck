import {
  getCurrentDriverSession,
  logoutDriver,
} from "../../services/authApi.js";
import { getTodayDriverSchedules } from "../../services/driverApi.js";

let session = null;
let todayScheduleData = null;

const todayLabel = document.querySelector("#today-label");
const vehicleName = document.querySelector("#vehicle-name");
const accountName = document.querySelector("#account-name");
const scheduleList = document.querySelector("#schedule-list");
const scheduleMessage = document.querySelector("#schedule-message");
const logoutButton = document.querySelector("#logout-button");

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "long",
});

function renderToday() {
  todayLabel.textContent = dateFormatter.format(new Date());
}

function showScheduleMessage(text, type = "info") {
  scheduleMessage.textContent = text;
  scheduleMessage.dataset.type = type;
}

function renderDriverSummary() {
  const vehicle = todayScheduleData?.vehicle;

  vehicleName.textContent = vehicle ? vehicle.name : "배정된 차량 없음";
  accountName.textContent = `${session.user.accountId} 계정으로 로그인 중`;
}

function createScheduleButton(schedule) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "schedule-card";
  button.dataset.scheduleId = schedule.id;

  const time = document.createElement("span");
  time.className = "schedule-card__time";
  time.textContent = schedule.startTime;

  const name = document.createElement("span");
  name.className = "schedule-card__name";
  name.textContent = schedule.name;

  const hint = document.createElement("span");
  hint.className = "schedule-card__hint";
  hint.textContent = "원생 탑승 확인하기";

  button.append(time, name, hint);
  button.addEventListener("click", () => {
    scheduleMessage.textContent = `${schedule.startTime} ${schedule.name} 시간대로 이동합니다.`;
    window.location.href = `../schedule/?scheduleId=${encodeURIComponent(schedule.id)}`;
  });

  return button;
}

function renderSchedules() {
  const schedules = todayScheduleData?.schedules || [];
  scheduleList.replaceChildren();

  if (schedules.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "등록된 시간대가 없습니다.";
    scheduleList.append(empty);
    return;
  }

  schedules.forEach((schedule) => {
    scheduleList.append(createScheduleButton(schedule));
  });
}

logoutButton.addEventListener("click", () => {
  logoutButton.disabled = true;
  logoutButton.textContent = "로그아웃 중...";

  logoutDriver().finally(() => {
    window.location.replace("../login/");
  });
});

async function initializeHome() {
  session = await getCurrentDriverSession();

  if (!session) {
    window.location.replace("../login/");
    return;
  }

  renderToday();
  vehicleName.textContent = "운행 정보를 불러오는 중입니다";
  accountName.textContent = `${session.user.accountId} 계정으로 로그인 중`;
  showScheduleMessage("정보를 불러오는 중입니다.", "info");

  try {
    todayScheduleData = await getTodayDriverSchedules();
    renderDriverSummary();
    renderSchedules();
    showScheduleMessage("", "info");
  } catch {
    vehicleName.textContent = "운행 정보를 불러오지 못했습니다";
    accountName.textContent = "잠시 후 다시 시도해주세요.";
    scheduleList.replaceChildren();
    showScheduleMessage("시간대 정보를 불러오지 못했습니다.", "error");
  }
}

initializeHome();
