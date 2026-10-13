// Imported into the final single-file Worker by prepare-worker.py.
const enc = new TextEncoder();
const hex = a => [...new Uint8Array(a)].map(x => x.toString(16).padStart(2,'0')).join('');
async function sha(s) { return hex(await crypto.subtle.digest('SHA-256',enc.encode(s))); }
async function sign(s,key) { const k=await crypto.subtle.importKey('raw',enc.encode(key),{name:'HMAC',hash:'SHA-256'},false,['sign']); return hex(await crypto.subtle.sign('HMAC',k,enc.encode(s))); }
function equal(a,b) { if(a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0; }
const headers={ 'Content-Type':'text/html; charset=utf-8', 'Cache-Control':'private, no-store, max-age=0', 'X-Robots-Tag':'noindex, nofollow, noarchive', 'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'no-referrer', 'Strict-Transport-Security':'max-age=31536000', 'Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'" };
function response(body,status=200,extra={}){return new Response(body,{status,headers:{...headers,...extra}});}
function login(error='') {return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>Affiliate-Kompass · Zugang</title><style>body{margin:0;background:#f5f4f0;color:#273332;font:16px system-ui;display:grid;min-height:100vh;place-items:center}main{width:min(380px,80vw);background:white;border:1px solid #e3e3db;border-radius:18px;padding:36px}small{color:#55716d}h1{font-size:27px}label,input,button{display:block}input{box-sizing:border-box;width:100%;font:inherit;padding:12px;margin:8px 0 20px;border:1px solid #adbebb;border-radius:7px}button{font:inherit;padding:13px;width:100%;border:0;border-radius:7px;background:#126d78;color:white;cursor:pointer}.error{color:#a23828}</style></head><body><main><small>DEINE FLOTTE. EIN BESTAND.</small><h1>Affiliate-Kompass</h1><p>Interne Prüfversion. Bitte melde dich mit dem Zugangspasswort an.</p><form action="/login" method="post"><label for="password">Passwort</label><input id="password" name="password" type="password" autocomplete="current-password" required maxlength="256"><button>Anmelden</button></form><p class="error" role="alert">${error}</p><small>Geschützter Zugang · HTTPS</small></main></body></html>`;}
async function authenticated(request,env){const c=request.headers.get('cookie')?.match(/(?:^|;\s*)ak_review=([0-9]+\.[a-f0-9]{64})/);if(!c)return false;const [expiry,signature]=c[1].split('.');if(Number(expiry)<=Date.now()||Number(expiry)>Date.now()+12*3600000)return false;return equal(signature,await sign(expiry,env.REVIEW_SESSION_KEY));}
const failures=new Map(); // Per-isolate best-effort throttling; password has 144 bits of entropy.
export default {async fetch(request,env){
 if(!env.REVIEW_PASSWORD_SHA256||!env.REVIEW_SESSION_KEY)return response('Zugang noch nicht eingerichtet.',503);
 const url=new URL(request.url);
 if(url.protocol!=='https:')return response('HTTPS erforderlich.',400);
 if(url.pathname==='/robots.txt')return response('User-agent: *\nDisallow: /\n',200,{'Content-Type':'text/plain; charset=utf-8'});
 if(request.method==='POST'){
  if(request.headers.get('origin')!==url.origin)return response('Ungültige Anfrage.',403);
  if(url.pathname==='/logout')return response('',303,{'Location':'/','Set-Cookie':'ak_review=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0'});
  if(url.pathname!=='/login')return response('Nicht gefunden.',404);
  if(Number(request.headers.get('content-length')||0)>4096)return response('Anfrage zu groß.',413);
  const ip=request.headers.get('cf-connecting-ip')||'unknown';let f=failures.get(ip);if(f&&Date.now()-f.at>60000){failures.delete(ip);f=null;}if(f?.count>=5)return response(login('Bitte warte eine Minute und versuche es erneut.'),429,{'Retry-After':'60'});
  const raw=await request.text();if(raw.length>4096)return response('Anfrage zu groß.',413);
  const password=new URLSearchParams(raw).get('password')||'';
  if(password.length>256||!equal(await sha(password),env.REVIEW_PASSWORD_SHA256)) { if(failures.size>10000)failures.clear();failures.set(ip,{at:f?.at||Date.now(),count:(f?.count||0)+1});return response(login('Das Passwort stimmt nicht.'),401); }
  failures.delete(ip);const expiry=String(Date.now()+12*3600000);const cookie=expiry+'.'+await sign(expiry,env.REVIEW_SESSION_KEY);
  return response('',303,{'Location':'/','Set-Cookie':`ak_review=${cookie}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=43200`});
 }
 if(!['GET','HEAD'].includes(request.method))return response('Methode nicht erlaubt.',405);
 if(!await authenticated(request,env))return response(request.method==='HEAD'?null:login(),401);
 if(!['/','/pruefung.html'].includes(url.pathname))return response('Nicht gefunden.',404);
 return response(request.method==='HEAD'?null:page);
}};
