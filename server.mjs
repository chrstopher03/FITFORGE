import 'dotenv/config';
import express from 'express';
import OpenAI from 'openai';

const app=express();
const port=Number(process.env.PORT||3000);
const openai=process.env.OPENAI_API_KEY?new OpenAI({apiKey:process.env.OPENAI_API_KEY}):null;
const model=process.env.OPENAI_MODEL||'gpt-5.6-luna';
app.use(express.json({limit:'12mb'}));
app.use(express.static('.'));

function requireAI(res){
  if(!openai){res.status(503).json({error:'OPENAI_API_KEY no está configurada en el servidor.'});return false}
  return true;
}

app.get('/api/health',(req,res)=>res.json({ok:true,ai:!!openai,model}));

app.post('/api/assistant',async(req,res)=>{
  if(!requireAI(res))return;
  const message=String(req.body?.message||'').trim();
  const context=req.body?.context||{};
  if(!message)return res.status(400).json({error:'Mensaje vacío.'});
  try{
    const response=await openai.responses.create({
      model,
      tools:[{type:'web_search'}],
      instructions:`Eres el asistente de FITFORGE. Responde en español claro y útil. Puedes explicar entrenamiento, carrera, nutrición general, recuperación, sueño, hidratación y uso de la app. Usa web_search cuando la pregunta dependa de información actual. No diagnostiques enfermedades, no prometas resultados médicos y no conviertas síntomas en diagnósticos. Si hay signos de emergencia (por ejemplo dolor de pecho intenso, dificultad respiratoria importante, desmayo, debilidad súbita, confusión, sangrado grave o síntomas neurológicos súbitos), indica buscar atención de urgencia. En preguntas de alimentación, diferencia estimaciones de datos de etiquetas. Si la pregunta no tiene suficiente información, pide el dato necesario.`,
      input:[{role:'user',content:[{type:'input_text',text:`Pregunta: ${message}\nContexto opcional del usuario: ${JSON.stringify(context)}`}]}]
    });
    res.json({answer:response.output_text||'No recibí una respuesta.'});
  }catch(err){console.error(err);res.status(500).json({error:'No se pudo consultar el asistente.'});}
});

app.post('/api/food-image',async(req,res)=>{
  if(!requireAI(res))return;
  const image=String(req.body?.image||'');
  if(!/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(image))return res.status(400).json({error:'Imagen no válida.'});
  try{
    const response=await openai.responses.create({
      model,
      instructions:`Analiza la foto de comida. No afirmes que puedes medir calorías exactas a partir de una imagen. Identifica el alimento o plato visible y estima una porción razonable solo si es posible. Devuelve SOLO JSON válido con estas claves: food, portion, kcal_estimate, protein_g, carbs_g, fat_g, confidence, notes. kcal_estimate y macros deben ser números o null. confidence debe ser low, medium o high. Si la foto no permite estimar bien, usa null y explica por qué en notes.`,
      input:[{role:'user',content:[
        {type:'input_text',text:'Identifica esta comida y estima sus valores nutricionales. La estimación visual no sustituye una etiqueta nutricional ni una medición por peso.'},
        {type:'input_image',image_url:image,detail:'high'}
      ]}]
    });
    const raw=(response.output_text||'').trim().replace(/^```json\s*/i,'').replace(/```$/,'').trim();
    let data;try{data=JSON.parse(raw)}catch{data={food:'Alimento identificado',portion:'No se pudo estructurar la porción',kcal_estimate:null,protein_g:null,carbs_g:null,fat_g:null,confidence:'low',notes:raw}};
    res.json(data);
  }catch(err){console.error(err);res.status(500).json({error:'No se pudo analizar la imagen.'});}
});

app.listen(port,()=>console.log(`FITFORGE: http://localhost:${port}`));
