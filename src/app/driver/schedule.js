import { getCurrentDriverSession } from "../../services/authApi.js";
import {
  getDriverScheduleStudents,
  getTodayDriverSchedules,
} from "../../services/driverApi.js";
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
const totalCount = document.querySelector("#total-count");
const boardedCount = document.querySelector("#boarded-count");
const notBoardedCount = document.querySelector("#not-boarded-count");
const lockedNotice = document.querySelector("#locked-notice");
const refreshButton = document.querySelector("#refresh-button");
const saveButton = document.querySelector("#save-button");
const nextScheduleButton = document.querySelector("#next-schedule-button");
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

const CONTACT_ICONS = {
  phone: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.69 2.8a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.33 1.85.56 2.81.69A2 2 0 0 1 22 16.92Z"></path>
    </svg>
  `,
  message: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"></path>
      <path d="M8 10h8"></path>
      <path d="M8 14h5"></path>
    </svg>
  `,
};

let session = null;
let selectedSchedule = null;
let selectedVehicle = null;
let nextSchedule = null;
let attendanceRecords = [];
let isSaving = false;
let isLoading = false;
let isLocked = false;
let hasUnsavedChanges = false;

function getTodayDateValue() {
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  return today.toISOString().slice(0, 10);
}

function showMessage(text, type = "info") {
  saveMessage.textContent = text;
  saveMessage.dataset.type = type;
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

  scheduleTitle.textContent = `${selectedSchedule.startTime} · ${selectedSchedule.name}`;
  vehicleName.textContent = `${selectedVehicle.name} · ${session.user.accountId} 계정`;
  scheduleError.classList.add("hidden");
  attendanceSection.classList.remove("hidden");
}

function renderSummary() {
  const summary = getCurrentSummary();

  totalCount.textContent = `${summary.total}명`;
  boardedCount.textContent = `${summary.boarded}명`;
  notBoardedCount.textContent = `${summary.notBoarded}명`;
}

function renderCompletionButton() {
  if (isSaving) {
    saveButton.textContent = "저장 중...";
    return;
  }

  saveButton.classList.toggle("completion-button--edit", isLocked);
  saveButton.innerHTML = isLocked
    ? `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 20h9"></path>
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"></path>
      </svg>
      <span>수정하기</span>
    `
    : "탑승 완료";
}

function setSaving(saving) {
  isSaving = saving;
  confirmSaveButton.disabled = saving;
  refreshButton.disabled = saving;
  nextScheduleButton.disabled = saving || !nextSchedule;
  confirmSaveButton.textContent = saving ? "저장 중..." : "탑승 완료";
  renderCompletionButton();
  renderStudentList();
}

function setLocked(locked) {
  isLocked = locked;
  lockedNotice.classList.toggle("hidden", !locked);
  renderCompletionButton();
  renderStudentList();
}

function updateRecordStatus(studentId) {
  if (isSaving || isLocked) {
    return;
  }

  attendanceRecords = attendanceRecords.map((record) => {
    if (record.studentId !== studentId) {
      return record;
    }

    return {
      ...record,
      status: record.status === ATTENDANCE_STATUSES.boarded
        ? ATTENDANCE_STATUSES.notBoarded
        : ATTENDANCE_STATUSES.boarded,
    };
  });
  hasUnsavedChanges = true;
  renderStudentList();
  renderSummary();
  showMessage("탑승 상태가 변경되었습니다.", "info");
}

function createContactControl(record, type) {
  const hasPhoneNumber = Boolean(record.parentPhone);
  const label = type === "phone" ? "전화하기" : "문자하기";
  const control = document.createElement(hasPhoneNumber ? "a" : "button");

  control.className = "contact-button";
  control.innerHTML = CONTACT_ICONS[type];
  control.setAttribute("aria-label", `${record.studentName} 보호자에게 ${label}`);

  if (hasPhoneNumber) {
    control.href = `${type === "phone" ? "tel" : "sms"}:${record.parentPhone}`;
    control.title = `${record.studentName} 보호자 ${label}`;
  } else {
    control.type = "button";
    control.disabled = true;
    control.title = "보호자 연락처가 등록되지 않았습니다.";
  }

  return control;
}

function createStudentCard(record) {
  const card = document.createElement("article");
  card.className = `student-card student-card--${record.status}`;

  const header = document.createElement("div");
  header.className = "student-card__header";

  const identity = document.createElement("div");
  identity.className = "student-card__identity";

  const name = document.createElement("h3");
  name.textContent = record.studentName;
  name.title = record.studentName;
  identity.append(name);

  if (record.memo) {
    const memo = document.createElement("p");
    memo.className = "student-card__memo";
    memo.textContent = record.memo;
    memo.title = record.memo;
    identity.append(memo);
  }

  const contactActions = document.createElement("div");
  contactActions.className = "contact-actions";
  contactActions.append(
    createContactControl(record, "phone"),
    createContactControl(record, "message"),
  );

  const statusButton = document.createElement("button");
  statusButton.type = "button";
  statusButton.className = `status-button status-button--${record.status}`;
  statusButton.textContent = ATTENDANCE_STATUS_LABEL[record.status];
  statusButton.disabled = isSaving || isLocked;
  statusButton.setAttribute(
    "aria-pressed",
    String(record.status === ATTENDANCE_STATUSES.boarded),
  );
  statusButton.addEventListener("click", () => {
    updateRecordStatus(record.studentId);
  });

  header.append(identity, contactActions);
  card.append(header, statusButton);
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
  if (isSaving || isLocked) {
    return;
  }

  const summary = getCurrentSummary();

  saveDialogSummary.textContent = `${selectedSchedule.startTime} ${selectedSchedule.name} · 총 ${summary.total}명 중 탑승 ${summary.boarded}명, 미탑승 ${summary.notBoarded}명입니다.`;

  if (typeof saveDialog.showModal === "function") {
    saveDialog.showModal();
    return;
  }

  const shouldSave = window.confirm(`${saveDialogSummary.textContent}\n탑승 확인을 완료할까요?`);

  if (shouldSave) {
    handleSave();
  }
}

async function handleSave() {
  if (isSaving || isLocked) {
    return;
  }

  setSaving(true);
  showMessage("탑승 상태를 저장하는 중입니다.", "info");

  try {
    const result = await saveAttendance({
      date: getTodayDateValue(),
      vehicleId: selectedVehicle.id,
      scheduleId: selectedSchedule.id,
      records: attendanceRecords,
    });

    attendanceRecords = attendanceRecords.map((record) => ({
      ...record,
      lastSavedAt: result.savedAt,
    }));
    hasUnsavedChanges = false;
    isLocked = true;
    const savedTime = timeFormatter.format(new Date(result.savedAt));

    showMessage(`탑승 확인을 완료했습니다. · ${savedTime}`, "success");
  } catch {
    showMessage("저장에 실패했습니다. 잠시 후 다시 시도해주세요.", "error");
  } finally {
    setSaving(false);
    setLocked(isLocked);
  }
}

function findNextSchedule(schedules) {
  const currentIndex = schedules.findIndex((schedule) => schedule.id === scheduleId);

  return currentIndex >= 0 ? schedules[currentIndex + 1] || null : null;
}

function renderNextScheduleButton() {
  nextScheduleButton.disabled = isSaving || !nextSchedule;
  nextScheduleButton.title = nextSchedule
    ? `${nextSchedule.startTime} ${nextSchedule.name} 시간대로 이동`
    : "다음 시간표가 없습니다.";
}

function confirmDiscardChanges() {
  return !hasUnsavedChanges || window.confirm("저장하지 않은 변경사항이 있습니다. 계속할까요?");
}

async function loadSchedule({ isRefresh = false } = {}) {
  if (isLoading || !scheduleId) {
    return;
  }

  isLoading = true;
  refreshButton.disabled = true;
  refreshButton.classList.add("is-loading");

  if (isRefresh) {
    showMessage("시간표를 새로고침하는 중입니다.", "info");
  }

  try {
    const date = getTodayDateValue();
    const [data, scheduleData] = await Promise.all([
      getDriverScheduleStudents(scheduleId, date),
      getTodayDriverSchedules(date),
    ]);

    selectedSchedule = data.schedule;
    selectedVehicle = {
      id: session.user.vehicleId,
      name: session.user.vehicleName,
    };
    attendanceRecords = (data.students || []).map((student) => ({
      ...student,
      status: student.status === ATTENDANCE_STATUSES.boarded
        ? ATTENDANCE_STATUSES.boarded
        : ATTENDANCE_STATUSES.notBoarded,
    }));
    nextSchedule = findNextSchedule(scheduleData.schedules || []);
    hasUnsavedChanges = false;
    isLocked = attendanceRecords.length > 0 && attendanceRecords.every(
      (record) => Boolean(record.lastSavedAt),
    );

    renderScheduleHeader();
    renderSummary();
    renderNextScheduleButton();
    setLocked(isLocked);

    if (isRefresh) {
      showMessage("최신 탑승 상태를 불러왔습니다.", "success");
    }
  } catch {
    scheduleTitle.textContent = "시간대 정보를 불러오지 못했습니다";
    vehicleName.textContent = "";
    scheduleErrorTitle.textContent = "원생 명단을 불러오지 못했습니다";
    scheduleErrorMessage.textContent = "시간대 정보를 확인한 뒤 다시 시도해주세요.";
    scheduleError.classList.remove("hidden");
    attendanceSection.classList.add("hidden");
  } finally {
    isLoading = false;
    refreshButton.disabled = isSaving;
    refreshButton.classList.remove("is-loading");
  }
}

saveButton.addEventListener("click", () => {
  if (isSaving) {
    return;
  }

  if (isLocked) {
    hasUnsavedChanges = false;
    setLocked(false);
    showMessage("탑승 상태를 수정할 수 있습니다.", "info");
    return;
  }

  if (!selectedSchedule || !selectedVehicle) {
    showMessage("저장할 시간대 정보를 찾을 수 없습니다.", "error");
    return;
  }

  openSaveDialog();
});

refreshButton.addEventListener("click", () => {
  if (!confirmDiscardChanges()) {
    return;
  }

  loadSchedule({ isRefresh: true });
});

nextScheduleButton.addEventListener("click", () => {
  if (!nextSchedule || !confirmDiscardChanges()) {
    return;
  }

  window.location.href = `./?scheduleId=${encodeURIComponent(nextSchedule.id)}`;
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
  await loadSchedule();
}

initializeSchedule();
