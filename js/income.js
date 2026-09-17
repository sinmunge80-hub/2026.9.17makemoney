import { addEntry, getEntries } from "./db.js";
import {
  renderShell,
  getNickname,
  setNickname,
  formatWon,
  todayStr,
  monthOf,
  showToast,
} from "./app.js";
import { buildIncomePrompt } from "./gemini.js";
import { setupAIWidget, requestAIComment, wireRetry } from "./ai-widget.js";

renderShell("income", "부수입 인증");
setupAIWidget();

let lastEntryData = null;
wireRetry(() => buildIncomePrompt(lastEntryData));

const today = todayStr();
document.getElementById("nickname").value = getNickname();

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

document.getElementById("incomeForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const nickname = document.getElementById("nickname").value.trim();
  const amount = document.getElementById("amount").value;
  if (!nickname || amount === "") return;
  setNickname(nickname);

  const source = document.getElementById("source").value.trim();
  const memo = document.getElementById("memo").value.trim();

  const submitBtn = e.target.querySelector("button[type=submit]");
  submitBtn.disabled = true;
  submitBtn.textContent = "저장 중...";

  try {
    await addEntry(
      {
        nickname,
        category: "income",
        date: today,
        sideIncomeAmount: Number(amount),
        sideIncomeSource: source,
        memo,
      },
      selectedFile
    );
    showToast("부수입 인증 완료! 오늘도 한 걸음 더 🚀");
    lastEntryData = { nickname, amount: Number(amount), source, memo };
    requestAIComment(() => buildIncomePrompt(lastEntryData));
    document.getElementById("amount").value = "";
    document.getElementById("source").value = "";
    document.getElementById("memo").value = "";
    photoInput.value = "";
    selectedFile = null;
    photoPreview.classList.remove("show");
    run();
  } catch (err) {
    console.error(err);
    showToast("저장 중 문제가 발생했어요. 다시 시도해주세요.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "부수입 인증하기 💰";
  }
});

async function run() {
  const entries = await getEntries();
  const incomeEntries = entries.filter((e) => e.category === "income");

  const ym = monthOf(today);
  const monthEntries = incomeEntries.filter((e) => monthOf(e.date) === ym);
  const monthTotal = monthEntries.reduce(
    (s, e) => s + (Number(e.sideIncomeAmount) || 0),
    0
  );
  document.getElementById("monthTotal").textContent = formatWon(monthTotal);
  document.getElementById("monthCount").textContent = `${monthEntries.length}건`;

  const list = incomeEntries.sort((a, b) => b.createdAt - a.createdAt).slice(0, 15);
  const el = document.getElementById("entryList");
  if (list.length === 0) {
    el.innerHTML = `<p class="empty-msg">아직 부수입 인증 기록이 없어요.</p>`;
    return;
  }
  el.innerHTML = list
    .map(
      (e) => `
      <div class="entry-item">
        ${
          e.photoURL
            ? `<img class="entry-thumb" src="${e.photoURL}" alt="">`
            : `<div class="entry-thumb"></div>`
        }
        <div class="entry-body">
          <div class="entry-top">
            <span>${escapeHtml(e.nickname)}</span>
            <span>+${formatWon(e.sideIncomeAmount)}</span>
          </div>
          <div class="entry-memo">${escapeHtml(e.sideIncomeSource || "")}${
        e.memo ? " · " + escapeHtml(e.memo) : ""
      }</div>
          <div class="entry-meta">${e.date}</div>
        </div>
      </div>`
    )
    .join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

run();
