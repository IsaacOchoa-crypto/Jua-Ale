/* ============================================================
   PUNTO DE ENTRADA PRINCIPAL (MAIN.JS)
============================================================ */
import { 
  initScrollAndAnimations, 
  initSplashAndMusic, 
  initCountdown, 
  initCopyClabe, 
  initLightbox, 
  initRsvpForm 
} from './ui.js';

import { 
  initQrCode, 
  initUploadModal, 
  initLiveWall 
} from './photo-wall.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Inicializar animaciones de scroll (GSAP / Lenis)
  initScrollAndAnimations();

  // 2. Control de Splash Screen y Música
  initSplashAndMusic();

  // 3. Cuenta regresiva y utilidades
  initCountdown();
  initCopyClabe();
  initLightbox();
  initRsvpForm();

  // 4. Módulo estrella "Capturando Momentos" (QR, Modal de Cámara y Muro en Vivo)
  initQrCode();
  initUploadModal();
  initLiveWall();
});
