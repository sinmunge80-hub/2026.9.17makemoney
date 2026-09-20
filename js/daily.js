import { addEntry, getEntries } from "./db.js";
import {
  renderShell,
  getNickname,
  setNickname,
  formatWon,
  todayStr,
  showToast,
} from "./app.js";
import { buildDailyPrompt } from "./gemini.js";
import { setupAIWidget, requestAIComment, wireRetry } from "./ai-widget.js";

renderShell("daily", "일일 가계부 인증");
setupAIWidget();

let lastEntryData = null;
wireRetry(() => buildDailyPrompt(lastEntryData));

const today = todayStr();
document.getElementById("dateLabel").textContent = `(${today})`;
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

document.getElementById("dailyForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const nickname = document.getElementById("nickname").value.trim();
  if (!nickname) return;
  setNickname(nickname);

  const fixedSpendVal = document.getElementById("fixedSpend").value;
  const variableSpendVal = document.getElementById("variableSpend").value;
  const fixedSpend = fixedSpendVal === "" ? 0 : Number(fixedSpendVal);
  const variableSpend = variableSpendVal === "" ? 0 : Number(variableSpendVal);
  const spend = fixedSpend + variableSpend;
  const memo = document.getElementById("memo").value.trim();

  const submitBtn = e.target.querySelector("button[type=submit]");
  submitBtn.disabled = true;
  submitBtn.textContent = "저장 중...";

  try {
    await addEntry(
      {
        nickname,
        category: "daily",
        date: today,
        spend,
        fixedSpend,
        variableSpend,
        memo,
      },
      selectedFile
    );
    showToast("인증 완료! 오늘도 수고하셨어요 🎉");
    lastEntryData = { nickname, spend, memo };
    requestAIComment(() => buildDailyPrompt(lastEntryData));
    document.getElementById("memo").value = "";
    document.getElementById("fixedSpend").value = "";
    document.getElementById("variableSpend").value = "";
    photoInput.value = "";
    selectedFile = null;
    photoPreview.classList.remove("show");
    loadRecent();
  } catch (err) {
    console.error(err);
    showToast("저장 중 문제가 발생했어요. 다시 시도해주세요.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "인증하기 🙌";
  }
});

async function loadRecent() {
  const entries = await getEntries();
  const list = entries
    .filter((e) => e.category === "daily")
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 15);

  const el = document.getElementById("entryList");
  if (list.length === 0) {
    el.innerHTML = `<p class="empty-msg">아직 인증 기록이 없어요.</p>`;
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
            <span>${formatWon(e.spend)}</span>
          </div>
          ${
            e.fixedSpend != null || e.variableSpend != null
              ? `<div class="entry-breakdown">고정 ${formatWon(
                  e.fixedSpend || 0
                )} · 변동 ${formatWon(e.variableSpend || 0)}</div>`
              : ""
          }
          ${e.memo ? `<div class="entry-memo">${escapeHtml(e.memo)}</div>` : ""}
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

loadRecent();
