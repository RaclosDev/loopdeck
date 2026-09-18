with open('src/design-system.css', 'a', encoding='utf-8') as f:
    f.write("\n\n/* 8. Utility Rows */\n.pill-row {\n  display: flex;\n  gap: var(--space-sm);\n  overflow-x: auto;\n  padding: var(--space-sm) 0;\n  -webkit-overflow-scrolling: touch;\n  scrollbar-width: none;\n}\n.pill-row::-webkit-scrollbar { display: none; }\n")
