import re

with open('src/pages/Study.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the grid
content = content.replace(
    '<div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 w-full max-w-2xl">',
    '<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "1rem", marginBottom: "2rem", width: "100%", maxWidth: "600px" }}>'
)
content = re.sub(
    r'<div className="bg-card border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center(?: col-span-2)?">',
    r'<div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1rem" }}>',
    content
)

content = re.sub(
    r'<p className="text-muted-foreground mb-8">(.*?)</p>',
    r'<p className="empty-state-desc">\1</p>',
    content
)

content = re.sub(
    r'<strong className="text-foreground">(.*?)</strong>',
    r'<strong style={{ color: "var(--text-primary)" }}>\1</strong>',
    content
)

content = re.sub(
    r'className="btn btn-primary flex items-center gap-2 px-6 py-3 rounded-xl text-lg font-semibold shadow-lg shadow-primary/20"',
    r'className="btn btn-primary" style={{ padding: "1rem 2rem", fontSize: "1.1rem" }}',
    content
)

content = re.sub(
    r'className="btn btn-primary flex items-center gap-2 px-6 py-3 rounded-xl font-semibold"',
    r'className="btn btn-primary" style={{ padding: "1rem 2rem", fontSize: "1.1rem" }}',
    content
)

# the top header
content = content.replace(
    '<div className="flex justify-between items-center mb-6 shrink-0 px-2">',
    '<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", padding: "0 0.5rem" }}>'
)

content = content.replace(
    '<div className="flex items-center gap-3">',
    '<div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>'
)

content = content.replace(
    'className="p-2 -ml-2 text-muted-foreground hover:text-foreground hover:bg-[rgba(255,255,255,0.05)] rounded-full transition-colors"',
    'style={{ padding: "0.5rem", marginLeft: "-0.5rem", color: "var(--text-muted)", borderRadius: "50%", transition: "all 0.2s" }}'
)

content = content.replace(
    '<h2 className="m-0 text-lg font-bold">{deck?.name}</h2>',
    '<h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>{deck?.name}</h2>'
)

content = content.replace(
    '<div className="flex gap-2 text-xs font-bold">',
    '<div style={{ display: "flex", gap: "0.5rem", fontSize: "0.8rem", fontWeight: 700 }}>'
)

content = content.replace(
    '<div className="bg-blue-500/10 text-blue-500 px-2.5 py-1 rounded-full">{counts.new}</div>',
    '<div className="pill" style={{ color: "var(--accent-primary-light)", borderColor: "var(--accent-primary)" }}>{counts.new}</div>'
)

content = content.replace(
    '<div className="bg-orange-500/10 text-orange-500 px-2.5 py-1 rounded-full">{counts.learning}</div>',
    '<div className="pill" style={{ color: "var(--color-warning)", borderColor: "var(--color-warning)" }}>{counts.learning}</div>'
)

content = content.replace(
    '<div className="bg-emerald-500/10 text-emerald-500 px-2.5 py-1 rounded-full">{counts.review}</div>',
    '<div className="pill" style={{ color: "var(--color-success)", borderColor: "var(--color-success)" }}>{counts.review}</div>'
)

content = content.replace(
    '<div className="flex-1 flex flex-col min-h-0 relative">',
    '<div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, position: "relative" }}>'
)

content = content.replace(
    '<div className="flex-1 flex flex-col items-center justify-center min-h-0 py-2 sm:py-4 w-full">',
    '<div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 0, padding: "1rem 0", width: "100%" }}>'
)

content = content.replace(
    '<div className="mt-4 shrink-0 flex flex-col gap-4 pb-4">',
    '<div style={{ marginTop: "1rem", flexShrink: 0, display: "flex", flexDirection: "column", gap: "1rem", paddingBottom: "1rem" }}>'
)

content = content.replace(
    'className="btn btn-primary w-full py-5 text-xl font-bold rounded-[20px] flex items-center justify-center gap-2 shadow-xl shadow-primary/25"',
    'className="btn btn-primary" style={{ width: "100%", padding: "1.25rem", fontSize: "1.25rem", borderRadius: "var(--radius-xl)" }}'
)


with open('src/pages/Study.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
