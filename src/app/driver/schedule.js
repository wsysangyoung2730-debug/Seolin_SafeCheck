import { getCurrentDriverSession } from "../../services/authApi.js";
import { getDriverScheduleStudents } from "../../services/driverApi.js";
import {
  ATTENDANCE_STATUS_LABEL,
  ATTENDANCE_STATUSES,
  getAttendanceSummary,
} from "../../services/attendance/attendanceStatus.js";
import { saveAttendance } from "../../services/attendanceApi.js";

const urlParams = new URLSearchParams(window.location.search);
const scheduleId = urlParams.get("scheduleId");

const todayLabel = document.querySelector("#today-label");
const scheduleTitle = document.querySelector("#schedule-title");
const vehicleName = document.querySelector("#vehicle-name");
const scheduleError = document.querySelector("#schedule-error");
const scheduleErrorTitle = document.querySelector("#schedule-error-title");
const scheduleErrorMessage = document.querySelector("#schedule-error-message");
const attendanceSection = document.querySelector("#attendance-section");
const studentList = document.querySelector("#student-list");
const boardedCount = document.querySelector("#boarded-count");
const notBoardedCount = document.querySelector("#not-boarded-count");
const uncheckedCount = document.querySelector("#unchecked-count");
const saveButton = document.querySelector("#save-button");
const saveMessage = document.querySelector("#save-message");
const saveDialog = document.querySelector("#save-dialog");
const saveDialogSummary = document.querySelector("#save-dialog-summary");
const confirmSaveButton = document.querySelector("#confirm-save-button");

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "long",
});

const timeFormatter = new Intl.DateTimeFormat("ko-KR", {
  hour: "2-digit",
  minute: "2-digit",
});

let session = null;
let selectedSchedule = null;
let selectedVehicle = null;
let attendanceRecords = [];
let isSaving = false;

function getTodayDateValue() {
  return new Date().toISOString().slice(0, 10);
}

function showMessage(text, type = "info") {
  saveMessage.textContent = text;
  saveMessage.dataset.type = type;
}

function setSaving(saving) {
  saveButton.disabled = saving;
  confirmSaveButton.disabled = saving;
  saveButton.textContent = saving ? "저장 중..." : "전체 저장";
  confirmSaveButton.textContent = saving ? "저장 중..." : "저장하기";

  studentList.querySelectorAll(".status-button").forEach((button) => {
    button.disabled = saving;
  });
}

function getCurrentSummary() {
  return getAttendanceSummary(attendanceRecords);
}

function renderToday() {
  todayLabel.textContent = dateFormatter.format(new Date());
}

function renderScheduleHeader() {
  if (!selectedSchedule || !selectedVehicle) {
    scheduleTitle.textContent = "시간대를 찾을 수 없습니다";
    vehicleName.textContent = "";
    scheduleErrorTitle.textContent = "시간대를 찾을 수 없습니다";
    scheduleErrorMessage.textContent = "선택한 운행 시간대가 없거나 접근할 수 없습니다.";
    scheduleError.classList.remove("hidden");
    attendanceSection.classList.add("hidden");
    return;
  }

  scheduleTitle.textContent = `${selectedSchedule.startTime} ${selectedSchedule.name}`;
  vehicleName.textContent = `${selectedVehicle.name} · ${session.user.accountId} 계정`;
  scheduleError.classList.add("hidden");
  attendanceSection.classList.remove("hidden");
}

function renderSummary() {
  const summary = getCurrentSummary();

  boardedCount.textContent = `${summary.boarded}명`;
  notBoardedCount.textContent = `${summary.notBoarded}명`;
  uncheckedCount.textContent = `${summary.unchecked}명`;
}

function getNextStatus(currentStatus, selectedStatus) {
  return currentStatus === selectedStatus
    ? ATTENDANCE_STATUSES.unchecked
    : selectedStatus;
}

function updateRecordStatus(studentId, status) {
  if (isSaving) {
    return;
  }

  attendanceRecords = attendanceRecords.map((record) =>
    record.studentId === studentId
      ? { ...record, status: getNextStatus(record.status, status) }
      : record,
  );
  renderStudentList();
  renderSummary();
  showMessage("상태가 변경되었습니다. 전체 저장을 눌러 확정하세요.", "info");
}

function createStatusButton(record, status) {
  const button = document.createElement("button");
  const isSelected = record.status === status;

  button.type = "button";
  button.className = `status-button status-button--${status}`;
  button.textContent = ATTENDANCE_STATUS_LABEL[status];
  button.disabled = isSaving;
  button.setAttribute("aria-pressed", String(isSelected));
  button.addEventListener("click", () => {
    updateRecordStatus(record.studentId, status);
  });

  return button;
}

function createStudentCard(record) {
  const card = document.createElement("article");
  card.className = `student-card student-card--${record.status}`;

  const details = document.createElement("div");
  details.className = "student-card__details";

  const name = document.createElement("h3");
  name.textContent = record.studentName;

  const pickupPlace = document.createElement("p");
  pickupPlace.textContent = `탑승 장소: ${record.pickupPlace}`;

  const status = document.createElement("strong");
  status.className = `status-label status-label--${record.status}`;
  status.textContent = `현재 상태: ${ATTENDANCE_STATUS_LABEL[record.status]}`;

  details.append(name, pickupPlace, status);

  const actions = document.createElement("div");
  actions.className = "status-actions";
  actions.append(
    createStatusButton(record, ATTENDANCE_STATUSES.boarded),
    createStatusButton(record, ATTENDANCE_STATUSES.notBoarded),
  );

  card.append(details, actions);
  return card;
}

function renderStudentList() {
  studentList.replaceChildren();

  if (attendanceRecords.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "등록된 원생이 없습니다.";
    studentList.append(empty);
    return;
  }

  attendanceRecords.forEach((record) => {
    studentList.append(createStudentCard(record));
  });
}

function openSaveDialog() {
  if (isSaving) {
    return;
  }

  const summary = getCurrentSummary();

  saveDialogSummary.textContent = `${selectedSchedule.startTime} ${selectedSchedule.name} · 총 ${summary.total}명 중 탑승 ${summary.boarded}명, 미탑승 ${summary.notBoarded}명, 미확인 ${summary.unchecked}명입니다.`;

  if (typeof saveDialog.showModal === "function") {
    saveDialog.showModal();
    return;
  }

  const shouldSave = window.confirm(`${saveDialogSummary.textContent}\n저장할까요?`);

  if (shouldSave) {
    handleSave();
  }
}

async function handleSave() {
  if (isSaving) {
    return;
  }

  isSaving = true;
  setSaving(true);
  showMessage("저장 중입니다.", "info");

  try {
    const result = await saveAttendance({
      date: getTodayDateValue(),
      vehicleId: selectedVehicle.id,
      scheduleId: selectedSchedule.id,
      records: attendanceRecords,
    });

    isSaving = false;
    setSaving(false);

    const savedTime = timeFormatter.format(new Date(result.savedAt));
    const { summary } = result;

    showMessage(
      `저장 완료: 총 ${summary.total}명, 탑승 ${summary.boarded}명, 미탑승 ${summary.notBoarded}명, 미확인 ${summary.unchecked}명 · ${savedTime}`,
      "success",
    );
  } catch {
    isSaving = false;
    setSaving(false);
    showMessage("저장에 실패했습니다. 잠시 후 다시 시도해주세요.", "error");
  }
}

saveButton.addEventListener("click", () => {
  if (isSaving) {
    return;
  }

  if (!selectedSchedule || !selectedVehicle) {
    showMessage("저장할 시간대 정보를 찾을 수 없습니다.", "error");
    return;
  }

  openSaveDialog();
});

saveDialog.addEventListener("close", () => {
  if (saveDialog.returnValue === "confirm") {
    handleSave();
  }
});

renderToday();

async function initializeSchedule() {
  session = await getCurrentDriverSession();

  if (!session) {
    window.location.replace("../login/");
    return;
  }

  if (!scheduleId) {
    renderScheduleHeader();
    return;
  }

  scheduleTitle.textContent = "시간대 정보를 불러오는 중입니다";
  vehicleName.textContent = `${session.user.accountId} 계정으로 로그인 중`;

  try {
    const data = await getDriverScheduleStudents(scheduleId);
    selectedSchedule = data.schedule;
    selectedVehicle = {
      id: session.user.vehicleId,
      name: session.user.vehicleName,
    };
    attendanceRecords = (data.students || []).map((student) => ({
      ...student,
      status: student.status || ATTENDANCE_STATUSES.unchecked,
    }));

    renderScheduleHeader();
    renderStudentList();
    renderSummary();
  } catch {
    scheduleTitle.textContent = "시간대 정보를 불러오지 못했습니다";
    vehicleName.textContent = "";
    scheduleErrorTitle.textContent = "원생 명단을 불러오지 못했습니다";
    scheduleErrorMessage.textContent = "시간대 정보를 확인한 뒤 다시 시도해주세요.";
    scheduleError.classList.remove("hidden");
    attendanceSection.classList.add("hidden");
  }
}

initializeSchedule();
