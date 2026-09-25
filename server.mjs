import 'dotenv/config';
import express from 'express';
import OpenAI from 'openai';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const app = express();
const port = Number(process.env.PORT || 3000);
const DB_FILE = path.join(process.cwd(), 'fitforge-data.json');
const SESSION_TTL = 1000 * 60 * 60 * 24 * 30;
const sessions = new Map();
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const model = process.env.OPENAI_MODEL || 'gpt-5.6-luna';

app.use(express.json({ limit: '16mb' }));
app.use(express.static('.'));

let db = { users: {}, states: {}, subscriptions: {} };
async function loadDB(){
  try { db = JSON.parse(await fs.readFile(DB_FILE, 'utf8')); }
  catch { await saveDB(); }
  db.users ||= {}; db.states ||= {}; db.subscriptions ||= {};
}
async function saveDB(){ await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), 'utf8'); }
function id(){ return crypto.randomUUID(); }
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')){
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}
function verifyPassword(password, salt, hash){
  const actual = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(hash, 'hex'));
}
function cookieValue(req, name){
  const raw = req.headers.cookie || '';
  const item = raw.split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='));
  return item ? decodeURIComponent(item.slice(name.length+1)) : '';
}
function setCookie(res, name, value, maxAge=SESSION_TTL){
  res.setHeader('Set-Cookie', `${name}=${encodeURIComponent(value)}; Max-Age=${Math.floor(maxAge/1000)}; Path=/; HttpOnly; SameSite=Lax`);
}
function clearCookie(res, name){ res.setHeader('Set-Cookie', `${name}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`); }
function authUser(req){
  const token = cookieValue(req, 'ff_session');
  const s = sessions.get(token);
  if(!s || s.expires < Date.now()){ if(token) sessions.delete(token); return null; }
  return db.users[s.userId] || null;
}
function publicUser(u){ return u ? {id:u.id,email:u.email,name:u.name,createdAt:u.createdAt} : null; }
function requireUser(req,res){ const u=authUser(req); if(!u){res.status(401).json({error:'No hay una sesión activa.'});return null} return u; }

app.get('/api/health', (req,res)=>res.json({ok:true,ai:!!openai,model,auth:true,gyms:true}));

app.post('/api/auth/register', async (req,res)=>{
  const email=String(req.body?.email||'').trim().toLowerCase();
  const password=String(req.body?.password||'');
  const name=String(req.body?.name||'').trim().slice(0,80) || 'Usuario FITFORGE';
  if(!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({error:'Correo electrónico no válido.'});
  if(password.length<8) return res.status(400).json({error:'La contraseña debe tener al menos 8 caracteres.'});
  if(Object.values(db.users).some(u=>u.email===email)) return res.status(409).json({error:'Ya existe una cuenta con ese correo.'});
  const {salt,hash}=hashPassword(password);
  const user={id:id(),email,name,passwordSalt:salt,passwordHash:hash,createdAt:new Date().toISOString()};
  db.users[user.id]=user;
  db.states[user.id]={name,email,avatar:'',weight:0,height:0,goal:'',sleepHours:0,notifications:[]};
  await saveDB();
  const token=crypto.randomBytes(32).toString('hex'); sessions.set(token,{userId:user.id,expires:Date.now()+SESSION_TTL}); setCookie(res,'ff_session',token);
  res.json({user:publicUser(user)});
});

app.post('/api/auth/login', async (req,res)=>{
  const email=String(req.body?.email||'').trim().toLowerCase();
  const password=String(req.body?.password||'');
  const user=Object.values(db.users).find(u=>u.email===email);
  if(!user || !verifyPassword(password,user.passwordSalt,user.passwordHash)) return res.status(401).json({error:'Correo o contraseña incorrectos.'});
  const token=crypto.randomBytes(32).toString('hex'); sessions.set(token,{userId:user.id,expires:Date.now()+SESSION_TTL}); setCookie(res,'ff_session',token);
  res.json({user:publicUser(user)});
});

app.post('/api/auth/logout',(req,res)=>{ const token=cookieValue(req,'ff_session'); if(token)sessions.delete(token); clearCookie(res,'ff_session'); res.json({ok:true}); });
app.get('/api/auth/me',(req,res)=>{ const u=authUser(req); res.json({user:publicUser(u)}); });

app.get('/api/me/state',async(req,res)=>{const u=requireUser(req,res);if(!u)return;res.json({state:db.states[u.id]||{}})});
app.put('/api/me/state',async(req,res)=>{const u=requireUser(req,res);if(!u)return;const incoming=req.body?.state;if(!incoming||typeof incoming!=='object')return res.status(400).json({error:'Estado inválido.'});db.states[u.id]=incoming;await saveDB();res.json({ok:true});});
app.put('/api/me/profile',async(req,res)=>{const u=requireUser(req,res);if(!u)return;const p=req.body||{};u.name=String(p.name||u.name).slice(0,80);db.states[u.id]={...(db.states[u.id]||{}),name:u.name,email:u.email,avatar:String(p.avatar||db.states[u.id]?.avatar||'')};await saveDB();res.json({user:publicUser(u),state:db.states[u.id]});});

app.get('/api/gyms',async(req,res)=>{
  const lat=Number(req.query.lat),lon=Number(req.query.lon),radius=Math.min(50000,Math.max(1000,Number(req.query.radius)||10000));
  if(!Number.isFinite(lat)||!Number.isFinite(lon))return res.status(400).json({error:'Coordenadas inválidas.'});
  const query=`[out:json][timeout:30];(nwr["leisure"="fitness_centre"](around:${radius},${lat},${lon});nwr["sport"="fitness"](around:${radius},${lat},${lon});nwr["leisure"="sports_centre"](around:${radius},${lat},${lon});nwr["amenity"="gym"](around:${radius},${lat},${lon}););out center tags;`;
  try{
    const r=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',headers:{'content-type':'text/plain'},body:query});
    if(!r.ok)throw new Error('Overpass '+r.status);
    const data=await r.json(); res.json(data);
  }catch(e){console.error(e);res.status(502).json({error:'No se pudo consultar OpenStreetMap/Overpass.'});}
});

function aiInstructions(name='Usuario'){
  return `Eres el asistente personal de FITFORGE. Llama al usuario por su nombre (${name}) cuando sea natural. Responde en español claro, directo y útil. Puedes responder preguntas generales de entrenamiento, carrera, nutrición, alimentos, recetas, hidratación, sueño, recuperación, uso de la app, tecnología, calendario, gimnasios y bienestar. Para información que pueda cambiar usa web_search. No inventes datos ni fuentes. Si una cifra depende de ingredientes, porción, dispositivo o país, dilo. No diagnostiques enfermedades ni determines salud por una foto del rostro. Ante dolor de pecho intenso/opresivo, dificultad respiratoria importante, desmayo, confusión, debilidad súbita, convulsiones, sangrado grave u otros signos de emergencia, indica buscar atención de urgencia. Para síntomas no urgentes, da orientación general y recomienda valoración profesional cuando corresponda. Si la pregunta es ambigua, pide solo el dato imprescindible.`;
}

app.post('/api/assistant',async(req,res)=>{
  const message=String(req.body?.message||'').trim(); const context=req.body?.context||{};
  if(!message)return res.status(400).json({error:'Mensaje vacío.'});
  if(!openai)return res.status(503).json({error:'OPENAI_API_KEY no está configurada.'});
  try{
    const response=await openai.responses.create({model,tools:[{type:'web_search'}],instructions:aiInstructions(context.name||'Usuario'),input:[{role:'user',content:[{type:'input_text',text:`Pregunta: ${message}\nDatos disponibles: ${JSON.stringify(context)}`}]}]});
    res.json({answer:response.output_text||'No recibí una respuesta.'});
  }catch(e){console.error(e);res.status(500).json({error:'No se pudo consultar el asistente de IA.'});}
});

app.post('/api/food-image',async(req,res)=>{
  if(!openai)return res.status(503).json({error:'OPENAI_API_KEY no está configurada.'});
  const image=String(req.body?.image||'');
  if(!/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(image))return res.status(400).json({error:'Imagen no válida.'});
  try{
    const response=await openai.responses.create({model,instructions:`Analiza la foto de comida. No afirmes que puedes medir calorías exactas a partir de una imagen. Devuelve SOLO JSON válido con food, portion, kcal_estimate, protein_g, carbs_g, fat_g, confidence, notes. Usa null cuando no puedas estimar con fundamento.`,input:[{role:'user',content:[{type:'input_text',text:'Identifica el plato y estima una porción razonable. Las calorías y macros son estimaciones visuales.'},{type:'input_image',image_url:image,detail:'high'}]}]});
    const raw=(response.output_text||'').trim().replace(/^```json\s*/i,'').replace(/```$/,'').trim(); let data;try{data=JSON.parse(raw)}catch{data={food:'Alimento',portion:null,kcal_estimate:null,protein_g:null,carbs_g:null,fat_g:null,confidence:'low',notes:raw}};res.json(data);
  }catch(e){console.error(e);res.status(500).json({error:'No se pudo analizar la imagen.'});}
});

await loadDB();
app.listen(port,()=>console.log(`FITFORGE ejecutándose en http://localhost:${port}`));
