/**
 * FlashForge — Definition Lookup Service
 * Uses the Free Dictionary API + fallback to Wiktionary for Spanish.
 */

const DICT_API = 'https://api.dictionaryapi.dev/api/v2/entries';

/**
 * Fetch a short definition for a word.
 * Tries Spanish first, then English.
 * @param {string} word - The word to look up
 * @returns {Promise<{definition: string, language: string} | null>}
 */
export async function lookupDefinition(word) {
  if (!word || !word.trim()) return null;
  const clean = word.trim().toLowerCase();

  // Try Spanish first
  const esDef = await tryLanguage(clean, 'es');
  if (esDef) return { ...esDef, language: 'es' };

  // Fallback to English
  const enDef = await tryLanguage(clean, 'en');
  if (enDef) return { ...enDef, language: 'en' };

  return null;
}

async function tryLanguage(word, lang) {
  try {
    const res = await fetch(`${DICT_API}/${lang}/${encodeURIComponent(word)}`);
    if (!res.ok) return null;

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const entry = data[0];
    const meanings = entry.meanings || [];

    // Get first definition from the first meaning
    for (const meaning of meanings) {
      const defs = meaning.definitions || [];
      if (defs.length > 0) {
        const partOfSpeech = meaning.partOfSpeech || '';
        const shortDef = defs[0].definition;
        
        // Build a clean short definition
        let result = '';
        if (partOfSpeech) {
          result += `<em style="color: var(--text-dim); font-size: 0.85em">(${partOfSpeech})</em> `;
        }
        result += shortDef;

        // Add example if available
        if (defs[0].example) {
          result += `<br><span style="color: var(--text-dim); font-size: 0.9em">"${defs[0].example}"</span>`;
        }

        return { definition: result };
      }
    }

    return null;
  } catch {
    return null;
  }
}
