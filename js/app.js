// 공통 유틸: 닉네임, 날짜, 포맷, 하단 네비게이션
import { isCloudMode } from "./db.js";
import { signInWithGoogle, signOutUser, onAuthChange, consumeRedirectResult } from "./auth.js";

const NICK_KEY = "mm_nickname";
const GOOGLE_EMAIL_KEY = "mm_google_email";

export function getNickname() {
  return localStorage.getItem(NICK_KEY) || "";
}

export function setNickname(nick) {
  localStorage.setItem(NICK_KEY, nick);
}

/** 구글 로그인 상태일 때만 값이 있습니다. 질문게시판 등에서 운영자 판별에 씁니다. */
export function getGoogleEmail() {
  return localStorage.getItem(GOOGLE_EMAIL_KEY) || "";
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
  { page: "challenge", href: "challenge.html", icon: "🏠", label: "챌린지" },
  { page: "daily", href: "daily.html", icon: "✅", label: "일일인증" },
  { page: "mission", href: "mission.html", icon: "🎯", label: "미션" },
  { page: "settlement", href: "settlement.html", icon: "📊", label: "결산" },
  { page: "income", href: "income.html", icon: "💵", label: "부수입" },
  { page: "qna", href: "qna.html", icon: "💬", label: "질문" },
  { page: "links", href: "links.html", icon: "🔗", label: "정보허브" },
];

export function renderShell(activePage, title) {
  const cloudBadge = isCloudMode()
    ? `<span class="badge badge-cloud">☁️ 실시간 동기화</span>`
    : `<span class="badge badge-local">📱 로컬 체험 모드</span>`;

  const authSlot = isCloudMode()
    ? `<button type="button" id="authBtn" class="gear-btn" aria-label="구글 로그인" title="구글 로그인">👤</button>`
    : "";

  const header = document.createElement("header");
  header.className = "app-header";
  header.innerHTML = `
    <div class="app-header-top">
      <h1><a href="index.html">${title}</a></h1>
      <div class="header-actions">
        ${cloudBadge}
        ${authSlot}
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

  if (isCloudMode()) wireAuthButton();
}

/**
 * 구글 로그인 버튼을 실제로 동작하게 연결합니다. renderShell()이 자동으로
 * 호출하지만, index.html(브랜드 홈)처럼 자체 헤더를 쓰는 페이지에서는
 * 직접 버튼을 만들고 이 함수를 호출하면 됩니다.
 */
export function wireAuthButton(authBtn, loggedOutLabel = "👤") {
  authBtn = authBtn || document.getElementById("authBtn");
  if (!authBtn) return;
  let currentUser = null;

  // 구글 로그인 화면에서 이 페이지로 막 돌아온 경우, 여기서 결과를 받아요.
  consumeRedirectResult().then((user) => {
    if (user) showToast(`${user.displayName}님, 환영해요! 👋`);
  });

  onAuthChange((user) => {
    currentUser = user;
    if (user) {
      authBtn.textContent = "";
      authBtn.style.backgroundImage = user.photoURL ? `url(${user.photoURL})` : "";
      authBtn.classList.toggle("has-photo", !!user.photoURL);
      authBtn.title = `${user.displayName || user.email} · 클릭하면 로그아웃`;
      if (user.displayName) setNickname(user.displayName);
      localStorage.setItem(GOOGLE_EMAIL_KEY, user.email || "");
    } else {
      authBtn.textContent = loggedOutLabel;
      authBtn.style.backgroundImage = "";
      authBtn.classList.remove("has-photo");
      authBtn.title = "구글 로그인";
      localStorage.removeItem(GOOGLE_EMAIL_KEY);
    }
  });

  authBtn.addEventListener("click", async () => {
    if (currentUser) {
      if (confirm("로그아웃 하시겠어요?")) {
        await signOutUser();
        showToast("로그아웃했어요");
      }
      return;
    }
    try {
      await signInWithGoogle(); // 구글 로그인 페이지로 이동합니다 (이후 코드는 보통 실행되지 않음)
    } catch (err) {
      console.error(err);
      showToast("구글 로그인에 실패했어요. 다시 시도해주세요.");
    }
  });
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
