import re

with open('src/components/FlashCard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Base container
content = re.sub(
    r'className={`relative w-full max-w-lg mx-auto flex-1 min-h-\[400px\] max-h-\[65vh\] flex flex-col \$\{\!isFlipped \? \'cursor-pointer group\' : \'\'\}`}',
    r'style={{ position: "relative", width: "100%", maxWidth: "32rem", margin: "0 auto", flex: 1, minHeight: "400px", maxHeight: "65vh", display: "flex", flexDirection: "column", cursor: !isFlipped ? "pointer" : "default" }}',
    content
)

# Front / Back card
content = re.sub(
    r'className="absolute inset-0 flex flex-col p-6 sm:p-10 bg-card shadow-2xl border border-white/10"',
    r'className="card" style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", padding: "2rem", boxShadow: "0 10px 40px rgba(0,0,0,0.5)", border: "1px solid var(--border-medium)", borderRadius: "var(--radius-xl)" }}',
    content
)

# Text container
content = re.sub(
    r'className="flex-1 flex flex-col items-center justify-center overflow-y-auto min-h-0 w-full text-center"',
    r'style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflowY: "auto", minHeight: 0, width: "100%", textAlign: "center", scrollbarWidth: "none" }}',
    content
)

# Front text
content = re.sub(
    r'className="text-2xl sm:text-3xl leading-relaxed text-foreground/90 font-medium"',
    r'style={{ fontSize: "1.75rem", lineHeight: 1.6, color: "var(--text-primary)", fontWeight: 500 }}',
    content
)

# Back text
content = re.sub(
    r'className="text-xl sm:text-2xl leading-relaxed text-foreground/90"',
    r'style={{ fontSize: "1.25rem", lineHeight: 1.6, color: "var(--text-primary)" }}',
    content
)

# Touch to flip
content = re.sub(
    r'className="mt-4 pt-4 shrink-0 flex justify-center items-center gap-2 text-sm text-muted-foreground opacity-60 group-hover:opacity-100 transition-opacity border-t border-white/5"',
    r'style={{ marginTop: "1rem", paddingTop: "1rem", flexShrink: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-muted)", borderTop: "1px solid var(--border-subtle)", opacity: !isFlipped ? 0.7 : 1 }}',
    content
)

content = re.sub(
    r'className="font-medium tracking-wide"',
    r'style={{ fontWeight: 500, letterSpacing: "0.05em" }}',
    content
)

with open('src/components/FlashCard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
