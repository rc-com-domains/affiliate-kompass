import json,sys
from pathlib import Path
state=json.loads(Path(sys.argv[1]).read_text())
for key in ['sites','offers','proposals']:
 if not isinstance(state.get(key),list):raise ValueError('Ungültiger Export: '+key)
literal=json.dumps(state,ensure_ascii=False,separators=(',',':')).replace("'","''")
target=Path(__file__).parent/'02-bestand-import.sql'
target.write_text("-- Erstimport; vorhandener zentraler Bestand wird nicht überschrieben.\ninsert into public.affiliate_inventory(id,revision,payload) values(1,1,'"+literal+"'::jsonb) on conflict(id) do nothing;\n")
print('Import vorbereitet:',target)
