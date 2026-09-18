import re

with open('src/index.css', 'r', encoding='utf-8') as f:
    content = f.read()

# Add aliases to :root
root_end = content.find('}')
if root_end != -1:
    aliases = '''
  /* Compat aliases */
  --text-main: var(--text-primary);
  --text-dim: var(--text-muted);
  --accent-color: var(--accent-primary);
  --accent-light: var(--accent-primary-light);
  --danger-color: #EF4444;
  --danger-bg: var(--color-danger-bg);
  --border-color: var(--border-subtle);
  --bg-hover: var(--bg-card-hover);
  --bg-surface: var(--bg-secondary);
'''
    content = content[:root_end] + aliases + content[root_end:]

# Add .primary-btn alias
content += '''
/* Safety alias */
.primary-btn {
  background: var(--accent-primary);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-md);
  font-weight: 600;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-base);
}
'''

with open('src/index.css', 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)
