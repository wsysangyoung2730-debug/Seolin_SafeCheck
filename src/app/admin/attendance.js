import {
  getAdminAttendanceRecords,
  getAdminSchedules,
  getAdminVehicles,
} from "../../services/adminApi.js";
import { ApiClientError } from "../../services/apiClient.js";
import { bindPlannedNavigation, requireAdminSession } from "./layout.js";

const dateInput = document.querySelector("#attendance-date");
const vehicleFilter = document.querySelector("#vehicle-filter");
const scheduleFilter = document.querySelector("#schedule-filter");
const loadButton = document.querySelector("#load-attendance-button");
const summaryGrid = document.querySelector("#attendance-summary");
const tableBody = document.querySelector("#attendance-table-body");
const message = document.querySelector("#attendance-message");

let vehicles = [];
let schedules = [];

const STATUS_LABEL = {
  unchecked: "미확인",
  boarded: "탑승",
  not_boarded: "미탑승",
};

function setMessage(text, type = "info") {
  message.textContent = text;
  message.dataset.type = type;
}

function getTodayValue() {
  return new Date().toISOString().slice(0, 10);
}

function createOption(value, label) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  return option;
}

function renderFilters() {
  vehicleFilter.replaceChildren(createOption("", "전체 차량"));
  vehicles.forEach((vehicle) => {
    vehicleFilter.append(createOption(vehicle.vehicleId, vehicle.vehicleName));
  });

  renderScheduleOptions();
}

function renderScheduleOptions() {
  const selectedVehicleId = vehicleFilter.value;
  scheduleFilter.replaceChildren(createOption("", "전체 시간표"));
  schedules
    .filter((schedule) => !selectedVehicleId || schedule.vehicleId === selectedVehicleId)
    .forEach((schedule) => {
      scheduleFilter.append(
        createOption(
          schedule.scheduleId,
          `${schedule.vehicleName} ${schedule.startTime} ${schedule.name}`,
        ),
      );
    });
}

function createMetric(label, value) {
  const item = document.createElement("article");
  item.className = "metric-card";

  const valueElement = document.createElement("strong");
  valueElement.textContent = value;

  const labelElement = document.createElement("span");
  labelElement.textContent = label;

  item.append(valueElement, labelElement);
  return item;
}

function renderSummary(summary = {}) {
  summaryGrid.replaceChildren(
    createMetric("전체", summary.total ?? 0),
    createMetric("탑승", summary.boarded ?? 0),
    createMetric("미탑승", summary.notBoarded ?? 0),
    createMetric("미확인", summary.unchecked ?? 0),
  );
}

function renderStatus(status) {
  const badge = document.createElement("span");
  badge.className = status === "boarded" ? "badge badge--success" : "badge";
  badge.textContent = STATUS_LABEL[status] || "미확인";
  return badge;
}

function formatSavedAt(value) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function renderRecords(records = []) {
  tableBody.replaceChildren();

  if (records.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.className = "table-empty";
    cell.textContent = "조회된 출결 기록이 없습니다.";
    row.append(cell);
    tableBody.append(row);
    return;
  }

  records.forEach((record) => {
    const row = document.createElement("tr");

    const scheduleCell = document.createElement("td");
    scheduleCell.textContent = `${record.schedule.startTime} ${record.schedule.name}`;

    const vehicleCell = document.createElement("td");
    vehicleCell.textContent = record.vehicle.vehicleName;

    const studentCell = document.createElement("td");
    studentCell.textContent = record.student.studentName;

    const pickupCell = document.createElement("td");
    pickupCell.textContent = record.pickupPlace;

    const statusCell = document.createElement("td");
    statusCell.append(renderStatus(record.status));

    const savedAtCell = document.createElement("td");
    savedAtCell.textContent = formatSavedAt(record.savedAt);

    row.append(scheduleCell, vehicleCell, studentCell, pickupCell, statusCell, savedAtCell);
    tableBody.append(row);
  });
}

async function loadBaseData() {
  const [vehicleData, scheduleData] = await Promise.all([
    getAdminVehicles(),
    getAdminSchedules(),
  ]);

  vehicles = vehicleData.vehicles || [];
  schedules = scheduleData.schedules || [];
  renderFilters();
}

async function loadAttendanceRecords() {
  loadButton.disabled = true;
  setMessage("출결 기록을 불러오는 중입니다.", "info");

  try {
    const data = await getAdminAttendanceRecords({
      date: dateInput.value,
      vehicleId: vehicleFilter.value,
      scheduleId: scheduleFilter.value,
    });

    renderSummary(data.summary);
    renderRecords(data.attendanceRecords);
    setMessage(`출결 기록 ${data.summary?.total ?? 0}건을 불러왔습니다.`, "success");
  } catch (error) {
    renderSummary();
    renderRecords([]);
    setMessage(
      error instanceof ApiClientError
        ? error.message
        : "출결 기록을 불러오지 못했습니다.",
      "error",
    );
  } finally {
    loadButton.disabled = false;
  }
}

async function initializeAttendance() {
  const session = await requireAdminSession();

  if (!session) {
    return;
  }

  bindPlannedNavigation();
  dateInput.value = getTodayValue();
  renderSummary();
  renderRecords([]);

  try {
    await loadBaseData();
    await loadAttendanceRecords();
  } catch {
    setMessage("출결 기록 필터를 불러오지 못했습니다.", "error");
  }

  vehicleFilter.addEventListener("change", () => {
    renderScheduleOptions();
  });
  loadButton.addEventListener("click", loadAttendanceRecords);
}

initializeAttendance();
