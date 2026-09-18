import sys

with open('src/pages/AddCard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's count where the imbalance happens
lines = content.split('\n')
p = 0
b = 0
for i, line in enumerate(lines):
    for char in line:
        if char == '(': p += 1
        elif char == ')': p -= 1
        elif char == '{': b += 1
        elif char == '}': b -= 1
    if p < 0 or b < 0:
        print(f"Negative balance at line {i+1}: p={p}, b={b}")

print(f"Final balance: p={p}, b={b}")
