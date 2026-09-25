import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const PORT=Number(process.env.PORT||3000);
const HOST=process.env.HOST||'0.0.0.0';
const SESSION_SECRET=process.env.SESSION_SECRET||'change-this-secret-in-production';
const DATA_DIR=path.join(__dirname,'data');
const USERS_FILE=path.join(DATA_DIR,'users.json');
fs.mkdirSync(DATA_DIR,{recursive:true});
if(!fs.existsSync(USERS_FILE))fs.writeFileSync(USERS_FILE,'{}');
const readUsers=()=>JSON.parse(fs.readFileSync(USERS_FILE,'utf8')||'{}');
const writeUsers=u=>fs.writeFileSync(USERS_FILE,JSON.stringify(u,null,2));
const json=(res,status,data)=>{const body=JSON.stringify(data);res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'});res.end(body)};
const body=async req=>{let s='';for await(const c of req)s+=c;if(s.length>2_000_000)throw new Error('payload');return s?JSON.parse(s):{}};
const cookie=req=>{const h=req.headers.cookie||'';const m=h.match(/ff_session=([^;]+)/);return m?.[1]||null};
const signSession=email=>{const payload=Buffer.from(JSON.stringify({email,exp:Date.now()+2592000000})).toString('base64url');const sig=crypto.createHmac('sha256',SESSION_SECRET).update(payload).digest('base64url');return payload+'.'+sig};
const sessionEmail=req=>{try{const sid=cookie(req);if(!sid)return null;const [payload,sig]=sid.split('.');const expected=crypto.createHmac('sha256',SESSION_SECRET).update(payload).digest('base64url');if(!sig||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return null;const d=JSON.parse(Buffer.from(payload,'base64url').toString());if(!d.email||d.exp<Date.now())return null;return d.email}catch{return null}};
const userFor=req=>{const email=sessionEmail(req);if(!email)return null;const users=readUsers();return users[email]||null};
const hash=(password,salt=crypto.randomBytes(16).toString('hex'))=>new Promise((resolve,reject)=>crypto.scrypt(password,salt,64,(e,k)=>e?reject(e):resolve(`${salt}:${k.toString('hex')}`)));
const verify=async(password,stored)=>{const [salt,key]=String(stored).split(':');const got=await hash(password,salt);return crypto.timingSafeEqual(Buffer.from(got.split(':')[1],'hex'),Buffer.from(key,'hex'))};
const session=(res,email)=>{const sid=signSession(email);const secure=process.env.NODE_ENV==='production'?' Secure;':'';res.setHeader('Set-Cookie',`ff_session=${sid}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000;${secure}`)};
const safeUser=u=>({id:u.id,name:u.name,email:u.email,createdAt:u.createdAt});
const sendFile=(req,res)=>{let p=new URL(req.url,'http://localhost').pathname;if(p==='/' )p='/index.html';if(p.includes('..'))return res.writeHead(400).end();const file=path.join(__dirname,p);fs.stat(file,(e,st)=>{if(e||!st.isFile())return res.writeHead(404).end('Not found');const ext=path.extname(file);const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.ico':'image/x-icon'};res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream','Cache-Control':ext==='.html'?'no-cache':'public, max-age=86400'});fs.createReadStream(file).pipe(res)})};

const server=http.createServer(async(req,res)=>{
 if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Credentials':'true','Access-Control-Allow-Methods':'GET,POST,PUT,OPTIONS'});return res.end()}
 try{
  const u=new URL(req.url,`http://${req.headers.host||'localhost'}`);const p=u.pathname;
  if(p==='/api/health'){return json(res,200,{ok:true,service:'FITFORGE',time:new Date().toISOString()})}
  if(p==='/api/gyms' && req.method==='GET'){
    const lat=Number(u.searchParams.get('lat')), lon=Number(u.searchParams.get('lon')), radius=Math.min(50000,Math.max(1000,Number(u.searchParams.get('radius'))||10000));
    if(!Number.isFinite(lat)||!Number.isFinite(lon))return json(res,400,{error:'Ubicación no válida'});
    const q=`[out:json][timeout:18];(nwr["leisure"="fitness_centre"](around:${radius},${lat},${lon});nwr["amenity"="gym"](around:${radius},${lat},${lon});nwr["sport"~"fitness|gym|bodybuilding",i](around:${radius},${lat},${lon});nwr["leisure"="sports_centre"]["name"](around:${radius},${lat},${lon}););out center tags;`;
    const endpoints=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter','https://overpass.private.coffee/api/interpreter'];
    let last='';
    for(const endpoint of endpoints){try{const rr=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','User-Agent':'FITFORGE/1.0'},body:new URLSearchParams({data:q}),signal:AbortSignal.timeout(20000)});if(!rr.ok){last=`HTTP ${rr.status}`;continue}const data=await rr.json();return json(res,200,data)}catch(e){last=e.message||'Overpass error'}}
    return json(res,502,{error:'No se pudo consultar los datos de gimnasios',detail:last});
  }
  if(p==='/api/auth/me'){const x=userFor(req);return json(res,200,{user:x?safeUser(x):null})}
  if(p==='/api/auth/logout'){const secure=process.env.NODE_ENV==='production'?' Secure;':'';res.setHeader('Set-Cookie',`ff_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0;${secure}`);return json(res,200,{ok:true})}
  if((p==='/api/auth/register'||p==='/api/auth/login')&&req.method==='POST'){
   const d=await body(req);const email=String(d.email||'').trim().toLowerCase();const password=String(d.password||'');const name=String(d.name||'Usuario FITFORGE').trim().slice(0,80);
   if(!/^\S+@\S+\.\S+$/.test(email))return json(res,400,{error:'Correo electrónico no válido'});
   if(password.length<8)return json(res,400,{error:'La contraseña debe tener al menos 8 caracteres'});
   const users=readUsers();
   if(p==='/api/auth/register'){
    if(users[email])return json(res,409,{error:'Ya existe una cuenta con ese correo'});
    const id=crypto.randomUUID();users[email]={id,email,name:name||'Usuario FITFORGE',password:await hash(password),createdAt:new Date().toISOString(),state:null,profile:{}};writeUsers(users);session(res,email);return json(res,201,{user:safeUser(users[email])});
   }
   const user=users[email];if(!user||!(await verify(password,user.password)))return json(res,401,{error:'Correo o contraseña incorrectos'});session(res,email);return json(res,200,{user:safeUser(user)});
  }
  const user=userFor(req);
  if(p==='/api/me/state'&&(req.method==='GET'||req.method==='PUT')){if(!user)return json(res,401,{error:'No autenticado'});if(req.method==='GET')return json(res,200,{state:user.state});const d=await body(req);const users=readUsers();users[user.email].state=d.state||{};writeUsers(users);return json(res,200,{ok:true})}
  if(p==='/api/me/profile'&&req.method==='PUT'){if(!user)return json(res,401,{error:'No autenticado'});const d=await body(req);const users=readUsers();users[user.email].name=String(d.name||users[user.email].name).slice(0,80);users[user.email].profile={...users[user.email].profile,...d};writeUsers(users);return json(res,200,{user:safeUser(users[user.email])})}
  if(p.startsWith('/api/'))return json(res,404,{error:'Ruta no encontrada'});
  sendFile(req,res);
 }catch(e){console.error(e);json(res,500,{error:'Error interno del servidor'})}
});
server.listen(PORT,HOST,()=>console.log(`FITFORGE listo en ${HOST}:${PORT}`));
