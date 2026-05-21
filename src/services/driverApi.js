import { apiGet } from "./apiClient.js";

export async function getTodayDriverSchedules() {
  return apiGet("/api/driver/schedules/today");
}

export async function getDriverScheduleStudents(scheduleId) {
  return apiGet(`/api/driver/schedules/${encodeURIComponent(scheduleId)}/students`);
}
