import { getAdminOverview } from "../../services/adminApi.js";
import { bindPlannedNavigation, requireAdminSession } from "./layout.js";

const overviewGrid = document.querySelector("#overview-grid");
const overviewMessage = document.querySelector("#overview-message");

function setMessage(text, type = "info") {
  overviewMessage.textContent = text;
  overviewMessage.dataset.type = type;
}

function createMetric(label, value) {
  const item = document.createElement("article");
  item.className = "metric-card";

  const valueElement = document.createElement("strong");
  valueElement.textContent = value;

  const labelElement = document.createElement("span");
  labelElement.textContent = label;

  item.append(valueElement, labelElement);
  return item;
}

function renderOverview(overview) {
  overviewGrid.replaceChildren(
    createMetric("전체 원생 수", overview.totalStudents ?? "-"),
    createMetric("활성 원생 수", overview.activeStudents ?? "-"),
    createMetric("차량 수", overview.totalVehicles ?? "-"),
    createMetric("시간표 수", overview.totalSchedules ?? "-"),
  );
}

async function initializeHome() {
  const session = await requireAdminSession();

  if (!session) {
    return;
  }

  bindPlannedNavigation();
  setMessage("관리자 현황을 불러오는 중입니다.", "info");

  try {
    const overview = await getAdminOverview();
    renderOverview(overview);
    setMessage("원생 관리는 현재 사용할 수 있습니다.", "success");
  } catch {
    overviewGrid.replaceChildren();
    setMessage("관리자 기능을 준비 중입니다. 원생 관리는 현재 사용할 수 있습니다.", "error");
  }
}

initializeHome();
