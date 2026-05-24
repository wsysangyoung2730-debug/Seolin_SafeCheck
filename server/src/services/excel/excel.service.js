const ExcelJS = require("exceljs");

const STATUS_LABEL = {
  unchecked: "미확인",
  boarded: "탑승",
  not_boarded: "미탑승",
};

const WEEKDAY_LABEL = {
  sunday: "일",
  monday: "월",
  tuesday: "화",
  wednesday: "수",
  thursday: "목",
  friday: "금",
  saturday: "토",
};

const WEEKDAY_VALUE = {
  일: "sunday",
  일요일: "sunday",
  sunday: "sunday",
  월: "monday",
  월요일: "monday",
  monday: "monday",
  화: "tuesday",
  화요일: "tuesday",
  tuesday: "tuesday",
  수: "wednesday",
  수요일: "wednesday",
  wednesday: "wednesday",
  목: "thursday",
  목요일: "thursday",
  thursday: "thursday",
  금: "friday",
  금요일: "friday",
  friday: "friday",
  토: "saturday",
  토요일: "saturday",
  saturday: "saturday",
};

function formatDate(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  return new Date(value).toISOString().slice(0, 10);
}

function getDayLabel(date) {
  const value = formatDate(date);

  if (!value) {
    return "";
  }

  const [year, month, day] = value.split("-").map(Number);
  const dayOfWeek = new Date(year, month - 1, day).getDay();

  return ["일", "월", "화", "수", "목", "금", "토"][dayOfWeek];
}

function formatDateTime(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function buildAttendanceWorkbook(records) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("출결 기록");

  sheet.columns = [
    { header: "날짜", key: "date", width: 14 },
    { header: "요일", key: "dayLabel", width: 8 },
    { header: "차량", key: "vehicleName", width: 16 },
    { header: "시간대", key: "scheduleName", width: 18 },
    { header: "원생명", key: "studentName", width: 16 },
    { header: "탑승장소", key: "pickupPlace", width: 24 },
    { header: "상태", key: "statusLabel", width: 12 },
    { header: "저장시각", key: "savedAt", width: 22 },
  ];

  records.forEach((record) => {
    sheet.addRow({
      date: record.date,
      dayLabel: getDayLabel(record.date),
      vehicleName: record.vehicle.vehicleName,
      scheduleName: `${record.schedule.startTime} ${record.schedule.name}`,
      studentName: record.student.studentName,
      pickupPlace: record.pickupPlace,
      statusLabel: STATUS_LABEL[record.status] || "미확인",
      savedAt: formatDateTime(record.savedAt),
    });
  });

  sheet.getRow(1).font = { bold: true };

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function normalizeCell(value) {
  if (value && typeof value === "object") {
    if (value.text) {
      return String(value.text).trim();
    }

    if (value.result) {
      return String(value.result).trim();
    }
  }

  return String(value ?? "").trim();
}

function normalizeTime(value) {
  if (value instanceof Date) {
    return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
  }

  const numericValue = Number(value);

  if (Number.isFinite(numericValue) && numericValue > 0 && numericValue < 1) {
    const totalMinutes = Math.round(numericValue * 24 * 60);
    const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
    const minutes = String(totalMinutes % 60).padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  const text = normalizeCell(value);
  const match = text.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);

  if (!match) {
    return text;
  }

  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function validateImportRow(row, rowNumber, seenKeys) {
  const studentName = normalizeCell(row["원생명"]);
  const vehicleName = normalizeCell(row["차량"]);
  const weekdayText = normalizeCell(row["요일"]).toLowerCase();
  const dayOfWeek = WEEKDAY_VALUE[weekdayText] || "";
  const scheduleTime = normalizeTime(row["시간대"]);
  const pickupPlace = normalizeCell(row["탑승장소"]);
  const parentContact = normalizeCell(row["학부모 연락처"]);
  const errors = [];

  if (!studentName) {
    errors.push("원생명이 없습니다.");
  }

  if (!vehicleName) {
    errors.push("차량명이 없습니다.");
  }

  if (!dayOfWeek) {
    errors.push("요일이 올바르지 않습니다.");
  }

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(scheduleTime)) {
    errors.push("시간대가 올바르지 않습니다.");
  }

  if (!pickupPlace) {
    errors.push("탑승장소가 없습니다.");
  }

  if (parentContact && !/^[0-9+\-\s]{8,20}$/.test(parentContact)) {
    errors.push("학부모 연락처 형식이 올바르지 않습니다.");
  }

  const duplicateKey = [
    studentName,
    vehicleName,
    dayOfWeek,
    scheduleTime,
    pickupPlace,
  ].join("|");

  if (seenKeys.has(duplicateKey)) {
    errors.push("중복된 행입니다.");
  }

  seenKeys.add(duplicateKey);

  return {
    rowNumber,
    studentName,
    vehicleName,
    dayOfWeek,
    dayLabel: WEEKDAY_LABEL[dayOfWeek] || normalizeCell(row["요일"]),
    scheduleTime,
    pickupPlace,
    hasParentContact: Boolean(parentContact),
    errors,
  };
}

function getRowObject(row, headers) {
  return headers.reduce((nextRow, header, index) => {
    nextRow[header] = row.getCell(index + 1).value;
    return nextRow;
  }, {});
}

async function previewStudentImport(buffer) {
  const workbook = new ExcelJS.Workbook();

  await workbook.xlsx.load(buffer);

  const sheet = workbook.worksheets[0];

  if (!sheet) {
    return {
      rows: [],
      summary: { total: 0, valid: 0, invalid: 0 },
    };
  }

  const headerRow = sheet.getRow(1);
  const headers = [];

  headerRow.eachCell({ includeEmpty: true }, (cell) => {
    headers.push(normalizeCell(cell.value));
  });

  const rows = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }

    rows.push({
      row,
      rowNumber,
    });
  });

  const seenKeys = new Set();
  const previewRows = rows.map(({ row, rowNumber }) =>
    validateImportRow(getRowObject(row, headers), rowNumber, seenKeys),
  );
  const invalid = previewRows.filter((row) => row.errors.length > 0).length;

  return {
    rows: previewRows.slice(0, 100),
    summary: {
      total: previewRows.length,
      valid: previewRows.length - invalid,
      invalid,
    },
  };
}

module.exports = {
  buildAttendanceWorkbook,
  previewStudentImport,
};
