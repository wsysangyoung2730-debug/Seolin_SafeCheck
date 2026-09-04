import {
  createAdminStudent,
  deactivateAdminStudent,
  getAdminStudents,
  updateAdminStudent,
} from "../../services/adminApi.js?v=phone-format-2";
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

let students = [];
let isSaving = false;
let pendingDeactivateStudent = null;
const STUDENT_MEMO_MAX_LENGTH = 20;

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
    pickupCell.textContent = student.pickupPlace;

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
    deactivateButton.textContent = "미이용 처리";
    deactivateButton.disabled = !student.isActive;
    deactivateButton.addEventListener("click", () => {
      handleDeactivate(student);
    });

    actionCell.append(editButton, deactivateButton);
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
  setMessage("원생을 미이용 처리하는 중입니다.", "info");

  try {
    await deactivateAdminStudent(student.studentId);
    setMessage("원생을 미이용 처리했습니다.", "success");
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
  memoInput.addEventListener("input", updateMemoCount);
  parentPhoneInput.addEventListener("input", updateParentPhoneFormat);
  searchInput.addEventListener("input", renderStudents);

  await loadStudents();
}

initializeStudents();
