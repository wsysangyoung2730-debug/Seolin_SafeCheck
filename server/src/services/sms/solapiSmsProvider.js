const { SolapiMessageService } = require("solapi");
const { maskPhoneNumber, normalizePhoneNumber } = require("./phoneNumber");

function isEnabled(value) {
  return value === "true";
}

function getConfig() {
  return {
    realSendEnabled: isEnabled(process.env.SMS_REAL_SEND_ENABLED),
    testMode: process.env.SMS_TEST_MODE !== "false",
    testTo: normalizePhoneNumber(process.env.SMS_TEST_TO),
    apiKey: process.env.SOLAPI_API_KEY || "",
    apiSecret: process.env.SOLAPI_API_SECRET || "",
    senderNumber: normalizePhoneNumber(process.env.SOLAPI_SENDER_NUMBER),
  };
}

function validateConfig(config) {
  if (!config.realSendEnabled) {
    return "SMS_REAL_SEND_ENABLED가 true가 아니어서 SOLAPI 발송을 차단했습니다.";
  }

  if (!config.apiKey || !config.apiSecret || !config.senderNumber) {
    return "SOLAPI 환경변수가 설정되지 않았습니다.";
  }

  if (config.testMode && !config.testTo) {
    return "SMS_TEST_MODE=true 상태에서는 SMS_TEST_TO가 필요합니다.";
  }

  return "";
}

async function sendSms({ to, message }) {
  const config = getConfig();
  const configError = validateConfig(config);

  if (configError) {
    return {
      success: false,
      blocked: true,
      provider: "solapi",
      errorMessage: configError,
    };
  }

  const recipient = config.testMode
    ? config.testTo
    : normalizePhoneNumber(to);

  if (!recipient) {
    return {
      success: false,
      blocked: true,
      provider: "solapi",
      errorMessage: "수신번호가 없어 SOLAPI 발송을 차단했습니다.",
    };
  }

  try {
    const messageService = new SolapiMessageService(
      config.apiKey,
      config.apiSecret,
    );
    const result = await messageService.send({
      to: recipient,
      from: config.senderNumber,
      text: message,
    });

    return {
      success: true,
      provider: "solapi",
      messageId: result?.messageId || result?.groupInfo?.groupId || null,
      toMasked: maskPhoneNumber(recipient),
      testMode: config.testMode,
    };
  } catch (error) {
    return {
      success: false,
      provider: "solapi",
      errorMessage: error.message || "SOLAPI 발송에 실패했습니다.",
      toMasked: maskPhoneNumber(recipient),
      testMode: config.testMode,
    };
  }
}

module.exports = {
  sendSms,
};
