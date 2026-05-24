const { getSettingValue } = require("../../repositories/settings.repository");
const {
  findSmsLogs,
  findSmsTargets,
  insertSmsLog,
} = require("../../repositories/sms.repository");
const mockSmsProvider = require("./mockSmsProvider");

function createBoardedMessage(target) {
  if (target.status === "not_boarded") {
    return `${target.studentName} 학생이 ${target.startTime} ${target.pickupPlace}에서 미탑승 처리되었습니다.`;
  }

  return `${target.studentName} 학생이 ${target.startTime}에 ${target.pickupPlace}에서 승차하였습니다.`;
}

async function getEnabledStatuses() {
  const sendNotBoardedSms = await getSettingValue("send_not_boarded_sms");
  const statuses = ["boarded"];

  if (sendNotBoardedSms === "true") {
    statuses.push("not_boarded");
  }

  return statuses;
}

async function createAttendanceSmsLogs({ date, scheduleId }) {
  const statuses = await getEnabledStatuses();
  const targets = await findSmsTargets({ date, scheduleId, statuses });
  const results = [];

  for (const target of targets) {
    const message = createBoardedMessage(target);

    if (!target.parentPhone) {
      await insertSmsLog({
        attendanceRecordId: target.attendanceRecordId,
        studentId: target.studentId,
        parentContactMasked: null,
        message,
        status: "skipped",
        provider: "mock",
        providerMessageId: null,
        errorMessage: "학부모 연락처가 없어 mock SMS를 건너뛰었습니다.",
        sentAt: null,
      });
      results.push({ status: "skipped", studentId: target.studentId });
      continue;
    }

    const providerResult = await mockSmsProvider.sendSms({
      to: target.parentPhone,
      message,
      context: {
        attendanceRecordId: target.attendanceRecordId,
        studentId: target.studentId,
      },
    });

    await insertSmsLog({
      attendanceRecordId: target.attendanceRecordId,
      studentId: target.studentId,
      parentContactMasked: target.parentContactMasked,
      message,
      status: providerResult.success ? "sent" : "failed",
      provider: providerResult.provider,
      providerMessageId: providerResult.messageId,
      errorMessage: providerResult.errorMessage || null,
      sentAt: providerResult.success ? new Date().toISOString() : null,
    });
    results.push({ status: providerResult.success ? "sent" : "failed", studentId: target.studentId });
  }

  return {
    total: results.length,
    sent: results.filter((result) => result.status === "sent").length,
    skipped: results.filter((result) => result.status === "skipped").length,
    failed: results.filter((result) => result.status === "failed").length,
  };
}

async function getAdminSmsLogs(filters) {
  return {
    smsLogs: await findSmsLogs(filters),
  };
}

module.exports = {
  createAttendanceSmsLogs,
  getAdminSmsLogs,
};
