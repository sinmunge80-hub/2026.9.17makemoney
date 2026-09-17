import { getEntries } from "./db.js";
import {
  renderShell,
  getNickname,
  ensureNickname,
  formatWon,
  todayStr,
  addDays,
  monthOf,
} from "./app.js";

renderShell("home", "메이크머니 해빗챌린지");

const nick = getNickname();
const notice = document.getElementById("welcomeNotice");
if (!nick) {
  notice.style.display = "block";
  notice.textContent =
    "처음 오셨나요? 인증 메뉴에서 닉네임을 등록하면 순위와 기록이 저장돼요 🙂";
} else {
  notice.style.display = "block";
  notice.textContent = `${nick}님, 오늘도 화이팅! 함께 만들어가는 부자습관 💪`;
}

const today = todayStr();
document.getElementById("todayDateLabel").textContent = `(${today})`;

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

function computeStreak(dailySet, refDate) {
  let streak = 0;
  let cursor = refDate;
  while (dailySet.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

async function run() {
  const entries = await getEntries();

  // ---- 오늘 인증 현황 ----
  const todayDaily = entries.filter(
    (e) => e.category === "daily" && e.date === today
  );
  const todayList = document.getElementById("todayList");
  if (todayDaily.length === 0) {
    todayList.innerHTML = `<li class="empty-msg">아직 오늘 인증한 분이 없어요. 첫 인증의 주인공이 되어보세요!</li>`;
  } else {
    const names = [...new Set(todayDaily.map((e) => e.nickname))];
    todayList.innerHTML = names
      .map(
        (n) =>
          `<li><span class="check-dot"></span><span>${escapeHtml(
            n
          )}</span></li>`
      )
      .join("");
  }

  // ---- 이번 달 요약 ----
  const ym = monthOf(today);
  const monthEntries = entries.filter((e) => monthOf(e.date || "") === ym);
  const monthDailyCount = monthEntries.filter(
    (e) => e.category === "daily"
  ).length;
  const monthSpend = monthEntries
    .filter((e) => e.category === "daily")
    .reduce((sum, e) => sum + (Number(e.spend) || 0), 0);
  const monthSideIncome = monthEntries
    .filter((e) => e.category === "income")
    .reduce((sum, e) => sum + (Number(e.sideIncomeAmount) || 0), 0);

  document.getElementById("monthCertCount").textContent = `${monthDailyCount}건`;
  document.getElementById("monthSideIncome").textContent =
    formatWon(monthSideIncome);
  document.getElementById("monthSpend").textContent = formatWon(monthSpend);

  // ---- 닉네임별 daily 날짜 집합 ----
  const byNick = {};
  entries
    .filter((e) => e.category === "daily" && e.nickname)
    .forEach((e) => {
      if (!byNick[e.nickname]) byNick[e.nickname] = new Set();
      byNick[e.nickname].add(e.date);
    });

  // ---- 연속 인증일수 순위 ----
  const streakRows = Object.entries(byNick)
    .map(([name, set]) => ({ name, streak: computeStreak(set, today) }))
    .filter((r) => r.streak > 0)
    .sort((a, b) => b.streak - a.streak)
    .slice(0, 5);

  renderRank(
    "streakRank",
    streakRows,
    (r) => r.name,
    (r) => `${r.streak}일`
  );

  // ---- 이번 달 참여왕 (인증 횟수) ----
  const countMap = {};
  monthEntries
    .filter((e) => e.category === "daily" && e.nickname)
    .forEach((e) => {
      countMap[e.nickname] = (countMap[e.nickname] || 0) + 1;
    });
  const countRows = Object.entries(countMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  renderRank(
    "countRank",
    countRows,
    (r) => r.name,
    (r) => `${r.count}회`
  );
}

function renderRank(elId, rows, nameFn, valueFn) {
  const el = document.getElementById(elId);
  if (rows.length === 0) {
    el.innerHTML = `<li class="empty-msg">아직 데이터가 없어요</li>`;
    return;
  }
  const medals = ["🥇", "🥈", "🥉"];
  el.innerHTML = rows
    .map(
      (r, i) => `
      <li>
        <span class="rank-medal">${medals[i] || i + 1}</span>
        <span class="rank-name">${escapeHtml(nameFn(r))}</span>
        <span class="rank-value">${valueFn(r)}</span>
      </li>`
    )
    .join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

ensureNickname();
run();
