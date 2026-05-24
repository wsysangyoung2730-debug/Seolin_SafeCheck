import { apiGet, apiPatch, apiPost, apiPut } from "./apiClient.js";
import { getApiBaseUrl } from "../config/apiConfig.js";
import { getStoredAdminSession } from "./adminSession.js";

const ADMIN_AUTH_OPTIONS = {
  authRole: "admin",
};

export async function getAdminOverview() {
  return apiGet("/api/admin/overview", ADMIN_AUTH_OPTIONS);
}

export async function getAdminStudents() {
  return apiGet("/api/admin/students", ADMIN_AUTH_OPTIONS);
}

export async function createAdminStudent({ studentName, pickupPlace }) {
  return apiPost(
    "/api/admin/students",
    {
      studentName,
      pickupPlace,
    },
    ADMIN_AUTH_OPTIONS,
  );
}

export async function updateAdminStudent({
  studentId,
  studentName,
  pickupPlace,
  isActive,
}) {
  return apiPatch(
    `/api/admin/students/${encodeURIComponent(studentId)}`,
    {
      studentName,
      pickupPlace,
      isActive,
    },
    ADMIN_AUTH_OPTIONS,
  );
}

export async function deactivateAdminStudent(studentId) {
  return apiPatch(
    `/api/admin/students/${encodeURIComponent(studentId)}/deactivate`,
    {},
    ADMIN_AUTH_OPTIONS,
  );
}

export async function getAdminVehicles() {
  return apiGet("/api/admin/vehicles", ADMIN_AUTH_OPTIONS);
}

export async function createAdminVehicle({ vehicleName }) {
  return apiPost(
    "/api/admin/vehicles",
    { vehicleName },
    ADMIN_AUTH_OPTIONS,
  );
}

export async function updateAdminVehicle({ vehicleId, vehicleName, isActive }) {
  return apiPatch(
    `/api/admin/vehicles/${encodeURIComponent(vehicleId)}`,
    {
      vehicleName,
      isActive,
    },
    ADMIN_AUTH_OPTIONS,
  );
}

export async function deactivateAdminVehicle(vehicleId) {
  return apiPatch(
    `/api/admin/vehicles/${encodeURIComponent(vehicleId)}/deactivate`,
    {},
    ADMIN_AUTH_OPTIONS,
  );
}

export async function getAdminSchedules({ dayOfWeek, vehicleId } = {}) {
  const query = new URLSearchParams();

  if (dayOfWeek) {
    query.set("dayOfWeek", dayOfWeek);
  }

  if (vehicleId) {
    query.set("vehicleId", vehicleId);
  }

  const queryString = query.toString();

  return apiGet(
    `/api/admin/schedules${queryString ? `?${queryString}` : ""}`,
    ADMIN_AUTH_OPTIONS,
  );
}

export async function createAdminSchedule({
  vehicleId,
  dayOfWeek,
  scheduleName,
  startTime,
}) {
  return apiPost(
    "/api/admin/schedules",
    {
      vehicleId,
      dayOfWeek,
      scheduleName,
      startTime,
    },
    ADMIN_AUTH_OPTIONS,
  );
}

export async function updateAdminSchedule({
  scheduleId,
  vehicleId,
  dayOfWeek,
  scheduleName,
  startTime,
  isActive,
}) {
  return apiPatch(
    `/api/admin/schedules/${encodeURIComponent(scheduleId)}`,
    {
      vehicleId,
      dayOfWeek,
      scheduleName,
      startTime,
      isActive,
    },
    ADMIN_AUTH_OPTIONS,
  );
}

export async function deactivateAdminSchedule(scheduleId) {
  return apiPatch(
    `/api/admin/schedules/${encodeURIComponent(scheduleId)}/deactivate`,
    {},
    ADMIN_AUTH_OPTIONS,
  );
}

export async function getAdminScheduleStudents(scheduleId) {
  return apiGet(
    `/api/admin/schedules/${encodeURIComponent(scheduleId)}/students`,
    ADMIN_AUTH_OPTIONS,
  );
}

export async function updateAdminScheduleStudents({ scheduleId, studentIds }) {
  return apiPut(
    `/api/admin/schedules/${encodeURIComponent(scheduleId)}/students`,
    { studentIds },
    ADMIN_AUTH_OPTIONS,
  );
}

export async function getAdminAttendanceRecords({ date, vehicleId, scheduleId }) {
  const query = new URLSearchParams();

  if (date) {
    query.set("date", date);
  }

  if (vehicleId) {
    query.set("vehicleId", vehicleId);
  }

  if (scheduleId) {
    query.set("scheduleId", scheduleId);
  }

  const queryString = query.toString();

  return apiGet(
    `/api/admin/attendance-records${queryString ? `?${queryString}` : ""}`,
    ADMIN_AUTH_OPTIONS,
  );
}

export async function downloadAdminAttendanceRecords({ date, vehicleId, scheduleId }) {
  const query = new URLSearchParams();

  if (date) {
    query.set("date", date);
  }

  if (vehicleId) {
    query.set("vehicleId", vehicleId);
  }

  if (scheduleId) {
    query.set("scheduleId", scheduleId);
  }

  const session = getStoredAdminSession();
  const response = await fetch(
    `${getApiBaseUrl()}/api/admin/attendance-records/export?${query.toString()}`,
    {
      headers: session?.token
        ? { Authorization: `Bearer ${session.token}` }
        : {},
    },
  );

  if (!response.ok) {
    throw new Error("엑셀 파일을 다운로드하지 못했습니다.");
  }

  return response.blob();
}

export async function previewExcelImport(file) {
  const formData = new FormData();
  const session = getStoredAdminSession();

  formData.append("file", file);

  const response = await fetch(`${getApiBaseUrl()}/api/admin/excel/import/preview`, {
    method: "POST",
    headers: session?.token
      ? { Authorization: `Bearer ${session.token}` }
      : {},
    body: formData,
  });
  const payload = await response.json();

  if (!response.ok || !payload.success) {
    throw new Error(payload.error?.message || "엑셀 파일을 확인하지 못했습니다.");
  }

  return payload.data;
}
