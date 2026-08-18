/**
 * FlashForge — Definition Lookup Service
 * Uses Google Gemini AI via Backend with fallback to Wikipedia API.
 */

import { API_BASE } from '../services/api';

/**
 * Fetch a short definition for a word.
 * @param {string} word - The word to look up
 * @returns {Promise<{definition: string, language: string} | null>}
 */
export async function lookupDefinition(word) {
  if (!word || !word.trim()) return null;
  const clean = word.trim().toLowerCase();
  
  let resultDefinition = null;

  try {
    // 1. Try fetching from our Spring Boot Backend AI Endpoint
    const aiRes = await fetch(`${API_BASE}/ai/definition?word=${encodeURIComponent(clean)}`);
    if (aiRes.ok) {
      const data = await aiRes.json();
      if (data && data.definition && !data.definition.startsWith('Error:')) {
        resultDefinition = data.definition;
      }
    }
  } catch (error) {
    console.warn('Backend AI no disponible, usando Wikipedia como plan B...');
  }

  // 2. Fallback to Wikipedia API if backend is down or Gemini fails
  if (!resultDefinition) {
    try {
      const url = `https://es.wikipedia.org/w/api.php?action=query&prop=extracts&exsentences=1&exlimit=1&titles=${encodeURIComponent(clean)}&explaintext=1&formatversion=2&format=json&origin=*`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const pages = data.query?.pages || [];
        if (pages.length > 0 && !pages[0].missing && pages[0].extract) {
          resultDefinition = pages[0].extract;
          if (resultDefinition.length > 150) {
            resultDefinition = resultDefinition.substring(0, 147) + '...';
          }
        }
      }
    } catch (error) {
      console.error('Error fetching Wikipedia definition:', error);
    }
  }

  if (!resultDefinition) return null;

  return { 
    definition: resultDefinition,
    language: 'es'
  };
}

/**
 * Automatically fetch the best image from Wikimedia Commons for a given word.
 * @param {string} word - The word to search for
 * @returns {Promise<string | null>} The image URL, or null if not found
 */
export async function lookupImage(word) {
  if (!word || !word.trim()) return null;
  const clean = word.trim().toLowerCase();

  try {
    // 1. Traducir la palabra a inglés primero (la IA de imágenes funciona infinitamente mejor en inglés)
    let englishWord = clean;
    try {
      const translateUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean)}&langpair=es|en`;
      const transRes = await fetch(translateUrl);
      if (transRes.ok) {
        const transData = await transRes.json();
        if (transData.responseData?.translatedText) {
          englishWord = transData.responseData.translatedText.toLowerCase();
        }
      }
    } catch (e) {
      console.warn('No se pudo traducir la palabra, usando original');
    }

    // 2. Buscar la primera foto real en Wikimedia Commons usando la palabra en inglés
    // Al usar inglés, los resultados son infinitamente más precisos (evita que "casa" devuelva el "Castillo de la Casa Real").
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(englishWord)}&gsrlimit=3&prop=imageinfo&iiprop=url&iiurlwidth=600&format=json&origin=*`;
    
    const imgRes = await fetch(searchUrl);
    if (imgRes.ok) {
      const imgData = await imgRes.json();
      const pages = imgData.query?.pages || {};
      const images = Object.values(pages)
        .filter(page => page.imageinfo && page.imageinfo.length > 0)
        .map(page => page.imageinfo[0]);
      
      const bestImage = images.find(img => img.thumbwidth >= 100);
      if (bestImage) {
        return bestImage.thumburl;
      }
    }
  } catch (error) {
    console.warn('No se pudo auto-obtener la imagen real:', error);
  }
  return null;
}
