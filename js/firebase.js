/* ============================================================
   MÓDULO DE FIREBASE FIRESTORE v10 (TIEMPO REAL)
============================================================ */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  increment 
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { FIREBASE_CONFIG } from './config.js';

/* Inicialización */
const app = initializeApp(FIREBASE_CONFIG);
export const db = getFirestore(app);
export const momentsCollection = collection(db, "wedding_moments");

/**
 * Guarda un nuevo momento fotográfico en Firestore.
 */
export async function addWeddingMoment({ imageUrl, hdUrl, guestName, category, caption }) {
  return await addDoc(momentsCollection, {
    imageUrl,
    hdUrl,
    guestName,
    category,
    caption,
    likes: 0,
    createdAt: serverTimestamp()
  });
}

/**
 * Suscribe la aplicación a los cambios en tiempo real del álbum de fotos.
 */
export function subscribeToMoments(onUpdate, onError) {
  const q = query(momentsCollection, orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const moments = [];
    snapshot.forEach((docSnap) => {
      moments.push({ id: docSnap.id, ...docSnap.data() });
    });
    if (typeof onUpdate === 'function') onUpdate(moments);
  }, (err) => {
    console.error("Error en conexión en vivo con Firestore:", err);
    if (typeof onError === 'function') onError(err);
  });
}

/**
 * Incrementa el contador de likes en Firestore usando increment(1).
 */
export async function toggleLikeFirestore(docId) {
  const storageKey = `liked_moment_${docId}`;
  if (localStorage.getItem(storageKey)) {
    return { success: false, reason: 'already_liked' };
  }

  const photoRef = doc(db, "wedding_moments", docId);
  await updateDoc(photoRef, {
    likes: increment(1)
  });

  localStorage.setItem(storageKey, 'true');
  return { success: true };
}
