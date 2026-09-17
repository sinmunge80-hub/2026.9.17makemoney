// 데이터 저장 계층
// firebase-config.js 에 실제 키가 채워져 있으면 Firebase(Firestore+Storage)를 사용하고,
// 아니면 이 브라우저의 localStorage 를 사용하는 "로컬 체험 모드"로 자동 전환됩니다.
import { firebaseConfig } from "./firebase-config.js";

const FIREBASE_SDK_VERSION = "10.13.0";
const isFirebaseConfigured =
  !!firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith("YOUR_");

let firestore = null;
let storage = null;
let firestoreMod = null;
let storageMod = null;
let readyPromise = null;

function initFirebase() {
  if (!isFirebaseConfigured) return Promise.resolve(false);
  if (readyPromise) return readyPromise;
  readyPromise = (async () => {
    const { initializeApp } = await import(
      `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`
    );
    firestoreMod = await import(
      `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`
    );
    storageMod = await import(
      `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-storage.js`
    );
    const app = initializeApp(firebaseConfig);
    firestore = firestoreMod.getFirestore(app);
    storage = storageMod.getStorage(app);
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

function resizeToDataURL(file, maxWidth) {
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
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * entry: { nickname, category: 'daily'|'weekly'|'monthly'|'income',
 *          date, spend, sideIncomeAmount, sideIncomeSource, memo }
 */
export async function addEntry(entry, photoFile) {
  const ready = await initFirebase();
  const id = makeId();
  const record = { id, createdAt: Date.now(), photoURL: null, ...entry };

  if (ready) {
    if (photoFile) {
      const fileRef = storageMod.ref(storage, `photos/${id}_${photoFile.name}`);
      await storageMod.uploadBytes(fileRef, photoFile);
      record.photoURL = await storageMod.getDownloadURL(fileRef);
    }
    await firestoreMod.setDoc(
      firestoreMod.doc(firestore, "entries", id),
      record
    );
    return record;
  }

  if (photoFile) {
    record.photoURL = await resizeToDataURL(photoFile, 700);
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

export async function deleteEntry(id) {
  const ready = await initFirebase();
  if (ready) {
    await firestoreMod.deleteDoc(firestoreMod.doc(firestore, "entries", id));
    return;
  }
  const all = localGetAll().filter((e) => e.id !== id);
  localSaveAll(all);
}
