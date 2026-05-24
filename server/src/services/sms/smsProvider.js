const mockSmsProvider = require("./mockSmsProvider");
const solapiSmsProvider = require("./solapiSmsProvider");

function getSmsProvider() {
  const provider = (process.env.SMS_PROVIDER || "mock").toLowerCase();

  if (provider === "solapi") {
    return solapiSmsProvider;
  }

  return mockSmsProvider;
}

module.exports = {
  getSmsProvider,
};
