import {
  createAdminStudent,
  deactivateAdminStudent,
  deleteAdminStudent,
  getAdminStudentSchedules,
  getAdminStudents,
  getAdminVehicles,
  updateAdminStudent,
  updateAdminStudentSchedules,
} from "../../services/adminApi.js?v=student-boarding-1";
import { ApiClientError } from "../../services/apiClient.js";
import { createTrashButton } from "./deleteAction.js?v=permanent-delete-1";
import { bindPlannedNavigation, requireAdminSession } from "./layout.js";

const studentTableBody = document.querySelector("#student-table-body");
const studentMessage = document.querySelector("#student-message");
const searchInput = document.querySelector("#student-search");
const addButton = document.querySelector("#add-student-button");
const dialog = document.querySelector("#student-dialog");
const form = document.querySelector("#student-form");
const dialogTitle = document.querySelector("#student-dialog-title");
const studentIdInput = document.querySelector("#student-id");
const studentNameInput = document.querySelector("#student-name");
const pickupPlaceInput = document.querySelector("#pickup-place");
const memoInput = document.querySelector("#student-memo");
const memoCount = document.querySelector("#memo-count");
const parentNameInput = document.querySelector("#parent-name");
const parentPhoneInput = document.querySelector("#parent-phone");
const isActiveInput = document.querySelector("#is-active");
const cancelButton = document.querySelector("#cancel-student-button");
const saveButton = document.querySelector("#save-student-button");
const deactivateDialog = document.querySelector("#deactivate-dialog");
const deactivateMessage = document.querySelector("#deactivate-message");
const cancelDeactivateButton = document.querySelector("#cancel-deactivate-button");
const confirmDeactivateButton = document.querySelector("#confirm-deactivate-button");
const deleteDialog = document.querySelector("#student-delete-dialog");
const deleteMessage = document.querySelector("#student-delete-message");
const cancelDeleteButton = document.querySelector("#cancel-student-delete-button");
const confirmDeleteButton = document.querySelector("#confirm-student-delete-button");
const boardingDialog = document.querySelector("#boarding-dialog");
const boardingForm = document.querySelector("#boarding-form");
const boardingDialogTitle = document.querySelector("#boarding-dialog-title");
const closeBoardingButton = document.querySelector("#close-boarding-button");
const cancelBoardingButton = document.querySelector("#cancel-boarding-button");
const saveBoardingButton = document.querySelector("#save-boarding-button");
const boardingDialogMessage = document.querySelector("#boarding-dialog-message");
const currentBoardingList = document.querySelector("#current-boarding-list");
const boardingSelectedCount = document.querySelector("#boarding-selected-count");
const boardingWeekdayButtons = document.querySelector("#boarding-weekday-buttons");
const boardingVehicleButtons = document.querySelector("#boarding-vehicle-buttons");
const boardingScheduleList = document.querySelector("#boarding-schedule-list");

let students = [];
let isSaving = false;
let pendingDeactivateStudent = null;
let pendingDeleteStudent = null;
let selectedBoardingStudent = null;
let boardingSchedules = [];
let boardingVehicles = [];
let selectedBoardingScheduleIds = new Set();
let selectedBoardingDay = getTodayDayOfWeek();
let selectedBoardingVehicleId = "";
let focusedBoardingScheduleId = "";
let isBoardingSaving = false;
const STUDENT_MEMO_MAX_LENGTH = 20;
const WEEKDAYS = [
  { value: "monday", label: "월" },
  { value: "tuesday", label: "화" },
  { value: "wednesday", label: "수" },
  { value: "thursday", label: "목" },
  { value: "friday", label: "금" },
  { value: "saturday", label: "토" },
  { value: "sunday", label: "일" },
];

function getTodayDayOfWeek() {
  return [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ][new Date().getDay()];
}

function getDayLabel(dayOfWeek) {
  return WEEKDAYS.find((weekday) => weekday.value === dayOfWeek)?.label || "";
}

function setMessage(text, type = "info") {
  studentMessage.textContent = text;
  studentMessage.dataset.type = type;
}

function getVisibleStudents() {
  const keyword = searchInput.value.trim().toLowerCase();

  if (!keyword) {
    return students;
  }

  return students.filter((student) =>
    student.studentName.toLowerCase().includes(keyword),
  );
}

function getContactLabel(student) {
  if (student.parentContactStatus !== "registered") {
    return "연락처 입력";
  }

  return [student.parentName, student.parentContactMasked]
    .filter(Boolean)
    .join(" · ");
}

function renderStatusBadge(student) {
  const badge = document.createElement("span");
  badge.className = student.isActive ? "badge badge--success" : "badge";
  badge.textContent = student.isActive ? "이용 중" : "미이용";
  return badge;
}

function updateMemoCount() {
  const characters = Array.from(memoInput.value);

  if (characters.length > STUDENT_MEMO_MAX_LENGTH) {
    memoInput.value = characters.slice(0, STUDENT_MEMO_MAX_LENGTH).join("");
  }

  memoCount.textContent = `${Array.from(memoInput.value).length}/${STUDENT_MEMO_MAX_LENGTH}자`;
}

function getPhoneDigits(value) {
  return String(value || "").replace(/[^0-9]/g, "").slice(0, 11);
}

function formatPhoneNumber(value) {
  const digits = getPhoneDigits(value);

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function updateParentPhoneFormat() {
  parentPhoneInput.value = formatPhoneNumber(parentPhoneInput.value);
}

function renderStudents() {
  const visibleStudents = getVisibleStudents();
  studentTableBody.replaceChildren();

  if (visibleStudents.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.className = "table-empty";
    cell.textContent = students.length === 0
      ? "등록된 원생이 없습니다."
      : "검색 결과가 없습니다.";
    row.append(cell);
    studentTableBody.append(row);
    return;
  }

  visibleStudents.forEach((student) => {
    const row = document.createElement("tr");
    row.className = student.isActive ? "" : "is-inactive";

    const nameCell = document.createElement("td");
    const nameContent = document.createElement("div");
    const studentName = document.createElement("strong");

    nameContent.className = "student-name-cell";
    studentName.textContent = student.studentName;
    nameContent.append(studentName);

    if (student.memo) {
      const memo = document.createElement("span");
      memo.textContent = student.memo;
      memo.title = student.memo;
      nameContent.append(memo);
    }

    nameCell.append(nameContent);

    const pickupCell = document.createElement("td");
    const boardingSummary = document.createElement("div");
    const pickupPlace = document.createElement("strong");
    const boardingButton = document.createElement("button");

    boardingSummary.className = "boarding-summary";
    pickupPlace.textContent = student.pickupPlace;
    boardingButton.type = "button";
    boardingButton.className = "boarding-manage-button";
    boardingButton.textContent = student.assignedScheduleCount > 0
      ? `시간표 ${student.assignedScheduleCount}개 · 관리`
      : "미배정 · 관리";
    boardingButton.setAttribute(
      "aria-label",
      `${student.studentName} 원생 탑승 정보 관리`,
    );
    boardingButton.addEventListener("click", () => openBoardingDialog(student));
    boardingSummary.append(pickupPlace, boardingButton);
    pickupCell.append(boardingSummary);

    const contactCell = document.createElement("td");
    const contactSummary = document.createElement("div");
    const contactStatus = document.createElement("span");
    const contactEditButton = document.createElement("button");
    const hasContact = student.parentContactStatus === "registered";

    contactSummary.className = "contact-summary";
    contactStatus.className = hasContact ? "badge badge--success" : "badge";
    contactStatus.textContent = hasContact ? "등록됨" : "미등록";
    contactEditButton.type = "button";
    contactEditButton.className = "contact-edit-button";
    contactEditButton.textContent = getContactLabel(student);
    contactEditButton.setAttribute(
      "aria-label",
      `${student.studentName} 원생 보호자 연락처 ${hasContact ? "수정" : "입력"}`,
    );
    contactEditButton.addEventListener("click", () => {
      openStudentDialog(student, { focusContact: true });
    });
    contactSummary.append(contactStatus, contactEditButton);
    contactCell.append(contactSummary);

    const statusCell = document.createElement("td");
    statusCell.append(renderStatusBadge(student));

    const actionCell = document.createElement("td");
    actionCell.className = "table-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "ghost-button";
    editButton.textContent = "수정";
    editButton.addEventListener("click", () => {
      openStudentDialog(student);
    });

    const deactivateButton = document.createElement("button");
    deactivateButton.type = "button";
    deactivateButton.className = "danger-button";
    deactivateButton.textContent = "미이용";
    deactivateButton.disabled = !student.isActive;
    deactivateButton.addEventListener("click", () => {
      handleDeactivate(student);
    });

    const deleteButton = createTrashButton({
      label: `${student.studentName} 원생 영구 삭제`,
      onClick: () => openDeleteDialog(student),
    });

    actionCell.append(editButton, deactivateButton, deleteButton);
    row.append(nameCell, pickupCell, contactCell, statusCell, actionCell);
    studentTableBody.append(row);
  });
}

function openStudentDialog(student = null, { focusContact = false } = {}) {
  form.reset();
  studentIdInput.value = student?.studentId || "";
  studentNameInput.value = student?.studentName || "";
  pickupPlaceInput.value = student?.pickupPlace || "";
  memoInput.value = student?.memo || "";
  parentNameInput.value = student?.parentName || "";
  parentPhoneInput.value = formatPhoneNumber(student?.parentPhone || "");
  isActiveInput.checked = student ? student.isActive : true;
  dialogTitle.textContent = student ? "원생 정보 수정" : "원생 추가";
  saveButton.textContent = student ? "수정 저장" : "원생 추가";
  updateMemoCount();
  dialog.showModal();
  (focusContact ? parentPhoneInput : studentNameInput).focus();
}

function closeStudentDialog() {
  dialog.close();
}

function getFormValues() {
  const parentPhone = getPhoneDigits(parentPhoneInput.value);

  return {
    studentId: studentIdInput.value,
    studentName: studentNameInput.value.trim(),
    pickupPlace: pickupPlaceInput.value.trim(),
    memo: memoInput.value.trim(),
    parentName: parentNameInput.value.trim(),
    parentPhone,
    isActive: isActiveInput.checked,
  };
}

function validateForm(values) {
  if (!values.studentName) {
    setMessage("원생 이름을 입력해주세요.", "error");
    studentNameInput.focus();
    return false;
  }

  if (!values.pickupPlace) {
    setMessage("탑승 장소를 입력해주세요.", "error");
    pickupPlaceInput.focus();
    return false;
  }

  if (values.parentPhone && !/^\d{11}$/.test(values.parentPhone)) {
    setMessage("보호자 연락처를 000-0000-0000 형식으로 입력해주세요.", "error");
    parentPhoneInput.focus();
    return false;
  }

  if (Array.from(values.memo).length > STUDENT_MEMO_MAX_LENGTH) {
    setMessage(`원생 메모는 ${STUDENT_MEMO_MAX_LENGTH}자 이내로 입력해주세요.`, "error");
    memoInput.focus();
    return false;
  }

  return true;
}

function setSaving(nextIsSaving) {
  isSaving = nextIsSaving;
  saveButton.disabled = nextIsSaving;
  addButton.disabled = nextIsSaving;
}

async function loadStudents() {
  setMessage("원생 목록을 불러오는 중입니다.", "info");

  try {
    const data = await getAdminStudents();
    students = data.students || [];
    renderStudents();
    setMessage(`원생 ${students.length}명을 불러왔습니다.`, "success");
  } catch (error) {
    students = [];
    renderStudents();
    setMessage(
      error instanceof ApiClientError
        ? error.message
        : "원생 목록을 불러오지 못했습니다.",
      "error",
    );
  }
}

async function handleSave(event) {
  event.preventDefault();

  if (isSaving) {
    return;
  }

  const values = getFormValues();

  if (!validateForm(values)) {
    return;
  }

  setSaving(true);
  setMessage("원생 정보를 저장하는 중입니다.", "info");

  try {
    if (values.studentId) {
      await updateAdminStudent(values);
    } else {
      await createAdminStudent(values);
    }

    closeStudentDialog();
    setMessage("원생 정보가 저장되었습니다.", "success");
    await loadStudents();
  } catch (error) {
    setMessage(
      error instanceof ApiClientError
        ? error.message
        : "원생 정보를 저장하지 못했습니다.",
      "error",
    );
  } finally {
    setSaving(false);
  }
}

function setBoardingMessage(text, type = "info") {
  boardingDialogMessage.textContent = text;
  boardingDialogMessage.dataset.type = type;
}

function getSelectedBoardingSchedules() {
  return boardingSchedules.filter((schedule) =>
    selectedBoardingScheduleIds.has(schedule.scheduleId),
  );
}

function renderCurrentBoardingList() {
  const selectedSchedules = getSelectedBoardingSchedules();
  currentBoardingList.replaceChildren();
  boardingSelectedCount.textContent = `${selectedSchedules.length}개 시간표`;

  if (selectedSchedules.length === 0) {
    const empty = document.createElement("div");
    empty.className = "boarding-empty";
    empty.textContent = "현재 배정된 차량과 시간표가 없습니다.";
    currentBoardingList.append(empty);
    return;
  }

  selectedSchedules.forEach((schedule) => {
    const button = document.createElement("button");
    const time = document.createElement("span");
    const vehicle = document.createElement("strong");
    const place = document.createElement("span");
    const hint = document.createElement("span");

    button.type = "button";
    button.className = "current-boarding-card";
    button.setAttribute(
      "aria-label",
      `${getDayLabel(schedule.dayOfWeek)}요일 ${schedule.startTime} ${schedule.vehicleName} 시간표로 이동`,
    );
    time.className = "current-boarding-card__time";
    time.textContent = `${getDayLabel(schedule.dayOfWeek)}요일 · ${schedule.startTime} ${schedule.name}`;
    vehicle.textContent = schedule.vehicleName;
    place.textContent = `탑승장소 · ${schedule.pickupPlace}`;
    hint.className = "current-boarding-card__hint";
    hint.textContent = "이 시간표 보기 →";
    button.append(time, vehicle, place, hint);
    button.addEventListener("click", () => moveToBoardingSchedule(schedule));
    currentBoardingList.append(button);
  });
}

function renderBoardingWeekdayButtons() {
  boardingWeekdayButtons.replaceChildren();

  WEEKDAYS.forEach((weekday) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = weekday.value === selectedBoardingDay
      ? "selector-button selector-button--selected"
      : "selector-button";
    button.textContent = weekday.label;
    button.setAttribute("aria-pressed", String(weekday.value === selectedBoardingDay));
    button.addEventListener("click", () => {
      selectedBoardingDay = weekday.value;
      focusedBoardingScheduleId = "";
      renderBoardingWeekdayButtons();
      renderBoardingScheduleList();
    });
    boardingWeekdayButtons.append(button);
  });
}

function renderBoardingVehicleButtons() {
  boardingVehicleButtons.replaceChildren();

  if (boardingVehicles.length === 0) {
    const empty = document.createElement("span");
    empty.className = "selector-empty";
    empty.textContent = "등록된 차량이 없습니다.";
    boardingVehicleButtons.append(empty);
    return;
  }

  boardingVehicles.forEach((vehicle) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = vehicle.vehicleId === selectedBoardingVehicleId
      ? "selector-button selector-button--selected"
      : "selector-button";
    button.textContent = vehicle.isActive
      ? vehicle.vehicleName
      : `${vehicle.vehicleName} · 비활성`;
    button.setAttribute(
      "aria-pressed",
      String(vehicle.vehicleId === selectedBoardingVehicleId),
    );
    button.addEventListener("click", () => {
      selectedBoardingVehicleId = vehicle.vehicleId;
      focusedBoardingScheduleId = "";
      renderBoardingVehicleButtons();
      renderBoardingScheduleList();
    });
    boardingVehicleButtons.append(button);
  });
}

function renderBoardingScheduleList() {
  const visibleSchedules = boardingSchedules.filter((schedule) =>
    schedule.dayOfWeek === selectedBoardingDay
      && schedule.vehicleId === selectedBoardingVehicleId,
  );
  boardingScheduleList.replaceChildren();

  if (!selectedBoardingVehicleId || visibleSchedules.length === 0) {
    const empty = document.createElement("div");
    empty.className = "boarding-empty";
    empty.textContent = selectedBoardingVehicleId
      ? "선택한 요일과 차량에 등록된 시간표가 없습니다."
      : "차량을 먼저 선택해주세요.";
    boardingScheduleList.append(empty);
    return;
  }

  visibleSchedules.forEach((schedule) => {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    const detail = document.createElement("span");
    const title = document.createElement("strong");
    const place = document.createElement("span");
    const status = document.createElement("span");
    const isSelected = selectedBoardingScheduleIds.has(schedule.scheduleId);

    label.className = isSelected
      ? "boarding-schedule-item is-selected"
      : "boarding-schedule-item";
    label.dataset.scheduleId = schedule.scheduleId;

    if (schedule.scheduleId === focusedBoardingScheduleId) {
      label.classList.add("is-focused");
    }

    checkbox.type = "checkbox";
    checkbox.checked = isSelected;
    checkbox.value = schedule.scheduleId;
    checkbox.setAttribute(
      "aria-label",
      `${schedule.startTime} ${schedule.name} 시간표 포함`,
    );
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        selectedBoardingScheduleIds.add(schedule.scheduleId);
        label.classList.add("is-selected");
      } else {
        selectedBoardingScheduleIds.delete(schedule.scheduleId);
        label.classList.remove("is-selected");
      }

      renderCurrentBoardingList();
    });

    detail.className = "boarding-schedule-item__detail";
    title.textContent = `${schedule.startTime} · ${schedule.name}`;
    place.textContent = `탑승장소 · ${schedule.pickupPlace}`;
    status.className = schedule.scheduleIsActive
      ? "badge badge--success"
      : "badge";
    status.textContent = schedule.scheduleIsActive ? "활성" : "비활성";
    detail.append(title, place);
    label.append(checkbox, detail, status);
    boardingScheduleList.append(label);
  });
}

function moveToBoardingSchedule(schedule) {
  selectedBoardingDay = schedule.dayOfWeek;
  selectedBoardingVehicleId = schedule.vehicleId;
  focusedBoardingScheduleId = schedule.scheduleId;
  renderBoardingWeekdayButtons();
  renderBoardingVehicleButtons();
  renderBoardingScheduleList();

  requestAnimationFrame(() => {
    const target = Array.from(
      boardingScheduleList.querySelectorAll("[data-schedule-id]"),
    ).find((item) => item.dataset.scheduleId === schedule.scheduleId);
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    target?.querySelector("input")?.focus();
  });
}

async function openBoardingDialog(student) {
  selectedBoardingStudent = student;
  boardingSchedules = [];
  boardingVehicles = [];
  selectedBoardingScheduleIds = new Set();
  selectedBoardingDay = getTodayDayOfWeek();
  selectedBoardingVehicleId = "";
  focusedBoardingScheduleId = "";
  boardingDialogTitle.textContent = `${student.studentName} 탑승 정보 관리`;
  currentBoardingList.replaceChildren();
  boardingWeekdayButtons.replaceChildren();
  boardingVehicleButtons.replaceChildren();
  boardingScheduleList.replaceChildren();
  boardingSelectedCount.textContent = "";
  saveBoardingButton.disabled = true;
  setBoardingMessage("탑승 정보를 불러오는 중입니다.", "info");
  boardingDialog.showModal();

  try {
    const [assignmentData, vehicleData] = await Promise.all([
      getAdminStudentSchedules(student.studentId),
      getAdminVehicles(),
    ]);
    boardingSchedules = assignmentData.schedules || [];
    boardingVehicles = vehicleData.vehicles || [];
    selectedBoardingScheduleIds = new Set(
      boardingSchedules
        .filter((schedule) => schedule.isAssigned)
        .map((schedule) => schedule.scheduleId),
    );

    const todayAssignedSchedule = boardingSchedules.find((schedule) =>
      schedule.dayOfWeek === selectedBoardingDay && schedule.isAssigned,
    );
    const todaySchedule = boardingSchedules.find((schedule) =>
      schedule.dayOfWeek === selectedBoardingDay,
    );
    selectedBoardingVehicleId = todayAssignedSchedule?.vehicleId
      || todaySchedule?.vehicleId
      || boardingVehicles.find((vehicle) => vehicle.isActive)?.vehicleId
      || boardingVehicles[0]?.vehicleId
      || "";

    renderCurrentBoardingList();
    renderBoardingWeekdayButtons();
    renderBoardingVehicleButtons();
    renderBoardingScheduleList();
    setBoardingMessage("체크 상태를 변경한 뒤 저장해주세요.", "info");
    saveBoardingButton.disabled = false;
  } catch (error) {
    setBoardingMessage(
      error instanceof ApiClientError
        ? error.message
        : "탑승 정보를 불러오지 못했습니다.",
      "error",
    );
  }
}

function closeBoardingDialog() {
  if (isBoardingSaving) {
    return;
  }

  selectedBoardingStudent = null;
  boardingDialog.close();
}

async function handleBoardingSave(event) {
  event.preventDefault();

  if (!selectedBoardingStudent || isBoardingSaving) {
    return;
  }

  const student = selectedBoardingStudent;
  isBoardingSaving = true;
  saveBoardingButton.disabled = true;
  closeBoardingButton.disabled = true;
  cancelBoardingButton.disabled = true;
  setBoardingMessage("탑승 정보를 저장하는 중입니다.", "info");

  try {
    await updateAdminStudentSchedules({
      studentId: student.studentId,
      scheduleIds: Array.from(selectedBoardingScheduleIds),
    });
    selectedBoardingStudent = null;
    boardingDialog.close();
    await loadStudents();
    setMessage(`${student.studentName} 원생의 탑승 정보를 저장했습니다.`, "success");
  } catch (error) {
    setBoardingMessage(
      error instanceof ApiClientError
        ? error.message
        : "탑승 정보를 저장하지 못했습니다.",
      "error",
    );
  } finally {
    isBoardingSaving = false;
    saveBoardingButton.disabled = false;
    closeBoardingButton.disabled = false;
    cancelBoardingButton.disabled = false;
  }
}

async function handleDeactivate(student) {
  if (!student.isActive) {
    return;
  }

  pendingDeactivateStudent = student;
  deactivateMessage.textContent = `${student.studentName} 원생을 출결 대상에서 제외하고 미이용 상태로 변경할까요? 원생 정보는 삭제되지 않습니다.`;
  deactivateDialog.showModal();
}

async function confirmDeactivate() {
  if (!pendingDeactivateStudent) {
    return;
  }

  const student = pendingDeactivateStudent;
  confirmDeactivateButton.disabled = true;
  setMessage("원생을 미이용으로 변경하는 중입니다.", "info");

  try {
    await deactivateAdminStudent(student.studentId);
    setMessage("원생을 미이용으로 변경했습니다.", "success");
    await loadStudents();
  } catch (error) {
    setMessage(
      error instanceof ApiClientError
        ? error.message
        : "작업에 실패했습니다. 잠시 후 다시 시도해주세요.",
      "error",
    );
  } finally {
    confirmDeactivateButton.disabled = false;
    pendingDeactivateStudent = null;
    deactivateDialog.close();
  }
}

function openDeleteDialog(student) {
  pendingDeleteStudent = student;
  deleteMessage.textContent = `${student.studentName} 원생을 영구 삭제할까요? 시간표 배정, 출결 기록, 문자 기록도 함께 삭제되며 복구할 수 없습니다.`;
  deleteDialog.showModal();
}

async function confirmDelete() {
  if (!pendingDeleteStudent) {
    return;
  }

  const student = pendingDeleteStudent;
  confirmDeleteButton.disabled = true;
  setMessage("원생과 연결 기록을 삭제하는 중입니다.", "info");

  try {
    await deleteAdminStudent(student.studentId);
    setMessage(`${student.studentName} 원생을 영구 삭제했습니다.`, "success");
    await loadStudents();
  } catch (error) {
    setMessage(
      error instanceof ApiClientError
        ? error.message
        : "원생을 삭제하지 못했습니다.",
      "error",
    );
  } finally {
    confirmDeleteButton.disabled = false;
    pendingDeleteStudent = null;
    deleteDialog.close();
  }
}

async function initializeStudents() {
  const session = await requireAdminSession();

  if (!session) {
    return;
  }

  bindPlannedNavigation();
  addButton.addEventListener("click", () => openStudentDialog());
  cancelButton.addEventListener("click", closeStudentDialog);
  cancelDeactivateButton.addEventListener("click", () => {
    pendingDeactivateStudent = null;
    deactivateDialog.close();
  });
  confirmDeactivateButton.addEventListener("click", confirmDeactivate);
  cancelDeleteButton.addEventListener("click", () => {
    pendingDeleteStudent = null;
    deleteDialog.close();
  });
  confirmDeleteButton.addEventListener("click", confirmDelete);
  closeBoardingButton.addEventListener("click", closeBoardingDialog);
  cancelBoardingButton.addEventListener("click", closeBoardingDialog);
  boardingForm.addEventListener("submit", handleBoardingSave);
  form.addEventListener("submit", handleSave);
  memoInput.addEventListener("input", updateMemoCount);
  parentPhoneInput.addEventListener("input", updateParentPhoneFormat);
  searchInput.addEventListener("input", renderStudents);

  await loadStudents();
}

initializeStudents();
