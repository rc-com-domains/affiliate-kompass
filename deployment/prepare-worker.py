from pathlib import Path
import json
here=Path(__file__).resolve().parent
html=(here.parent/'pruefung.html').read_text()
html=html.replace('<head>', '<head><meta name="robots" content="noindex,nofollow,noarchive">',1)
html=html.replace('</body>', '<form action="/logout" method="post" style="position:fixed;bottom:12px;left:18px;z-index:20"><button class="btn secondary">Abmelden</button></form></body>')
(here/'worker/index.js').write_text('const page='+json.dumps(html,ensure_ascii=False)+';\n'+(here/'worker/auth.js').read_text())
