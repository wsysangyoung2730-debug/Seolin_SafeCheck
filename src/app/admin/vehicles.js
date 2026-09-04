import {
  createAdminVehicle,
  deactivateAdminVehicle,
  deleteAdminVehicle,
  getAdminVehicles,
  updateAdminVehicle,
} from "../../services/adminApi.js?v=permanent-delete-1";
import { ApiClientError } from "../../services/apiClient.js";
import { createTrashButton } from "./deleteAction.js?v=permanent-delete-1";
import { bindPlannedNavigation, requireAdminSession } from "./layout.js";

const vehicleTableBody = document.querySelector("#vehicle-table-body");
const vehicleMessage = document.querySelector("#vehicle-message");
const addButton = document.querySelector("#add-vehicle-button");
const dialog = document.querySelector("#vehicle-dialog");
const form = document.querySelector("#vehicle-form");
const dialogTitle = document.querySelector("#vehicle-dialog-title");
const vehicleIdInput = document.querySelector("#vehicle-id");
const vehicleNameInput = document.querySelector("#vehicle-name");
const driverAccountIdInput = document.querySelector("#driver-account-id");
const driverPinInput = document.querySelector("#driver-pin");
const driverPinLabel = document.querySelector("#driver-pin-label");
const driverPinHelp = document.querySelector("#driver-pin-help");
const isActiveInput = document.querySelector("#vehicle-is-active");
const cancelButton = document.querySelector("#cancel-vehicle-button");
const saveButton = document.querySelector("#save-vehicle-button");
const deactivateDialog = document.querySelector("#vehicle-deactivate-dialog");
const deactivateMessage = document.querySelector("#vehicle-deactivate-message");
const cancelDeactivateButton = document.querySelector("#cancel-vehicle-deactivate-button");
const confirmDeactivateButton = document.querySelector("#confirm-vehicle-deactivate-button");
const deleteDialog = document.querySelector("#vehicle-delete-dialog");
const deleteMessage = document.querySelector("#vehicle-delete-message");
const cancelDeleteButton = document.querySelector("#cancel-vehicle-delete-button");
const confirmDeleteButton = document.querySelector("#confirm-vehicle-delete-button");

let vehicles = [];
let pendingDeactivateVehicle = null;
let pendingDeleteVehicle = null;
let isSaving = false;
let editingVehicleHasDriver = false;

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

    const deleteButton = createTrashButton({
      label: `${vehicle.vehicleName} 차량 영구 삭제`,
      onClick: () => openDeleteDialog(vehicle),
    });

    actionCell.append(editButton, deactivateButton, deleteButton);
    row.append(nameCell, driverCell, statusCell, idCell, actionCell);
    vehicleTableBody.append(row);
  });
}

function openVehicleDialog(vehicle = null) {
  form.reset();
  editingVehicleHasDriver = Boolean(vehicle?.driver);
  vehicleIdInput.value = vehicle?.vehicleId || "";
  vehicleNameInput.value = vehicle?.vehicleName || "";
  driverAccountIdInput.value = vehicle?.driver?.accountId || "";
  driverPinInput.value = "";
  isActiveInput.checked = vehicle ? vehicle.isActive : true;
  dialogTitle.textContent = vehicle ? "차량 정보 수정" : "차량 추가";
  driverPinLabel.textContent = vehicle ? "새 기사 PIN" : "기사 PIN";
  driverPinHelp.textContent = vehicle
    ? "PIN을 바꿀 때만 입력하세요. 변경하면 기존 로그인 세션은 종료됩니다."
    : "PIN 원문은 저장하거나 다시 표시하지 않습니다.";
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
    driverAccountId: driverAccountIdInput.value.trim().toLowerCase(),
    driverPin: driverPinInput.value.trim(),
    isActive: isActiveInput.checked,
  };
}

function validateForm(values) {
  if (!values.vehicleName) {
    setMessage("차량명을 입력해주세요.", "error");
    vehicleNameInput.focus();
    return false;
  }

  if (!/^[a-z0-9][a-z0-9_-]{2,31}$/.test(values.driverAccountId)) {
    setMessage("기사 로그인 ID를 영문 소문자, 숫자, -, _ 조합 3~32자로 입력해주세요.", "error");
    driverAccountIdInput.focus();
    return false;
  }

  if ((!values.vehicleId || !editingVehicleHasDriver) && !values.driverPin) {
    setMessage("기사 계정을 만들려면 PIN을 입력해주세요.", "error");
    driverPinInput.focus();
    return false;
  }

  if (values.driverPin && !/^\d{6,12}$/.test(values.driverPin)) {
    setMessage("기사 PIN을 숫자 6~12자리로 입력해주세요.", "error");
    driverPinInput.focus();
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

function openDeleteDialog(vehicle) {
  pendingDeleteVehicle = vehicle;
  const driverWarning = vehicle.driver
    ? " 연결된 기사님 계정과 로그인 세션도 함께 삭제됩니다."
    : "";
  deleteMessage.textContent = `${vehicle.vehicleName} 차량을 영구 삭제할까요? 소속 시간표, 출결 기록, 연결된 문자 기록도 함께 삭제되며 복구할 수 없습니다.${driverWarning}`;
  deleteDialog.showModal();
}

async function confirmDelete() {
  if (!pendingDeleteVehicle) {
    return;
  }

  const vehicle = pendingDeleteVehicle;
  confirmDeleteButton.disabled = true;
  setMessage("차량과 연결 기록을 삭제하는 중입니다.", "info");

  try {
    await deleteAdminVehicle(vehicle.vehicleId);
    setMessage(`${vehicle.vehicleName} 차량을 영구 삭제했습니다.`, "success");
    await loadVehicles();
  } catch (error) {
    setMessage(
      error instanceof ApiClientError
        ? error.message
        : "차량을 삭제하지 못했습니다.",
      "error",
    );
  } finally {
    confirmDeleteButton.disabled = false;
    pendingDeleteVehicle = null;
    deleteDialog.close();
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
  cancelDeleteButton.addEventListener("click", () => {
    pendingDeleteVehicle = null;
    deleteDialog.close();
  });
  confirmDeleteButton.addEventListener("click", confirmDelete);

  await loadVehicles();
}

initializeVehicles();
