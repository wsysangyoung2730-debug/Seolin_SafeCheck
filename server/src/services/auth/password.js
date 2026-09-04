const argon2 = require("argon2");

const PASSWORD_HASH_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19 * 1024,
  timeCost: 2,
  parallelism: 1,
};

async function hashCredential(credential) {
  return argon2.hash(credential, PASSWORD_HASH_OPTIONS);
}

async function verifyCredential(passwordHash, credential) {
  if (!passwordHash || !credential) {
    return false;
  }

  try {
    return await argon2.verify(passwordHash, credential);
  } catch {
    return false;
  }
}

module.exports = {
  hashCredential,
  verifyCredential,
};
