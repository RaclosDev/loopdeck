import re

with open('src/index.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Fix mobile-bottom-nav to be a native-like full bottom bar covering the safe area
old_nav = """.mobile-bottom-nav {
    display: none;
    position: fixed;
    bottom: env(safe-area-inset-bottom);
    left: 1rem;
    right: 1rem;
    height: 64px;
    background: rgba(28, 28, 30, 0.45);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 32px;
    
    z-index: 100;
  }"""

new_nav = """.mobile-bottom-nav {
    display: none;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: calc(64px + env(safe-area-inset-bottom));
    padding-bottom: env(safe-area-inset-bottom);
    background: rgba(28, 28, 30, 0.45);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    border-top: 1px solid rgba(255, 255, 255, 0.12);
    z-index: 100;
  }"""

css = css.replace(old_nav, new_nav)

# Add iOS PWA fixes to html, body
old_body = """html, body { overflow-x: hidden;
    overscroll-behavior-x: none;
  }"""

new_body = """html, body { overflow-x: hidden;
    overscroll-behavior-x: none;
    background-color: var(--bg-primary);
    min-height: 100vh;
    min-height: -webkit-fill-available;
  }"""

css = css.replace(old_body, new_body)

with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write(css)

