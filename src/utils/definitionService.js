/**
 * FlashForge — Definition Lookup Service
 * Uses Wikipedia API to fetch a short summary.
 */

/**
 * Fetch a short definition (extract) for a word from Wikipedia.
 * @param {string} word - The word to look up
 * @returns {Promise<{definition: string, language: string} | null>}
 */
export async function lookupDefinition(word) {
  if (!word || !word.trim()) return null;
  const clean = word.trim().toLowerCase();

  try {
    // We use Spanish Wikipedia by default.
    // Querying for exactly 2 sentences in plain text
    const url = `https://es.wikipedia.org/w/api.php?action=query&prop=extracts&exsentences=2&exlimit=1&titles=${encodeURIComponent(clean)}&explaintext=1&formatversion=2&format=json&origin=*`;
    
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const pages = data.query?.pages || [];
    
    if (pages.length === 0 || pages[0].missing) {
      return null;
    }

    const extract = pages[0].extract;
    if (!extract) return null;

    return { 
      definition: extract,
      language: 'es'
    };
  } catch (error) {
    console.error('Error fetching Wikipedia definition:', error);
    return null;
  }
}
