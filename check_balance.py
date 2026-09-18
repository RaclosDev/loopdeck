import sys

def check_balance(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        c = f.read()
    
    parens = 0
    braces = 0
    brackets = 0
    
    for i, char in enumerate(c):
        if char == '(': parens += 1
        elif char == ')': parens -= 1
        elif char == '{': braces += 1
        elif char == '}': braces -= 1
        elif char == '[': brackets += 1
        elif char == ']': brackets -= 1
    
    print(f"{filename} - parens: {parens}, braces: {braces}, brackets: {brackets}")

check_balance('src/pages/AddCard.tsx')
check_balance('src/pages/GlobalStudy.tsx')
