function createMockMessageId() {
  return `mock_sms_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function sendSms() {
  return {
    success: true,
    provider: "mock",
    messageId: createMockMessageId(),
  };
}

module.exports = {
  sendSms,
};
