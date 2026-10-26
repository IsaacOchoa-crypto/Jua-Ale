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
 * Control del Splash Screen: Sobre realista 3D con apertura y tarjeta deslizante
 */
export function initSplashAndMusic() {
  const bgm = document.getElementById('bgm');
  const musicBtn = document.getElementById('musicBtn');
  const eq = document.getElementById('eq');
  const openBtn = document.getElementById('openBtn');
  const envelopeWrapper = document.getElementById('envelopeWrapper');
  const envelopeActionPrompt = document.getElementById('envelopeActionPrompt');

  if (bgm) bgm.volume = 0.45;

  let isOpening = false;

  const handleOpenEnvelope = () => {
    if (isOpening) return;
    isOpening = true;

    // Iniciar música en la primera interacción del usuario
    if (bgm) {
      bgm.play().then(() => eq && eq.classList.remove('paused')).catch(() => {});
    }

    const isMobile = window.innerWidth < 640;
    const cardSlideY = isMobile ? -165 : -230;

    const tl = gsap.timeline({
      onComplete: () => {
        const splash = document.getElementById('splash');
        if (splash) splash.remove();
        document.body.classList.remove('locked');
        if (lenis) lenis.start();
        ScrollTrigger.refresh();
      }
    });

    // Paso 1: El sello de cera y textos auxiliares se desvanecen
    tl.to('#openBtn', { scale: 0.7, opacity: 0, duration: 0.35, ease: 'power2.in' })
      .to('#envelopeActionPrompt', { opacity: 0, y: 10, duration: 0.3 }, '<')
      .to('#envelopeHeader', { opacity: 0, y: -10, duration: 0.3 }, '<')

      // Paso 2: La solapa superior triangular se abre hacia arriba en 3D
      .to('#envelopeFlapTop', { 
        rotateX: 180, 
        duration: 0.75, 
        ease: 'power2.inOut',
        onUpdate: function() {
          const flap = document.getElementById('envelopeFlapTop');
          if (flap && this.progress() > 0.5) {
            flap.style.zIndex = 5; // Pasa detrás de la tarjeta cuando pasa los 90°
          }
        }
      }, '-=0.1')

      // Paso 3: La tarjeta de invitación emerge y se desliza hacia arriba saliendo del sobre
      .to('#invitationCard', { 
        y: cardSlideY, 
        duration: 0.95, 
        ease: 'power3.out' 
      }, '-=0.15')

      // Efecto de celebración con confeti en blanco y azul
      .call(() => {
        if (typeof confetti === 'function') {
          confetti({
            particleCount: 75,
            spread: 60,
            origin: { y: 0.48 },
            colors: ['#1B365D', '#2563EB', '#93C5FD', '#FFFFFF', '#CBD5E1']
          });
        }
      })

      // Paso 4: La tarjeta se agranda suavemente sumergiendo al usuario en el contenido de la boda
      .to('#invitationCard', { 
        scale: isMobile ? 1.4 : 1.6, 
        y: isMobile ? -60 : -80,
        opacity: 0, 
        duration: 0.8, 
        ease: 'power2.inOut' 
      }, '+=0.4')
      .to('#envelopeWrapper', { 
        scale: 0.85, 
        opacity: 0, 
        duration: 0.65, 
        ease: 'power2.in' 
      }, '<')
      .to('#splash', { 
        opacity: 0, 
        duration: 0.5 
      }, '-=0.25')

      // Paso 5: Mostrar reproductor y animar elementos del Hero
      .to(musicBtn, { opacity: 1, pointerEvents: 'auto', duration: 0.5 }, '-=0.2')
      .fromTo('.hero-char', { y: 35, opacity: 0 }, { opacity: 1, y: 0, stagger: 0.05, duration: 0.8, ease: 'power3.out' }, '-=0.3')
      .from('.hero-fade', { opacity: 0, y: 20, stagger: 0.15, duration: 0.8, ease: 'power2.out' }, '-=0.5');
  };

  if (openBtn) openBtn.addEventListener('click', handleOpenEnvelope);
  if (envelopeWrapper) envelopeWrapper.addEventListener('click', handleOpenEnvelope);
  if (envelopeActionPrompt) envelopeActionPrompt.addEventListener('click', handleOpenEnvelope);

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
export function showToast(msg, duration = 1.8) {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMsg');
  if (!toast || !toastMsg) return;

  toastMsg.textContent = msg;
  gsap.killTweensOf(toast);
  gsap.fromTo(toast, 
    { opacity: 0, y: 15, pointerEvents: 'none' }, 
    { opacity: 1, y: 0, pointerEvents: 'auto', duration: 0.35, yoyo: true, repeat: 1, repeatDelay: duration }
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
 * Integración con Calendarios (Google Calendar y Apple iCal / Outlook)
 */
export function initCalendarIntegration() {
  // Google Calendar
  const gcalBtn = document.getElementById('addToGcalBtn');
  if (gcalBtn) {
    gcalBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const title = encodeURIComponent(`Boda de ${WEDDING_CONFIG.couple}`);
      const details = encodeURIComponent(`¡Celebremos el amor de ${WEDDING_CONFIG.couple}! Ceremonia 5:00 PM en Parroquia San Miguel Arcángel y Recepción 7:00 PM en Hacienda Los Olivos.`);
      const location = encodeURIComponent('Hacienda Los Olivos, Tepotzotlán, Estado de México');
      // 2027-03-20 17:00:00 (UTC approx 23:00) a 2027-03-21 03:00:00 (UTC approx 09:00)
      const dates = '20270320T230000Z/20270321T090000Z';
      const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
      window.open(gcalUrl, '_blank');
      showToast('Abriendo Google Calendar 📅');
    });
  }

  // Apple Calendar / Outlook (.ics download)
  const icsBtn = document.getElementById('addToIcalBtn');
  if (icsBtn) {
    icsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Juan & Alejandra//Boda Digital//ES',
        'BEGIN:VEVENT',
        'UID:boda-juan-alejandra-2027@boda.com',
        'DTSTAMP:20261024T120000Z',
        'DTSTART:20270320T230000Z',
        'DTEND:20270321T090000Z',
        `SUMMARY:Boda de ${WEDDING_CONFIG.couple}`,
        `DESCRIPTION:¡Celebremos el amor de ${WEDDING_CONFIG.couple}! Ceremonia en Parroquia San Miguel Arcángel y Banquete en Hacienda Los Olivos.`,
        'LOCATION:Hacienda Los Olivos, Tepotzotlán, Edo. Méx.',
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\r\n');

      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Boda_Juan_y_Alejandra.ics');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Descargando evento de calendario 📅');
    });
  }
}

/**
 * Efecto Cinemático Suave de Pétalos y Destellos Flotantes
 */
export function initAmbientPetals() {
  const canvas = document.getElementById('ambientPetalsCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const petals = [];
  const TOTAL_PETALS = 22; // Cantidad sutil para no sobrecargar el diseño

  for (let i = 0; i < TOTAL_PETALS; i++) {
    petals.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 5 + 3,
      speedX: Math.random() * 0.8 - 0.4,
      speedY: Math.random() * 0.7 + 0.3,
      angle: Math.random() * 360,
      spinSpeed: Math.random() * 1.5 - 0.75,
      opacity: Math.random() * 0.4 + 0.25,
      // Pétalos de flores en blanco puro, azul serenidad y azul zafiro (como los centros de mesa)
      color: (() => {
        const rand = Math.random();
        if (rand < 0.45) return 'rgba(255, 255, 255,'; // Blanco hortensia
        if (rand < 0.75) return 'rgba(123, 164, 208,'; // Celeste serenidad / azul cielo suave
        return 'rgba(27, 54, 93,';                      // Azul marino italiano
      })()
    });
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    petals.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.angle * Math.PI) / 180);

      ctx.beginPath();
      // Dibujar forma de pétalo orgánico
      ctx.ellipse(0, 0, p.size, p.size * 1.6, 0, 0, Math.PI * 2);
      ctx.fillStyle = `${p.color} ${p.opacity})`;
      ctx.fill();
      ctx.restore();

      // Mover
      p.x += p.speedX;
      p.y += p.speedY;
      p.angle += p.spinSpeed;

      // Resetear cuando salga de pantalla
      if (p.y > height + 20) {
        p.y = -20;
        p.x = Math.random() * width;
      }
      if (p.x > width + 20) p.x = -20;
      if (p.x < -20) p.x = width + 20;
    });

    requestAnimationFrame(draw);
  }

  draw();
}

/**
 * Descarga y guarda una foto directamente en la galería del dispositivo (Android / iPhone / PC).
 * - En iOS / iPhone: Invoca Web Share API con el archivo procesado.
 *   Esto abre el menú nativo de iOS donde la opción principal es "Guardar imagen",
 *   colocándola directamente en la aplicación Fotos (Carrete / Galería).
 * - En Android / PC: Descarga directa de Blob con nombre de archivo.
 *   En Android, se descarga a /Downloads/ y el MediaScanner del sistema la indexa de inmediato en la Galería / Google Fotos.
 * - Fallback de rescate: Bandera fl_attachment de Cloudinary que fuerza descarga directa desde el servidor.
 */
export async function downloadPhotoFile(url, caption = '') {
  if (!url) return;

  showToast('Preparando foto en máxima resolución... 📸', 2.5);

  // Sanitizar el nombre del archivo
  const cleanCaption = (caption || 'recuerdo')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_')
    .substring(0, 25);
  const filename = `Boda_Juan_y_Alejandra_${cleanCaption || 'foto'}_${Date.now()}.jpg`;

  // Asegurar URL en alta resolución (remover transformaciones de previsualización)
  let targetUrl = url;
  if (targetUrl.includes('res.cloudinary.com')) {
    if (targetUrl.includes('/f_auto,q_auto,w_800/')) {
      targetUrl = targetUrl.replace('/f_auto,q_auto,w_800/', '/');
    }
  }

  try {
    // 1. Obtener los bytes reales de la imagen vía fetch (CORS habilitado por defecto en Cloudinary)
    const response = await fetch(targetUrl, { mode: 'cors' });
    if (!response.ok) throw new Error('Error al conectar con el servidor de fotos.');
    
    const blob = await response.blob();
    const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });

    // 2. Comportamiento especial para móviles (iOS Safari & Android)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'Boda Juan & Alejandra',
          text: caption ? `Recuerdo de la boda: "${caption}"` : 'Recuerdo de la Boda de Juan & Alejandra'
        });
        showToast('¡Selecciona "Guardar imagen" para añadirla a tu Galería! ✨', 4);
        return;
      } catch (shareErr) {
        if (shareErr.name === 'AbortError') {
          return; // Usuario canceló el menú nativo
        }
        console.warn('Web Share no disponible, procediendo con descarga directa:', shareErr);
      }
    }

    // 3. Descarga directa en navegador usando Blob URL
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(blobUrl), 20000);
    showToast('¡Foto guardada en tu dispositivo! ✨', 3);

  } catch (err) {
    console.warn('Error en descarga Blob, aplicando descarga Cloudinary attachment:', err);

    // 4. Fallback: Cloudinary fl_attachment fuerza descarga de archivo en lugar de visualización
    let fallbackUrl = targetUrl;
    if (fallbackUrl.includes('res.cloudinary.com') && fallbackUrl.includes('/upload/')) {
      fallbackUrl = fallbackUrl.replace('/upload/', `/upload/fl_attachment:Boda_Juan_y_Alejandra/`);
    }

    const link = document.createElement('a');
    link.href = fallbackUrl;
    link.setAttribute('download', filename);
    link.target = '_self';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Iniciando descarga directa a tu dispositivo...', 3);
  }
}

// Exponer en window para acceso desde cualquier módulo o botón HTML
window.savePhotoToGallery = downloadPhotoFile;

/**
 * Lightbox Universal
 */
export function initLightbox() {
  const lightbox = document.getElementById('lightbox');
  const lbImg = document.getElementById('lbImg');
  const lbCaption = document.getElementById('lbCaption');
  const lbDownloadBtn = document.getElementById('lbDownloadBtn');

  let currentLbUrl = '';
  let currentLbCaption = '';

  window.openLightbox = function(src, caption = '', downloadUrl = '') {
    if (!lightbox || !lbImg) return;
    currentLbUrl = downloadUrl || src;
    currentLbCaption = caption;

    lbImg.src = src;
    lbCaption.textContent = caption;

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

  if (lbDownloadBtn) {
    lbDownloadBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!currentLbUrl) return;

      const originalHtml = lbDownloadBtn.innerHTML;
      lbDownloadBtn.innerHTML = `
        <svg class="animate-spin w-4 h-4 inline" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
        <span>Guardando...</span>
      `;
      lbDownloadBtn.disabled = true;

      try {
        await downloadPhotoFile(currentLbUrl, currentLbCaption);
      } finally {
        lbDownloadBtn.innerHTML = originalHtml;
        lbDownloadBtn.disabled = false;
      }
    });
  }

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
