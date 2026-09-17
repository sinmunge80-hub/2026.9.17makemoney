import { renderShell, showToast } from "./app.js";
import { getApiKey, setApiKey, clearApiKey, maskApiKey, generateText } from "./gemini.js";

renderShell("settings", "설정");

const input = document.getElementById("apiKeyInput");
const keyStatus = document.getElementById("keyStatus");
const toggleShowBtn = document.getElementById("toggleShowBtn");
const saveBtn = document.getElementById("saveBtn");
const testBtn = document.getElementById("testBtn");
const clearBtn = document.getElementById("clearBtn");

function refreshStatus() {
  const key = getApiKey();
  keyStatus.textContent = key ? `저장됨 (${maskApiKey(key)})` : "미등록";
}

refreshStatus();

toggleShowBtn.addEventListener("click", () => {
  input.type = input.type === "password" ? "text" : "password";
  toggleShowBtn.textContent = input.type === "password" ? "👁️" : "🙈";
});

saveBtn.addEventListener("click", () => {
  const value = input.value.trim();
  if (!value) {
    showToast("API 키를 입력해주세요");
    return;
  }
  setApiKey(value);
  input.value = "";
  refreshStatus();
  showToast("API 키가 저장되었어요 ✅");
});

clearBtn.addEventListener("click", () => {
  clearApiKey();
  refreshStatus();
  showToast("API 키를 삭제했어요");
});

testBtn.addEventListener("click", async () => {
  if (!getApiKey() && !input.value.trim()) {
    showToast("먼저 API 키를 입력하고 저장해주세요");
    return;
  }
  if (input.value.trim()) {
    setApiKey(input.value.trim());
    input.value = "";
    refreshStatus();
  }
  testBtn.disabled = true;
  const originalText = testBtn.textContent;
  testBtn.textContent = "테스트 중...";
  try {
    await generateText("짧게 '안녕하세요!'라고만 답해주세요.");
    showToast("연결 성공! AI 기능을 사용할 수 있어요 🎉");
  } catch (err) {
    showToast(err.friendly || "키 테스트에 실패했어요");
  } finally {
    testBtn.disabled = false;
    testBtn.textContent = originalText;
  }
});
