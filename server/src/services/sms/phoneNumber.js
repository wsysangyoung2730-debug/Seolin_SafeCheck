function normalizePhoneNumber(value) {
  return String(value || "").replace(/[^0-9]/g, "");
}

function maskPhoneNumber(value) {
  const digits = normalizePhoneNumber(value);

  if (digits.length < 8) {
    return digits ? "****" : null;
  }

  return `${digits.slice(0, 3)}****${digits.slice(-4)}`;
}

module.exports = {
  maskPhoneNumber,
  normalizePhoneNumber,
};
