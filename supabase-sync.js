// Public project configuration only. Supabase Auth and SQL RPCs enforce write access.
(()=>{
const cfg=window.AFFILIATE_SUPABASE||{},configured=!!cfg.url&&!!cfg.publishableKey;
let validKey=cfg.publishableKey?.startsWith('sb_publishable_');
if(!validKey&&cfg.publishableKey){try{validKey=JSON.parse(atob(cfg.publishableKey.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role==='anon';}catch{}}
const sessionKey='affiliate-kompass-supabase-session';
let session=null,ready=false,blocked=false,busy=0,revision=null,queue=Promise.resolve();
const baseRender=render;
render=function(){baseRender();const notice=document.querySelector('#content > .notice');if(notice)notice.innerHTML=configured?'<b>Zentrale Verwaltung · Supabase.</b> Websites, Angebote und Freigaben werden gemeinsam gespeichert. Neue Luna-Abgleiche bleiben deaktiviert. Freigaben veröffentlichen keine Website.':'<b>Lokale Prüfversion · Supabase noch nicht eingerichtet.</b> Änderungen bleiben weiterhin in diesem Browser. Für die zentrale Speicherung fehlen Projekt-URL und Publishable Key.';};
function status(text,error=false){const e=document.getElementById('supabase-status');if(e){e.textContent=text;e.style.color=error?'#a34335':'';}}
function remembered(){try{session=JSON.parse(localStorage.getItem(sessionKey));}catch{session=null;}}
function remember(){try{if(session)localStorage.setItem(sessionKey,JSON.stringify(session));else localStorage.removeItem(sessionKey);}catch{}}
async function request(path,body,authenticated=false){
 if(!validKey)throw Error('Nur Publishable Key oder legacy anon Key verwenden; niemals Secret/service_role.');
 const url=new URL(cfg.url);if(url.protocol!=='https:'||!url.hostname.endsWith('.supabase.co'))throw Error('Bitte eine gültige Supabase-Projekt-URL konfigurieren.');
 if(authenticated){if(!session)throw Error('Bitte anmelden.');if(session.expires_at<=Date.now()/1000+60){const old=session;const fresh=await request('/auth/v1/token?grant_type=refresh_token',{refresh_token:old.refresh_token});session={...fresh,expires_at:Date.now()/1000+fresh.expires_in};remember();}}
 const headers={'apikey':cfg.publishableKey,'Content-Type':'application/json'};if(authenticated)headers.Authorization='Bearer '+session.access_token;
 const response=await fetch(url.origin+path,{method:'POST',headers,body:JSON.stringify(body),cache:'no-store'});
 const data=await response.json();if(!response.ok)throw Error(data.msg||data.error_description||data.message||'Supabase-Anfrage fehlgeschlagen.');return data;
}
function openLogin(message=''){ready=false;document.body.classList.add('supabase-required');document.getElementById('supabase-login-error').textContent=message;}
async function load(){const result=await request('/rest/v1/rpc/affiliate_read',{},true);if(!result?.state)throw Error('Initialbestand fehlt. Bitte 02-bestand-import.sql ausführen.');db=result.state;revision=result.revision;ready=true;blocked=false;document.body.classList.remove('supabase-required');render();status('Zentral geladen · Version '+revision);}
const browserSave=save;
save=function(){
 if(!configured)return browserSave();
 if(!ready||blocked){status('Nicht gespeichert · bitte Verbindung oder Anmeldung prüfen.',true);return false;}
 const snapshot=structuredClone(db);busy++;status('Wird zentral gespeichert …');
 queue=queue.then(async()=>{if(blocked)return;const result=await request('/rest/v1/rpc/affiliate_save',{expected_revision:revision,new_state:snapshot},true);if(result.conflict)throw Error('Ein anderes Gerät hat den Bestand geändert. Entwurf exportieren und neu laden.');revision=result.revision;})
 .catch(error=>{blocked=true;status('Nicht gespeichert: '+error.message,true);toast('Nicht zentral gespeichert. Bitte deinen Entwurf exportieren.');})
 .finally(()=>{busy--;if(!busy&&!blocked)status('Zentral gespeichert · Version '+revision);});
 return true;
};
// PostgreSQL JSONB may reorder object keys; semantic equality preserves offer snapshots.
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
validProposals=()=>db.proposals.filter(p=>{const o=db.offers.find(o=>o.id===p.offer),s=db.sites.find(s=>s.id===p.site);if(!o||!s||!eligible(o,s))return false;if(!p.offerSnapshot)return true;try{return JSON.stringify(canonical(JSON.parse(p.offerSnapshot)))===JSON.stringify(canonical(o));}catch{return false;}});
autoSimulate=function(){return 0;}; // Central threshold edits never fabricate publications or simulated approvals.
document.head.insertAdjacentHTML('beforeend','<style>body.supabase-required .shell{display:none}#supabase-login{display:none}body.supabase-required #supabase-login{position:fixed;inset:0;background:#f5f7f4;display:grid;place-items:center;z-index:9000}#supabase-login section{width:min(400px,85vw);padding:32px;border-radius:16px;background:white}#supabase-login input{width:100%;box-sizing:border-box;margin:8px 0 15px}#supabase-login label{display:block}#supabase-login-error{color:#a34335}</style>');
document.body.insertAdjacentHTML('beforeend','<div id="supabase-login"><section><h1>Affiliate-Kompass</h1><p>Gemeinsamer Bestand · Supabase-Anmeldung</p><form id="supabase-login-form"><label for="supabase-email">E-Mail</label><input class="control" id="supabase-email" type="email" autocomplete="username" required><label for="supabase-password">Passwort</label><input class="control" id="supabase-password" type="password" autocomplete="current-password" required><button class="btn primary">Anmelden</button><p id="supabase-login-error" role="alert"></p></form><p class="sub">Nur ausdrücklich freigegebene Nutzer erhalten Zugriff.</p></section></div>');
document.querySelector('.topbar').insertAdjacentHTML('beforeend','<span id="supabase-status" role="status" style="font-size:12px">'+(configured?'Verbindung wird hergestellt …':'Lokal · Supabase fehlt')+'</span>'+(configured?'<button class="btn secondary" id="supabase-refresh">Bestand aktualisieren</button><button class="btn secondary" id="supabase-logout">Abmelden</button>':''));
document.getElementById('supabase-login-form').onsubmit=async event=>{event.preventDefault();const password=document.getElementById('supabase-password');try{const data=await request('/auth/v1/token?grant_type=password',{email:document.getElementById('supabase-email').value.trim(),password:password.value});session={...data,expires_at:Date.now()/1000+data.expires_in};remember();password.value='';await load();}catch(error){openLogin(error.message);}};
if(configured){
 document.getElementById('supabase-refresh').onclick=async()=>{if(busy||document.querySelector('.modal')){toast('Bitte offene Eingaben zuerst abschließen.');return;}if(blocked){toast('Deinen nicht gespeicherten Entwurf zuerst über Bestand exportieren sichern. Danach neu laden.');return;}try{await load();}catch(error){status(error.message,true);}};
 document.getElementById('supabase-logout').onclick=async()=>{if(busy||blocked){toast('Bitte nicht gespeicherte Änderungen zuerst exportieren.');return;}try{if(session)await request('/auth/v1/logout',{},true);}catch{}session=null;remember();db=structuredClone(seed);openLogin();status('Abgemeldet');};
 remembered();openLogin();if(session)load().catch(error=>openLogin(error.message));
}
window.addEventListener('beforeunload',event=>{if(busy||blocked){event.preventDefault();event.returnValue='';}});
// Never replace active drafts. Other-device changes are indicated, not silently applied.
if(configured)setInterval(async()=>{if(!ready||busy||blocked||document.querySelector('.modal'))return;try{const result=await request('/rest/v1/rpc/affiliate_read',{},true);if(result.revision!==revision)status('Neuer Bestand verfügbar · bitte Bestand aktualisieren.');}catch(error){status('Verbindung unterbrochen: '+error.message,true);}},60000);
render();
})();
