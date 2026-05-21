import {
  createAdminStudent,
  deactivateAdminStudent,
  getAdminStudents,
  updateAdminStudent,
} from "../../services/adminApi.js";
import { ApiClientError } from "../../services/apiClient.js";
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
const isActiveInput = document.querySelector("#is-active");
const cancelButton = document.querySelector("#cancel-student-button");
const saveButton = document.querySelector("#save-student-button");
const deactivateDialog = document.querySelector("#deactivate-dialog");
const deactivateMessage = document.querySelector("#deactivate-message");
const cancelDeactivateButton = document.querySelector("#cancel-deactivate-button");
const confirmDeactivateButton = document.querySelector("#confirm-deactivate-button");

let students = [];
let isSaving = false;
let pendingDeactivateStudent = null;

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

function getContactLabel(status) {
  return status === "registered" ? "연락처 등록됨" : "연락처 없음";
}

function renderStatusBadge(student) {
  const badge = document.createElement("span");
  badge.className = student.isActive ? "badge badge--success" : "badge";
  badge.textContent = student.isActive ? "활성" : "비활성";
  return badge;
}

function renderStudents() {
  const visibleStudents = getVisibleStudents();
  studentTableBody.replaceChildren();

  if (visibleStudents.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
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

    const nameCell = document.createElement("td");
    nameCell.textContent = student.studentName;

    const pickupCell = document.createElement("td");
    pickupCell.textContent = student.pickupPlace;

    const contactCell = document.createElement("td");
    contactCell.textContent = getContactLabel(student.parentContactStatus);

    const statusCell = document.createElement("td");
    statusCell.append(renderStatusBadge(student));

    const idCell = document.createElement("td");
    idCell.textContent = student.studentId;
    idCell.className = "mono-cell";

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
    deactivateButton.textContent = "비활성화";
    deactivateButton.disabled = !student.isActive;
    deactivateButton.addEventListener("click", () => {
      handleDeactivate(student);
    });

    actionCell.append(editButton, deactivateButton);
    row.append(nameCell, pickupCell, contactCell, statusCell, idCell, actionCell);
    studentTableBody.append(row);
  });
}

function openStudentDialog(student = null) {
  form.reset();
  studentIdInput.value = student?.studentId || "";
  studentNameInput.value = student?.studentName || "";
  pickupPlaceInput.value = student?.pickupPlace || "";
  isActiveInput.checked = student ? student.isActive : true;
  dialogTitle.textContent = student ? "원생 정보 수정" : "원생 추가";
  saveButton.textContent = student ? "수정 저장" : "원생 추가";
  dialog.showModal();
  studentNameInput.focus();
}

function closeStudentDialog() {
  dialog.close();
}

function getFormValues() {
  return {
    studentId: studentIdInput.value,
    studentName: studentNameInput.value.trim(),
    pickupPlace: pickupPlaceInput.value.trim(),
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

async function handleDeactivate(student) {
  if (!student.isActive) {
    return;
  }

  pendingDeactivateStudent = student;
  deactivateMessage.textContent = `${student.studentName} 원생을 비활성화할까요?`;
  deactivateDialog.showModal();
}

async function confirmDeactivate() {
  if (!pendingDeactivateStudent) {
    return;
  }

  const student = pendingDeactivateStudent;
  confirmDeactivateButton.disabled = true;
  setMessage("원생을 비활성화하는 중입니다.", "info");

  try {
    await deactivateAdminStudent(student.studentId);
    setMessage("원생을 비활성화했습니다.", "success");
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
  form.addEventListener("submit", handleSave);
  searchInput.addEventListener("input", renderStudents);

  await loadStudents();
}

initializeStudents();
