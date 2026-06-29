import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import cron from 'node-cron';
import webpush from 'web-push';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';

const app = express();
const PORT = Number(process.env.PORT || 4242);
const SECRET = process.env.JWT_SECRET || 'local-demo-secret-change-in-production';
const pool = process.env.DATABASE_URL ? new pg.Pool({ connectionString: process.env.DATABASE_URL }) : null;
const DEMO_ID='00000000-0000-4000-8000-000000000001';
app.use(cors()); app.use(express.json());

type Entry = { date:string; weight:number; calories:number; protein:number; water:number; sleep:number; steps:number; mood:number; energy:number; stress:number; workoutMinutes:number; notes:string; habits:Record<string,boolean> };
const demoEntries: Entry[] = [
  {date:'2026-06-23',weight:74.8,calories:2210,protein:138,water:2.2,sleep:6.8,steps:7820,mood:7,energy:6,stress:5,workoutMinutes:45,notes:'',habits:{}},
  {date:'2026-06-24',weight:74.6,calories:2050,protein:151,water:2.8,sleep:7.4,steps:10200,mood:8,energy:8,stress:3,workoutMinutes:60,notes:'',habits:{}},
  {date:'2026-06-25',weight:74.7,calories:2340,protein:129,water:1.9,sleep:6.2,steps:6450,mood:6,energy:5,stress:6,workoutMinutes:0,notes:'',habits:{}},
  {date:'2026-06-26',weight:74.3,calories:2140,protein:144,water:2.5,sleep:7.8,steps:11840,mood:9,energy:8,stress:2,workoutMinutes:50,notes:'',habits:{}},
  {date:'2026-06-27',weight:74.4,calories:2280,protein:155,water:2.7,sleep:7.1,steps:9100,mood:8,energy:7,stress:3,workoutMinutes:40,notes:'',habits:{}},
  {date:'2026-06-28',weight:74.1,calories:1980,protein:142,water:3.0,sleep:8.0,steps:12650,mood:9,energy:9,stress:2,workoutMinutes:65,notes:'',habits:{}},
  {date:'2026-06-29',weight:74.2,calories:1280,protein:86,water:1.8,sleep:7.4,steps:6842,mood:8,energy:7,stress:3,workoutMinutes:45,notes:'',habits:{water:false,vegetables:true,teeth:true,hygiene:true,sleep:true,learn:true}}
];
const notifications = [
  {id:1,title:'New personal best',message:'You hit a 7-day logging streak. Keep it alive!',type:'streak',isRead:false,createdAt:new Date().toISOString()},
  {id:2,title:'Protein is on track',message:'Only 54g left to reach today’s goal.',type:'success',isRead:false,createdAt:new Date().toISOString()}
];

function tokenFor(user={id:DEMO_ID,name:'Alex Morgan',email:'alex@example.com'}) { return jwt.sign(user,SECRET,{expiresIn:'30d'}); }
function auth(req:any,_res:any,next:any){try{req.user=jwt.verify((req.headers.authorization||'').replace('Bearer ',''),SECRET)}catch{req.user={id:DEMO_ID}}next()}

app.get('/api/health', async (_req,res)=>{let database='demo'; if(pool){try{await pool.query('SELECT 1');database='postgresql'}catch{database='unavailable'}} res.json({ready:true,database,schedule:['10:00','17:00','22:00'],timezone:process.env.TZ||'Asia/Jerusalem'})});
app.post('/api/auth/demo',(_req,res)=>res.json({token:tokenFor(),user:{id:DEMO_ID,name:'Alex Morgan',email:'alex@example.com',xp:2780,coins:625,level:12}}));
app.post('/api/auth/register',async(req,res)=>{const {name,email,password}=req.body;if(!name||!email||!password)return res.status(400).json({error:'All fields are required'});if(!pool)return res.json({token:tokenFor({id:'local-user',name,email}),user:{id:'local-user',name,email,xp:0,coins:0,level:1}});try{const hash=await bcrypt.hash(password,12);const q=await pool.query('INSERT INTO users(name,email,password_hash) VALUES($1,$2,$3) RETURNING id,name,email,xp,coins',[name,email,hash]);res.status(201).json({token:tokenFor(q.rows[0]),user:q.rows[0]})}catch{res.status(409).json({error:'Email already registered'})}});
app.post('/api/auth/login',async(req,res)=>{if(!pool)return res.json({token:tokenFor(),user:{id:'demo-user',name:'Alex Morgan',email:req.body.email||'alex@example.com',xp:2780,coins:625,level:12}});const q=await pool.query('SELECT * FROM users WHERE email=$1',[req.body.email]);if(!q.rows[0]||!await bcrypt.compare(req.body.password,q.rows[0].password_hash))return res.status(401).json({error:'Invalid credentials'});res.json({token:tokenFor(q.rows[0]),user:q.rows[0]})});
app.get('/api/dashboard',auth,async(req:any,res)=>{let history=demoEntries;if(pool){const q=await pool.query('SELECT * FROM daily_entries WHERE user_id=$1 ORDER BY entry_date ASC LIMIT 30',[req.user.id]);if(q.rows.length)history=q.rows.map(r=>({date:String(r.entry_date).slice(0,10),weight:Number(r.weight),calories:r.calories,protein:r.protein,water:Number(r.water),sleep:Number(r.sleep),steps:r.steps,mood:r.mood,energy:r.energy,stress:r.stress,workoutMinutes:r.workout_minutes,notes:r.notes||'',habits:r.habits||{}}))}const today=history.at(-1)||demoEntries.at(-1)!;res.json({user:{name:'Alex Morgan',xp:2780,coins:625,level:12,nextLevelXp:3000,streak:7},today,history,notifications,goals:[{id:1,title:'10,000 daily steps',progress:today.steps,target:10000,color:'#d8ff4f'},{id:2,title:'Protein goal',progress:today.protein,target:140,color:'#6fe2c1'},{id:3,title:'8 hours of sleep',progress:today.sleep,target:8,color:'#a88bfa'}]})});
app.post('/api/entries',auth,async(req:any,res)=>{const entry={...req.body,date:req.body.date||new Date().toISOString().slice(0,10)};const idx=demoEntries.findIndex(e=>e.date===entry.date);idx>=0?demoEntries[idx]={...demoEntries[idx],...entry}:demoEntries.push(entry);if(pool){await pool.query(`INSERT INTO daily_entries(user_id,entry_date,weight,calories,protein,water,sleep,steps,mood,energy,stress,workout_minutes,notes,habits) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) ON CONFLICT(user_id,entry_date) DO UPDATE SET weight=$3,calories=$4,protein=$5,water=$6,sleep=$7,steps=$8,mood=$9,energy=$10,stress=$11,workout_minutes=$12,notes=$13,habits=$14`,[req.user.id,entry.date,entry.weight,entry.calories,entry.protein,entry.water,entry.sleep,entry.steps,entry.mood,entry.energy,entry.stress,entry.workoutMinutes,entry.notes,JSON.stringify(entry.habits||{})])}res.json({ok:true,entry})});
app.patch('/api/notifications/:id/read',auth,(req,res)=>{const n=notifications.find(x=>x.id===Number(req.params.id));if(n)n.isRead=true;res.json({ok:true})});
app.post('/api/push/subscribe',auth,async(req:any,res)=>{if(pool)await pool.query('INSERT INTO push_subscriptions(user_id,subscription) VALUES($1,$2)',[req.user.id,req.body]);res.status(201).json({ok:true})});
const defaultPreferences={profile:{name:'',email:'',age:'',height:'',weight:''},targets:{calories:2200,protein:140,water:2.5,steps:10000},settings:{notifications:true,weekly:true,penalties:false,dark:true},customGoals:[],onboardingComplete:false};
app.get('/api/preferences',auth,async(req:any,res)=>{if(!pool)return res.json(defaultPreferences);const q=await pool.query('SELECT * FROM user_preferences WHERE user_id=$1',[req.user.id]);if(!q.rows[0])return res.json(defaultPreferences);const p=q.rows[0];res.json({profile:p.profile,targets:p.targets,settings:p.settings,customGoals:p.custom_goals,onboardingComplete:p.onboarding_complete})});
app.put('/api/preferences',auth,async(req:any,res)=>{const value={...defaultPreferences,...req.body};if(pool)await pool.query(`INSERT INTO user_preferences(user_id,profile,targets,settings,custom_goals,onboarding_complete,updated_at) VALUES($1,$2,$3,$4,$5,$6,now()) ON CONFLICT(user_id) DO UPDATE SET profile=$2,targets=$3,settings=$4,custom_goals=$5,onboarding_complete=$6,updated_at=now()`,[req.user.id,JSON.stringify(value.profile),JSON.stringify(value.targets),JSON.stringify(value.settings),JSON.stringify(value.customGoals),Boolean(value.onboardingComplete)]);res.json({ok:true,preferences:value})});

const vapidPublic=process.env.VAPID_PUBLIC_KEY, vapidPrivate=process.env.VAPID_PRIVATE_KEY;
if(vapidPublic&&vapidPrivate)webpush.setVapidDetails('mailto:admin@daylight.app',vapidPublic,vapidPrivate);
async function scheduled(title:string,message:string,type='info'){notifications.unshift({id:Date.now(),title,message,type,isRead:false,createdAt:new Date().toISOString()});if(pool&&vapidPublic&&vapidPrivate){const q=await pool.query('SELECT subscription FROM push_subscriptions');await Promise.allSettled(q.rows.map(r=>webpush.sendNotification(r.subscription,JSON.stringify({title,body:message}))))}}
cron.schedule('0 10 * * *',()=>scheduled('Daily check-in','Take two minutes to log your morning and set the tone.'),{timezone:process.env.TZ||'Asia/Jerusalem'});
cron.schedule('0 17 * * *',()=>scheduled('Hydration check','A glass of water now is an easy win. 💧'),{timezone:process.env.TZ||'Asia/Jerusalem'});
cron.schedule('0 22 * * *',()=>scheduled('Protect your streak','Complete today’s log before the day ends.','streak'),{timezone:process.env.TZ||'Asia/Jerusalem'});

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
app.use(express.static(path.join(root,'dist'),{setHeaders:(res,file)=>{if(file.endsWith('index.html'))res.setHeader('Cache-Control','no-store, max-age=0')}})); app.get('/{*splat}',(_req,res)=>{res.setHeader('Cache-Control','no-store, max-age=0');res.sendFile(path.join(root,'dist','index.html'))});
async function start(){
  if(pool){
    const schema=await fs.readFile(path.join(root,'server','schema.sql'),'utf8');
    await pool.query(schema);
    const hash=await bcrypt.hash('demo-account-disabled-password',12);
    await pool.query('INSERT INTO users(id,name,email,password_hash) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING',[DEMO_ID,'Alex Morgan','alex@example.com',hash]);
  }
  app.listen(PORT,'0.0.0.0',()=>console.log(`Daily Life Tracker running on http://localhost:${PORT}`));
}
start().catch(error=>{console.error('Startup failed',error);process.exit(1)});
