import re

with open('src/pages/AddCard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Make the front and back editors more aesthetic
old_front_div = """                <div 
                  className="form-input" 
                  style={{ minHeight: '120px', padding: '12px', fontSize: '1rem', lineHeight: 1.5, background: 'var(--bg-card)', borderRadius: '12px' }}
                  contentEditable 
                  ref={frontContentRef}
                  onInput={handleFieldChange('front')} 
                  onPaste={handlePaste('front')}
                />"""

new_front_div = """                <div 
                  className="form-input" 
                  style={{ minHeight: '120px', padding: '16px', fontSize: '1.1rem', lineHeight: 1.6, borderRadius: '16px', cursor: 'text' }}
                  contentEditable 
                  ref={frontContentRef}
                  onInput={handleFieldChange('front')} 
                  onPaste={handlePaste('front')}
                />"""

old_back_div = """                <div 
                  className="form-input" 
                  style={{ minHeight: '120px', padding: '12px', fontSize: '1rem', lineHeight: 1.5, background: 'var(--bg-card)', borderRadius: '12px' }}
                  contentEditable 
                  ref={backContentRef}
                  onInput={handleFieldChange('back')}
                  onPaste={handlePaste('back')}
                />"""

new_back_div = """                <div 
                  className="form-input" 
                  style={{ minHeight: '120px', padding: '16px', fontSize: '1.1rem', lineHeight: 1.6, borderRadius: '16px', cursor: 'text' }}
                  contentEditable 
                  ref={backContentRef}
                  onInput={handleFieldChange('back')}
                  onPaste={handlePaste('back')}
                />"""

content = content.replace(old_front_div, new_front_div)
content = content.replace(old_back_div, new_back_div)

# Change the labels to use form-label class
content = content.replace("""<label style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>FRENTE (PREGUNTA)</label>""", """<label className="form-label" style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>FRENTE (PREGUNTA)</label>""")
content = content.replace("""<label style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>DORSO (RESPUESTA)</label>""", """<label className="form-label" style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>DORSO (RESPUESTA)</label>""")
content = content.replace("""<label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>MAZO</label>""", """<label className="form-label" style={{ margin: 0, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>MAZO</label>""")
content = content.replace("""<label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>TIPO DE NOTA</label>""", """<label className="form-label" style={{ margin: 0, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>TIPO DE NOTA</label>""")
content = content.replace("""<label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Lista de Conceptos</label>""", """<label className="form-label" style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Lista de Conceptos</label>""")

with open('src/pages/AddCard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
