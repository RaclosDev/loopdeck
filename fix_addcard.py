import os
import re

with open('src/pages/AddCard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('className="bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-md px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1"', 'className="btn btn-secondary btn-sm"')

with open('src/pages/AddCard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
