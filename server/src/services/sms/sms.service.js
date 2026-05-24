const { getSettingValue } = require("../../repositories/settings.repository");
const {
  findSmsLogs,
  findSmsTargets,
  insertSmsLog,
} = require("../../repositories/sms.repository");
const { getSmsProvider } = require("./smsProvider");

function createBoardedMessage(target) {
  return `[서린태권도] ${target.studentName} 학생이 ${target.startTime}에 ${target.pickupPlace}에서 승차하였습니다.`;
}

async function getEnabledStatuses() {
  await getSettingValue("send_not_boarded_sms");
  return ["boarded"];
}

async function createAttendanceSmsLogs({ date, scheduleId }) {
  const statuses = await getEnabledStatuses();
  const targets = await findSmsTargets({ date, scheduleId, statuses });
  const provider = getSmsProvider();
  const results = [];

  for (const target of targets) {
    const message = createBoardedMessage(target);

    const providerResult = await provider.sendSms({
      to: target.parentPhone,
      message,
      context: {
        attendanceRecordId: target.attendanceRecordId,
        studentId: target.studentId,
      },
    });
    const status = providerResult.blocked
      ? "skipped"
      : providerResult.success
        ? "sent"
        : "failed";

    if (!target.parentPhone && providerResult.provider !== "solapi") {
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

    await insertSmsLog({
      attendanceRecordId: target.attendanceRecordId,
      studentId: target.studentId,
      parentContactMasked: providerResult.toMasked || target.parentContactMasked,
      message,
      status,
      provider: providerResult.provider,
      providerMessageId: providerResult.messageId,
      errorMessage: providerResult.testMode
        ? `TEST_MODE: ${providerResult.errorMessage || "SMS_TEST_TO로 발송했습니다."}`
        : providerResult.errorMessage || null,
      sentAt: status === "sent" ? new Date().toISOString() : null,
    });
    results.push({ status, studentId: target.studentId });
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
