import { apiGet } from "./apiClient.js";

export async function getTodayDriverSchedules(date) {
  const queryString = date ? `?date=${encodeURIComponent(date)}` : "";

  return apiGet(`/api/driver/schedules/today${queryString}`);
}

export async function getDriverScheduleStudents(scheduleId, date) {
  const params = new URLSearchParams();

  if (date) {
    params.set("date", date);
  }

  const queryString = params.toString();

  return apiGet(
    `/api/driver/schedules/${encodeURIComponent(scheduleId)}/students${queryString ? `?${queryString}` : ""}`,
  );
}
