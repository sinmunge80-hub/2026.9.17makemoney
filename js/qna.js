import { addEntry, getEntriesByCategory } from "./db.js";
import { renderShell, getNickname, setNickname, showToast, getGoogleEmail } from "./app.js";
import {
  loadCommentsByTarget,
  renderCommentBlock,
  wireCommentEvents,
  isOperatorAuthor,
} from "./comments.js";

renderShell("qna", "질문게시판");

document.getElementById("nickname").value = getNickname();

const questionList = document.getElementById("questionList");
wireCommentEvents(questionList, loadQuestions);

document.getElementById("questionForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const nickname = document.getElementById("nickname").value.trim();
  const title = document.getElementById("title").value.trim();
  const content = document.getElementById("content").value.trim();
  if (!nickname || !title || !content) return;
  setNickname(nickname);

  const submitBtn = e.target.querySelector("button[type=submit]");
  submitBtn.disabled = true;
  submitBtn.textContent = "등록 중...";
  try {
    await addEntry({
      category: "question",
      nickname,
      authorEmail: getGoogleEmail(),
      title,
      content,
      date: new Date().toISOString().slice(0, 10),
    });
    showToast("질문이 등록됐어요! 운영자가 확인 후 답변드릴게요 🙌");
    document.getElementById("title").value = "";
    document.getElementById("content").value = "";
    loadQuestions();
  } catch (err) {
    console.error(err);
    showToast("등록 중 문제가 발생했어요. 다시 시도해주세요.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "질문 남기기";
  }
});

async function loadQuestions() {
  const [questions, commentsByTarget] = await Promise.all([
    getEntriesByCategory("question"),
    loadCommentsByTarget(),
  ]);
  questions.sort((a, b) => b.createdAt - a.createdAt);

  if (questions.length === 0) {
    questionList.innerHTML = `<p class="empty-msg">아직 등록된 질문이 없어요. 첫 질문을 남겨보세요!</p>`;
    return;
  }

  questionList.innerHTML = questions
    .map((q) => {
      const answered = (commentsByTarget[q.id] || []).length > 0;
      return `
      <div class="qna-item">
        <div class="qna-top">
          <span class="qna-title">${escapeHtml(q.title)}</span>
          <span class="qna-meta">${answered ? "✅ 답변완료" : "⏳ 답변대기"}</span>
        </div>
        <div class="qna-author">${escapeHtml(q.nickname)}${
        isOperatorAuthor(q) ? '<span class="badge-operator">운영자</span>' : ""
      } · ${q.date}</div>
        <div class="qna-content">${escapeHtml(q.content)}</div>
        ${renderCommentBlock(q.id, commentsByTarget[q.id])}
      </div>`;
    })
    .join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

loadQuestions();
