/* ============================================================
   MÓDULO DE CLOUDINARY & COMPRESIÓN DE IMÁGENES
============================================================ */
import { CLOUDINARY_CONFIG } from './config.js';

/**
 * Comprime una imagen en el cliente usando un <canvas> en memoria.
 * Limita el lado mayor a maxDimension (por defecto 1920px Full HD) con calidad JPEG 0.85.
 */
export function compressImage(file, maxDimension = 1920, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('No se pudo procesar la compresión de la imagen.'));
        }
      }, 'image/jpeg', quality);
    };
    img.onerror = (err) => reject(err);
  });
}

/**
 * Sube un Blob comprimido a Cloudinary vía XMLHttpRequest para reportar progreso real (0% - 100%).
 * Genera un nombre de archivo único para prevenir colisiones en móviles.
 */
export function uploadToCloudinary(blob, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();

    // Nombre de archivo único garantizado
    const uniqueFileName = `boda_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`;
    formData.append('file', blob, uniqueFileName);
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && typeof onProgress === 'function') {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          resolve(res);
        } catch (err) {
          reject(err);
        }
      } else {
        reject(new Error(`Error de Cloudinary (${xhr.status}): ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => reject(new Error('Fallo de conexión al subir imagen a Cloudinary.'));
    xhr.open('POST', CLOUDINARY_CONFIG.uploadUrl, true);
    xhr.send(formData);
  });
}
