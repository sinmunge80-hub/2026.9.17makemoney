// 인증 항목에 달리는 댓글(응원/피드백) 공용 위젯
// daily.html 등 여러 페이지에서 재사용합니다.
import { addEntry, getEntriesByCategory } from "./db.js";
import { ensureNickname, showToast, getGoogleEmail } from "./app.js";
import { PROFILE } from "./profile-data.js";

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

/** 구글 이메일(있으면 우선) 또는 닉네임으로 운영자 여부를 판별합니다. */
export function isOperatorAuthor(entry) {
  if (PROFILE.operatorEmail && entry.authorEmail) {
    return entry.authorEmail === PROFILE.operatorEmail;
  }
  return !!PROFILE.operatorNickname && entry.nickname === PROFILE.operatorNickname;
}

/** 전체 댓글을 한 번에 가져와 targetId별로 묶어줍니다. */
export async function loadCommentsByTarget() {
  const comments = await getEntriesByCategory("comment");
  comments.sort((a, b) => a.createdAt - b.createdAt);
  const map = {};
  comments.forEach((c) => {
    if (!c.targetId) return;
    if (!map[c.targetId]) map[c.targetId] = [];
    map[c.targetId].push(c);
  });
  return map;
}

/** 인증 항목 하나에 들어갈 댓글 토글+스레드+작성폼 HTML을 만듭니다. */
export function renderCommentBlock(targetId, comments) {
  const list = comments || [];
  const items = list
    .map(
      (c) => `
      <div class="comment-item">
        <span class="comment-nickname">${escapeHtml(c.nickname)}${
        isOperatorAuthor(c) ? '<span class="badge-operator">운영자</span>' : ""
      }</span>
        <span class="comment-text">${escapeHtml(c.content)}</span>
      </div>`
    )
    .join("");

  return `
    <div class="comment-block">
      <button type="button" class="comment-toggle" data-target-id="${targetId}">
        💬 댓글 ${list.length}개
      </button>
      <div class="comment-panel" data-target-id="${targetId}" hidden>
        <div class="comment-list">${
          items || '<p class="empty-msg">첫 댓글을 남겨보세요!</p>'
        }</div>
        <form class="comment-form" data-target-id="${targetId}">
          <input type="text" class="comment-input" placeholder="응원 한마디 남기기" required />
          <button type="submit" class="comment-submit">등록</button>
        </form>
      </div>
    </div>`;
}

/**
 * 댓글 토글/등록 이벤트를 컨테이너에 한 번만 위임 등록합니다.
 * (목록이 innerHTML로 다시 그려져도 이벤트는 유지됩니다)
 */
export function wireCommentEvents(container, onPosted) {
  if (container._commentsWired) return;
  container._commentsWired = true;

  container.addEventListener("click", (e) => {
    const btn = e.target.closest(".comment-toggle");
    if (!btn) return;
    const panel = container.querySelector(
      `.comment-panel[data-target-id="${btn.dataset.targetId}"]`
    );
    if (panel) panel.hidden = !panel.hidden;
  });

  container.addEventListener("submit", async (e) => {
    const form = e.target.closest(".comment-form");
    if (!form) return;
    e.preventDefault();
    const nickname = ensureNickname();
    if (!nickname) return;
    const input = form.querySelector(".comment-input");
    const content = input.value.trim();
    if (!content) return;

    const submitBtn = form.querySelector(".comment-submit");
    submitBtn.disabled = true;
    try {
      await addEntry({
        category: "comment",
        targetId: form.dataset.targetId,
        nickname,
        authorEmail: getGoogleEmail(),
        content,
        date: new Date().toISOString().slice(0, 10),
      });
      input.value = "";
      showToast("댓글을 남겼어요 💬");
      if (onPosted) await onPosted();
    } catch (err) {
      console.error(err);
      showToast("댓글 등록에 실패했어요. 다시 시도해주세요.");
    } finally {
      submitBtn.disabled = false;
    }
  });
}
