/* ============================================================
   MÓDULO DE ÁLBUM COLABORATIVO, RETOS & MODO PROYECTOR
============================================================ */
import { compressImage, uploadToCloudinary } from './cloudinary.js';
import { addWeddingMoment, subscribeToMoments, toggleLikeFirestore } from './firebase.js';
import { showToast, lenis } from './ui.js';

let currentMoments = [];
let currentFilter = 'all';
let selectedFile = null;

// Variables para el Modo Proyector / Slideshow
let slideshowInterval = null;
let currentSlideshowIndex = 0;
let isSlideshowPlaying = true;

/**
 * Configura el Código QR dinámico apuntando a ?action=upload#momentos
 */
export function initQrCode() {
  const currentBaseUrl = window.location.origin + window.location.pathname;
  const qrTargetUrl = `${currentBaseUrl}?action=upload#momentos`;
  const qrImage = document.getElementById('qrImage');
  if (qrImage) {
    qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrTargetUrl)}&color=2C2C2C&bgcolor=FFFFFF`;
  }
}

/**
 * Control del Modal de Subida
 */
export function initUploadModal() {
  const modal = document.getElementById('uploadModal');
  const fileInput = document.getElementById('photoFileInput');
  const form = document.getElementById('photoUploadForm');
  const nameInput = document.getElementById('modalGuestName');
  const catSelect = document.getElementById('modalCategory');

  window.openUploadModal = function() {
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (lenis) lenis.stop();
  };

  window.openUploadModalWithTag = function(category) {
    if (catSelect) catSelect.value = category;
    updateUploadPreview();
    window.openUploadModal();
  };

  window.closeUploadModal = function() {
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    if (form) form.reset();
    document.getElementById('previewContainer')?.classList.add('hidden');
    document.getElementById('uploadPrompt')?.classList.remove('hidden');
    document.getElementById('uploadProgressBarContainer')?.classList.add('hidden');
    const progressBar = document.getElementById('uploadProgressBar');
    if (progressBar) progressBar.style.width = '0%';
    const submitBtn = document.getElementById('submitUploadBtn');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Publicar en el Muro en Vivo';
    }
    selectedFile = null;
    if (lenis) lenis.start();
  };

  function updateUploadPreview() {
    const name = nameInput?.value.trim() || 'Invitado';
    const category = catSelect?.value || 'General';
    const guestText = document.getElementById('previewGuestText');
    const badge = document.getElementById('previewTagBadge');
    if (guestText) guestText.textContent = 'De: ' + name;
    if (badge) badge.textContent = category;
  }

  nameInput?.addEventListener('input', updateUploadPreview);
  catSelect?.addEventListener('change', updateUploadPreview);

  fileInput?.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      selectedFile = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        const previewImg = document.getElementById('previewImg');
        if (previewImg) previewImg.src = ev.target.result;
        document.getElementById('uploadPrompt')?.classList.add('hidden');
        document.getElementById('previewContainer')?.classList.remove('hidden');
        updateUploadPreview();
      };
      reader.readAsDataURL(selectedFile);
    }
  });

  // Procesamiento de Envío con Cloudinary y Firestore
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      alert('Por favor selecciona o toma una foto antes de publicar.');
      return;
    }

    const guestName = nameInput.value.trim();
    const category = catSelect.value;
    const caption = document.getElementById('modalDedication')?.value.trim() || '';

    const progressContainer = document.getElementById('uploadProgressBarContainer');
    const progressBar = document.getElementById('uploadProgressBar');
    const percentText = document.getElementById('uploadPercent');
    const statusText = document.getElementById('uploadStatusText');
    const submitBtn = document.getElementById('submitUploadBtn');

    try {
      progressContainer?.classList.remove('hidden');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Subiendo al muro...';
      }

      if (statusText) statusText.textContent = 'Optimizando foto para móvil...';
      const compressedBlob = await compressImage(selectedFile, 1920, 0.85);

      if (statusText) statusText.textContent = 'Subiendo a Cloudinary...';
      const cloudRes = await uploadToCloudinary(compressedBlob, (percent) => {
        if (progressBar) progressBar.style.width = percent + '%';
        if (percentText) percentText.textContent = percent + '%';
        if (percent >= 100 && statusText) {
          statusText.textContent = 'Guardando en álbum en tiempo real...';
        }
      });

      const hdUrl = cloudRes.secure_url;
      const imageUrl = hdUrl.replace('/upload/', '/upload/f_auto,q_auto,w_800/');

      await addWeddingMoment({
        imageUrl,
        hdUrl,
        guestName,
        category,
        caption
      });

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#1B365D', '#2563EB', '#93C5FD', '#FFFFFF', '#CBD5E1']
      });

      window.closeUploadModal();
      showToast('¡Tu foto ya está en el muro en vivo! 🎉');
      document.getElementById('muroLive')?.scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
      console.error(error);
      alert('Ocurrió un error al subir la foto: ' + error.message);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Publicar en el Muro en Vivo';
      }
      progressContainer?.classList.add('hidden');
    }
  });
}

/**
 * Renderizado del Muro de Fotos estilo Polaroid
 */
function renderLivePhotoWall() {
  const grid = document.getElementById('photoWallGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const filtered = currentMoments.filter(item => {
    if (currentFilter === 'all') return true;
    return item.category === currentFilter;
  });

  const counter = document.getElementById('photoCounter');
  if (counter) counter.textContent = currentMoments.length;

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full py-16 text-center text-carbon/60">
        <p class="font-serif-title text-3xl">Aún no hay fotos en esta categoría</p>
        <p class="text-xs mt-2">¡Sé el primero en cumplir este reto!</p>
        <button onclick="window.openUploadModalWithTag('${currentFilter}')" class="btn-luxury btn-gold mt-6 !py-2.5 !px-5 text-xs">
          Subir la primera foto
        </button>
      </div>
    `;
    return;
  }

  filtered.forEach((photo, idx) => {
    const rot = (idx % 3 === 0 ? -1.5 : idx % 3 === 1 ? 1.5 : 0);
    const hasLiked = localStorage.getItem(`liked_moment_${photo.id}`) === 'true';

    let dateStr = 'Reciente';
    if (photo.createdAt && photo.createdAt.toDate) {
      const d = photo.createdAt.toDate();
      dateStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    const card = document.createElement('div');
    card.className = 'polaroid-card group transition-all duration-300';
    card.style.transform = `rotate(${rot}deg)`;
    card.innerHTML = `
      <div class="polaroid-tape"></div>
      <div class="overflow-hidden bg-gray-100 aspect-[4/3] rounded-sm cursor-pointer" onclick="window.openLightbox('${photo.hdUrl || photo.imageUrl}', '${photo.caption || photo.guestName}', '${photo.hdUrl || photo.imageUrl}')">
        <img src="${photo.imageUrl}" alt="${photo.category}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 editorial-photo-filter" loading="lazy" />
      </div>
      <div class="pt-3 pb-1">
        <div class="flex items-center justify-between mb-1.5">
          <span class="inline-block px-2 py-0.5 text-[0.62rem] uppercase tracking-wider font-semibold rounded bg-champagneSoft text-champagneDark truncate max-w-[170px]">
            ${photo.category}
          </span>
          <span class="text-[0.65rem] text-carbon/50">${dateStr}</span>
        </div>
        <p class="text-xs font-semibold text-carbon">${photo.guestName}</p>
        ${photo.caption ? `<p class="text-xs text-carbon/80 mt-1 italic font-light leading-relaxed">“${photo.caption}”</p>` : ''}
        
        <div class="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between">
          <button onclick="event.stopPropagation(); window.savePhotoToGallery('${photo.hdUrl || photo.imageUrl}', '${(photo.caption || photo.guestName || '').replace(/['"\\]/g, '')}')" class="flex items-center gap-1.5 text-xs text-carbon/70 hover:text-champagne transition-colors py-0.5 px-2 rounded hover:bg-champagne/10 cursor-pointer" title="Guardar foto en tu Galería">
            <svg class="w-3.5 h-3.5 text-champagne" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            <span class="text-[0.65rem] uppercase tracking-wider font-semibold text-olivo">Guardar</span>
          </button>
          <button onclick="window.handleLikeClick('${photo.id}', this)" class="heart-btn flex items-center gap-1.5 text-xs text-carbon/70 hover:text-rose-600 transition-colors ${hasLiked ? 'liked text-rose-600 font-semibold' : ''}">
            <svg class="w-4 h-4 ${hasLiked ? 'fill-rose-500 stroke-rose-500' : 'stroke-current fill-none'}" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
            <span class="like-count">${photo.likes || 0}</span>
          </button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

/**
 * Manejo de Likes interactivos
 */
window.handleLikeClick = async function(docId, btn) {
  const res = await toggleLikeFirestore(docId);
  if (!res.success) {
    showToast('¡Ya le diste me gusta a esta foto! ❤️');
    return;
  }

  btn.classList.add('liked', 'text-rose-600', 'font-semibold');
  const svg = btn.querySelector('svg');
  if (svg) {
    svg.setAttribute('fill', '#e11d48');
    svg.setAttribute('stroke', '#e11d48');
  }
  showToast('¡Te gustó esta foto! ❤️');
};

/**
 * ============================================================
 * MODO PROYECTOR EN VIVO (SLIDESHOW PARA LA FIESTA)
 * ============================================================
 */
export function initSlideshowControls() {
  const modal = document.getElementById('slideshowModal');
  const btnOpen = document.getElementById('openSlideshowBtn');
  const btnClose = document.getElementById('closeSlideshowBtn');
  const btnPrev = document.getElementById('slidePrevBtn');
  const btnNext = document.getElementById('slideNextBtn');
  const btnPlayPause = document.getElementById('slidePlayPauseBtn');
  const btnFs = document.getElementById('slideFullscreenBtn');

  function updateSlideshowCard() {
    if (!currentMoments.length) return;
    const photo = currentMoments[currentSlideshowIndex];
    const container = document.getElementById('slideshowCardContainer');
    if (!container) return;

    container.innerHTML = `
      <div class="slideshow-active-card bg-white p-5 md:p-8 rounded-2xl shadow-2xl max-w-2xl mx-auto border border-champagne/40">
        <div class="relative overflow-hidden aspect-[4/3] rounded-lg bg-black/5 mb-4">
          <img src="${photo.hdUrl || photo.imageUrl}" alt="${photo.category}" class="w-full h-full object-contain mx-auto" />
        </div>
        <div class="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
          <span class="px-3 py-1 rounded-full text-xs font-semibold bg-champagneSoft text-champagneDark uppercase tracking-wider">
            ${photo.category}
          </span>
          <span class="text-xs text-olivo flex items-center gap-1 font-semibold">
            ❤️ ${photo.likes || 0} Me gusta
          </span>
        </div>
        <h4 class="font-serif-title text-2xl md:text-3xl text-carbon">${photo.guestName}</h4>
        ${photo.caption ? `<p class="text-sm md:text-base text-carbon/80 italic mt-1 font-light">“${photo.caption}”</p>` : ''}
      </div>
    `;

    const indexIndicator = document.getElementById('slideshowIndexIndicator');
    if (indexIndicator) {
      indexIndicator.textContent = `${currentSlideshowIndex + 1} de ${currentMoments.length}`;
    }
  }

  function startSlideshowTimer() {
    clearInterval(slideshowInterval);
    if (!isSlideshowPlaying) return;
    slideshowInterval = setInterval(() => {
      if (currentMoments.length > 0) {
        currentSlideshowIndex = (currentSlideshowIndex + 1) % currentMoments.length;
        updateSlideshowCard();
      }
    }, 5500);
  }

  window.openSlideshow = function() {
    if (!currentMoments.length) {
      showToast('Aún no hay fotos en el muro para proyectar.');
      return;
    }
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
    currentSlideshowIndex = 0;
    isSlideshowPlaying = true;
    updateSlideshowCard();
    startSlideshowTimer();
    if (lenis) lenis.stop();
  };

  window.closeSlideshow = function() {
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    clearInterval(slideshowInterval);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    if (lenis) lenis.start();
  };

  if (btnOpen) btnOpen.addEventListener('click', window.openSlideshow);
  if (btnClose) btnClose.addEventListener('click', window.closeSlideshow);

  if (btnNext) {
    btnNext.addEventListener('click', () => {
      currentSlideshowIndex = (currentSlideshowIndex + 1) % currentMoments.length;
      updateSlideshowCard();
      startSlideshowTimer();
    });
  }

  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      currentSlideshowIndex = (currentSlideshowIndex - 1 + currentMoments.length) % currentMoments.length;
      updateSlideshowCard();
      startSlideshowTimer();
    });
  }

  if (btnPlayPause) {
    btnPlayPause.addEventListener('click', () => {
      isSlideshowPlaying = !isSlideshowPlaying;
      btnPlayPause.textContent = isSlideshowPlaying ? '⏸️ Pausar' : '▶️ Reanudar';
      if (isSlideshowPlaying) startSlideshowTimer();
      else clearInterval(slideshowInterval);
    });
  }

  if (btnFs) {
    btnFs.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        modal?.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });
  }

  const btnDownloadCurrent = document.getElementById('slideDownloadCurrentBtn');
  if (btnDownloadCurrent) {
    btnDownloadCurrent.addEventListener('click', () => {
      if (!currentMoments.length) return;
      const current = currentMoments[currentSlideshowIndex];
      if (current) {
        window.savePhotoToGallery(current.hdUrl || current.imageUrl, current.caption || current.guestName);
      }
    });
  }
}

/**
 * Inicialización de Filtros y Suscripción en Tiempo Real
 */
export function initLiveWall() {
  document.querySelectorAll('.filter-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.category;
      renderLivePhotoWall();
    });
  });

  // Suscribirse a Firestore en tiempo real
  subscribeToMoments((moments) => {
    currentMoments = moments;
    renderLivePhotoWall();
  });

  // Auto-apertura si se escaneó código QR (?action=upload)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('action') === 'upload') {
    const splash = document.getElementById('splash');
    if (splash) splash.remove();
    document.body.classList.remove('locked');
    if (lenis) lenis.start();

    setTimeout(() => {
      document.getElementById('momentos')?.scrollIntoView({ behavior: 'smooth' });
      window.openUploadModal();
    }, 500);
  }
}
