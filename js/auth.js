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

export async function signInWithGoogle() {
  const ready = await initAuth();
  if (!ready) throw new Error("FIREBASE_NOT_CONFIGURED");
  const provider = new authMod.GoogleAuthProvider();
  const result = await authMod.signInWithPopup(auth, provider);
  return result.user;
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
