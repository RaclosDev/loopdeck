import os
import re

with open('src/pages/AuthPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = "declare global { interface Window { google: any; } }\n" + content

with open('src/pages/AuthPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

