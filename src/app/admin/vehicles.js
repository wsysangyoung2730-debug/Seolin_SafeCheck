import {
  createAdminVehicle,
  deactivateAdminVehicle,
  getAdminVehicles,
  updateAdminVehicle,
} from "../../services/adminApi.js";
import { ApiClientError } from "../../services/apiClient.js";
import { bindPlannedNavigation, requireAdminSession } from "./layout.js";

const vehicleTableBody = document.querySelector("#vehicle-table-body");
const vehicleMessage = document.querySelector("#vehicle-message");
const addButton = document.querySelector("#add-vehicle-button");
const dialog = document.querySelector("#vehicle-dialog");
const form = document.querySelector("#vehicle-form");
const dialogTitle = document.querySelector("#vehicle-dialog-title");
const vehicleIdInput = document.querySelector("#vehicle-id");
const vehicleNameInput = document.querySelector("#vehicle-name");
const isActiveInput = document.querySelector("#vehicle-is-active");
const cancelButton = document.querySelector("#cancel-vehicle-button");
const saveButton = document.querySelector("#save-vehicle-button");
const deactivateDialog = document.querySelector("#vehicle-deactivate-dialog");
const deactivateMessage = document.querySelector("#vehicle-deactivate-message");
const cancelDeactivateButton = document.querySelector("#cancel-vehicle-deactivate-button");
const confirmDeactivateButton = document.querySelector("#confirm-vehicle-deactivate-button");

let vehicles = [];
let pendingDeactivateVehicle = null;
let isSaving = false;

function setMessage(text, type = "info") {
  vehicleMessage.textContent = text;
  vehicleMessage.dataset.type = type;
}

function renderStatusBadge(item) {
  const badge = document.createElement("span");
  badge.className = item.isActive ? "badge badge--success" : "badge";
  badge.textContent = item.isActive ? "활성" : "비활성";
  return badge;
}

function renderVehicles() {
  vehicleTableBody.replaceChildren();

  if (vehicles.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.className = "table-empty";
    cell.textContent = "등록된 차량이 없습니다.";
    row.append(cell);
    vehicleTableBody.append(row);
    return;
  }

  vehicles.forEach((vehicle) => {
    const row = document.createElement("tr");

    const nameCell = document.createElement("td");
    nameCell.textContent = vehicle.vehicleName;

    const driverCell = document.createElement("td");
    driverCell.textContent = vehicle.driver
      ? `${vehicle.driver.displayName} (${vehicle.driver.accountId})`
      : "배정 없음";

    const statusCell = document.createElement("td");
    statusCell.append(renderStatusBadge(vehicle));

    const idCell = document.createElement("td");
    idCell.className = "mono-cell";
    idCell.textContent = vehicle.vehicleId;

    const actionCell = document.createElement("td");
    actionCell.className = "table-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "ghost-button";
    editButton.textContent = "수정";
    editButton.addEventListener("click", () => openVehicleDialog(vehicle));

    const deactivateButton = document.createElement("button");
    deactivateButton.type = "button";
    deactivateButton.className = "danger-button";
    deactivateButton.textContent = "비활성화";
    deactivateButton.disabled = !vehicle.isActive;
    deactivateButton.addEventListener("click", () => openDeactivateDialog(vehicle));

    actionCell.append(editButton, deactivateButton);
    row.append(nameCell, driverCell, statusCell, idCell, actionCell);
    vehicleTableBody.append(row);
  });
}

function openVehicleDialog(vehicle = null) {
  form.reset();
  vehicleIdInput.value = vehicle?.vehicleId || "";
  vehicleNameInput.value = vehicle?.vehicleName || "";
  isActiveInput.checked = vehicle ? vehicle.isActive : true;
  dialogTitle.textContent = vehicle ? "차량 정보 수정" : "차량 추가";
  saveButton.textContent = vehicle ? "수정 저장" : "차량 추가";
  dialog.showModal();
  vehicleNameInput.focus();
}

function closeVehicleDialog() {
  dialog.close();
}

function getFormValues() {
  return {
    vehicleId: vehicleIdInput.value,
    vehicleName: vehicleNameInput.value.trim(),
    isActive: isActiveInput.checked,
  };
}

function validateForm(values) {
  if (!values.vehicleName) {
    setMessage("차량명을 입력해주세요.", "error");
    vehicleNameInput.focus();
    return false;
  }

  return true;
}

function setSaving(nextIsSaving) {
  isSaving = nextIsSaving;
  saveButton.disabled = nextIsSaving;
  addButton.disabled = nextIsSaving;
}

async function loadVehicles() {
  setMessage("차량 정보를 불러오는 중입니다.", "info");

  try {
    const data = await getAdminVehicles();
    vehicles = data.vehicles || [];
    renderVehicles();
    setMessage(`차량 ${vehicles.length}대를 불러왔습니다.`, "success");
  } catch (error) {
    vehicles = [];
    renderVehicles();
    setMessage(
      error instanceof ApiClientError
        ? error.message
        : "차량 정보를 불러오지 못했습니다.",
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
  setMessage("차량 정보를 저장하는 중입니다.", "info");

  try {
    if (values.vehicleId) {
      await updateAdminVehicle(values);
    } else {
      await createAdminVehicle(values);
    }

    closeVehicleDialog();
    setMessage("차량 정보를 저장했습니다.", "success");
    await loadVehicles();
  } catch (error) {
    setMessage(
      error instanceof ApiClientError
        ? error.message
        : "차량 정보를 저장하지 못했습니다.",
      "error",
    );
  } finally {
    setSaving(false);
  }
}

function openDeactivateDialog(vehicle) {
  pendingDeactivateVehicle = vehicle;
  deactivateMessage.textContent = `${vehicle.vehicleName} 차량을 비활성화할까요?`;
  deactivateDialog.showModal();
}

async function confirmDeactivate() {
  if (!pendingDeactivateVehicle) {
    return;
  }

  confirmDeactivateButton.disabled = true;
  setMessage("차량을 비활성화하는 중입니다.", "info");

  try {
    await deactivateAdminVehicle(pendingDeactivateVehicle.vehicleId);
    setMessage("차량을 비활성화했습니다.", "success");
    await loadVehicles();
  } catch (error) {
    setMessage(
      error instanceof ApiClientError
        ? error.message
        : "작업에 실패했습니다. 잠시 후 다시 시도해주세요.",
      "error",
    );
  } finally {
    confirmDeactivateButton.disabled = false;
    pendingDeactivateVehicle = null;
    deactivateDialog.close();
  }
}

async function initializeVehicles() {
  const session = await requireAdminSession();

  if (!session) {
    return;
  }

  bindPlannedNavigation();
  addButton.addEventListener("click", () => openVehicleDialog());
  cancelButton.addEventListener("click", closeVehicleDialog);
  form.addEventListener("submit", handleSave);
  cancelDeactivateButton.addEventListener("click", () => {
    pendingDeactivateVehicle = null;
    deactivateDialog.close();
  });
  confirmDeactivateButton.addEventListener("click", confirmDeactivate);

  await loadVehicles();
}

initializeVehicles();
