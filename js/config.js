/* ============================================================
   CONFIGURACIÓN GENERAL Y CREDENCIALES DEL EVENTO
============================================================ */

export const WEDDING_CONFIG = {
  couple: 'Juan & Alejandra',
  shortNames: 'J & A',
  weddingDate: new Date('2027-03-20T17:00:00'),
  whatsapp: '5215512345678', // Reemplazar con el número del organizador / novios
  clabe: '012 180 0154879632 18',
  bank: 'BBVA México'
};

/* Configuración de Cloudinary (Unsigned Upload) */
export const CLOUDINARY_CONFIG = {
  cloudName: 'iux59frd',
  uploadPreset: 'boda_unsigned',
  get uploadUrl() {
    return `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`;
  }
};

/* Configuración de Firebase (SDK v10 Modular) */
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDGiSM-tc_swheretflHPR92IlnYIK-j44",
  authDomain: "boda-invitacion-4d83d.firebaseapp.com",
  projectId: "boda-invitacion-4d83d",
  storageBucket: "boda-invitacion-4d83d.firebasestorage.app",
  messagingSenderId: "310015047951",
  appId: "1:310015047951:web:45585037904bfad458267a",
  measurementId: "G-KRMV4DNKWH"
};
