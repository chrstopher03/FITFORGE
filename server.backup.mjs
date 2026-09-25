import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const PORT=Number(process.env.PORT||3000);
const DATA_DIR=path.join(__dirname,'data');
const USERS_FILE=path.join(DATA_DIR,'users.json');
fs.mkdirSync(DATA_DIR,{recursive:true});
if(!fs.existsSync(USERS_FILE))fs.writeFileSync(USERS_FILE,'{}');
const sessions=new Map();
const readUsers=()=>JSON.parse(fs.readFileSync(USERS_FILE,'utf8')||'{}');
const writeUsers=u=>fs.writeFileSync(USERS_FILE,JSON.stringify(u,null,2));
const json=(res,status,data)=>{const body=JSON.stringify(data);res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'});res.end(body)};
const body=async req=>{let s='';for await(const c of req)s+=c;if(s.length>2_000_000)throw new Error('payload');return s?JSON.parse(s):{}};
const cookie=req=>{const h=req.headers.cookie||'';const m=h.match(/ff_session=([^;]+)/);return m?.[1]||null};
const userFor=req=>{const sid=cookie(req);const email=sessions.get(sid);if(!email)return null;const users=readUsers();return users[email]||null};
const hash=(password,salt=crypto.randomBytes(16).toString('hex'))=>new Promise((resolve,reject)=>crypto.scrypt(password,salt,64,(e,k)=>e?reject(e):resolve(`${salt}:${k.toString('hex')}`)));
const verify=async(password,stored)=>{const [salt,key]=String(stored).split(':');const got=await hash(password,salt);return crypto.timingSafeEqual(Buffer.from(got.split(':')[1],'hex'),Buffer.from(key,'hex'))};
const session=(res,email)=>{const sid=crypto.randomBytes(32).toString('hex');sessions.set(sid,email);res.setHeader('Set-Cookie',`ff_session=${sid}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000`)};
const safeUser=u=>({id:u.id,name:u.name,email:u.email,createdAt:u.createdAt});
const sendFile=(req,res)=>{let p=new URL(req.url,'http://localhost').pathname;if(p==='/' )p='/index.html';if(p.includes('..'))return res.writeHead(400).end();const file=path.join(__dirname,p);fs.stat(file,(e,st)=>{if(e||!st.isFile())return res.writeHead(404).end('Not found');const ext=path.extname(file);const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.ico':'image/x-icon'};res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream','Cache-Control':ext==='.html'?'no-cache':'public, max-age=86400'});fs.createReadStream(file).pipe(res)})};

const server=http.createServer(async(req,res)=>{
 if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Credentials':'true','Access-Control-Allow-Methods':'GET,POST,PUT,OPTIONS'});return res.end()}
 try{
  const u=new URL(req.url,`http://${req.headers.host||'localhost'}`);const p=u.pathname;
  if(p==='/api/auth/me'){const x=userFor(req);return json(res,200,{user:x?safeUser(x):null})}
  if(p==='/api/auth/logout'){sessions.delete(cookie(req));res.setHeader('Set-Cookie','ff_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');return json(res,200,{ok:true})}
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
server.listen(PORT,()=>console.log(`FITFORGE listo en http://localhost:${PORT}`));
