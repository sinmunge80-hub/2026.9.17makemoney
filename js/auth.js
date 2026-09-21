// Firebase Authentication (구글 로그인)
// Spark(무료) 요금제에서도 이메일/구글 로그인은 비용 없이 사용할 수 있습니다.
import { firebaseConfig } from "./firebase-config.js";

const FIREBASE_SDK_VERSION = "10.13.0";
const isFirebaseConfigured =
  !!firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith("YOUR_");

let auth = null;
let authMod = null;
let readyPromise = null;

function initAuth() {
  if (!isFirebaseConfigured) return Promise.resolve(false);
  if (readyPromise) return readyPromise;
  readyPromise = (async () => {
    const { initializeApp, getApps, getApp } = await import(
      `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`
    );
    authMod = await import(
      `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-auth.js`
    );
    // db.js도 같은 설정으로 앱을 초기화할 수 있으므로, 이미 초기화돼 있으면 재사용합니다.
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    auth = authMod.getAuth(app);
    return true;
  })();
  return readyPromise;
}

export function isAuthAvailable() {
  return isFirebaseConfigured;
}

// 팝업 방식은 모바일 브라우저에서 조용히 차단되는 경우가 많아, 페이지 이동
// 방식(리다이렉트)을 씁니다. 이 함수를 호출하면 구글 로그인 화면으로
// 페이지가 이동하고, 로그인 후 다시 이 사이트로 돌아옵니다.
export async function signInWithGoogle() {
  const ready = await initAuth();
  if (!ready) throw new Error("FIREBASE_NOT_CONFIGURED");
  const provider = new authMod.GoogleAuthProvider();
  await authMod.signInWithRedirect(auth, provider);
}

/** 리다이렉트로 돌아온 직후 한 번 호출해 로그인 결과(user|null)를 가져옵니다. */
export async function consumeRedirectResult() {
  const ready = await initAuth();
  if (!ready) return null;
  try {
    const result = await authMod.getRedirectResult(auth);
    return result ? result.user : null;
  } catch (err) {
    console.error("구글 로그인 리다이렉트 처리 실패:", err);
    return null;
  }
}

export async function signOutUser() {
  const ready = await initAuth();
  if (!ready) return;
  await authMod.signOut(auth);
}

/** user가 바뀔 때마다 callback(user|null)을 호출합니다. */
export async function onAuthChange(callback) {
  const ready = await initAuth();
  if (!ready) {
    callback(null);
    return;
  }
  authMod.onAuthStateChanged(auth, callback);
}
