// 데이터 저장 계층
// firebase-config.js 에 실제 키가 채워져 있으면 Firebase(Firestore)를 사용하고,
// 아니면 이 브라우저의 localStorage 를 사용하는 "로컬 체험 모드"로 자동 전환됩니다.
// Firebase Storage는 Spark(무료) 요금제에서 결제수단 등록을 요구하는 경우가 있어
// 사용하지 않으며, 사진은 작게 압축해 Firestore 문서 안에 직접 저장합니다.
import { firebaseConfig } from "./firebase-config.js";

const FIREBASE_SDK_VERSION = "10.13.0";
const isFirebaseConfigured =
  !!firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith("YOUR_");

let firestore = null;
let firestoreMod = null;
let readyPromise = null;

function initFirebase() {
  if (!isFirebaseConfigured) return Promise.resolve(false);
  if (readyPromise) return readyPromise;
  readyPromise = (async () => {
    const { initializeApp, getApps, getApp } = await import(
      `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`
    );
    firestoreMod = await import(
      `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`
    );
    // auth.js도 같은 설정으로 앱을 초기화할 수 있으므로, 이미 초기화돼 있으면 재사용합니다.
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    firestore = firestoreMod.getFirestore(app);
    return true;
  })();
  return readyPromise;
}

export function isCloudMode() {
  return isFirebaseConfigured;
}

const LOCAL_KEY = "mm_entries_v1";

function localGetAll() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
  } catch {
    return [];
  }
}

function localSaveAll(list) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
}

function makeId() {
  return "e_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
}

function resizeToDataURL(file, maxWidth, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Firestore 문서는 1MB를 넘을 수 없어서, 사진을 점점 더 압축해가며
// 안전한 크기(~700KB) 밑으로 맞춥니다. 그래도 안 되면 사진 없이 저장합니다.
const MAX_PHOTO_DATA_URL_LENGTH = 700_000;

async function compressPhoto(file) {
  let width = 640;
  let quality = 0.6;
  for (let attempt = 0; attempt < 4; attempt++) {
    const dataUrl = await resizeToDataURL(file, width, quality);
    if (dataUrl.length < MAX_PHOTO_DATA_URL_LENGTH) return dataUrl;
    width = Math.round(width * 0.75);
    quality = Math.max(0.35, quality - 0.15);
  }
  return null;
}

/**
 * entry: { nickname, category: 'daily'|'weekly'|'monthly'|'income',
 *          date, spend, sideIncomeAmount, sideIncomeSource, memo }
 */
export async function addEntry(entry, photoFile) {
  const ready = await initFirebase();
  const id = makeId();
  const record = { id, createdAt: Date.now(), photoURL: null, ...entry };

  if (photoFile) {
    const dataUrl = await compressPhoto(photoFile);
    if (dataUrl) {
      record.photoURL = dataUrl;
    } else {
      record.photoSkipped = true;
    }
  }

  if (ready) {
    await firestoreMod.setDoc(
      firestoreMod.doc(firestore, "entries", id),
      record
    );
    return record;
  }

  const all = localGetAll();
  all.push(record);
  localSaveAll(all);
  return record;
}

export async function getEntries() {
  const ready = await initFirebase();
  if (ready) {
    const snap = await firestoreMod.getDocs(
      firestoreMod.collection(firestore, "entries")
    );
    return snap.docs.map((d) => d.data());
  }
  return localGetAll();
}

// category만 필요한 화면(질문게시판, 댓글, 커뮤니티 링크 등)에서 전체 컬렉션을
// 읽지 않고 필요한 문서만 가져와 Firestore 무료 읽기 한도를 아낍니다.
export async function getEntriesByCategory(category) {
  const ready = await initFirebase();
  if (ready) {
    const q = firestoreMod.query(
      firestoreMod.collection(firestore, "entries"),
      firestoreMod.where("category", "==", category)
    );
    const snap = await firestoreMod.getDocs(q);
    return snap.docs.map((d) => d.data());
  }
  return localGetAll().filter((e) => e.category === category);
}

export async function deleteEntry(id) {
  const ready = await initFirebase();
  if (ready) {
    await firestoreMod.deleteDoc(firestoreMod.doc(firestore, "entries", id));
    return;
  }
  const all = localGetAll().filter((e) => e.id !== id);
  localSaveAll(all);
}
