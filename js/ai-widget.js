// daily/settlement/income 페이지에서 공통으로 쓰는 AI 응원 댓글 위젯 로직
import { hasApiKey, generateText } from "./gemini.js";
import { showToast } from "./app.js";

export function setupAIWidget() {
  const notice = document.getElementById("aiKeyNotice");
  if (notice) notice.style.display = hasApiKey() ? "none" : "block";

  const copyBtn = document.getElementById("aiCopyBtn");
  const content = document.getElementById("aiContent");
  if (copyBtn && content) {
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(content.textContent || "");
        showToast("복사했어요! 단톡방에 붙여넣어보세요 📋");
      } catch {
        showToast("복사에 실패했어요. 직접 선택해서 복사해주세요.");
      }
    });
  }
}

export async function requestAIComment(promptFn) {
  if (!hasApiKey()) return;
  const card = document.getElementById("aiCard");
  const content = document.getElementById("aiContent");
  const retryBtn = document.getElementById("aiRetryBtn");
  if (!card || !content) return;

  card.style.display = "block";
  content.textContent = "AI가 응원 메시지를 작성 중이에요...";
  content.classList.add("ai-loading");
  if (retryBtn) retryBtn.disabled = true;

  try {
    const text = await generateText(promptFn());
    content.textContent = text;
  } catch (err) {
    content.textContent =
      err.friendly || "AI 응원 댓글을 불러오지 못했어요. 다시 시도해주세요.";
  } finally {
    content.classList.remove("ai-loading");
    if (retryBtn) retryBtn.disabled = false;
  }
}

export function wireRetry(promptFn) {
  const retryBtn = document.getElementById("aiRetryBtn");
  if (!retryBtn) return;
  retryBtn.addEventListener("click", () => requestAIComment(promptFn));
}
