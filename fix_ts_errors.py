import sys

def fix_addcard():
    with open('src/pages/AddCard.tsx', 'r', encoding='utf-8') as f:
        c = f.read()
    if c.endswith('}'):
        pass # maybe it is missing a closing brace?
    # wait I will check last 50 lines of AddCard
    print("AddCard.tsx:")
    print(c[-500:])

def fix_dashboard():
    with open('src/pages/Dashboard.tsx', 'r', encoding='utf-8') as f:
        c = f.read()
    print("Dashboard.tsx:")
    lines = c.split('\n')
    for i in range(160, min(180, len(lines))):
        print(f"{i+1}: {lines[i]}")

def fix_globalstudy():
    with open('src/pages/GlobalStudy.tsx', 'r', encoding='utf-8') as f:
        c = f.read()
    print("GlobalStudy.tsx:")
    lines = c.split('\n')
    for i in range(50, min(100, len(lines))):
        print(f"{i+1}: {lines[i]}")

def fix_stats():
    with open('src/pages/Stats.tsx', 'r', encoding='utf-8') as f:
        c = f.read()
    print("Stats.tsx:")
    lines = c.split('\n')
    for i in range(100, min(120, len(lines))):
        print(f"{i+1}: {lines[i]}")

def fix_templates():
    with open('src/pages/Templates.tsx', 'r', encoding='utf-8') as f:
        c = f.read()
    print("Templates.tsx:")
    lines = c.split('\n')
    for i in range(25, min(40, len(lines))):
        print(f"{i+1}: {lines[i]}")

fix_addcard()
fix_dashboard()
fix_globalstudy()
fix_stats()
fix_templates()
