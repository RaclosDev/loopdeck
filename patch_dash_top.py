import re

with open('frontend/src/pages/Dashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the title bar to remove 3 dot menu
title_bar_pattern = r'<div className="flex justify-between items-start mb-4">\s*<h2 className="text-xl font-bold m-0 cursor-pointer hover:text-\[var\(--accent-primary\)\] transition-colors" onClick=\{\(\) => navigate\(`/study/\$\{deck.id\}`\)\}>\{deck\.name\}</h2>\s*<Button variant="ghost" size="icon" onClick=\{\(\) => setActiveMoreMenu\(deck\.id\)\} className="-mt-1 -mr-2">\s*<MoreVertical className="w-5 h-5 opacity-70" />\s*</Button>\s*</div>'

new_title_bar = '''<div className="mb-4">
                  <h2 className="text-[1.1rem] font-bold m-0 text-white">{deck.name}</h2>
                </div>'''

content = re.sub(title_bar_pattern, new_title_bar, content, flags=re.DOTALL)

with open('frontend/src/pages/Dashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
