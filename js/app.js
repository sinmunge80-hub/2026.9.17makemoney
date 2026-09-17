// 공통 유틸: 닉네임, 날짜, 포맷, 하단 네비게이션
import { isCloudMode } from "./db.js";

const NICK_KEY = "mm_nickname";

export function getNickname() {
  return localStorage.getItem(NICK_KEY) || "";
}

export function setNickname(nick) {
  localStorage.setItem(NICK_KEY, nick);
}

export function ensureNickname() {
  let nick = getNickname();
  if (!nick) {
    nick = (prompt("챌린지에서 사용할 닉네임을 입력해주세요 🙂", "") || "").trim();
    if (nick) setNickname(nick);
  }
  return nick;
}

export function formatWon(n) {
  if (n === null || n === undefined || n === "" || isNaN(n)) return "-";
  return Number(n).toLocaleString("ko-KR") + "원";
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function toDate(str) {
  return new Date(str + "T00:00:00");
}

export function addDays(dateStr, n) {
  const d = toDate(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function weekRange(dateStr) {
  const d = toDate(dateStr);
  const day = d.getDay(); // 0=Sun ... 6=Sat
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = addDays(dateStr, mondayOffset);
  const sunday = addDays(monday, 6);
  return { start: monday, end: sunday };
}

export function monthOf(dateStr) {
  return dateStr.slice(0, 7); // YYYY-MM
}

export function monthLabel(ym) {
  const [y, m] = ym.split("-");
  return `${y}년 ${Number(m)}월`;
}

export function weekLabel(range) {
  const [, sm, sd] = range.start.split("-");
  const [, em, ed] = range.end.split("-");
  return `${Number(sm)}.${Number(sd)} ~ ${Number(em)}.${Number(ed)}`;
}

const NAV_ITEMS = [
  { page: "home", href: "index.html", icon: "🏠", label: "홈" },
  { page: "daily", href: "daily.html", icon: "✅", label: "일일인증" },
  { page: "settlement", href: "settlement.html", icon: "📊", label: "결산" },
  { page: "income", href: "income.html", icon: "💵", label: "부수입" },
  { page: "links", href: "links.html", icon: "🔗", label: "정보허브" },
];

export function renderShell(activePage, title) {
  const cloudBadge = isCloudMode()
    ? `<span class="badge badge-cloud">☁️ 실시간 동기화</span>`
    : `<span class="badge badge-local">📱 로컬 체험 모드</span>`;

  const header = document.createElement("header");
  header.className = "app-header";
  header.innerHTML = `
    <div class="app-header-top">
      <h1>${title}</h1>
      <div class="header-actions">
        ${cloudBadge}
        <a href="settings.html" class="gear-btn" aria-label="설정">⚙️</a>
      </div>
    </div>
  `;
  document.body.prepend(header);

  const nav = document.createElement("nav");
  nav.className = "bottom-nav";
  nav.innerHTML = NAV_ITEMS.map(
    (item) => `
    <a href="${item.href}" data-page="${item.page}" class="${
      item.page === activePage ? "active" : ""
    }">
      <span class="nav-icon">${item.icon}</span>
      <span class="nav-label">${item.label}</span>
    </a>`
  ).join("");
  document.body.appendChild(nav);
}

export function showToast(msg) {
  let el = document.querySelector(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove("show"), 2200);
}
