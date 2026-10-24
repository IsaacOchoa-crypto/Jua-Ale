/* ============================================================
   MÓDULO DE INTERFAZ, ANIMACIONES (GSAP / LENIS) Y NAVEGACIÓN
============================================================ */
import { WEDDING_CONFIG } from './config.js';

export let lenis = null;

/**
 * Inicializa Lenis Smooth Scroll y GSAP ScrollTrigger
 */
export function initScrollAndAnimations() {
  gsap.registerPlugin(ScrollTrigger);

  lenis = new Lenis({ duration: 1.2, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop(); // Bloqueado hasta abrir el sobre

  // Separar caracteres en el Hero para animación escalonada
  document.querySelectorAll('[data-split]').forEach(el => {
    el.innerHTML = [...el.textContent].map(c => `<span class="inline-block opacity-0 hero-char">${c}</span>`).join('');
  });

  // Parallax Hero
  gsap.to('#heroBg', {
    yPercent: 15,
    ease: 'none',
    scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true }
  });

  // Scroll Reveal global
  gsap.utils.toArray('.reveal').forEach(el => {
    gsap.from(el, {
      opacity: 0,
      y: 45,
      duration: 0.9,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' }
    });
  });

  // Línea de tiempo que se dibuja con el scroll
  gsap.fromTo('#tlProgress', { scaleY: 0 }, {
    scaleY: 1,
    ease: 'none',
    scrollTrigger: { trigger: '#timeline', start: 'top 70%', end: 'bottom 70%', scrub: true }
  });
}

/**
 * Control del Splash Screen (Sobre interactivo) y música ambiental
 */
export function initSplashAndMusic() {
  const bgm = document.getElementById('bgm');
  const musicBtn = document.getElementById('musicBtn');
  const eq = document.getElementById('eq');
  const openBtn = document.getElementById('openBtn');

  if (bgm) bgm.volume = 0.45;

  if (openBtn) {
    openBtn.addEventListener('click', () => {
      if (bgm) {
        bgm.play().then(() => eq.classList.remove('paused')).catch(() => {});
      }

      const tl = gsap.timeline({
        onComplete: () => {
          const splash = document.getElementById('splash');
          if (splash) splash.remove();
          document.body.classList.remove('locked');
          if (lenis) lenis.start();
          ScrollTrigger.refresh();
        }
      });

      tl.to('#splashContent', { opacity: 0, scale: 1.1, duration: 0.7, ease: 'power2.in' })
        .to('#curtainL', { xPercent: -100, duration: 1.2, ease: 'power3.inOut' }, '-=0.2')
        .to('#curtainR', { xPercent: 100, duration: 1.2, ease: 'power3.inOut' }, '<')
        .to(musicBtn, { opacity: 1, pointerEvents: 'auto', duration: 0.5 }, '-=0.4')
        .fromTo('.hero-char', { y: 35, opacity: 0 }, { opacity: 1, y: 0, stagger: 0.05, duration: 0.8, ease: 'power3.out' }, '-=0.8')
        .from('.hero-fade', { opacity: 0, y: 20, stagger: 0.15, duration: 0.8, ease: 'power2.out' }, '-=0.5');
    });
  }

  if (musicBtn) {
    musicBtn.addEventListener('click', () => {
      if (bgm.paused) {
        bgm.play();
        eq.classList.remove('paused');
        showToast('Música activada 🎵');
      } else {
        bgm.pause();
        eq.classList.add('paused');
        showToast('Música pausada 🔇');
      }
    });
  }
}

/**
 * Reloj de Cuenta Regresiva dinámico
 */
export function initCountdown() {
  const pad = n => String(n).padStart(2, '0');
  function updateCountdown() {
    const diff = Math.max(0, WEDDING_CONFIG.weddingDate - new Date());
    const d = Math.floor(diff / 864e5);
    const h = Math.floor((diff % 864e5) / 36e5);
    const m = Math.floor((diff % 36e5) / 6e4);
    const s = Math.floor((diff % 6e4) / 1e3);

    const cdD = document.getElementById('cd-d');
    const cdH = document.getElementById('cd-h');
    const cdM = document.getElementById('cd-m');
    const cdS = document.getElementById('cd-s');

    if (cdD) cdD.textContent = pad(d);
    if (cdH) cdH.textContent = pad(h);
    if (cdM) cdM.textContent = pad(m);
    if (cdS) cdS.textContent = pad(s);
  }
  updateCountdown();
  setInterval(updateCountdown, 1000);
}

/**
 * Toast de Notificaciones
 */
export function showToast(msg) {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMsg');
  if (!toast || !toastMsg) return;

  toastMsg.textContent = msg;
  gsap.killTweensOf(toast);
  gsap.fromTo(toast, 
    { opacity: 0, y: 15, pointerEvents: 'none' }, 
    { opacity: 1, y: 0, pointerEvents: 'auto', duration: 0.35, yoyo: true, repeat: 1, repeatDelay: 1.8 }
  );
}

/**
 * Botón Copiar CLABE
 */
export function initCopyClabe() {
  const btn = document.getElementById('copyClabeBtn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const text = document.getElementById('clabeNum').textContent.replace(/\s/g, '');
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    showToast('¡CLABE copiada al portapapeles!');
  });
}

/**
 * Lightbox Universal
 */
export function initLightbox() {
  const lightbox = document.getElementById('lightbox');
  const lbImg = document.getElementById('lbImg');
  const lbCaption = document.getElementById('lbCaption');
  const lbDownloadBtn = document.getElementById('lbDownloadBtn');

  window.openLightbox = function(src, caption = '', downloadUrl = '') {
    if (!lightbox || !lbImg) return;
    lbImg.src = src;
    lbCaption.textContent = caption;
    if (lbDownloadBtn) lbDownloadBtn.href = downloadUrl || src;

    lightbox.classList.remove('hidden');
    lightbox.classList.add('flex');
    if (lenis) lenis.stop();
    gsap.to(lightbox, { opacity: 1, duration: 0.3 });
  };

  window.closeLightbox = function() {
    if (!lightbox) return;
    gsap.to(lightbox, {
      opacity: 0,
      duration: 0.25,
      onComplete: () => {
        lightbox.classList.add('hidden');
        lightbox.classList.remove('flex');
        if (lenis) lenis.start();
      }
    });
  };

  if (lightbox) {
    lightbox.addEventListener('click', e => {
      if (e.target === lightbox) window.closeLightbox();
    });
  }
}

/**
 * Formulario RSVP que genera enlace dinámico de WhatsApp
 */
export function initRsvpForm() {
  const form = document.getElementById('rsvpForm');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('guestName').value.trim();
    const passes = document.getElementById('guestPasses').value;
    const attending = document.querySelector('input[name="attending"]:checked').value;
    const diet = document.getElementById('guestDiet').value.trim() || 'Ninguna';
    const song = document.getElementById('guestSong').value.trim() || 'A elección del DJ';

    const message = 
      `💍 *CONFIRMACIÓN DE ASISTENCIA BODA ${WEDDING_CONFIG.couple.toUpperCase()}*\n\n` +
      `👤 *Nombre:* ${name}\n` +
      `🎟️ *Pases:* ${passes}\n` +
      `✨ *Estado:* ${attending}\n` +
      `🥗 *Restricciones/Alergias:* ${diet}\n` +
      `🎵 *Canción sugerida:* ${song}\n\n` +
      `¡Muchas gracias por hacernos parte de su historia!`;

    const whatsappUrl = `https://wa.me/${WEDDING_CONFIG.whatsapp}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    showToast('Abriendo WhatsApp...');
  });
}
