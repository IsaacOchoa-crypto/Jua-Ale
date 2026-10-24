/* ============================================================
   PUNTO DE ENTRADA PRINCIPAL (MAIN.JS)
============================================================ */
import { 
  initScrollAndAnimations, 
  initSplashAndMusic, 
  initCountdown, 
  initCopyClabe, 
  initCalendarIntegration,
  initAmbientPetals,
  initLightbox, 
  initRsvpForm 
} from './ui.js';

import { 
  initQrCode, 
  initUploadModal, 
  initLiveWall,
  initSlideshowControls
} from './photo-wall.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Inicializar animaciones de scroll (GSAP / Lenis) y atmósfera de pétalos
  initScrollAndAnimations();
  initAmbientPetals();

  // 2. Control de Splash Screen y Música
  initSplashAndMusic();

  // 3. Cuenta regresiva, calendario, CLABE y utilidades
  initCountdown();
  initCalendarIntegration();
  initCopyClabe();
  initLightbox();
  initRsvpForm();

  // 4. Módulo estrella "Capturando Momentos" (QR, Modal de Cámara, Muro en Vivo y Modo Proyector)
  initQrCode();
  initUploadModal();
  initLiveWall();
  initSlideshowControls();
});
