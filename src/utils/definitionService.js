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
    // Generar una imagen por IA en tiempo real (gratis, sin API key) usando Pollinations.ai
    // Le pasamos un prompt para que sea una foto limpia, ideal para estudiar.
    const prompt = `una fotografía clara, sencilla y realista de ${clean}, fondo blanco, alta calidad, sin texto`;
    const imgUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=600&height=400&nologo=true`;
    
    // Hacemos fetch primero para asegurarnos de que se genere y devuelva 200 OK antes de ponerla en la tarjeta
    const imgRes = await fetch(imgUrl);
    if (imgRes.ok) {
      return imgUrl; // Devolvemos la URL directa para que el navegador la cargue
    }
  } catch (error) {
    console.warn('No se pudo auto-obtener la imagen por IA:', error);
  }
  return null;
}
