import {
  createAdminSchedule,
  deactivateAdminSchedule,
  getAdminScheduleStudents,
  getAdminSchedules,
  getAdminVehicles,
  updateAdminSchedule,
  updateAdminScheduleStudents,
} from "../../services/adminApi.js";
import { ApiClientError } from "../../services/apiClient.js";
import { bindPlannedNavigation, requireAdminSession } from "./layout.js";

const scheduleTableBody = document.querySelector("#schedule-table-body");
const scheduleMessage = document.querySelector("#schedule-message");
const addButton = document.querySelector("#add-schedule-button");
const weekdayButtons = document.querySelector("#weekday-buttons");
const vehicleButtons = document.querySelector("#vehicle-buttons");
const dialog = document.querySelector("#schedule-dialog");
const form = document.querySelector("#schedule-form");
const dialogTitle = document.querySelector("#schedule-dialog-title");
const scheduleIdInput = document.querySelector("#schedule-id");
const scheduleContext = document.querySelector("#schedule-context");
const vehicleSelect = document.querySelector("#schedule-vehicle");
const scheduleNameInput = document.querySelector("#schedule-name");
const startTimeInput = document.querySelector("#schedule-start-time");
const isActiveInput = document.querySelector("#schedule-is-active");
const cancelButton = document.querySelector("#cancel-schedule-button");
const saveButton = document.querySelector("#save-schedule-button");
const assignmentDialog = document.querySelector("#assignment-dialog");
const assignmentForm = document.querySelector("#assignment-form");
const assignmentTitle = document.querySelector("#assignment-dialog-title");
const assignmentList = document.querySelector("#assignment-list");
const cancelAssignmentButton = document.querySelector("#cancel-assignment-button");
const saveAssignmentButton = document.querySelector("#save-assignment-button");
const deactivateDialog = document.querySelector("#schedule-deactivate-dialog");
const deactivateMessage = document.querySelector("#schedule-deactivate-message");
const cancelDeactivateButton = document.querySelector("#cancel-schedule-deactivate-button");
const confirmDeactivateButton = document.querySelector("#confirm-schedule-deactivate-button");

let schedules = [];
let vehicles = [];
let selectedDayOfWeek = getTodayDayOfWeek();
let selectedVehicleId = "";
let selectedAssignmentSchedule = null;
let pendingDeactivateSchedule = null;
let isSaving = false;

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
  const values = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];

  return values[new Date().getDay()];
}

function getDayLabel(dayOfWeek) {
  return WEEKDAYS.find((weekday) => weekday.value === dayOfWeek)?.label || "";
}

function getSelectedVehicle() {
  return vehicles.find((vehicle) => vehicle.vehicleId === selectedVehicleId) || null;
}

function setMessage(text, type = "info") {
  scheduleMessage.textContent = text;
  scheduleMessage.dataset.type = type;
}

function renderStatusBadge(item) {
  const badge = document.createElement("span");
  badge.className = item.isActive ? "badge badge--success" : "badge";
  badge.textContent = item.isActive ? "활성" : "비활성";
  return badge;
}

function renderVehicleOptions(selectedVehicleId = "") {
  vehicleSelect.replaceChildren();

  const vehicle = vehicles.find((item) => item.vehicleId === selectedVehicleId);

  if (!vehicle) {
    return;
  }

  const option = document.createElement("option");
  option.value = vehicle.vehicleId;
  option.textContent = vehicle.vehicleName;
  option.selected = true;
  vehicleSelect.append(option);
}

function renderWeekdayButtons() {
  weekdayButtons.replaceChildren();

  WEEKDAYS.forEach((weekday) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "selector-button";
    button.textContent = weekday.label;
    button.setAttribute("aria-pressed", String(weekday.value === selectedDayOfWeek));
    button.addEventListener("click", async () => {
      selectedDayOfWeek = weekday.value;
      renderWeekdayButtons();
      await loadSchedules();
    });
    weekdayButtons.append(button);
  });
}

function renderVehicleButtons() {
  vehicleButtons.replaceChildren();

  const activeVehicles = vehicles.filter((vehicle) => vehicle.isActive);

  if (activeVehicles.length === 0) {
    const empty = document.createElement("span");
    empty.className = "selector-empty";
    empty.textContent = "선택할 수 있는 활성 차량이 없습니다.";
    vehicleButtons.append(empty);
    return;
  }

  activeVehicles.forEach((vehicle) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "selector-button";
    button.textContent = vehicle.vehicleName;
    button.setAttribute("aria-pressed", String(vehicle.vehicleId === selectedVehicleId));
    button.addEventListener("click", async () => {
      selectedVehicleId = vehicle.vehicleId;
      renderVehicleButtons();
      await loadSchedules();
    });
    vehicleButtons.append(button);
  });
}

function renderSchedules() {
  scheduleTableBody.replaceChildren();

  if (schedules.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.className = "table-empty";
    cell.textContent = selectedVehicleId
      ? "선택한 요일과 차량에 등록된 시간표가 없습니다."
      : "활성 차량을 먼저 등록해주세요.";
    row.append(cell);
    scheduleTableBody.append(row);
    return;
  }

  schedules.forEach((schedule) => {
    const row = document.createElement("tr");
    row.className = schedule.isActive ? "" : "is-inactive";

    const vehicleCell = document.createElement("td");
    vehicleCell.textContent = schedule.vehicleName;

    const nameCell = document.createElement("td");
    nameCell.textContent = schedule.name;

    const startTimeCell = document.createElement("td");
    startTimeCell.textContent = schedule.startTime;

    const countCell = document.createElement("td");
    countCell.textContent = `${schedule.assignedStudentCount}명`;

    const statusCell = document.createElement("td");
    statusCell.append(renderStatusBadge(schedule));

    const actionCell = document.createElement("td");
    actionCell.className = "table-actions";

    const assignmentButton = document.createElement("button");
    assignmentButton.type = "button";
    assignmentButton.className = "ghost-button";
    assignmentButton.textContent = "원생 배정";
    assignmentButton.addEventListener("click", () => openAssignmentDialog(schedule));

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "ghost-button";
    editButton.textContent = "수정";
    editButton.addEventListener("click", () => openScheduleDialog(schedule));

    const deactivateButton = document.createElement("button");
    deactivateButton.type = "button";
    deactivateButton.className = "danger-button";
    deactivateButton.textContent = "비활성화";
    deactivateButton.disabled = !schedule.isActive;
    deactivateButton.addEventListener("click", () => openDeactivateDialog(schedule));

    actionCell.append(assignmentButton, editButton, deactivateButton);
    row.append(vehicleCell, nameCell, startTimeCell, countCell, statusCell, actionCell);
    scheduleTableBody.append(row);
  });
}

function openScheduleDialog(schedule = null) {
  if (!selectedVehicleId) {
    setMessage("활성 차량이 없어 시간표를 추가할 수 없습니다.", "error");
    return;
  }

  form.reset();
  scheduleIdInput.value = schedule?.scheduleId || "";
  const vehicleId = schedule?.vehicleId || selectedVehicleId;
  renderVehicleOptions(vehicleId);
  const vehicle = vehicles.find((item) => item.vehicleId === vehicleId);
  scheduleNameInput.value = schedule?.name || "등원";
  startTimeInput.value = schedule?.startTime || "";
  isActiveInput.checked = schedule ? schedule.isActive : true;
  scheduleContext.textContent =
    `${getDayLabel(schedule?.dayOfWeek || selectedDayOfWeek)}요일 · ${vehicle?.vehicleName || "선택 차량"}`;
  dialogTitle.textContent = schedule ? "시간표 정보 수정" : "시간표 추가";
  saveButton.textContent = schedule ? "수정 저장" : "시간표 추가";
  dialog.showModal();
  scheduleNameInput.focus();
}

function closeScheduleDialog() {
  dialog.close();
}

function getFormValues() {
  return {
    scheduleId: scheduleIdInput.value,
    vehicleId: vehicleSelect.value,
    dayOfWeek: scheduleIdInput.value
      ? schedules.find((schedule) => schedule.scheduleId === scheduleIdInput.value)?.dayOfWeek
      : selectedDayOfWeek,
    scheduleName: scheduleNameInput.value.trim(),
    startTime: startTimeInput.value,
    isActive: isActiveInput.checked,
  };
}

function validateForm(values) {
  if (!values.vehicleId) {
    setMessage("차량을 선택해주세요.", "error");
    vehicleSelect.focus();
    return false;
  }

  if (!values.scheduleName) {
    setMessage("시간대 이름을 입력해주세요.", "error");
    scheduleNameInput.focus();
    return false;
  }

  if (!values.startTime) {
    setMessage("시작 시간을 올바르게 입력해주세요.", "error");
    startTimeInput.focus();
    return false;
  }

  return true;
}

function setSaving(nextIsSaving) {
  isSaving = nextIsSaving;
  saveButton.disabled = nextIsSaving;
  addButton.disabled = nextIsSaving;
}

async function loadBaseData() {
  setMessage("시간표 정보를 불러오는 중입니다.", "info");

  try {
    const vehicleData = await getAdminVehicles();
    vehicles = vehicleData.vehicles || [];
    const activeVehicles = vehicles.filter((vehicle) => vehicle.isActive);
    selectedVehicleId = activeVehicles[0]?.vehicleId || "";
    renderWeekdayButtons();
    renderVehicleButtons();
    await loadSchedules();
  } catch (error) {
    vehicles = [];
    schedules = [];
    renderSchedules();
    setMessage(
      error instanceof ApiClientError
        ? error.message
        : "시간표 정보를 불러오지 못했습니다.",
      "error",
    );
  }
}

async function loadSchedules() {
  renderWeekdayButtons();
  renderVehicleButtons();

  if (!selectedVehicleId) {
    schedules = [];
    addButton.disabled = true;
    renderSchedules();
    setMessage("선택할 수 있는 활성 차량이 없습니다.", "info");
    return;
  }

  addButton.disabled = false;
  setMessage("시간표 정보를 불러오는 중입니다.", "info");

  try {
    const scheduleData = await getAdminSchedules({
      dayOfWeek: selectedDayOfWeek,
      vehicleId: selectedVehicleId,
    });
    schedules = scheduleData.schedules || [];
    renderSchedules();
    setMessage(
      `${getDayLabel(selectedDayOfWeek)}요일 ${getSelectedVehicle()?.vehicleName || ""} 시간표 ${schedules.length}개를 불러왔습니다.`,
      "success",
    );
  } catch (error) {
    schedules = [];
    renderSchedules();
    setMessage(
      error instanceof ApiClientError
        ? error.message
        : "시간표 정보를 불러오지 못했습니다.",
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
  setMessage("시간표 정보를 저장하는 중입니다.", "info");

  try {
    if (values.scheduleId) {
      await updateAdminSchedule(values);
    } else {
      await createAdminSchedule(values);
    }

    closeScheduleDialog();
    setMessage("시간표 정보를 저장했습니다.", "success");
    await loadSchedules();
  } catch (error) {
    setMessage(
      error instanceof ApiClientError
        ? error.message
        : "시간표 정보를 저장하지 못했습니다.",
      "error",
    );
  } finally {
    setSaving(false);
  }
}

async function openAssignmentDialog(schedule) {
  selectedAssignmentSchedule = schedule;
  assignmentTitle.textContent = `${schedule.vehicleName} ${schedule.startTime} 원생 배정`;
  assignmentList.replaceChildren();
  assignmentDialog.showModal();

  try {
    const data = await getAdminScheduleStudents(schedule.scheduleId);
    const students = data.students || [];

    if (students.length === 0) {
      const empty = document.createElement("div");
      empty.className = "table-empty";
      empty.textContent = "활성 원생이 없습니다.";
      assignmentList.append(empty);
      return;
    }

    students.forEach((student) => {
      const label = document.createElement("label");
      label.className = "assignment-item";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = student.studentId;
      checkbox.checked = student.isAssigned;

      const detail = document.createElement("span");
      const name = document.createElement("strong");
      name.textContent = student.studentName;
      const place = document.createElement("span");
      place.textContent = student.pickupPlace;

      detail.append(name, place);
      label.append(checkbox, detail);
      assignmentList.append(label);
    });
  } catch (error) {
    assignmentList.replaceChildren();
    const empty = document.createElement("div");
    empty.className = "table-empty";
    empty.textContent = error instanceof ApiClientError
      ? error.message
      : "원생 배정을 불러오지 못했습니다.";
    assignmentList.append(empty);
  }
}

async function handleAssignmentSave(event) {
  event.preventDefault();

  if (!selectedAssignmentSchedule) {
    return;
  }

  const studentIds = Array.from(
    assignmentList.querySelectorAll("input[type='checkbox']:checked"),
  ).map((checkbox) => checkbox.value);

  saveAssignmentButton.disabled = true;
  setMessage("원생 배정을 저장하는 중입니다.", "info");

  try {
    await updateAdminScheduleStudents({
      scheduleId: selectedAssignmentSchedule.scheduleId,
      studentIds,
    });
    assignmentDialog.close();
    selectedAssignmentSchedule = null;
    setMessage("원생 배정을 저장했습니다.", "success");
    await loadSchedules();
  } catch (error) {
    setMessage(
      error instanceof ApiClientError
        ? error.message
        : "원생 배정을 저장하지 못했습니다.",
      "error",
    );
  } finally {
    saveAssignmentButton.disabled = false;
  }
}

function openDeactivateDialog(schedule) {
  pendingDeactivateSchedule = schedule;
  deactivateMessage.textContent = `${schedule.vehicleName} ${schedule.startTime} 시간표를 비활성화할까요?`;
  deactivateDialog.showModal();
}

async function confirmDeactivate() {
  if (!pendingDeactivateSchedule) {
    return;
  }

  confirmDeactivateButton.disabled = true;
  setMessage("시간표를 비활성화하는 중입니다.", "info");

  try {
    await deactivateAdminSchedule(pendingDeactivateSchedule.scheduleId);
    setMessage("시간표를 비활성화했습니다.", "success");
    await loadSchedules();
  } catch (error) {
    setMessage(
      error instanceof ApiClientError
        ? error.message
        : "작업에 실패했습니다. 잠시 후 다시 시도해주세요.",
      "error",
    );
  } finally {
    confirmDeactivateButton.disabled = false;
    pendingDeactivateSchedule = null;
    deactivateDialog.close();
  }
}

async function initializeSchedules() {
  const session = await requireAdminSession();

  if (!session) {
    return;
  }

  bindPlannedNavigation();
  addButton.addEventListener("click", () => openScheduleDialog());
  cancelButton.addEventListener("click", closeScheduleDialog);
  form.addEventListener("submit", handleSave);
  assignmentForm.addEventListener("submit", handleAssignmentSave);
  cancelAssignmentButton.addEventListener("click", () => {
    selectedAssignmentSchedule = null;
    assignmentDialog.close();
  });
  cancelDeactivateButton.addEventListener("click", () => {
    pendingDeactivateSchedule = null;
    deactivateDialog.close();
  });
  confirmDeactivateButton.addEventListener("click", confirmDeactivate);

  await loadBaseData();
}

initializeSchedules();
