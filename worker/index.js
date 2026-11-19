const SITE = "https://quicktools24.in";
const OWNER = "Sachinrajpooot";
const REPO = "Quicktools";
const BASE = "main";
const ALLOWED = "Sachinrajpooot";
const COOKIE = "__Host-qt_admin";
const STATE = "__Host-qt_state";
const enc = new TextEncoder();
const dec = new TextDecoder();
const json = (data, status) => new Response(JSON.stringify(data), {status: status || 200, headers: {"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
function getCookie(req, name) {
  const part = (req.headers.get("Cookie") || "").split(";").map(x => x.trim()).find(x => x.startsWith(name + "="));
  return part ? part.slice(name.length + 1) : "";
}
function b64url(bytes) {
  let s = ""; for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
}
function from64url(s) {
  s=s.replace(/-/g,"+").replace(/_/g,"/"); while(s.length%4)s+="=";
  const raw=atob(s); return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
function cookie(name,value,age) { return name+"="+value+"; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age="+age; }
function clear(name) { return name+"=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"; }
async function key(env) {
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters");
  const digest=await crypto.subtle.digest("SHA-256",enc.encode(env.SESSION_SECRET));
  return crypto.subtle.importKey("raw",digest,"AES-GCM",false,["encrypt","decrypt"]);
}
async function seal(data,env) {
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const cipher=await crypto.subtle.encrypt({name:"AES-GCM",iv},await key(env),enc.encode(JSON.stringify(data)));
  return b64url(new Uint8Array([...iv,...new Uint8Array(cipher)]));
}
async function session(req,env) {
  try {
    const raw=from64url(getCookie(req,COOKIE)); if(raw.length<14)return null;
    const plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:raw.slice(0,12)},await key(env),raw.slice(12));
    const data=JSON.parse(dec.decode(plain));
    return data.exp>Date.now() && data.login.toLowerCase()===ALLOWED.toLowerCase() ? data : null;
  } catch { return null; }
}
function ghHeaders(token) { return {Authorization:"Bearer "+token,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28","User-Agent":"QuickTools24-Admin"}; }
async function gh(path,token,opts) {
  const r=await fetch("https://api.github.com"+path,{...(opts||{}),headers:{...ghHeaders(token),...((opts&&opts.headers)||{})}});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(d.message||("GitHub API error "+r.status)); return d;
}
function b64utf8(value) {
  const bytes=enc.encode(value); let binary="";
  for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return btoa(binary);
}
function esc(s) { return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function slugify(s) { return String(s).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,70); }
function articlePage(p) {
  const body=p.body.split(/\r?\n/).map(line=>{
    const t=line.trim(); if(!t)return "";
    if(t.startsWith("## "))return "<h2>"+esc(t.slice(3))+"</h2>";
    if(t.startsWith("### "))return "<h3>"+esc(t.slice(4))+"</h3>";
    if(t.startsWith("- "))return "<p>• "+esc(t.slice(2))+"</p>";
    return "<p>"+esc(t)+"</p>";
  }).filter(Boolean).join("\n");
  const canonical=SITE+"/articles/"+p.slug+".html";
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(p.title)+' | QuickTools24</title><meta name="description" content="'+esc(p.description)+'"><link rel="canonical" href="'+canonical+'"><meta name="robots" content="index,follow"><meta property="og:type" content="article"><meta property="og:title" content="'+esc(p.title)+'"><meta property="og:description" content="'+esc(p.description)+'"><meta property="og:url" content="'+canonical+'"><style>*{box-sizing:border-box}body{margin:0;background:#f5f7fb;color:#182230;font:16px/1.75 Arial,sans-serif}.top{background:#101c35;color:white;padding:18px max(20px,calc((100% - 900px)/2));font-weight:bold}.wrap{max-width:860px;margin:32px auto;padding:0 20px}.paper{background:white;border:1px solid #e5eaf2;border-radius:16px;padding:clamp(22px,5vw,48px)}h1{font-size:clamp(28px,5vw,42px);line-height:1.2;margin:0 0 14px}h2{margin-top:30px}.desc{color:#536174;font-size:18px}</style></head><body><header class="top"><a href="'+SITE+'" style="color:white;text-decoration:none">QuickTools24</a></header><main class="wrap"><article class="paper"><h1>'+esc(p.title)+'</h1><p class="desc">'+esc(p.description)+'</p>'+body+'</article><p><a href="'+SITE+'">Back to QuickTools24</a></p></main></body></html>';
}
const ADMIN = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>QuickTools24 Admin</title><style>*{box-sizing:border-box}body{margin:0;background:#f3f6fb;color:#172238;font:15px/1.5 Arial}.wrap{max-width:760px;margin:35px auto;padding:0 16px}.card{background:white;border:1px solid #e2e8f0;border-radius:16px;padding:24px}h1{margin:0 0 6px}label{display:block;font-weight:bold;margin:16px 0 6px}input,textarea{width:100%;padding:12px;border:1px solid #cbd5e1;border-radius:9px;font:inherit}textarea{min-height:220px}button,.btn{display:inline-block;border:0;border-radius:9px;background:#155eef;color:white;padding:12px 18px;font-weight:bold;text-decoration:none;cursor:pointer;margin-top:16px}.secondary{background:#e8eef8;color:#18345f;margin-left:8px}.status{margin-top:16px;padding:12px;border-radius:9px;background:#f1f5f9;white-space:pre-wrap;overflow-wrap:anywhere}.hidden{display:none}.muted{color:#65738a}.note{font-size:13px;color:#68778c}</style></head><body><main class="wrap"><section class="card"><h1>QuickTools24 Admin</h1><p class="muted">Private SEO article dashboard</p><div id="login"><p>Sign in with the authorized GitHub account.</p><a class="btn" href="/auth/login">Continue with GitHub</a></div><div id="editor" class="hidden"><p id="who" class="muted"></p><label>Article title</label><input id="title" maxlength="100" placeholder="How to Compress PDF Online"><label>SEO description</label><input id="description" maxlength="180" placeholder="Write a clear search-result summary"><label>URL slug</label><input id="slug" maxlength="70" placeholder="how-to-compress-pdf"><label>Article content</label><textarea id="body" maxlength="30000" placeholder="Write original useful content. Use ## for section headings and ### for subheadings."></textarea><button id="publish">Create review pull request</button><button id="logout" class="secondary">Logout</button><p class="note">A GitHub pull request is created. The article goes live only after review and merge. Avoid private or sensitive information.</p></div><div id="status" class="status">Checking login…</div></section></main><script>const $=id=>document.getElementById(id),s=$("status");async function check(){try{const r=await fetch("/api/me"),d=await r.json();$("login").classList.toggle("hidden",d.authenticated);$("editor").classList.toggle("hidden",!d.authenticated);if(d.authenticated)$("who").textContent="Signed in as "+d.login;s.textContent=d.authenticated?"You are securely signed in.":"Please sign in to continue."}catch{s.textContent="Could not connect. Refresh and try again."}}$("title").oninput=()=>{if(!$("slug").dataset.edited)$("slug").value=$("title").value.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,70)};$("slug").oninput=()=>{$("slug").dataset.edited="1";$("slug").value=$("slug").value.toLowerCase().replace(/[^a-z0-9-]/g,"").replace(/--+/g,"-")};$("publish").onclick=async()=>{const p={title:$("title").value.trim(),description:$("description").value.trim(),slug:$("slug").value.trim(),body:$("body").value};if(!p.title||!p.description||!p.body){s.textContent="Title, description and article content are required.";return}const b=$("publish");b.disabled=true;s.textContent="Creating review pull request…";try{const r=await fetch("/api/articles",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(p)}),d=await r.json();if(!r.ok)throw Error(d.error||"Request failed");s.textContent="Draft created. Review and merge this pull request:\n"+d.pullRequestUrl}catch(e){s.textContent="Error: "+e.message}finally{b.disabled=false}};$("logout").onclick=async()=>{await fetch("/api/logout",{method:"POST"});location.reload()};check();</script></body></html>';
async function publish(p,token) {
  const slug=slugify(p.slug||p.title),title=String(p.title||"").trim().slice(0,100),description=String(p.description||"").trim().slice(0,180),body=String(p.body||"").trim();
  if(!slug||!title||title.length<8||description.length<40||body.length<300)throw new Error("Title 8+, description 40+ and article content 300+ characters required.");
  const branch="admin/article-"+slug+"-"+Date.now();
  const main=await gh("/repos/"+OWNER+"/"+REPO+"/git/ref/heads/"+BASE,token);
  await gh("/repos/"+OWNER+"/"+REPO+"/git/refs",token,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({ref:"refs/heads/"+branch,sha:main.object.sha})});
  const path="articles/"+slug+".html";
  await gh("/repos/"+OWNER+"/"+REPO+"/contents/"+path,token,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({message:"Add SEO article: "+title,content:b64utf8(articlePage({title,description,slug,body})),branch})});
  const sm=await gh("/repos/"+OWNER+"/"+REPO+"/contents/sitemap.xml?ref="+encodeURIComponent(branch),token);
  const bytes=Uint8Array.from(atob(sm.content.replace(/\n/g,"")),c=>c.charCodeAt(0)); let xml=dec.decode(bytes);
  const articleUrl=SITE+"/"+path;
  if(!xml.includes(articleUrl)){xml=xml.replace("</urlset>",'  <url><loc>'+articleUrl+'</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>\n</urlset>');await gh("/repos/"+OWNER+"/"+REPO+"/contents/sitemap.xml",token,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({message:"Add article to sitemap",content:b64utf8(xml),branch,sha:sm.sha})});}
  const pr=await gh("/repos/"+OWNER+"/"+REPO+"/pulls",token,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({title:"Publish SEO article: "+title,head:branch,base:BASE,body:"Review the article page and sitemap entry before merging.\n\nArticle: "+articleUrl+"\nSEO title and description included. Please proofread before publishing."})});
  return {pullRequestUrl:pr.html_url,articleUrl:articleUrl};
}
export default {
 async fetch(request,env) {
  const u=new URL(request.url),path=u.pathname;
  if(request.method==="GET"&&path==="/")return Response.redirect(u.origin+"/admin",302);
  if(request.method==="GET"&&path==="/admin")return new Response(ADMIN,{headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store","content-security-policy":"default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"}});
  if(request.method==="GET"&&path==="/auth/login"){
   if(!env.GITHUB_CLIENT_ID)return new Response("Missing GITHUB_CLIENT_ID variable.",{status:500});
   const state=b64url(crypto.getRandomValues(new Uint8Array(24))),target=new URL("https://github.com/login/oauth/authorize");
   target.searchParams.set("client_id",env.GITHUB_CLIENT_ID);target.searchParams.set("redirect_uri",u.origin+"/auth/callback");target.searchParams.set("scope","public_repo");target.searchParams.set("state",state);
   return new Response(null,{status:302,headers:{Location:target.toString(),"Set-Cookie":cookie(STATE,state,600),"Cache-Control":"no-store"}});
  }
  if(request.method==="GET"&&path==="/auth/callback"){
   if(!urlParam(u,"state")||urlParam(u,"state")!==getCookie(request,STATE)||!urlParam(u,"code"))return new Response("OAuth state check failed. Try login again.",{status:400});
   if(!env.GITHUB_CLIENT_ID||!env.GITHUB_CLIENT_SECRET)return new Response("GitHub OAuth credentials are not configured.",{status:500});
   const tr=await fetch("https://github.com/login/oauth/access_token",{method:"POST",headers:{Accept:"application/json","content-type":"application/json"},body:JSON.stringify({client_id:env.GITHUB_CLIENT_ID,client_secret:env.GITHUB_CLIENT_SECRET,code:urlParam(u,"code"),redirect_uri:u.origin+"/auth/callback"})});
   const td=await tr.json();if(!tr.ok||!td.access_token)return new Response("GitHub login failed.",{status:401});
   const profile=await fetch("https://api.github.com/user",{headers:ghHeaders(td.access_token)}).then(r=>r.json());
   if(!profile.login||profile.login.toLowerCase()!==ALLOWED.toLowerCase())return new Response("This GitHub account is not allowed.",{status:403,headers:{"Set-Cookie":clear(STATE)}});
   const value=await seal({accessToken:td.access_token,login:profile.login,exp:Date.now()+28800000},env);
   return new Response(null,{status:302,headers:{Location:u.origin+"/admin","Set-Cookie":cookie(COOKIE,value,28800)+", "+clear(STATE),"Cache-Control":"no-store"}});
  }
  if(request.method==="GET"&&path==="/api/me"){const s=await session(request,env);return json(s?{authenticated:true,login:s.login}:{authenticated:false});}
  if(request.method==="POST"&&path==="/api/logout")return new Response('{"ok":true}',{headers:{"content-type":"application/json","Set-Cookie":clear(COOKIE),"cache-control":"no-store"}});
  if(request.method==="POST"&&path==="/api/articles"){
   if(request.headers.get("Origin")!==u.origin)return json({error:"Origin rejected."},403);
   const s=await session(request,env);if(!s)return json({error:"Please sign in again."},401);
   try{return json(await publish(await request.json(),s.accessToken),201)}catch(e){return json({error:e.message||"Could not create article."},400);}
  }
  return new Response("Not found",{status:404});
 }
};
function urlParam(u,k){return u.searchParams.get(k)||"";}
