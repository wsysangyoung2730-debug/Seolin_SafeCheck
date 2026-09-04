const crypto = require("crypto");
const readline = require("readline");

const pool = require("../db/pool");
const { runMigrations } = require("../db/migrations");
const { hashCredential } = require("../services/auth/password");

function parseArguments(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];

    if (!item.startsWith("--")) {
      continue;
    }

    const nextItem = argv[index + 1];

    if (!nextItem || nextItem.startsWith("--")) {
      args[item.slice(2)] = true;
    } else {
      args[item.slice(2)] = nextItem;
      index += 1;
    }
  }

  return args;
}

function readHiddenLine(label) {
  if (!process.stdin.isTTY || !process.stdin.setRawMode) {
    throw new Error("PIN/비밀번호 입력에는 TTY 터미널이 필요합니다.");
  }

  return new Promise((resolve, reject) => {
    let value = "";
    readline.emitKeypressEvents(process.stdin);
    process.stdout.write(label);
    process.stdin.setRawMode(true);
    process.stdin.resume();

    const cleanup = () => {
      process.stdin.off("keypress", onKeypress);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
    };

    const onKeypress = (character, key = {}) => {
      if (key.ctrl && key.name === "c") {
        cleanup();
        reject(new Error("계정 생성을 취소했습니다."));
        return;
      }

      if (key.name === "return" || key.name === "enter") {
        cleanup();
        resolve(value);
        return;
      }

      if (key.name === "backspace") {
        value = value.slice(0, -1);
        return;
      }

      if (character && !key.ctrl && !key.meta) {
        value += character;
      }
    };

    process.stdin.on("keypress", onKeypress);
  });
}

function validateAccount({ role, loginId, displayName, credential }) {
  if (!["admin", "driver"].includes(role)) {
    return "--role은 admin 또는 driver여야 합니다.";
  }

  if (!/^[a-z0-9][a-z0-9_-]{2,31}$/.test(loginId || "")) {
    return "--id는 영문 소문자, 숫자, -, _ 조합 3~32자로 입력해주세요.";
  }

  if (!displayName) {
    return "--name을 입력해주세요.";
  }

  if (role === "driver" && !/^\d{6,12}$/.test(credential)) {
    return "기사 PIN은 숫자 6~12자리여야 합니다.";
  }

  if (role === "admin" && credential.length < 10) {
    return "관리자 비밀번호는 10자 이상이어야 합니다.";
  }

  return "";
}

async function main() {
  const args = parseArguments(process.argv.slice(2));
  const role = args.role;
  const loginId = String(args.id || "").trim().toLowerCase();
  const displayName = String(args.name || "").trim();
  const userId = String(args["user-id"] || `user_${crypto.randomUUID()}`).trim();
  const credentialLabel = role === "driver" ? "기사 PIN" : "관리자 비밀번호";
  const credential = await readHiddenLine(`${credentialLabel}: `);
  const confirmation = await readHiddenLine(`${credentialLabel} 확인: `);

  if (credential !== confirmation) {
    throw new Error("입력한 인증 정보가 서로 일치하지 않습니다.");
  }

  const validationMessage = validateAccount({
    role,
    loginId,
    displayName,
    credential,
  });

  if (validationMessage) {
    throw new Error(validationMessage);
  }

  await runMigrations();
  const passwordHash = await hashCredential(credential);
  let result;

  if (args.reset) {
    result = await pool.query(
      `
        update users
        set
          password_hash = $3,
          display_name = $4,
          is_active = true,
          updated_at = now()
        where login_id = $1
          and role = $2
        returning id, login_id, role, display_name
      `,
      [loginId, role, passwordHash, displayName],
    );

    if (!result.rows[0]) {
      throw new Error("재설정할 계정을 찾을 수 없습니다.");
    }

    await pool.query("delete from auth_sessions where user_id = $1", [result.rows[0].id]);
  } else {
    result = await pool.query(
      `
        insert into users (
          id,
          login_id,
          password_hash,
          role,
          display_name,
          is_active,
          created_at,
          updated_at
        ) values ($1, $2, $3, $4, $5, true, now(), now())
        returning id, login_id, role, display_name
      `,
      [userId, loginId, passwordHash, role, displayName],
    );
  }

  console.log(args.reset ? "계정 인증 정보를 재설정했습니다:" : "계정을 생성했습니다:", result.rows[0]);
}

main()
  .catch((error) => {
    if (error.code === "23505") {
      console.error("이미 사용 중인 계정 ID 또는 사용자 ID입니다.");
    } else {
      console.error(error.message);
    }

    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
