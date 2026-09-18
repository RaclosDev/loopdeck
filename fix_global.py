import os

with open('src/pages/GlobalStudy.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('</div></div>\n              </div>\n              \n              <div style={{ background: \'var(--bg-glass)', '</div>\n              </div>\n              \n              <div style={{ background: \'var(--bg-glass)')

with open('src/pages/GlobalStudy.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
