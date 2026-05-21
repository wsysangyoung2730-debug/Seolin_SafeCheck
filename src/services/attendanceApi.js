import { apiPost } from "./apiClient.js";

export async function saveAttendance({ date, vehicleId, scheduleId, records }) {
  return apiPost("/api/driver/attendance/save", {
    date,
    vehicleId,
    scheduleId,
    records: records.map((record) => ({
      studentId: record.studentId,
      status: record.status,
      pickupPlace: record.pickupPlace,
    })),
  });
}
