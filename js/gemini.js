// Gemini API(gemini-3.5-flash-lite) 연동
// API 키는 사용자가 설정 페이지에서 직접 입력하며, 이 브라우저의 localStorage에만
// 저장됩니다. 요청은 브라우저에서 Google로 직접 전송되고, 별도 서버를 거치지 않습니다.
const KEY_STORAGE = "mm_gemini_key";
const MODEL = "gemini-3.5-flash-lite";

export function getApiKey() {
  return localStorage.getItem(KEY_STORAGE) || "";
}

export function setApiKey(key) {
  localStorage.setItem(KEY_STORAGE, key.trim());
}

export function clearApiKey() {
  localStorage.removeItem(KEY_STORAGE);
}

export function hasApiKey() {
  return !!getApiKey();
}

export function maskApiKey(key) {
  if (!key) return "";
  if (key.length <= 8) return "••••••••";
  return key.slice(0, 4) + "••••••••" + key.slice(-4);
}

function friendlyError(status) {
  if (status === 400) return "API 키 형식이 올바르지 않아요. 설정에서 키를 다시 확인해주세요.";
  if (status === 403) return "API 키가 유효하지 않거나 권한이 없어요. 설정에서 키를 다시 확인해주세요.";
  if (status === 404) return "AI 모델을 찾을 수 없어요. 잠시 후 다시 시도해주세요.";
  if (status === 429) return "요청이 너무 많아요. 잠시 후 다시 시도해주세요.";
  return "AI 요청 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.";
}

/**
 * @param {string} prompt
 * @returns {Promise<string>}
 */
export async function generateText(prompt) {
  const key = getApiKey();
  if (!key) {
    const err = new Error("NO_API_KEY");
    err.code = "NO_API_KEY";
    throw err;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(
    key
  )}`;

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.9, maxOutputTokens: 300 },
      }),
    });
  } catch {
    const err = new Error("NETWORK_ERROR");
    err.code = "NETWORK_ERROR";
    err.friendly = "네트워크 연결을 확인해주세요.";
    throw err;
  }

  if (!res.ok) {
    const err = new Error(`API_ERROR_${res.status}`);
    err.code = "API_ERROR";
    err.status = res.status;
    err.friendly = friendlyError(res.status);
    throw err;
  }

  const data = await res.json();
  const text = (data?.candidates?.[0]?.content?.parts || [])
    .map((p) => p.text || "")
    .join("")
    .trim();

  if (!text) {
    const err = new Error("EMPTY_RESPONSE");
    err.code = "EMPTY_RESPONSE";
    err.friendly = "AI가 답변을 생성하지 못했어요. 다시 시도해주세요.";
    throw err;
  }
  return text;
}

const PERSONA =
  "당신은 '메이크머니 해빗챌린지'라는 경제·재테크 습관 챌린지를 함께 운영하는 다정한 코치입니다. " +
  "챌린지원이 방금 인증을 올렸습니다. 한국어 구어체로, 짧고(2~3문장) 진심이 느껴지게 응원 댓글을 써주세요. " +
  "이모지는 1~2개만 자연스럽게 사용하고, 훈계나 지적 없이 격려와 공감 위주로 작성하세요. " +
  "댓글 본문만 출력하고 따옴표나 설명은 붙이지 마세요.";

export function buildDailyPrompt({ nickname, spend, memo }) {
  return `${PERSONA}

- 닉네임: ${nickname}
- 오늘 지출: ${spend ? Number(spend).toLocaleString("ko-KR") + "원" : "0원"}
- 한줄 메모: ${memo || "(메모 없음)"}

오늘의 가계부 인증에 대한 응원 댓글을 작성해주세요.`;
}

export function buildSettlementPrompt({ nickname, periodLabel, count, totalSpend, memo }) {
  return `${PERSONA}

- 닉네임: ${nickname}
- 결산 기간: ${periodLabel}
- 이 기간 인증 횟수: ${count}회
- 이 기간 총 지출: ${totalSpend ? Number(totalSpend).toLocaleString("ko-KR") + "원" : "0원"}
- 결산 소감: ${memo || "(소감 없음)"}

이 결산 인증에 대한 축하와 응원의 댓글을 작성해주세요.`;
}

export function buildIncomePrompt({ nickname, amount, source, memo }) {
  return `${PERSONA}

- 닉네임: ${nickname}
- 부수입 금액: ${amount ? Number(amount).toLocaleString("ko-KR") + "원" : "0원"}
- 부수입 출처: ${source || "미기재"}
- 한줄 메모: ${memo || "(메모 없음)"}

이 부수입 인증에 대한 신나고 축하하는 댓글을 작성해주세요.`;
}
