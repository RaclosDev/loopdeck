import sys

with open('src/pages/AddCard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')
p = 0
b = 0
for i, line in enumerate(lines):
    for char in line:
        if char == '(': p += 1
        elif char == ')': p -= 1
        elif char == '{': b += 1
        elif char == '}': b -= 1
    
    if i > len(lines) - 50:
        print(f"Line {i+1}: p={p} b={b} -> {line.strip()}")
