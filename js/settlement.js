import { addEntry, getEntries } from "./db.js";
import {
  renderShell,
  getNickname,
  setNickname,
  formatWon,
  todayStr,
  weekRange,
  weekLabel,
  monthOf,
  monthLabel,
  showToast,
} from "./app.js";

renderShell("settlement", "주간·월간 결산");

const today = todayStr();
const wr = weekRange(today);
const ym = monthOf(today);

let mode = "weekly"; // 'weekly' | 'monthly'
let allEntries = [];

document.getElementById("nickname").value = getNickname();

document.getElementById("tabWeekly").addEventListener("click", () => setMode("weekly"));
document.getElementById("tabMonthly").addEventListener("click", () => setMode("monthly"));

function setMode(m) {
  mode = m;
  document.getElementById("tabWeekly").classList.toggle("active", m === "weekly");
  document.getElementById("tabMonthly").classList.toggle("active", m === "monthly");

  if (m === "weekly") {
    document.getElementById("periodTitle").innerHTML =
      '이번 주 결산 <span class="sub" id="periodLabel"></span>';
    document.getElementById("formTitle").textContent = "주간 결산 인증하기";
    document.getElementById("memoLabel").textContent = "이번 주 소감 / 다음 주 다짐";
  } else {
    document.getElementById("periodTitle").innerHTML =
      '이번 달 결산 <span class="sub" id="periodLabel"></span>';
    document.getElementById("formTitle").textContent = "월간 결산 인증하기";
    document.getElementById("memoLabel").textContent = "이번 달 소감 / 다음 달 목표";
  }
  document.getElementById("periodLabel").textContent =
    m === "weekly" ? `(${weekLabel(wr)})` : `(${monthLabel(ym)})`;

  render();
}

function inPeriod(dateStr) {
  if (!dateStr) return false;
  if (mode === "weekly") return dateStr >= wr.start && dateStr <= wr.end;
  return monthOf(dateStr) === ym;
}

function render() {
  const daily = allEntries.filter(
    (e) => e.category === "daily" && inPeriod(e.date)
  );
  const income = allEntries.filter(
    (e) => e.category === "income" && inPeriod(e.date)
  );

  const totalSpend = daily.reduce((s, e) => s + (Number(e.spend) || 0), 0);
  const totalSideIncome = income.reduce(
    (s, e) => s + (Number(e.sideIncomeAmount) || 0),
    0
  );

  document.getElementById("certCount").textContent = `${daily.length}건`;
  document.getElementById("totalSpend").textContent = formatWon(totalSpend);
  document.getElementById("totalSideIncome").textContent = formatWon(totalSideIncome);

  const byNick = {};
  daily.forEach((e) => {
    if (!e.nickname) return;
    if (!byNick[e.nickname]) byNick[e.nickname] = { count: 0, spend: 0 };
    byNick[e.nickname].count++;
    byNick[e.nickname].spend += Number(e.spend) || 0;
  });

  const rows = Object.entries(byNick)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.count - a.count);

  const listEl = document.getElementById("participantList");
  if (rows.length === 0) {
    listEl.innerHTML = `<li class="empty-msg">이 기간 인증 기록이 없어요</li>`;
  } else {
    listEl.innerHTML = rows
      .map(
        (r) => `
        <li>
          <span class="rank-name">${escapeHtml(r.name)}</span>
          <span class="rank-value">${r.count}회 · ${formatWon(r.spend)}</span>
        </li>`
      )
      .join("");
  }
}

const photoInput = document.getElementById("photo");
const photoPreview = document.getElementById("photoPreview");
let selectedFile = null;

photoInput.addEventListener("change", () => {
  selectedFile = photoInput.files[0] || null;
  if (selectedFile) {
    photoPreview.src = URL.createObjectURL(selectedFile);
    photoPreview.classList.add("show");
  } else {
    photoPreview.classList.remove("show");
  }
});

document
  .getElementById("settlementForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const nickname = document.getElementById("nickname").value.trim();
    if (!nickname) return;
    setNickname(nickname);
    const memo = document.getElementById("memo").value.trim();

    const submitBtn = e.target.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    submitBtn.textContent = "저장 중...";

    try {
      await addEntry(
        {
          nickname,
          category: mode, // 'weekly' | 'monthly'
          date: today,
          memo,
        },
        selectedFile
      );
      showToast(
        mode === "weekly"
          ? "이번 주 결산 인증 완료! 수고하셨어요 🏁"
          : "이번 달 결산 인증 완료! 대단해요 🎊"
      );
      document.getElementById("memo").value = "";
      photoInput.value = "";
      selectedFile = null;
      photoPreview.classList.remove("show");
    } catch (err) {
      console.error(err);
      showToast("저장 중 문제가 발생했어요. 다시 시도해주세요.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent =
        mode === "weekly" ? "결산 인증하기 🏁" : "결산 인증하기 🏁";
    }
  });

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

async function init() {
  allEntries = await getEntries();
  setMode("weekly");
}

init();
