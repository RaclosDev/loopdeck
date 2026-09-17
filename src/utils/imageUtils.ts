/**
 * Utility to compress images pasted from clipboard before inserting them as Base64.
 * Returns a Promise that resolves to the compressed Base64 string.
 */
export const compressImageFromPaste = (file, maxWidth = 800, quality = 0.7) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to JPEG base64
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      img.onerror = (e) => reject(e);
    };
    reader.onerror = (e) => reject(e);
  });
};

/**
 * Handles paste event on a contenteditable element to compress images.
 */
export const handleImagePaste = async (e, onImageInsert) => {
  const items = (e.clipboardData || e.originalEvent.clipboardData).items;
  let hasImage = false;

  for (let index in items) {
    const item = items[index];
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      hasImage = true;
      e.preventDefault(); // Prevent default paste of raw large image
      const file = item.getAsFile();
      try {
        const compressedDataUrl = await compressImageFromPaste(file);
        // Insert the compressed image at cursor position
        const imgHtml = `<img src="${compressedDataUrl}" style="max-width: 100%; border-radius: 8px; margin: 8px 0;" alt="Pasted image"/>`;
        document.execCommand('insertHTML', false, imgHtml);
        
        // Callback if needed (e.g. to update react state)
        if (onImageInsert) {
          onImageInsert();
        }
      } catch (err) {
        console.error('Error compressing image:', err);
      }
      break; // Only handle the first image
    }
  }
};
