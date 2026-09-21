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
import { INCOME_CATEGORIES, categoryLabel } from "./income-categories.js";

renderShell("income", "부수입 인증");
setupAIWidget();

let lastEntryData = null;
wireRetry(() => buildIncomePrompt(lastEntryData));

const today = todayStr();
document.getElementById("nickname").value = getNickname();

const categorySelect = document.getElementById("category");
categorySelect.innerHTML = INCOME_CATEGORIES.map(
  (c) => `<option value="${c.id}">${escapeHtml(c.label)}</option>`
).join("");

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
  const incomeCategory = categorySelect.value;
  const memo = document.getElementById("memo").value.trim();

  const submitBtn = e.target.querySelector("button[type=submit]");
  submitBtn.disabled = true;
  submitBtn.textContent = "저장 중...";

  try {
    const saved = await addEntry(
      {
        nickname,
        category: "income",
        date: today,
        sideIncomeAmount: Number(amount),
        sideIncomeSource: source,
        incomeCategory,
        memo,
      },
      selectedFile
    );
    showToast(
      saved.photoSkipped
        ? "부수입 인증 완료! 다만 사진 용량이 너무 커서 사진은 저장하지 못했어요 📸"
        : "부수입 인증 완료! 오늘도 한 걸음 더 🚀"
    );
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

  renderCategoryChart(monthEntries, monthTotal);

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
          <div class="entry-memo">
            ${
              e.incomeCategory
                ? `<span class="entry-tag" style="background:var(--cat-${e.incomeCategory})">${escapeHtml(
                    categoryLabel(e.incomeCategory)
                  )}</span> `
                : ""
            }${escapeHtml(e.sideIncomeSource || "")}${
        e.memo ? " · " + escapeHtml(e.memo) : ""
      }</div>
          <div class="entry-meta">${e.date}</div>
        </div>
      </div>`
    )
    .join("");
}

function renderCategoryChart(monthEntries, monthTotal) {
  const totals = {};
  monthEntries.forEach((e) => {
    const id = e.incomeCategory || "etc";
    totals[id] = (totals[id] || 0) + (Number(e.sideIncomeAmount) || 0);
  });

  const rows = INCOME_CATEGORIES.map((c) => ({ ...c, amount: totals[c.id] || 0 }))
    .filter((r) => r.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const el = document.getElementById("categoryChart");
  if (rows.length === 0) {
    el.innerHTML = `<p class="empty-msg">이번 달 부수입 기록이 없어요</p>`;
    return;
  }

  el.innerHTML = rows
    .map((r) => {
      const pct = monthTotal > 0 ? Math.round((r.amount / monthTotal) * 100) : 0;
      return `
        <div class="cat-bar-row">
          <div class="cat-bar-top">
            <span class="cat-dot" style="background:var(--cat-${r.id})"></span>
            <span class="cat-bar-name">${escapeHtml(r.label)}</span>
            <span class="cat-bar-pct">${pct}%</span>
          </div>
          <div class="cat-bar-track">
            <div class="cat-bar-fill" style="width:${pct}%; background:var(--cat-${r.id})"></div>
          </div>
          <div class="cat-bar-amount">${formatWon(r.amount)}</div>
        </div>`;
    })
    .join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

run();
