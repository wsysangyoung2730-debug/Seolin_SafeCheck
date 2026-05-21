import { apiGet, apiPatch, apiPost } from "./apiClient.js";

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
