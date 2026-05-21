import {
  getDriverSession,
  logoutDriver,
} from "../../services/auth/mockAuthService.js";
import {
  getTodayRouteSchedulesForDriver,
  getVehicleForDriver,
} from "../../services/driver/mockDriverData.js";

const session = getDriverSession();

if (!session) {
  window.location.replace("../login/");
}

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

function renderDriverSummary() {
  const vehicle = getVehicleForDriver(session.driverId);

  vehicleName.textContent = vehicle ? vehicle.name : "배정된 차량 없음";
  accountName.textContent = `${session.accountId} 계정으로 로그인 중`;
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
  hint.textContent = "탑승 확인은 다음 단계에서 진행";

  button.append(time, name, hint);
  button.addEventListener("click", () => {
    scheduleMessage.textContent = `${schedule.startTime} ${schedule.name} 시간대가 선택되었습니다. 출결 체크 화면은 다음 구현 단계에서 연결합니다.`;
  });

  return button;
}

function renderSchedules() {
  const schedules = getTodayRouteSchedulesForDriver(session.driverId);
  scheduleList.replaceChildren();

  if (schedules.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "오늘 표시할 운행 시간대가 없습니다.";
    scheduleList.append(empty);
    return;
  }

  schedules.forEach((schedule) => {
    scheduleList.append(createScheduleButton(schedule));
  });
}

logoutButton.addEventListener("click", () => {
  logoutDriver();
  window.location.replace("../login/");
});

renderToday();
renderDriverSummary();
renderSchedules();
