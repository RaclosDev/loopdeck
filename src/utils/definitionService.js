/**
 * FlashForge — Definition Lookup Service
 * Uses Google Gemini AI via Backend with fallback to Wikipedia API.
 */

/**
 * Fetch a short definition for a word.
 * @param {string} word - The word to look up
 * @returns {Promise<{definition: string, language: string} | null>}
 */
export async function lookupDefinition(word) {
  if (!word || !word.trim()) return null;
  const clean = word.trim().toLowerCase();

  try {
    // 1. Try fetching from our Spring Boot Backend AI Endpoint
    const aiRes = await fetch(`/api/ai/definition?word=${encodeURIComponent(clean)}`);
    if (aiRes.ok) {
      const data = await aiRes.json();
      if (data && data.definition && !data.definition.startsWith('Error:')) {
        return {
          definition: data.definition,
          language: 'es' // Gemini responds in Spanish because of our prompt
        };
      }
    }
  } catch (error) {
    console.warn('Backend AI no disponible, usando Wikipedia como plan B...');
  }

  // 2. Fallback to Wikipedia API if backend is down or Gemini fails
  try {
    const url = `https://es.wikipedia.org/w/api.php?action=query&prop=extracts&exsentences=1&exlimit=1&titles=${encodeURIComponent(clean)}&explaintext=1&formatversion=2&format=json&origin=*`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const pages = data.query?.pages || [];
    
    if (pages.length === 0 || pages[0].missing) {
      return null;
    }

    let extract = pages[0].extract;
    if (!extract) return null;

    if (extract.length > 150) {
      extract = extract.substring(0, 147) + '...';
    }

    return { 
      definition: extract,
      language: 'es'
    };
  } catch (error) {
    console.error('Error fetching Wikipedia definition:', error);
    return null;
  }
}
