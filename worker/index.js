const SITE = "https://quicktools24.in";
const OWNER = "Sachinrajpooot";
const REPO = "Quicktools";
const BASE = "main";
const ALLOWED = "Sachinrajpooot";
const COOKIE = "__Host-qt_admin";
const STATE = "__Host-qt_state";
const enc = new TextEncoder();
const dec = new TextDecoder();
const json = (data, status) => new Response(JSON.stringify(data), {status: status || 200, headers: {"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff","referrer-policy":"no-referrer","x-frame-options":"DENY"}});
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
  if (!env.GITHUB_CLIENT_SECRET || env.GITHUB_CLIENT_SECRET.length < 20) throw new Error("GitHub Client Secret is not configured.");
  const digest=await crypto.subtle.digest("SHA-256",enc.encode(env.GITHUB_CLIENT_SECRET));
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
    const safe=esc(t).replace(/\[([^\]]+)\]\((https:\/\/[^\s)]+|\/[a-zA-Z0-9_./#?=&%-]+)\)/g,'<a href="$2" rel="noopener">$1</a>');
    if(t.startsWith("## "))return "<h2>"+esc(t.slice(3))+"</h2>";
    if(t.startsWith("### "))return "<h3>"+esc(t.slice(4))+"</h3>";
    if(t.startsWith("- "))return "<p>• "+safe.slice(2)+"</p>";
    return "<p>"+safe+"</p>";
  }).filter(Boolean).join("\n");
  const canonical=SITE+"/articles/"+p.slug+".html";
  const image=esc(p.imageUrl||"");
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(p.title)+' | QuickTools24</title><meta name="description" content="'+esc(p.description)+'"><link rel="canonical" href="'+canonical+'"><meta name="robots" content="index,follow"><meta property="og:type" content="article"><meta property="og:title" content="'+esc(p.title)+'"><meta property="og:description" content="'+esc(p.description)+'"><meta property="og:url" content="'+canonical+'"><meta property="og:image" content="'+image+'"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="'+image+'"><style>*{box-sizing:border-box}body{margin:0;background:#f5f7fb;color:#182230;font:16px/1.75 Arial,sans-serif}.top{background:#101c35;color:white;padding:18px max(20px,calc((100% - 900px)/2));font-weight:bold}.wrap{max-width:900px;margin:32px auto;padding:0 20px}.paper{background:white;border:1px solid #e5eaf2;border-radius:16px;padding:clamp(22px,5vw,48px)}h1{font-size:clamp(28px,5vw,42px);line-height:1.2;margin:0 0 14px}h2{margin-top:30px}.desc{color:#536174;font-size:18px}.hero{display:block;width:100%;max-height:420px;object-fit:cover;border-radius:14px;margin:22px 0}.paper a{color:#155eef;font-weight:700}.tool-cta{display:inline-block;margin-top:24px;padding:12px 18px;border-radius:10px;background:#4f46e5;color:#fff!important;text-decoration:none}</style></head><body><header class="top"><a href="'+SITE+'" style="color:white;text-decoration:none">QuickTools24</a></header><main class="wrap"><article class="paper"><h1>'+esc(p.title)+'</h1><p class="desc">'+esc(p.description)+'</p><img class="hero" src="'+image+'" alt="'+esc(p.title)+' — QuickTools24 guide" loading="eager">'+body+'<p><a class="tool-cta" href="'+SITE+'/all-tools.html">Explore QuickTools24 tools</a></p></article><p><a href="'+SITE+'/articles/">More guides</a> · <a href="'+SITE+'">QuickTools24 Home</a></p></main></body></html>';
}
const ADMIN = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>QuickTools24 Admin</title><style>*{box-sizing:border-box}body{margin:0;background:#f3f6fb;color:#172238;font:15px/1.5 Arial}.wrap{max-width:760px;margin:35px auto;padding:0 16px}.card{background:white;border:1px solid #e2e8f0;border-radius:16px;padding:24px}h1{margin:0 0 6px}label{display:block;font-weight:bold;margin:16px 0 6px}input,textarea{width:100%;padding:12px;border:1px solid #cbd5e1;border-radius:9px;font:inherit}textarea{min-height:220px}button,.btn{display:inline-block;border:0;border-radius:9px;background:#155eef;color:white;padding:12px 18px;font-weight:bold;text-decoration:none;cursor:pointer;margin-top:16px}.secondary{background:#e8eef8;color:#18345f;margin-left:8px}.status{margin-top:16px;padding:12px;border-radius:9px;background:#f1f5f9;white-space:pre-wrap;overflow-wrap:anywhere}.hidden{display:none}.muted{color:#65738a}.note{font-size:13px;color:#68778c}</style></head><body><main class="wrap"><section class="card"><h1>QuickTools24 Admin</h1><p class="muted">Private SEO article dashboard</p><div id="login"><p>Sign in with the authorized GitHub account.</p><a class="btn" href="/auth/login">Continue with GitHub</a></div><div id="editor" class="hidden"><p id="who" class="muted"></p><div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0"><a class="btn secondary" href="#site-analysis-section">Analysis</a><a class="btn secondary" href="/admin/feedback">Suggestions &amp; Feedback</a></div><label>Article title</label><input id="title" maxlength="100" placeholder="How to Compress PDF Online"><label>SEO description</label><input id="description" maxlength="180" placeholder="Write a clear search-result summary"><label>URL slug</label><input id="slug" maxlength="70" placeholder="how-to-compress-pdf"><label>Featured image URL (HTTPS)</label><input id="imageUrl" maxlength="500" placeholder="https://images.unsplash.com/..."><label>Article content (minimum 1,500 characters)</label><textarea id="body" maxlength="50000" placeholder="Write a detailed original guide. Use ## headings, ### subheadings, - bullet points and [tool name](/tool-page.html) for internal links."></textarea><label>Category</label><input id="category" value="SEO Guides" readonly><button id="publish">Create review pull request</button><button id="refresh" class="secondary">Refresh articles</button><button id="logout" class="secondary">Logout</button><section style="margin-top:24px"><h2>SEO Guides — Articles</h2><div id="articles" class="status">Loading articles…</div></section><section id="site-analysis-section" style="margin-top:24px"><h2>Website Analysis</h2><p class="note">Private dashboard — visible only after authorized admin login.</p><div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0"><button type="button" class="secondary" data-site-range="7d">7 days</button><button type="button" class="secondary" data-site-range="28d">28 days</button><button type="button" class="secondary" data-site-range="90d">90 days</button><button type="button" class="secondary" id="site-refresh">Refresh</button></div><div id="site-analysis" class="status">Loading website analysis…</div></section><section style="margin-top:24px"><h2>Tool usage analytics</h2><div id="analytics" class="status">Loading analytics…</div></section><p class="note">A GitHub pull request is created. The article goes live only after review and merge. Avoid private or sensitive information.</p></div><div id="status" class="status">Checking login…</div></section></main><script>const $=id=>document.getElementById(id),s=$("status");async function check(){try{const r=await fetch("/api/me"),d=await r.json();$("login").classList.toggle("hidden",d.authenticated);$("editor").classList.toggle("hidden",!d.authenticated);if(d.authenticated)$("who").textContent="Signed in as "+d.login;s.textContent=d.authenticated?"You are securely signed in.":"Please sign in to continue."}catch{s.textContent="Could not connect. Refresh and try again."}}$("title").oninput=()=>{if(!$("slug").dataset.edited)$("slug").value=$("title").value.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,70)};$("slug").oninput=()=>{$("slug").dataset.edited="1";$("slug").value=$("slug").value.toLowerCase().replace(/[^a-z0-9-]/g,"").replace(/--+/g,"-")};$("publish").onclick=async()=>{const p={title:$("title").value.trim(),description:$("description").value.trim(),slug:$("slug").value.trim(),imageUrl:$("imageUrl").value.trim(),body:$("body").value};if(!p.title||!p.description||!p.imageUrl||p.body.trim().length<1500){s.textContent="Title, description, HTTPS image URL and at least 1,500 characters of original content are required.";return}const b=$("publish");b.disabled=true;s.textContent="Creating review pull request…";try{const r=await fetch("/api/articles",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(p)}),d=await r.json();if(!r.ok)throw Error(d.error||"Request failed");s.textContent="Draft created. Review and merge this pull request:\\n"+d.pullRequestUrl}catch(e){s.textContent="Error: "+e.message}finally{b.disabled=false}};$("logout").onclick=async()=>{await fetch("/api/logout",{method:"POST"});location.reload()};async function loadArticles(){const box=$("articles");try{const r=await fetch("/api/articles"),d=await r.json();if(!r.ok)throw Error(d.error||"Could not load articles");box.innerHTML=d.articles.length?d.articles.map(a=>`<div style="padding:9px 0;border-bottom:1px solid #e5eaf2"><strong>${a.title.replace(/[&<>"]/g,"")}</strong><br><small>${a.slug}</small> · <a target="_blank" rel="noopener" href="${a.url}">Open article</a></div>`).join(""):"No published articles yet."}catch(e){box.textContent=e.message}}async function loadAnalytics(){const box=$("analytics");try{const r=await fetch("/api/analytics"),d=await r.json();if(!r.ok)throw Error(d.error||"Analytics unavailable");box.textContent=d.configured?("Tracked tool uses (last 7 days)\\n"+(d.tools.length?d.tools.map(x=>x.name+": "+x.uses).join("\\n"):"No tool usage recorded yet.")):"Analytics storage is not connected yet. Add a Cloudflare KV namespace binding named USAGE_KV to this Worker."}catch(e){box.textContent=e.message}}$("refresh").onclick=()=>{loadArticles();loadAnalytics()};async function loadSiteAnalysis(range="28d"){const box=$("site-analysis");box.textContent="Loading verified website analytics…";try{const r=await fetch("/api/site-analysis?range="+encodeURIComponent(range),{cache:"no-store"}),d=await r.json();if(!r.ok)throw Error(d.error||"Website analysis unavailable");const s=d.searchConsole||{},a=d.analytics||{};const lines=["Google Search impressions: "+(s.impressions??"—"),"Google Search clicks: "+(s.clicks??"—"),"Average CTR: "+(s.ctr==null?"—":(Number(s.ctr)*100).toFixed(2)+"%"),"Average Google position: "+(s.averagePosition??"—"),"Active users: "+(a.activeUsers??"—"),"Sessions: "+(a.sessions??"—"),"Page views: "+(a.pageViews??"—"),"Active users now: "+(d.realtimeActiveUsers??"—"),"Top pages: "+((d.topPages||[]).slice(0,5).map(x=>x.path+": "+x.views).join(" | ")||"—"),"Top tools: "+((d.topTools||[]).slice(0,5).map(x=>x.name+": "+x.uses).join(" | ")||"—"),"Updated: "+(d.updatedAt||"—")];box.textContent=lines.join("\\n")}catch(e){box.textContent=e.message}}document.querySelectorAll("[data-site-range]").forEach(b=>b.onclick=()=>loadSiteAnalysis(b.dataset.siteRange));$("site-refresh").onclick=()=>loadSiteAnalysis();check().then(()=>{loadArticles();loadAnalytics();loadSiteAnalysis()});</script></body></html>';
async function publish(p,token) {
  const slug=slugify(p.slug||p.title),title=String(p.title||"").trim().slice(0,100),description=String(p.description||"").trim().slice(0,180),body=String(p.body||"").trim(),imageUrl=String(p.imageUrl||"").trim();
  let image;try{image=new URL(imageUrl);if(image.protocol!=="https:")throw new Error();}catch{throw new Error("Add a valid HTTPS featured image URL.");}
  if(!slug||!title||title.length<8||description.length<40||body.length<1500||body.length>50000)throw new Error("Title 8+, description 40+, HTTPS image and 1,500–50,000 characters are required.");
  const path="articles/"+slug+".html";
  try{await gh("/repos/"+OWNER+"/"+REPO+"/contents/"+path+"?ref="+encodeURIComponent(BASE),token);throw new Error("This article URL already exists. Choose a different slug to avoid replacing an existing article.");}catch(e){if(!String(e.message).includes("Not Found"))throw e;}
  const branch="admin/article-"+slug+"-"+Date.now();
  const main=await gh("/repos/"+OWNER+"/"+REPO+"/git/ref/heads/"+BASE,token);
  await gh("/repos/"+OWNER+"/"+REPO+"/git/refs",token,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({ref:"refs/heads/"+branch,sha:main.object.sha})});
  await gh("/repos/"+OWNER+"/"+REPO+"/contents/"+path,token,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({message:"Add SEO article: "+title,content:b64utf8(articlePage({title,description,slug,body,imageUrl:image.href})),branch})});
  const sm=await gh("/repos/"+OWNER+"/"+REPO+"/contents/sitemap.xml?ref="+encodeURIComponent(branch),token);
  const bytes=Uint8Array.from(atob(sm.content.replace(/\n/g,"")),c=>c.charCodeAt(0)); let xml=dec.decode(bytes);
  const articleUrl=SITE+"/"+path;
  if(!xml.includes(articleUrl)){xml=xml.replace("</urlset>",'  <url><loc>'+articleUrl+'</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>\n</urlset>');await gh("/repos/"+OWNER+"/"+REPO+"/contents/sitemap.xml",token,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({message:"Add article to sitemap",content:b64utf8(xml),branch,sha:sm.sha})});}
  // Rebuild the public SEO Guides category page from the articles in this branch.
  const listing=await gh("/repos/"+OWNER+"/"+REPO+"/contents/articles?ref="+encodeURIComponent(branch),token);
  const entries=[];
  for(const item of listing.filter(x=>x.type==="file"&&x.name.endsWith(".html")&&x.name!=="index.html")){
    const file=await gh("/repos/"+OWNER+"/"+REPO+"/contents/"+item.path+"?ref="+encodeURIComponent(branch),token);
    const raw=dec.decode(Uint8Array.from(atob(file.content.replace(/\n/g,"")),ch=>ch.charCodeAt(0)));
    const t=(()=>{const a=raw.indexOf("<h1"),b=raw.indexOf(">",a),e=raw.indexOf("</h1>",b);return a>=0&&b>=0&&e>b?raw.slice(b+1,e):item.name.slice(0,-5).replace(/-/g," ")})();
    const d=(raw.match(/<meta name="description" content="([^"]*)"/i)||[])[1]||"Read this practical guide on QuickTools24.";
    const img=(raw.match(/<meta property="og:image" content="([^"]*)"/i)||[])[1]||"https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80";
    entries.push('<article class="guide-card"><a class="guide-image-link" href="/articles/'+item.name+'"><img src="'+esc(img)+'" alt="'+esc(t)+'" loading="lazy"></a><div><h2><a href="/articles/'+item.name+'">'+t+'</a></h2><p>'+d+'</p><a class="guide-link" href="/articles/'+item.name+'">Read guide →</a></div></article>');
  }
  const categoryHtml='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SEO Guides & Tutorials | QuickTools24</title><meta name="description" content="Practical SEO guides and tutorials from QuickTools24. Learn to compress images, manage PDFs and use online tools."><link rel="canonical" href="'+SITE+'/articles/"><meta name="robots" content="index,follow"><style>*{box-sizing:border-box}body{font:16px/1.7 Arial;background:#f5f7fb;color:#182230;margin:0}.top{background:#101c35;color:white;padding:18px max(20px,calc((100% - 1000px)/2))}.top a{color:white;text-decoration:none;font-weight:bold}main{max-width:1000px;margin:32px auto;padding:28px;background:white;border-radius:18px}.intro{color:#64748b;margin-bottom:22px}.guide-card{display:grid;grid-template-columns:260px 1fr;gap:20px;padding:18px 0;border-bottom:1px solid #e5eaf2;align-items:center}.guide-image-link{display:block}.guide-card img{width:100%;height:165px;object-fit:cover;border-radius:12px}.guide-card h2{margin:0 0 8px;font-size:21px;line-height:1.35}.guide-card p{margin:0 0 8px;color:#64748b}.guide-link{color:#155eef;font-weight:800;text-decoration:none}@media(max-width:650px){main{margin:14px;padding:18px}.guide-card{grid-template-columns:1fr;gap:10px}.guide-card img{height:190px}.guide-card h2{font-size:18px}}</style></head><body><header class="top"><a href="'+SITE+'/">QuickTools24</a></header><main><h1>SEO Guides & Tutorials</h1><p class="intro">Detailed, illustrated guides with direct links to the matching free tools.</p>'+entries.join("\\n")+'</main></body></html>';
  const catPath="articles/index.html";
  try{const oldCat=await gh("/repos/"+OWNER+"/"+REPO+"/contents/"+catPath+"?ref="+encodeURIComponent(branch),token);await gh("/repos/"+OWNER+"/"+REPO+"/contents/"+catPath,token,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({message:"Update SEO Guides category page",content:b64utf8(categoryHtml),branch,sha:oldCat.sha})});}catch(e){if(!String(e.message).includes("Not Found"))throw e;await gh("/repos/"+OWNER+"/"+REPO+"/contents/"+catPath,token,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({message:"Create SEO Guides category page",content:b64utf8(categoryHtml),branch})});}
  const pr=await gh("/repos/"+OWNER+"/"+REPO+"/pulls",token,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({title:"Publish SEO article: "+title,head:branch,base:BASE,body:"Review the article page and sitemap entry before merging.\n\nArticle: "+articleUrl+"\nSEO title and description included. Please proofread before publishing."})});
  return {pullRequestUrl:pr.html_url,articleUrl:articleUrl};
}
const FEEDBACK_ADMIN = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Feedback Inbox | QuickTools24 Admin</title><style>*{box-sizing:border-box}body{margin:0;background:#f3f6fb;color:#172238;font:15px/1.5 Arial}.wrap{max-width:900px;margin:28px auto;padding:0 14px}.card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:20px;margin-bottom:14px}a{color:#155eef}button{border:0;border-radius:8px;background:#155eef;color:#fff;padding:9px 13px;font-weight:700;cursor:pointer;margin:4px 4px 4px 0}.muted{color:#64748b}.item{padding:15px 0;border-bottom:1px solid #e5eaf2;overflow-wrap:anywhere}.item:last-child{border:0}.msg{white-space:pre-wrap;margin:10px 0}.tag{font-size:12px;background:#eef2ff;padding:3px 8px;border-radius:20px}.danger{background:#b91c1c}.secondary{background:#e8eef8;color:#18345f}</style></head><body><main class="wrap"><p><a href="/admin">← Back to Admin</a></p><section class="card"><h1>Suggestions & Feedback Inbox</h1><p class="muted">Private messages submitted through QuickTools24. Only the authorized admin can view them.</p><p id="summary">Loading messages…</p><button id="refresh">Refresh</button></section><section class="card" id="list">Loading…</section></main><script>const box=document.getElementById("list"),summary=document.getElementById("summary");async function act(id,action){const r=await fetch("/api/feedback/action",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({id,action})});const d=await r.json();if(!r.ok)throw Error(d.error||"Action failed");load()}async function load(){box.textContent="Loading messages…";try{const r=await fetch("/api/feedback",{cache:"no-store"}),d=await r.json();if(!r.ok)throw Error(d.error||"Could not load inbox");summary.textContent=d.total+" messages · "+d.unread+" unread";box.replaceChildren();if(!d.messages.length){box.textContent="No suggestions received yet.";return}for(const [index,m] of d.messages.entries()){const article=document.createElement("article");article.className="item";const head=document.createElement("div");const strong=document.createElement("strong");strong.textContent="Message "+(index+1);head.append(strong);const tag=document.createElement("span");tag.className="tag";tag.textContent=m.status==="unread"?"NEW":"READ";head.append(" ",tag);const subject=document.createElement("p");subject.className="msg";const subjectLabel=document.createElement("strong");subjectLabel.textContent="Subject: ";subject.append(subjectLabel,document.createTextNode(m.subject||"No subject"));const message=document.createElement("p");message.className="msg";const messageLabel=document.createElement("strong");messageLabel.textContent="Message: ";message.append(messageLabel,document.createTextNode(m.message||""));const email=document.createElement("p");email.className="muted";const emailLabel=document.createElement("strong");emailLabel.textContent="Email ID: ";email.append(emailLabel,document.createTextNode(m.email||"Not provided"));const date=document.createElement("p");date.className="muted";date.textContent=new Date(m.createdAt).toLocaleString();const reply=document.createElement("a");reply.href="mailto:"+encodeURIComponent(m.email||"")+"?subject="+encodeURIComponent("Re: "+(m.subject||"QuickTools24 feedback"));reply.textContent="Reply by email";const read=document.createElement("button");read.className="secondary";read.textContent=m.status==="unread"?"Mark as read":"Mark unread";read.onclick=()=>act(m.id,"toggle");const del=document.createElement("button");del.className="danger";del.textContent="Delete";del.onclick=()=>{if(confirm("Delete this message permanently?"))act(m.id,"delete")};article.append(head,subject,message,email,date,reply,document.createElement("br"),read,del);box.append(article)}}catch(e){box.textContent=e.message}}document.getElementById("refresh").onclick=load;load();</script></body></html>`
export default {
 async fetch(request,env) {
  const u=new URL(request.url),path=u.pathname;
  if(request.method==="GET"&&path==="/")return Response.redirect(u.origin+"/admin",302);
  if(request.method==="GET"&&path==="/health")return new Response("QuickTools24 Admin Worker is running",{headers:{"content-type":"text/plain; charset=utf-8","cache-control":"no-store"}});
  if(request.method==="GET"&&path==="/admin"){
   const s=await session(request,env);
   // Render the authenticated dashboard on the server; do not depend on browser JavaScript.
   let page=ADMIN;
   if(s){
    page=page
      
      .replace('<div id="login">','<div id="login" class="hidden" aria-hidden="true">')
      .replace('<div id="editor" class="hidden">','<div id="editor">')
      .replace('<p id="who" class="muted"></p>','<p id="who" class="muted">Signed in as '+esc(s.login)+'</p>')
      .replace('Checking login…','You are securely signed in.');
   }
   const headers={"content-type":"text/html; charset=utf-8","cache-control":"no-store, no-cache, must-revalidate, max-age=0","pragma":"no-cache","x-content-type-options":"nosniff","x-frame-options":"DENY","referrer-policy":"no-referrer","permissions-policy":"camera=(), microphone=(), geolocation=()","strict-transport-security":"max-age=15552000","content-security-policy":"default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'","x-qt-admin-build":"admin-session-render-v2"};
   return new Response(page,{headers});
  }
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
   const responseHeaders=new Headers();responseHeaders.set("Location",u.origin+"/admin");responseHeaders.append("Set-Cookie",cookie(COOKIE,value,28800));responseHeaders.append("Set-Cookie",clear(STATE));responseHeaders.set("Cache-Control","no-store");return new Response(null,{status:302,headers:responseHeaders});
  }
  if(request.method==="GET"&&path==="/api/me"){const s=await session(request,env);return json(s?{authenticated:true,login:s.login}:{authenticated:false});}
  if(request.method==="GET"&&path==="/api/articles"){
   const s=await session(request,env);if(!s)return json({error:"Please sign in again."},401);
   try{const files=await gh("/repos/"+OWNER+"/"+REPO+"/contents/articles?ref="+BASE,s.accessToken);const articles=files.filter(x=>x.type==="file"&&x.name.endsWith(".html")&&x.name!=="index.html").map(x=>({slug:x.name.slice(0,-5),title:x.name.slice(0,-5).replace(/-/g," "),url:SITE+"/articles/"+x.name}));return json({category:"SEO Guides",articles});}catch(e){return json({error:e.message},502);}
  }
  if(request.method==="GET"&&path==="/api/site-analysis"){
   const s=await session(request,env);if(!s)return json({error:"Please sign in again."},401);
   const range=["7d","28d","90d"].includes(u.searchParams.get("range"))?u.searchParams.get("range"):"28d";
   try{const r=await fetch("https://quicktools-analytics-api.vercel.app/api/public-analytics?range="+range,{headers:{"Accept":"application/json","Cache-Control":"no-store"},cf:{cacheTtl:0}});const d=await r.json().catch(()=>({}));if(!r.ok||d.status!=="ok")throw new Error(d.message||"Analytics provider is temporarily unavailable.");return json(d);}catch(e){return json({error:e.message||"Could not load website analysis."},502);}
  }
  if(request.method==="GET"&&path==="/api/analytics"){
   const s=await session(request,env);if(!s)return json({error:"Please sign in again."},401);
   if(!env.USAGE_KV)return json({configured:false,tools:[]});
   const totals={};for(let i=0;i<7;i++){const d=new Date(Date.now()-i*86400000).toISOString().slice(0,10);const raw=await env.USAGE_KV.get("usage:"+d);if(!raw)continue;try{const day=JSON.parse(raw);for(const [name,count] of Object.entries(day))totals[name]=(totals[name]||0)+Number(count||0);}catch{}}
   return json({configured:true,tools:Object.entries(totals).map(([name,uses])=>({name,uses})).sort((a,b)=>b.uses-a.uses)});
  }
  if(request.method==="OPTIONS"&&path==="/api/track")return new Response(null,{headers:{"access-control-allow-origin":SITE,"access-control-allow-methods":"POST, OPTIONS","access-control-allow-headers":"Content-Type","access-control-max-age":"86400","vary":"Origin"}});
  if(request.method==="POST"&&path==="/api/track"){
   const origin=request.headers.get("Origin");const headers={"content-type":"application/json; charset=utf-8","access-control-allow-origin":SITE,"vary":"Origin","cache-control":"no-store","x-content-type-options":"nosniff","referrer-policy":"no-referrer"};
   if(origin!==SITE)return new Response(JSON.stringify({error:"Origin rejected."}),{status:403,headers});
   if(!env.USAGE_KV)return new Response(JSON.stringify({ok:false,reason:"analytics-not-configured"}),{status:202,headers});
   try{if(!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))return new Response(JSON.stringify({error:"JSON required."}),{status:415,headers});const p=await readJsonLimited(request,1024),name=String(p.tool||"").replace(/[^a-z0-9_-]/gi,"").slice(0,60);const allowed=new Set(["merge","split","extract","delete","rotate","reorder","addblank","crop","watermark","pagenum","text","signature","metadata","inspect","textout","images","render","grayscale","compress","form","flatten","header","rotateone","create","pdf-editor","img-resizekb","img-resize","img-crop","img-convert","img-bw","img-rotate","img-watermark","img-compress","img-flip","img-passport","img-pngjpg","img-jpgpng","bg-remove","txt-count","txt-case","txt-clean","txt-sort","txt-duplicate","txt-reverse"]);if(!allowed.has(name))return new Response(JSON.stringify({error:"Unknown tool."}),{status:400,headers});const day=new Date().toISOString().slice(0,10),key="usage:"+day;const data=JSON.parse(await env.USAGE_KV.get(key)||"{}");data[name]=Math.min(100000000,Number(data[name]||0)+1);await env.USAGE_KV.put(key,JSON.stringify(data),{expirationTtl:60*60*24*400});return new Response(JSON.stringify({ok:true}),{headers});}catch(e){return new Response(JSON.stringify({ok:false,error:e.message||"Invalid request."}),{status:400,headers});}
  }
  if(request.method==="GET"&&path==="/admin/feedback"){
   const s=await session(request,env);if(!s)return Response.redirect(u.origin+"/admin",302);
   return new Response(FEEDBACK_ADMIN,{headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff","x-frame-options":"DENY","referrer-policy":"no-referrer","content-security-policy":"default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"}});
  }
  if(request.method==="OPTIONS"&&path==="/api/feedback")return new Response(null,{headers:{"access-control-allow-origin":SITE,"access-control-allow-methods":"POST, OPTIONS","access-control-allow-headers":"Content-Type","access-control-max-age":"86400","vary":"Origin"}});
  if(request.method==="POST"&&path==="/api/feedback"){
   const headers={"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff","access-control-allow-origin":SITE,"vary":"Origin"};
   if(request.headers.get("Origin")!==SITE)return new Response(JSON.stringify({error:"Origin rejected."}),{status:403,headers});
   if(!env.USAGE_KV)return new Response(JSON.stringify({error:"Feedback storage is temporarily unavailable."}),{status:503,headers});
   try{
    if(!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))return new Response(JSON.stringify({error:"JSON required."}),{status:415,headers});
    const p=await readJsonLimited(request,7000);
    if(String(p.website||"").trim())return new Response(JSON.stringify({ok:true}),{headers});
    const name=String(p.name||"").trim().slice(0,100),email=String(p.email||"").trim().slice(0,150),subject=String(p.subject||"").trim().slice(0,150),message=String(p.message||"").trim().slice(0,4000);
    if(!name||!/^\S+@\S+\.\S+$/.test(email)||!subject||message.length<3)return new Response(JSON.stringify({error:"Please enter a valid name, email, subject and message."}),{status:400,headers});
    const ip=request.headers.get("CF-Connecting-IP")||"unknown",digest=await crypto.subtle.digest("SHA-256",enc.encode(ip)),ipKey="feedback-rate:"+Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,"0")).join("");
    const count=Number(await env.USAGE_KV.get(ipKey)||0);if(count>=5)return new Response(JSON.stringify({error:"Too many messages. Please try again later."}),{status:429,headers});
    await env.USAGE_KV.put(ipKey,String(count+1),{expirationTtl:3600});
    const id=Date.now().toString(36)+"-"+Array.from(crypto.getRandomValues(new Uint8Array(12))).map(x=>x.toString(16).padStart(2,"0")).join("");
    const record={id,name,email,subject,message,status:"unread",createdAt:new Date().toISOString()};
    await env.USAGE_KV.put("feedback:"+id,JSON.stringify(record),{expirationTtl:60*60*24*365*2});
    return new Response(JSON.stringify({ok:true}),{headers});
   }catch(e){return new Response(JSON.stringify({error:e.message||"Could not save your message."}),{status:400,headers});}
  }
  if(request.method==="GET"&&path==="/api/feedback"){
   const s=await session(request,env);if(!s)return json({error:"Please sign in again."},401);
   if(!env.USAGE_KV)return json({error:"Feedback storage is not configured."},503);
   try{const listed=await env.USAGE_KV.list({prefix:"feedback:",limit:100}),messages=(await Promise.all(listed.keys.map(async k=>{const raw=await env.USAGE_KV.get(k.name);try{return raw?JSON.parse(raw):null}catch{return null}}))).filter(Boolean).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));return json({messages,total:messages.length,unread:messages.filter(m=>m.status==="unread").length});}catch(e){return json({error:e.message||"Could not read feedback."},500);}
  }
  if(request.method==="POST"&&path==="/api/feedback/action"){
   if(request.headers.get("Origin")!==u.origin)return json({error:"Origin rejected."},403);
   const s=await session(request,env);if(!s)return json({error:"Please sign in again."},401);
   try{const p=await readJsonLimited(request,1000),id=String(p.id||"");if(!/^[a-z0-9-]{5,80}$/i.test(id))return json({error:"Invalid message ID."},400);const k="feedback:"+id,raw=await env.USAGE_KV.get(k);if(!raw)return json({error:"Message not found."},404);if(p.action==="delete"){await env.USAGE_KV.delete(k);return json({ok:true})}if(p.action==="toggle"){const m=JSON.parse(raw);m.status=m.status==="unread"?"read":"unread";await env.USAGE_KV.put(k,JSON.stringify(m),{expirationTtl:60*60*24*365*2});return json({ok:true})}return json({error:"Unknown action."},400)}catch(e){return json({error:e.message||"Action failed."},400);}
  }
  if(request.method==="POST"&&path==="/api/logout"){if(request.headers.get("Origin")!==u.origin)return json({error:"Origin rejected."},403);return new Response('{"ok":true}',{headers:{"content-type":"application/json","Set-Cookie":clear(COOKIE),"cache-control":"no-store","x-content-type-options":"nosniff"}});}
  if(request.method==="POST"&&path==="/api/articles"){
   if(request.headers.get("Origin")!==u.origin)return json({error:"Origin rejected."},403);
   const s=await session(request,env);if(!s)return json({error:"Please sign in again."},401);
   try{if(!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))return json({error:"JSON required."},415);return json(await publish(await readJsonLimited(request,60000),s.accessToken),201)}catch(e){return json({error:e.message||"Could not create article."},400);}
  }
  return new Response("Not found",{status:404});
 }
};
async function readJsonLimited(request,maxBytes){
  const declared=Number(request.headers.get("Content-Length")||0);
  if(declared>maxBytes)throw new Error("Request is too large.");
  if(!request.body)throw new Error("Request body is required.");
  const reader=request.body.getReader(),chunks=[];let total=0;
  try{
    while(true){
      const part=await reader.read();if(part.done)break;
      total+=part.value.byteLength;
      if(total>maxBytes){await reader.cancel();throw new Error("Request is too large.");}
      chunks.push(part.value);
    }
  }finally{reader.releaseLock();}
  const bytes=new Uint8Array(total);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  try{return JSON.parse(dec.decode(bytes))}catch{throw new Error("Invalid JSON request.");}
}
function urlParam(u,k){return u.searchParams.get(k)||"";}
