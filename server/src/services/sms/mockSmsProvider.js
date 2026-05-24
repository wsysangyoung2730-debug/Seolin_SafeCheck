const { maskPhoneNumber } = require("./phoneNumber");

function createMockMessageId() {
  return `mock_sms_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function sendSms({ to }) {
  return {
    success: true,
    provider: "mock",
    messageId: createMockMessageId(),
    toMasked: maskPhoneNumber(to),
  };
}

module.exports = {
  sendSms,
};
