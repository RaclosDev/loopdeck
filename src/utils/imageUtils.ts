/**
 * Utility to compress images pasted from clipboard before inserting them as Base64.
 * Returns a Promise that resolves to the compressed Base64 string.
 */
export const compressImageFromPaste = (file: File, maxWidth = 800, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      if (typeof event.target?.result === 'string') {
        img.src = event.target.result;
      }
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
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64);
        } else {
          reject(new Error('Failed to get 2d context'));
        }
      };
      img.onerror = (e) => reject(e);
    };
    reader.onerror = (e) => reject(e);
  });
};

/**
 * Handles paste event on a contenteditable element to compress images.
 */
export const handleImagePaste = async (e: React.ClipboardEvent<HTMLDivElement> | ClipboardEvent, onImageInsert?: () => void) => {
  const clipboardData = (e as React.ClipboardEvent<HTMLDivElement>).clipboardData || (e as any).originalEvent?.clipboardData || (e as ClipboardEvent).clipboardData;
  if (!clipboardData) return;
  const items = clipboardData.items;

  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      e.preventDefault(); // Prevent default paste of raw large image
      const file = item.getAsFile();
      if (file) {
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
      }
      break; // Only handle the first image
    }
  }
};
