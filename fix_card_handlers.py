import re

with open('src/pages/AddCard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace handleDefinition
old_def = """  const handleDefinition = async () => {
    const term = (fields.front || '').replace(/<[^>]*>/g, '').trim();
    if (!term) return addToast('Escribe un término en el frente primero', 'error');
    setLookingUpDef(true);
    try {
      const def = await lookupDefinition(term);
      if (def?.definition) {
        if (backContentRef.current) backContentRef.current.innerHTML = def.definition;
        setFields(prev => ({ ...prev, back: def.definition }));
      }
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Error buscando definicion', 'error');
    } finally {
      setLookingUpDef(false);
    }
  };"""

# Sometimes the characters have encoding differences or formatting, so regex is safer.
old_def_regex = r"const handleDefinition = async \(\) => \{.*?setLookingUpDef\(false\);\s*\}\s*\};"

new_def = """const handleDefinition = async () => {
    const term = (fields.front || '').replace(/<[^>]*>/g, '').trim();
    if (!term) return addToast('Escribe un término en el frente primero', 'error');
    setLookingUpDef(true);
    try {
      const def = await lookupDefinition(term);
      if (def?.definition) {
        if (frontContentRef.current) frontContentRef.current.innerHTML = def.definition;
        if (backContentRef.current) backContentRef.current.innerHTML = term;
        setFields(prev => ({ ...prev, front: def.definition, back: term }));
      }
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Error buscando definicion', 'error');
    } finally {
      setLookingUpDef(false);
    }
  };"""

content = re.sub(old_def_regex, new_def, content, flags=re.DOTALL)

old_img_regex = r"const handleAutoImage = async \(\) => \{.*?setLookingUpImage\(false\);\s*\}\s*\};"

new_img = """const handleAutoImage = async () => {
    const term = (fields.front || '').replace(/<[^>]*>/g, '').trim();
    if (!term) return addToast('Escribe un término en el frente primero', 'error');
    setLookingUpImage(true);
    try {
      const url = await lookupImage(term);
      if (url) {
        const imgHtml = `<img src="${url}" />`;
        if (frontContentRef.current) frontContentRef.current.innerHTML = imgHtml;
        if (backContentRef.current) backContentRef.current.innerHTML = term;
        setFields(prev => ({ ...prev, front: imgHtml, back: term }));
      } else {
        addToast('No se encontró imagen', 'error');
      }
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Error buscando imagen', 'error');
    } finally {
      setLookingUpImage(false);
    }
  };"""

content = re.sub(old_img_regex, new_img, content, flags=re.DOTALL)

with open('src/pages/AddCard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

