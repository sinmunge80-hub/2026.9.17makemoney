import { addEntry, getEntriesByCategory } from "./db.js";
import {
  renderShell,
  getNickname,
  setNickname,
  ensureNickname,
  showToast,
  getGoogleEmail,
  todayStr,
} from "./app.js";
import {
  loadCommentsByTarget,
  renderCommentBlock,
  wireCommentEvents,
  isOperatorAuthor,
} from "./comments.js";
import { MONTHLY_BOOKS } from "./monthly-books.js";

renderShell("mission", "과제·미션");

document.getElementById("nickname").value = getNickname();

document.getElementById("bookList").innerHTML = MONTHLY_BOOKS.map(
  (b, i) => `
  <div class="book-slot">
    <span class="book-slot-num">${i + 1}</span>
    <div class="book-slot-body">
      <a href="${escapeAttr(b.url)}" target="_blank" rel="noopener"><strong>${escapeHtml(
    b.title
  )}</strong></a>
      <div class="book-slot-author">${escapeHtml(b.author || "")}</div>
      <div class="book-slot-desc">${escapeHtml(b.desc || "")}</div>
    </div>
  </div>`
).join("");

const missionList = document.getElementById("missionList");
wireCommentEvents(missionList, loadMissions);

missionList.addEventListener("click", async (e) => {
  const btn = e.target.closest(".mission-complete-btn");
  if (!btn || btn.classList.contains("done")) return;
  const nickname = ensureNickname();
  if (!nickname) return;

  btn.disabled = true;
  try {
    await addEntry({
      category: "mission-complete",
      targetId: btn.dataset.missionId,
      nickname,
      authorEmail: getGoogleEmail(),
      date: todayStr(),
    });
    showToast("과제 인증 완료! 잘하셨어요 🙌");
    loadMissions();
  } catch (err) {
    console.error(err);
    showToast("인증 중 문제가 발생했어요. 다시 시도해주세요.");
    btn.disabled = false;
  }
});

document.getElementById("missionForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const nickname = document.getElementById("nickname").value.trim();
  const weekNum = Number(document.getElementById("weekNum").value);
  const dayNum = Number(document.getElementById("dayNum").value);
  const title = document.getElementById("title").value.trim();
  const content = document.getElementById("content").value.trim();
  if (!nickname || !content) return;
  setNickname(nickname);

  const submitBtn = e.target.querySelector("button[type=submit]");
  submitBtn.disabled = true;
  submitBtn.textContent = "등록 중...";
  try {
    await addEntry({
      category: "mission",
      nickname,
      authorEmail: getGoogleEmail(),
      weekNum,
      dayNum,
      title,
      content,
      date: todayStr(),
    });
    showToast("과제가 등록됐어요! 📌");
    document.getElementById("title").value = "";
    document.getElementById("content").value = "";
    loadMissions();
  } catch (err) {
    console.error(err);
    showToast("등록 중 문제가 발생했어요. 다시 시도해주세요.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "과제 등록하기";
  }
});

async function loadMissions() {
  const [missions, completions, commentsByTarget] = await Promise.all([
    getEntriesByCategory("mission"),
    getEntriesByCategory("mission-complete"),
    loadCommentsByTarget(),
  ]);

  missions.sort((a, b) => {
    if ((a.weekNum || 0) !== (b.weekNum || 0)) return (a.weekNum || 0) - (b.weekNum || 0);
    if ((a.dayNum || 0) !== (b.dayNum || 0)) return (a.dayNum || 0) - (b.dayNum || 0);
    return a.createdAt - b.createdAt;
  });

  const completionsByMission = {};
  completions.forEach((c) => {
    if (!c.targetId) return;
    if (!completionsByMission[c.targetId]) completionsByMission[c.targetId] = [];
    completionsByMission[c.targetId].push(c);
  });

  const myNickname = getNickname();

  if (missions.length === 0) {
    missionList.innerHTML = `<p class="empty-msg">아직 등록된 과제가 없어요.</p>`;
    return;
  }

  missionList.innerHTML = missions
    .map((m) => {
      const doneList = completionsByMission[m.id] || [];
      const iDidIt = doneList.some((d) => d.nickname === myNickname);
      return `
      <div class="mission-item">
        <div class="mission-top">
          <span class="mission-badge">${m.weekNum}주차 ${m.dayNum}일차</span>
          ${m.title ? `<span class="mission-title">${escapeHtml(m.title)}</span>` : ""}
        </div>
        <div class="mission-author">${escapeHtml(m.nickname)}${
        isOperatorAuthor(m) ? '<span class="badge-operator">운영자</span>' : ""
      } · ${m.date}</div>
        <div class="mission-content">${escapeHtml(m.content)}</div>
        <button type="button" class="mission-complete-btn ${
          iDidIt ? "done" : ""
        }" data-mission-id="${m.id}">
          ${iDidIt ? "✅ 인증완료" : "과제 인증하기"}
        </button>
        <div class="mission-doers">
          ${
            doneList.length > 0
              ? `완료 ${doneList.length}명: ${doneList
                  .map((d) => escapeHtml(d.nickname))
                  .join(", ")}`
              : "아직 인증한 사람이 없어요"
          }
        </div>
        ${renderCommentBlock(m.id, commentsByTarget[m.id])}
      </div>`;
    })
    .join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

function escapeAttr(str) {
  return (str || "#").replace(/"/g, "&quot;");
}

loadMissions();
