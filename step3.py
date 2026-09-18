import os
import glob

replacements = {
    'primary-btn': 'btn btn-primary',
    '--text-main': '--text-primary',
    '--text-dim': '--text-muted',
    '--accent-color': '--accent-primary',
    '--accent-light': '--accent-primary-light',
    '--danger-color': '--color-danger',
    '--border-color': '--border-subtle',
    '--bg-hover': '--bg-card-hover',
    '--bg-surface': '--bg-secondary',
}

files = glob.glob('src/**/*.tsx', recursive=True) + glob.glob('src/**/*.ts', recursive=True)

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    for old, new in replacements.items():
        content = content.replace(old, new)
        
    if content != original:
        with open(file, 'w', encoding='utf-8', newline='\n') as f:
            f.write(content)
        print(f"Updated {file}")
