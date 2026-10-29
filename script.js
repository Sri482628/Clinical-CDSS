/* ============================================
   ClinAI CDSS v2.0 — script.js
   Auth · Patient Records · AI Engine · Reports
   ============================================ */
'use strict';

// ══════════════════════════════════════════════
//  SESSION — Doctor auth from sessionStorage
// ══════════════════════════════════════════════
let CURRENT_DOCTOR = null;

function initSession() {
  const raw = localStorage.getItem('clinai_doctor');
  if (!raw) { window.location.href = 'login.html'; return; }
  try { CURRENT_DOCTOR = JSON.parse(raw); } catch(e) { window.location.href = 'login.html'; return; }

  // Sidebar doctor block
  const av   = document.getElementById('sb-avatar');
  const nm   = document.getElementById('sb-name');
  const rl   = document.getElementById('sb-role');
  if (av) { av.textContent = CURRENT_DOCTOR.initials; av.style.background = CURRENT_DOCTOR.bg; av.style.color = CURRENT_DOCTOR.color; }
  if (nm) nm.textContent = CURRENT_DOCTOR.name;
  if (rl) rl.textContent = CURRENT_DOCTOR.role;

  // Dashboard greeting
  const hour = new Date().getHours();
  const timeWord = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const greet = document.getElementById('dash-greeting');
  if (greet) greet.innerHTML = `Good ${timeWord}, <span class="accent">${CURRENT_DOCTOR.name}</span> 👋`;
}

function doLogout() {
  document.getElementById('logout-modal').classList.add('open');
}
function closeLogoutModal() {
  document.getElementById('logout-modal').classList.remove('open');
}
function confirmLogout() {
  localStorage.removeItem('clinai_doctor');
  window.location.replace('login.html');
}

// ══════════════════════════════════════════════
//  DATA STORE — localStorage persistence
// ══════════════════════════════════════════════
const STORE_KEY = 'clinai_store_v3';

function loadStore() {
  try {
    const r = localStorage.getItem(STORE_KEY);
    return r ? JSON.parse(r) : { patients:[], predictions:0, testsOrdered:0 };
  } catch(e) { return { patients:[], predictions:0, testsOrdered:0 }; }
}
function saveStore() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(STORE)); } catch(e) {}
}
let STORE = loadStore();
let currentAnalysis = null;

// ══════════════════════════════════════════════
//  DOCTOR DATABASE
// ══════════════════════════════════════════════
const DOCTORS = [
  { id:'d1', name:'Dr. Rama Kumar',    initials:'RK', dept:'general',        deptLabel:'General Medicine',        role:'Senior Physician & CDSS Coordinator',  color:'#0EA5E9', colorBg:'rgba(14,165,233,.15)', qual:'MBBS, MD (General Medicine)',                       exp:'18 years', phone:'+91 94442 10001', room:'OPD Block A, Room 101',  floor:'Ground Floor, Block A',        availability:'available',   availLabel:'Available Now',      sessions:[{label:'Morning OPD', time:'9:00 AM – 1:00 PM', slots:'12 slots'},{label:'Evening OPD', time:'4:00 PM – 7:00 PM', slots:'8 slots'}],     today:true,  specialties:['Internal Medicine','Preventive Care','Diabetes Management'] },
  { id:'d2', name:'Dr. Priya Sharma',  initials:'PS', dept:'endocrinology',   deptLabel:'Endocrinology',           role:'Senior Endocrinologist',                color:'#10B981', colorBg:'rgba(16,185,129,.15)', qual:'MBBS, MD, DM (Endocrinology)',                     exp:'14 years', phone:'+91 94442 10002', room:'OPD Block B, Room 204',  floor:'Second Floor, Block B',        availability:'available',   availLabel:'Available Now',      sessions:[{label:'Morning OPD', time:'10:00 AM – 1:00 PM', slots:'10 slots'},{label:'Follow-up', time:'3:00 PM – 5:30 PM', slots:'6 slots'}],   today:true,  specialties:['Type 1 & 2 Diabetes','Thyroid Disorders','Metabolic Syndrome'] },
  { id:'d3', name:'Dr. Arjun Mehta',   initials:'AM', dept:'cardiology',      deptLabel:'Cardiology',              role:'Interventional Cardiologist',           color:'#F43F5E', colorBg:'rgba(244,63,94,.15)',  qual:'MBBS, MD, DM (Cardiology)',                        exp:'16 years', phone:'+91 94442 10003', room:'Cardiology Wing, Room 301', floor:'Third Floor, Cardiology Wing',  availability:'morning',     availLabel:'Morning Session',    sessions:[{label:'Cath Lab', time:'8:00 AM – 12:00 PM', slots:'Procedure'},{label:'OPD', time:'2:00 PM – 5:00 PM', slots:'8 slots'}],          today:true,  specialties:['Coronary Artery Disease','Echocardiography','Cardiac Rehab'] },
  { id:'d4', name:'Dr. Kavitha Nair',  initials:'KN', dept:'nephrology',      deptLabel:'Nephrology',              role:'Senior Nephrologist',                   color:'#F59E0B', colorBg:'rgba(245,158,11,.15)', qual:'MBBS, MD, DM (Nephrology)',                        exp:'11 years', phone:'+91 94442 10004', room:'Nephrology Dept, Room 412', floor:'Fourth Floor, Block C',         availability:'afternoon',   availLabel:'Afternoon Session',  sessions:[{label:'Ward Rounds', time:'9:00 AM – 11:00 AM', slots:'Ward'},{label:'OPD', time:'2:00 PM – 5:30 PM', slots:'10 slots'}],          today:true,  specialties:['Chronic Kidney Disease','Dialysis','Kidney Transplant'] },
  { id:'d5', name:'Dr. Suresh Pillai', initials:'SP', dept:'neurology',       deptLabel:'Neurology',               role:'Consultant Neurologist',                color:'#A855F7', colorBg:'rgba(168,85,247,.15)', qual:'MBBS, MD, DM (Neurology)',                         exp:'12 years', phone:'+91 94442 10005', room:'Neurology Dept, Room 503',  floor:'Fifth Floor, Block D',          availability:'available',   availLabel:'Available Now',      sessions:[{label:'OPD', time:'10:00 AM – 1:00 PM', slots:'8 slots'},{label:'Tele-consult', time:'4:00 PM – 6:00 PM', slots:'6 slots'}],     today:true,  specialties:['Stroke','Epilepsy','Headache Disorders'] },
  { id:'d6', name:'Dr. Ananya Rajan',  initials:'AR', dept:'endocrinology',   deptLabel:'Endocrinology',           role:'Thyroid & Hormone Specialist',          color:'#10B981', colorBg:'rgba(16,185,129,.15)', qual:'MBBS, MD (Endocrinology)',                         exp:'9 years',  phone:'+91 94442 10006', room:'OPD Block B, Room 206',  floor:'Second Floor, Block B',        availability:'unavailable', availLabel:'On Leave Today',     sessions:[{label:'OPD (Regular)', time:'9:30 AM – 12:30 PM', slots:'Not today'},{label:'Hormone Clinic', time:'3:00 PM – 5:00 PM', slots:'Not today'}], today:false, specialties:['Thyroid Cancer','Hormonal Imbalance','PCOS'] },
  { id:'d7', name:'Dr. Vijay Srinivas',initials:'VS', dept:'cardiology',      deptLabel:'Cardiology',              role:'Electrophysiologist',                   color:'#F43F5E', colorBg:'rgba(244,63,94,.15)',  qual:'MBBS, MD, DM (Cardiology), EP Fellowship',        exp:'13 years', phone:'+91 94442 10007', room:'EP Lab, Cardiology Wing',   floor:'Third Floor, Cardiology Wing',  availability:'available',   availLabel:'Available Now',      sessions:[{label:'EP Lab', time:'8:30 AM – 1:00 PM', slots:'Procedure'},{label:'Arrhythmia OPD', time:'3:30 PM – 5:30 PM', slots:'6 slots'}], today:true,  specialties:['Arrhythmia','Pacemaker Implant','Atrial Fibrillation'] },
  { id:'d8', name:'Dr. Meera Chandran',initials:'MC', dept:'general',         deptLabel:'General Medicine',        role:'General Physician',                     color:'#0EA5E9', colorBg:'rgba(14,165,233,.15)', qual:'MBBS, MD (General Medicine)',                      exp:'7 years',  phone:'+91 94442 10008', room:'OPD Block A, Room 104',  floor:'Ground Floor, Block A',        availability:'morning',     availLabel:'Morning Session Only',sessions:[{label:'General OPD', time:'8:00 AM – 12:00 PM', slots:'15 slots'},{label:'—', time:'Afternoon off', slots:'—'}],            today:true,  specialties:['Fever & Infections','Acute Care','Health Checkup'] },
];

// ══════════════════════════════════════════════
//  DISEASE ENGINE
// ══════════════════════════════════════════════
const DISEASES = ['diabetes','heart','kidney','hypertension','thyroid'];
const DISEASE_META = {
  diabetes:     { name:'Diabetes',      icon:'🩸', color:'#0EA5E9' },
  heart:        { name:'Heart Disease', icon:'❤️', color:'#F43F5E' },
  kidney:       { name:'Kidney Dis.',   icon:'🫘', color:'#F59E0B' },
  hypertension: { name:'Hypertension',  icon:'💉', color:'#6366F1' },
  thyroid:      { name:'Thyroid',       icon:'🦋', color:'#10B981' },
};
const TEST_MAP = {
  diabetes:     ['HbA1c Test','Fasting Blood Sugar (FBS)','Post-Prandial Sugar','Urine Sugar Test','OGTT'],
  heart:        ['12-Lead ECG','Lipid Profile Panel','Echocardiogram','Troponin I / Troponin T','2D Echo + Doppler'],
  kidney:       ['Kidney Function Test (KFT)','Serum Creatinine','Urine Analysis (Routine)','eGFR Calculation','24-hr Urine Protein'],
  hypertension: ['Ambulatory BP Monitoring','Renal Function Test','Urine Microalbumin','Fundoscopy'],
  thyroid:      ['TSH (Thyroid Stimulating Hormone)','Free T3 / Free T4','Thyroid Antibodies','Thyroid Ultrasound'],
};
const SPECIALIST_MAP = { diabetes:'endocrinology', heart:'cardiology', kidney:'nephrology', hypertension:'nephrology', thyroid:'endocrinology' };

function computeRisks(p) {
  let d=0, h=0, k=0, bp=0, th=0;
  const factors = [];

  if (p.glucose>=200)      { d+=42; k+=10; factors.push({icon:'🩸',label:`Very High Fasting Glucose (${p.glucose} mg/dL)`,detail:'Strongly indicative of uncontrolled diabetes',level:'high',impact:'Critical',affects:['diabetes','kidney']}); }
  else if (p.glucose>=126) { d+=30; k+=6;  factors.push({icon:'🩸',label:`High Glucose (${p.glucose} mg/dL)`,detail:'Exceeds diabetic threshold of 126 mg/dL',level:'high',impact:'High',affects:['diabetes']}); }
  else if (p.glucose>=100) { d+=16;        factors.push({icon:'🩸',label:`Pre-diabetic Glucose (${p.glucose} mg/dL)`,detail:'100–125 mg/dL — impaired fasting glucose',level:'mod',impact:'Moderate',affects:['diabetes']}); }

  if (p.hba1c>=9)          { d+=35; factors.push({icon:'🔴',label:`Very High HbA1c (${p.hba1c}%)`,detail:'Severely elevated 3-month blood sugar average',level:'high',impact:'Critical',affects:['diabetes']}); }
  else if (p.hba1c>=6.5)   { d+=22; factors.push({icon:'🔴',label:`Diabetic Range HbA1c (${p.hba1c}%)`,detail:'HbA1c ≥6.5% meets WHO diagnostic criteria',level:'high',impact:'High',affects:['diabetes']}); }
  else if (p.hba1c>=5.7)   { d+=10; factors.push({icon:'🟡',label:`Pre-diabetic HbA1c (${p.hba1c}%)`,detail:'5.7–6.4% indicates increased risk',level:'mod',impact:'Moderate',affects:['diabetes']}); }

  if (p.bmi>=35)           { d+=20; h+=14; k+=8; bp+=15; factors.push({icon:'⚖️',label:`Severe Obesity (BMI ${p.bmi})`,detail:'BMI ≥35 elevates risk across multiple diseases',level:'high',impact:'High',affects:['diabetes','heart','kidney','hypertension']}); }
  else if (p.bmi>=30)      { d+=13; h+=9; k+=5; bp+=9;   factors.push({icon:'⚖️',label:`Obese BMI (${p.bmi})`,detail:'Increases insulin resistance and cardiovascular load',level:'mod',impact:'Moderate',affects:['diabetes','heart']}); }
  else if (p.bmi>=25)      { d+=6; h+=4; bp+=4;           factors.push({icon:'⚖️',label:`Overweight BMI (${p.bmi})`,detail:'Overweight raises metabolic and CV disease risk',level:'info',impact:'Low',affects:['diabetes','heart']}); }

  if (p.bpSys>=180||p.bpDia>=110)    { h+=30; k+=25; bp+=40; d+=8; factors.push({icon:'💉',label:`Hypertensive Crisis (${p.bpSys}/${p.bpDia} mmHg)`,detail:'Stage 3 — immediate medical attention required',level:'high',impact:'Critical',affects:['heart','kidney','hypertension']}); }
  else if (p.bpSys>=140||p.bpDia>=90){ h+=18; k+=14; bp+=28;       factors.push({icon:'💉',label:`Stage 2 Hypertension (${p.bpSys}/${p.bpDia} mmHg)`,detail:'Consistently elevated BP damages kidneys and heart',level:'high',impact:'High',affects:['heart','kidney','hypertension']}); }
  else if (p.bpSys>=130||p.bpDia>=80){ h+=10; k+=7;  bp+=16;       factors.push({icon:'💉',label:`Elevated BP (${p.bpSys}/${p.bpDia} mmHg)`,detail:'Stage 1 — lifestyle changes recommended',level:'mod',impact:'Moderate',affects:['heart','hypertension']}); }

  if (p.chol>=240)         { h+=22; factors.push({icon:'🫀',label:`High Cholesterol (${p.chol} mg/dL)`,detail:'≥240 doubles coronary artery disease risk',level:'high',impact:'High',affects:['heart']}); }
  else if (p.chol>=200)    { h+=11; factors.push({icon:'🫀',label:`Borderline Cholesterol (${p.chol} mg/dL)`,detail:'200–239 mg/dL — borderline high, monitor advised',level:'mod',impact:'Moderate',affects:['heart']}); }

  if (p.creatinine>=3.0)   { k+=40; factors.push({icon:'🫘',label:`Severely Elevated Creatinine (${p.creatinine} mg/dL)`,detail:'Creatinine ≥3 indicates severely reduced kidney filtration',level:'high',impact:'Critical',affects:['kidney']}); }
  else if (p.creatinine>=1.5){ k+=22; factors.push({icon:'🫘',label:`Elevated Creatinine (${p.creatinine} mg/dL)`,detail:'Suggests moderately impaired kidney function',level:'high',impact:'High',affects:['kidney']}); }
  else if (p.creatinine>=1.2){ k+=10; factors.push({icon:'🫘',label:`Borderline Creatinine (${p.creatinine} mg/dL)`,detail:'Upper normal limit — repeat in 3 months',level:'mod',impact:'Moderate',affects:['kidney']}); }

  if (p.age>=65)   { d+=10; h+=14; k+=12; bp+=12; th+=8; factors.push({icon:'🎂',label:`Advanced Age (${p.age} years)`,detail:'Age ≥65 is independent risk factor for all listed diseases',level:'mod',impact:'Moderate',affects:['diabetes','heart','kidney','hypertension','thyroid']}); }
  else if(p.age>=45){ d+=6; h+=9; k+=7; bp+=7; th+=4;    factors.push({icon:'🎂',label:`Middle Age (${p.age} years)`,detail:'Risk of metabolic disease rises significantly after 45',level:'info',impact:'Low',affects:['diabetes','heart']}); }

  if (p.familyHistory.includes('fh-diabetes'))     { d+=8;  factors.push({icon:'🧬',label:'Family History of Diabetes',detail:'First-degree relatives with diabetes increases personal risk 2–3×',level:'mod',impact:'Moderate',affects:['diabetes']}); }
  if (p.familyHistory.includes('fh-heart'))        { h+=10; factors.push({icon:'🧬',label:'Family History of Heart Disease',detail:'Genetic predisposition to CAD',level:'mod',impact:'Moderate',affects:['heart']}); }
  if (p.familyHistory.includes('fh-hypertension')) { bp+=10;factors.push({icon:'🧬',label:'Family History of Hypertension',detail:'Hereditary component raises lifetime risk significantly',level:'mod',impact:'Moderate',affects:['hypertension']}); }

  const S = p.symptoms;
  if(S.includes('fatigue'))           { d+=5;k+=5;    factors.push({icon:'😴',label:'Fatigue',detail:'Persistent fatigue is common in diabetes and kidney disease',level:'info',impact:'Low',affects:['diabetes','kidney']}); }
  if(S.includes('frequent-urination')){ d+=10;k+=8;   factors.push({icon:'🚿',label:'Frequent Urination (Polyuria)',detail:'Classic diabetes symptom; also seen in kidney dysfunction',level:'mod',impact:'Moderate',affects:['diabetes','kidney']}); }
  if(S.includes('excessive-thirst'))  { d+=8;         factors.push({icon:'🥤',label:'Excessive Thirst (Polydipsia)',detail:'Hallmark symptom of hyperglycemia',level:'mod',impact:'Moderate',affects:['diabetes']}); }
  if(S.includes('chest-pain'))        { h+=20;        factors.push({icon:'🫀',label:'Chest Pain / Tightness',detail:'Anginal chest pain — significant cardiac red flag',level:'high',impact:'High',affects:['heart']}); }
  if(S.includes('palpitations'))      { h+=10;th+=8;  factors.push({icon:'💓',label:'Palpitations',detail:'May indicate arrhythmia or thyroid dysfunction',level:'mod',impact:'Moderate',affects:['heart','thyroid']}); }
  if(S.includes('sob'))               { h+=12;k+=8;   factors.push({icon:'🫁',label:'Shortness of Breath',detail:'Dyspnea can indicate cardiac failure or renal fluid retention',level:'high',impact:'High',affects:['heart','kidney']}); }
  if(S.includes('dizziness'))         { h+=8;bp+=10;  factors.push({icon:'💫',label:'Dizziness / Lightheadedness',detail:'Common with hypertension or cardiac rhythm problems',level:'mod',impact:'Moderate',affects:['heart','hypertension']}); }
  if(S.includes('swelling'))          { h+=8;k+=12;   factors.push({icon:'🦵',label:'Leg / Ankle Swelling (Edema)',detail:'Peripheral edema is a key sign of cardiac or renal failure',level:'high',impact:'High',affects:['heart','kidney']}); }
  if(S.includes('weight-loss'))       { d+=8;th+=10;  factors.push({icon:'⚖️',label:'Unexplained Weight Loss',detail:'Unintentional weight loss can signal diabetes or hyperthyroidism',level:'mod',impact:'Moderate',affects:['diabetes','thyroid']}); }
  if(S.includes('back-pain'))         { k+=8;         factors.push({icon:'🔙',label:'Back / Flank Pain',detail:'Costophrenic angle tenderness may indicate kidney pathology',level:'mod',impact:'Moderate',affects:['kidney']}); }
  if(S.includes('blurred-vision'))    { d+=7;bp+=6;   factors.push({icon:'👁️',label:'Blurred Vision',detail:'Hypertensive retinopathy or diabetic retinopathy',level:'mod',impact:'Moderate',affects:['diabetes','hypertension']}); }
  if(S.includes('headache'))          { h+=5;bp+=8;   factors.push({icon:'🤕',label:'Persistent Headache',detail:'Common presentation of hypertension and migraine',level:'info',impact:'Low',affects:['heart','hypertension']}); }
  if(S.includes('slow-healing'))      { d+=6;         factors.push({icon:'🩹',label:'Slow Wound Healing',detail:'Impaired healing — complication of poorly controlled diabetes',level:'mod',impact:'Moderate',affects:['diabetes']}); }
  if(S.includes('weakness'))          { d+=4;k+=5;th+=6; factors.push({icon:'💪',label:'General Weakness',detail:'May indicate metabolic, kidney, or thyroid issue',level:'info',impact:'Low',affects:['diabetes','kidney','thyroid']}); }
  if(S.includes('nausea'))            { k+=7;         factors.push({icon:'🤢',label:'Nausea / Vomiting',detail:'Uremic nausea — symptom of advanced kidney dysfunction',level:'mod',impact:'Moderate',affects:['kidney']}); }
  if(S.includes('fever'))             { k+=5;         factors.push({icon:'🌡️',label:'Fever',detail:'Fever with back pain may suggest kidney infection',level:'info',impact:'Low',affects:['kidney']}); }

  const cl = v => Math.min(Math.round(v),99);
  const lbl = v => v>=65?'High':v>=35?'Moderate':'Low';
  const cls = v => v>=65?'high':v>=35?'mod':'low';
  const scores = { diabetes:cl(d), heart:cl(h), kidney:cl(k), hypertension:cl(bp), thyroid:cl(th) };
  const diseases = DISEASES.map(id=>({id,...DISEASE_META[id],score:scores[id],label:lbl(scores[id]),cls:cls(scores[id])}));
  return { patient:p, diseases, factors, timestamp:new Date().toISOString() };
}

// ══════════════════════════════════════════════
//  NAVIGATION
// ══════════════════════════════════════════════
function showSection(id, linkEl) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(l=>l.classList.remove('active'));
  const pg = document.getElementById('page-'+id);
  if (pg) pg.classList.add('active');
  if (linkEl) linkEl.classList.add('active');
  window.scrollTo({top:0,behavior:'smooth'});
  if (id==='dashboard')   refreshDashboard();
  if (id==='records')     { renderRecordsTable(); updateRecordsRibbon(); }
  if (id==='departments') { renderDoctors('all'); document.getElementById('dept-date-label').textContent='Showing availability for '+new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'}); }
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ══════════════════════════════════════════════
//  CLOCK
// ══════════════════════════════════════════════
function updateClock() {
  const now  = new Date();
  const date = now.toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
  const time = now.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  const el=document.getElementById('dash-datetime'); if(el) el.textContent=date+'  ·  '+time;
  const tb=document.getElementById('topbar-time');   if(tb) tb.textContent=time;
}

// ══════════════════════════════════════════════
//  FORM HELPERS
// ══════════════════════════════════════════════
function toggleSym(cb) {
  cb.closest('.sym-card').classList.toggle('checked',cb.checked);
  const count=document.querySelectorAll('.sym-cb:checked').length;
  const lb=document.querySelector('.sym-count-label');
  if(lb) lb.textContent=count+' symptom'+(count!==1?'s':'')+' selected';
}

function clearAssessment() {
  ['f-name','f-pid','f-age','f-phone','f-refdoc','f-bpsys','f-bpdia','f-glucose','f-bmi',
   'f-chol','f-hba1c','f-creatinine','f-hr','f-spo2','f-meds','f-notes'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  document.getElementById('f-gender').value='';
  document.getElementById('f-blood').value='';
  document.querySelectorAll('.sym-cb').forEach(cb=>{cb.checked=false;cb.closest('.sym-card').classList.remove('checked');});
  document.querySelectorAll('.fh-cb').forEach(cb=>{cb.checked=false;});
  const lb=document.querySelector('.sym-count-label');if(lb)lb.textContent='0 symptoms selected';
  showToast('Form cleared');
}

function collectPatient() {
  return {
    id:      document.getElementById('f-pid').value.trim()||('PT-'+Date.now().toString(36).toUpperCase()),
    name:    document.getElementById('f-name').value.trim()||'Unknown',
    age:     parseFloat(document.getElementById('f-age').value)||0,
    gender:  document.getElementById('f-gender').value||'—',
    blood:   document.getElementById('f-blood').value||'—',
    phone:   document.getElementById('f-phone').value||'—',
    refDoc:  document.getElementById('f-refdoc').value||CURRENT_DOCTOR?.name||'—',
    bpSys:   parseFloat(document.getElementById('f-bpsys').value)||0,
    bpDia:   parseFloat(document.getElementById('f-bpdia').value)||0,
    glucose: parseFloat(document.getElementById('f-glucose').value)||0,
    bmi:     parseFloat(document.getElementById('f-bmi').value)||0,
    chol:    parseFloat(document.getElementById('f-chol').value)||0,
    hba1c:   parseFloat(document.getElementById('f-hba1c').value)||0,
    creatinine:parseFloat(document.getElementById('f-creatinine').value)||0,
    hr:      parseFloat(document.getElementById('f-hr').value)||0,
    spo2:    parseFloat(document.getElementById('f-spo2').value)||0,
    meds:    document.getElementById('f-meds').value||'',
    notes:   document.getElementById('f-notes').value||'',
    familyHistory:[...document.querySelectorAll('.fh-cb:checked')].map(c=>c.value),
    symptoms:[...document.querySelectorAll('.sym-cb:checked')].map(c=>c.value),
    assessedByDoctor: CURRENT_DOCTOR?.name||'—',
    assessedByDept:   CURRENT_DOCTOR?.dept||'—',
  };
}

// ══════════════════════════════════════════════
//  RUN ANALYSIS
// ══════════════════════════════════════════════
function runAnalysis() {
  const p = collectPatient();
  if (!p.name||p.name==='Unknown') { showToast('⚠ Please enter patient name'); return; }
  if (!p.age) { showToast('⚠ Please enter patient age'); return; }
  if (!(p.glucose||p.bmi||p.bpSys||p.chol||p.hba1c||p.creatinine)) { showToast('⚠ Please enter at least one vital sign'); return; }

  currentAnalysis = computeRisks(p);
  STORE.predictions++;
  saveStore();
  renderAnalysis(currentAnalysis);
  showSection('analysis',document.querySelector('[data-section=analysis]'));
  showToast('✅ AI Analysis complete');
}

// ══════════════════════════════════════════════
//  RENDER ANALYSIS
// ══════════════════════════════════════════════
function renderAnalysis(r) {
  const sub=document.getElementById('analysis-sub');
  if(sub) sub.textContent=`Patient: ${r.patient.name}  ·  Age: ${r.patient.age}  ·  ${r.patient.gender}  ·  Analysed: ${fmtDT(r.timestamp)}`;

  // Risk cards
  const grid=document.getElementById('risk-cards-grid');
  if(grid) {
    grid.innerHTML=r.diseases.map(d=>`
      <div class="risk-card">
        <div class="rc-header"><span class="rc-icon">${d.icon}</span><span class="rc-name">${d.name}</span></div>
        <div class="rc-score c-${d.cls}" id="rcs-${d.id}">0%</div>
        <div class="rc-label lbl-${d.cls}">${d.label} Risk</div>
        <div class="rc-bar-wrap"><div class="rc-bar bar-fill-${d.cls}" id="rcb-${d.id}" style="width:0%"></div></div>
      </div>`).join('');
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      r.diseases.forEach(d=>{
        const b=document.getElementById('rcb-'+d.id);
        const s=document.getElementById('rcs-'+d.id);
        if(b) b.style.width=d.score+'%';
        if(s) { let c=0,step=d.score/50; const t=setInterval(()=>{c=Math.min(c+step,d.score);s.textContent=Math.round(c)+'%';if(c>=d.score)clearInterval(t);},20); }
      });
    }));
  }

  // XAI
  const xl=document.getElementById('xai-factors-list');
  if(xl) xl.innerHTML=r.factors.length
    ? r.factors.map((f,i)=>`<div class="xai-row xai-${f.level}" style="animation-delay:${i*.04}s"><span class="xai-icon">${f.icon}</span><div class="xai-content"><div class="xai-label">${f.label}</div><div class="xai-detail">${f.detail}</div></div><span class="xai-impact">${f.impact}</span></div>`).join('')
    : '<p style="color:var(--muted);font-size:13px">No significant risk factors identified.</p>';

  // Tests
  const tl=document.getElementById('test-reco-list');
  if(tl) {
    const elevated=r.diseases.filter(d=>d.cls!=='low');
    tl.innerHTML=elevated.length
      ? elevated.map(d=>`<div class="test-disease-block"><div class="tdb-label">${d.icon} ${d.name} — ${d.label} Risk</div>${TEST_MAP[d.id].map(t=>`<div class="test-item-row" data-test="${t}">${t}</div>`).join('')}</div>`).join('')
      : '<p style="color:var(--muted);font-size:13px">No specific tests required. Routine screening advised.</p>';
    document.getElementById('tests-ordered-notice').style.display='none';
  }

  // Specialists
  const sf=document.getElementById('specialists-flex');
  if(sf) {
    const needed=[...new Set(r.diseases.filter(d=>d.cls!=='low').map(d=>SPECIALIST_MAP[d.id]))];
    sf.innerHTML=needed.map(deptId=>{
      const doc=DOCTORS.find(d=>d.dept===deptId&&d.today)||DOCTORS.find(d=>d.dept===deptId);
      if(!doc) return '';
      return `<div class="spec-card"><div class="spec-ava" style="background:${doc.colorBg}">${doc.initials}</div><div class="spec-body"><div class="spec-name">${doc.name}</div><div class="spec-role">${doc.role}</div><div class="spec-dept">${doc.deptLabel}</div><div class="spec-room">📍 ${doc.room}</div><span class="spec-avail">${doc.availability==='available'?'✅ Available Now':doc.availability==='morning'?'🌅 Morning Session':doc.availability==='afternoon'?'🌇 Afternoon Session':'❌ On Leave'}</span></div></div>`;
    }).join('')||'<p style="color:var(--muted)">No specialist referral required.</p>';
  }

  // Confirmed diagnoses
  const confirmed=r.diseases.filter(d=>d.cls==='high');
  const banner=document.getElementById('confirmed-banner');
  if(confirmed.length&&banner) {
    banner.style.display='flex';
    document.getElementById('confirmed-text').textContent=` Auto-recorded: ${confirmed.map(d=>d.icon+' '+d.name).join(', ')} at ${fmtDT(new Date().toISOString())}`;
  } else if(banner) banner.style.display='none';

  savePatientRecord(r,confirmed);
}

// ══════════════════════════════════════════════
//  SAVE PATIENT RECORD — full details + timestamp
// ══════════════════════════════════════════════
function savePatientRecord(r, confirmed) {
  const existing=STORE.patients.findIndex(p=>p.patientId===r.patient.id);
  const record={
    patientId:    r.patient.id,
    name:         r.patient.name,
    age:          r.patient.age,
    gender:       r.patient.gender,
    blood:        r.patient.blood,
    phone:        r.patient.phone,
    refDoc:       r.patient.refDoc,
    assessedBy:   r.patient.assessedByDoctor,
    assessedDept: r.patient.assessedByDept,
    vitals:{
      bpSys:r.patient.bpSys, bpDia:r.patient.bpDia,
      glucose:r.patient.glucose, bmi:r.patient.bmi, chol:r.patient.chol,
      hba1c:r.patient.hba1c, creatinine:r.patient.creatinine,
      hr:r.patient.hr, spo2:r.patient.spo2,
    },
    symptoms:      r.patient.symptoms,
    familyHistory: r.patient.familyHistory,
    meds:          r.patient.meds,
    notes:         r.patient.notes,
    assessedAt:    r.timestamp,             // ← full ISO timestamp
    assessedDate:  new Date(r.timestamp).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}),
    assessedTime:  new Date(r.timestamp).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit'}),
    diseases:      r.diseases,
    factors:       r.factors,
    testsOrdered:  [],
    confirmedDx:   confirmed.map(d=>({id:d.id,name:d.name,icon:d.icon,recordedAt:new Date().toISOString()})),
  };
  if(existing>=0) STORE.patients[existing]=record;
  else STORE.patients.unshift(record);
  saveStore();
}

// ══════════════════════════════════════════════
//  ORDER TESTS
// ══════════════════════════════════════════════
function orderTests() {
  if(!currentAnalysis){showToast('Run analysis first');return;}
  const now=new Date().toISOString();
  const testItems=document.querySelectorAll('.test-item-row');
  const testNames=[...testItems].map(t=>t.dataset.test);
  testItems.forEach(t=>t.classList.add('test-ordered'));
  const notice=document.getElementById('tests-ordered-notice');
  const timeEl=document.getElementById('tests-ordered-time');
  if(notice) notice.style.display='block';
  if(timeEl) timeEl.textContent=fmtDT(now);
  const rec=STORE.patients.find(p=>p.patientId===currentAnalysis.patient.id);
  if(rec){ rec.testsOrdered=testNames.map(name=>({name,orderedAt:now})); }
  STORE.testsOrdered+=testNames.length;
  saveStore();
  showToast(`✅ ${testNames.length} tests ordered and recorded`);
}

// ══════════════════════════════════════════════
//  DASHBOARD REFRESH
// ══════════════════════════════════════════════
function refreshDashboard() {
  const patients=STORE.patients;
  const today=new Date().toDateString();
  const todayPats=patients.filter(p=>new Date(p.assessedAt).toDateString()===today);
  const highRisk=patients.filter(p=>p.diseases.some(d=>d.cls==='high'));

  animCount('stat-total-patients',patients.length);
  animCount('stat-predictions',STORE.predictions);
  animCount('stat-high-risk',highRisk.length);
  animCount('stat-confirmed',patients.reduce((s,p)=>s+p.confirmedDx.length,0));
  animCount('hs-today',todayPats.length);
  animCount('hs-total',patients.length);
  const ts=document.getElementById('stat-tests-run'); if(ts) ts.textContent=STORE.testsOrdered+' tests ordered';
  const tp=document.getElementById('stat-today-patients'); if(tp) tp.textContent=todayPats.length+' today';

  // Recent patients
  const rp=document.getElementById('dash-recent-patients');
  if(rp) rp.innerHTML=patients.length===0
    ? `<div class="empty-state"><div class="es-icon">📋</div><p>No assessments yet</p><p class="es-sub">Add a patient to begin</p></div>`
    : patients.slice(0,6).map(p=>{
        const worst=p.diseases.reduce((a,b)=>b.score>a.score?b:a,p.diseases[0]);
        return `<div class="recent-patient-row">
          <div class="rp-avatar">${initials(p.name)}</div>
          <div class="rp-body">
            <div class="rp-name">${p.name}</div>
            <div class="rp-meta">${p.age}y · ${p.gender} · ${p.assessedDate} ${p.assessedTime}</div>
          </div>
          <div class="rp-risk"><span class="risk-pill pill-${worst.cls}">${worst.icon} ${worst.label}</span></div>
        </div>`;
      }).join('');

  // Disease distribution bars
  const counts={diabetes:0,heart:0,kidney:0,hypertension:0,thyroid:0};
  patients.forEach(p=>p.diseases.filter(d=>d.cls!=='low').forEach(d=>counts[d.id]++));
  const maxC=Math.max(...Object.values(counts),1);
  DISEASES.forEach(id=>{
    const b=document.getElementById('bar-'+id); if(b) b.style.width=(counts[id]/maxC*100)+'%';
    const c=document.getElementById('cnt-'+id); if(c) c.textContent=counts[id];
  });

  renderTodayDocsMini();
}

function renderTodayDocsMini() {
  const el=document.getElementById('today-docs-mini'); if(!el) return;
  const aCls={endocrinology:'avt-endo',cardiology:'avt-cardio',nephrology:'avt-nephro',general:'avt-gen',neurology:'avt-neuro'};
  const avCls={available:'avail-yes',morning:'avail-yes',afternoon:'avail-soon',unavailable:'avail-no'};
  el.innerHTML=DOCTORS.map(d=>`
    <div class="today-doc-mini">
      <div class="tdm-avt ${aCls[d.dept]||''}">${d.initials}</div>
      <div>
        <div class="tdm-name">${d.name}</div>
        <div class="tdm-dept"><span class="avail-dot ${avCls[d.availability]}"></span>${d.availLabel}</div>
      </div>
    </div>`).join('');
}

// ══════════════════════════════════════════════
//  PATIENT RECORDS TABLE
// ══════════════════════════════════════════════
function renderRecordsTable(filter='') {
  const tbody=document.getElementById('records-tbody'); if(!tbody) return;
  let pts=STORE.patients;
  if(filter){ const f=filter.toLowerCase(); pts=pts.filter(p=>p.name.toLowerCase().includes(f)||p.patientId.toLowerCase().includes(f)); }

  if(pts.length===0){ tbody.innerHTML=`<tr><td colspan="12" class="empty-td">No records found.</td></tr>`; return; }

  tbody.innerHTML=pts.map((p,i)=>{
    const highDis=p.diseases.filter(d=>d.cls==='high');
    const modDis=p.diseases.filter(d=>d.cls==='mod');
    const riskFlags=[...highDis.map(d=>`<span class="risk-flag pill-high">${d.icon} ${d.name}</span>`),...modDis.map(d=>`<span class="risk-flag pill-mod">${d.icon} ${d.name}</span>`)].join('')||'<span style="color:var(--green);font-size:11.5px">✓ Low risk</span>';
    const testsHtml=p.testsOrdered.length?`<span style="color:var(--teal);font-size:12px;font-weight:600">${p.testsOrdered.length} test(s) ✓</span>`:'<span style="color:var(--faint);font-size:12px">None</span>';
    const dxHtml=p.confirmedDx.length?p.confirmedDx.map(d=>`<span class="risk-flag pill-high">${d.icon} ${d.name}</span>`).join(''):'<span style="color:var(--faint);font-size:12px">—</span>';
    const vKey=`<div class="vital-snippet">${p.vitals.bpSys?`BP: ${p.vitals.bpSys}/${p.vitals.bpDia}<br/>`:''}${p.vitals.glucose?`Glu: ${p.vitals.glucose}<br/>`:''}${p.vitals.bmi?`BMI: ${p.vitals.bmi}`:''}`.replace(/<br\/>$/,'')+'</div>';
    return `<tr>
      <td style="font-family:'JetBrains Mono',monospace;font-size:11.5px;color:var(--muted)">${pts.length-i}</td>
      <td><div class="rec-name-cell">${p.name}</div><div class="rec-id">${p.patientId}</div></td>
      <td>${p.age}y · ${p.gender}</td>
      <td style="font-size:12.5px">${p.blood||'—'}</td>
      <td style="font-size:12px;color:var(--muted)">${p.phone||'—'}</td>
      <td>
        <div style="font-weight:600;font-size:12.5px">${p.assessedDate}</div>
        <div style="font-size:11px;color:var(--teal);font-family:'JetBrains Mono',monospace">${p.assessedTime}</div>
        <div style="font-size:11px;color:var(--faint)">${p.assessedBy||'—'}</div>
      </td>
      <td style="font-size:12px;color:var(--muted)">${p.refDoc||'—'}</td>
      <td>${vKey}</td>
      <td>${riskFlags}</td>
      <td>${testsHtml}</td>
      <td>${dxHtml}</td>
      <td><button class="btn-sm" onclick="openRecord('${p.patientId}')">View</button></td>
    </tr>`;
  }).join('');
}

function updateRecordsRibbon() {
  const pts=STORE.patients;
  const today=new Date().toDateString();
  animCount('rb-total',pts.length);
  animCount('rb-today',pts.filter(p=>new Date(p.assessedAt).toDateString()===today).length);
  animCount('rb-high',pts.filter(p=>p.diseases.some(d=>d.cls==='high')).length);
  animCount('rb-tests',pts.reduce((s,p)=>s+p.testsOrdered.length,0));
  animCount('rb-dx',pts.reduce((s,p)=>s+p.confirmedDx.length,0));
}

function filterRecords() {
  renderRecordsTable(document.getElementById('records-search').value);
}

function exportRecordsCSV() {
  const pts=STORE.patients;
  if(!pts.length){showToast('No records to export');return;}
  const header=['#','Patient ID','Name','Age','Gender','Blood Group','Phone','Assessment Date','Assessment Time','Assessed By','Referring Doctor','BP','Glucose','BMI','Cholesterol','HbA1c','Creatinine','HR','SpO2','Symptoms','Family History','Medications','Notes','Diabetes Risk','Heart Risk','Kidney Risk','Hypertension Risk','Thyroid Risk','Tests Ordered','Confirmed Dx'];
  const rows=pts.map((p,i)=>[
    pts.length-i, p.patientId, p.name, p.age, p.gender, p.blood, p.phone,
    p.assessedDate, p.assessedTime, p.assessedBy||'—', p.refDoc,
    (p.vitals.bpSys&&p.vitals.bpDia)?`${p.vitals.bpSys}/${p.vitals.bpDia}`:'',
    p.vitals.glucose||'', p.vitals.bmi||'', p.vitals.chol||'', p.vitals.hba1c||'', p.vitals.creatinine||'', p.vitals.hr||'', p.vitals.spo2||'',
    p.symptoms.join('; '), p.familyHistory.join('; '), p.meds, p.notes,
    ...DISEASES.map(id=>{ const d=p.diseases.find(dd=>dd.id===id); return d?`${d.score}% (${d.label})`:''; }),
    p.testsOrdered.map(t=>t.name).join('; '),
    p.confirmedDx.map(d=>d.name).join('; '),
  ]);
  const csv=[header,...rows].map(r=>r.map(c=>`"${String(c||'').replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob=new Blob([csv],{type:'text/csv'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=`ClinAI_Records_${new Date().toLocaleDateString('en-IN').replace(/\//g,'-')}.csv`; a.click();
  URL.revokeObjectURL(url);
  showToast('✅ CSV exported');
}

function openRecord(pid) {
  const p=STORE.patients.find(r=>r.patientId===pid); if(!p) return;
  document.getElementById('modal-title').textContent=p.name+' — Full Clinical Record';
  document.getElementById('modal-body').innerHTML=buildModalHTML(p);
  document.getElementById('modal-overlay').classList.add('open');
}
function closeModal() { document.getElementById('modal-overlay').classList.remove('open'); }

function buildModalHTML(p) {
  const bpStr=(p.vitals.bpSys&&p.vitals.bpDia)?`${p.vitals.bpSys}/${p.vitals.bpDia} mmHg`:'—';
  const vitals=[['Blood Pressure',bpStr],['Glucose',p.vitals.glucose?p.vitals.glucose+' mg/dL':'—'],['BMI',p.vitals.bmi||'—'],['Cholesterol',p.vitals.chol?p.vitals.chol+' mg/dL':'—'],['HbA1c',p.vitals.hba1c?p.vitals.hba1c+'%':'—'],['Creatinine',p.vitals.creatinine?p.vitals.creatinine+' mg/dL':'—'],['Heart Rate',p.vitals.hr?p.vitals.hr+' bpm':'—'],['SpO₂',p.vitals.spo2?p.vitals.spo2+'%':'—']];
  return `<div style="font-size:13px">
    <div class="report-section">Patient Information</div>
    <div class="report-row"><span class="rr-label">Patient ID</span><span class="rr-val">${p.patientId}</span></div>
    <div class="report-row"><span class="rr-label">Name</span><span class="rr-val">${p.name}</span></div>
    <div class="report-row"><span class="rr-label">Age / Gender</span><span class="rr-val">${p.age}y / ${p.gender}</span></div>
    <div class="report-row"><span class="rr-label">Blood Group</span><span class="rr-val">${p.blood||'—'}</span></div>
    <div class="report-row"><span class="rr-label">Contact</span><span class="rr-val">${p.phone||'—'}</span></div>
    <div class="report-row"><span class="rr-label">Assessed Date</span><span class="rr-val" style="color:var(--teal)">${p.assessedDate} at ${p.assessedTime}</span></div>
    <div class="report-row"><span class="rr-label">Assessed By</span><span class="rr-val">${p.assessedBy||'—'}</span></div>
    <div class="report-row"><span class="rr-label">Referring Doctor</span><span class="rr-val">${p.refDoc||'—'}</span></div>
    <div class="report-section">Vitals</div>
    ${vitals.map(([l,v])=>`<div class="report-row"><span class="rr-label">${l}</span><span class="rr-val">${v}</span></div>`).join('')}
    <div class="report-section">Risk Assessment</div>
    ${p.diseases.map(d=>`<div class="report-risk-row"><span>${d.icon} ${d.name}</span><span class="risk-pill pill-${d.cls}">${d.score}% — ${d.label}</span></div>`).join('')}
    <div class="report-section">Tests Ordered</div>
    ${p.testsOrdered.length?p.testsOrdered.map(t=>`<div style="padding:4px 0;font-size:12.5px;color:var(--muted)">🧪 ${t.name} <span style="font-size:11px;color:var(--faint)">— ${fmtDT(t.orderedAt)}</span></div>`).join(''):'<p style="color:var(--faint);font-size:12px">No tests ordered yet</p>'}
    <div class="report-section">Confirmed Diagnoses (Auto-recorded)</div>
    ${p.confirmedDx.length?p.confirmedDx.map(d=>`<div style="padding:4px 0;font-size:12.5px;color:var(--rose)">${d.icon} ${d.name} — ${fmtDT(d.recordedAt)}</div>`).join(''):'<p style="color:var(--faint);font-size:12px">No high-risk diagnoses confirmed</p>'}
    ${p.symptoms.length?`<div class="report-section">Symptoms</div><div style="font-size:12.5px;color:var(--muted)">${p.symptoms.join(', ')}</div>`:''}
    ${p.meds?`<div class="report-section">Medications</div><div style="font-size:12.5px;color:var(--muted)">${p.meds}</div>`:''}
    ${p.notes?`<div class="report-section">Notes</div><div style="font-size:12.5px;color:var(--muted)">${p.notes}</div>`:''}
  </div>`;
}

// ══════════════════════════════════════════════
//  DOCTORS
// ══════════════════════════════════════════════
function renderDoctors(filter) {
  const grid=document.getElementById('doctors-grid'); if(!grid) return;
  const docs=filter==='all'?DOCTORS:DOCTORS.filter(d=>d.dept===filter);
  const aCls={available:'avail-available',morning:'avail-morning',afternoon:'avail-afternoon',unavailable:'avail-unavailable'};
  const aIco={available:'🟢',morning:'🌅',afternoon:'🌇',unavailable:'🔴'};
  grid.innerHTML=docs.map(d=>`
    <div class="doctor-card" data-dept="${d.dept}">
      <div class="dc-header">
        <div class="dc-avatar" style="background:${d.colorBg};border-color:${d.color};color:${d.color}">${d.initials}</div>
        <div>
          <div class="dc-name">${d.name}</div>
          <div class="dc-role" style="color:${d.color}">${d.role}</div>
          <div class="dc-dept">${d.deptLabel}</div>
        </div>
      </div>
      <div class="dc-avail-badge ${aCls[d.availability]}">${aIco[d.availability]} ${d.availLabel}</div>
      <div class="dc-info-row"><span class="dc-info-icon">🎓</span><span class="dc-info-val">${d.qual}</span></div>
      <div class="dc-info-row"><span class="dc-info-icon">⏱️</span><span class="dc-info-val">${d.exp} experience</span></div>
      <div class="dc-info-row"><span class="dc-info-icon">📍</span><span class="dc-info-val">${d.room}<br/><span style="color:var(--faint);font-size:11px">${d.floor}</span></span></div>
      <div class="dc-info-row"><span class="dc-info-icon">📞</span><span class="dc-info-val">${d.phone}</span></div>
      <div class="dc-info-row"><span class="dc-info-icon">⭐</span><span class="dc-info-val" style="font-size:11.5px">${d.specialties.join(' · ')}</span></div>
      <div class="dc-session-box">
        <div class="dc-session-label">Today's Sessions</div>
        ${d.sessions.map(s=>`<div class="dc-session-row"><span>${s.label}</span><span class="session-time">${s.time}</span><span class="session-slots">${s.slots}</span></div>`).join('')}
      </div>
    </div>`).join('');
}

function filterDept(dept,btn) {
  document.querySelectorAll('.dept-tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  renderDoctors(dept);
}

// ══════════════════════════════════════════════
//  REPORT
// ══════════════════════════════════════════════
function generateAndShowReport() {
  if(!currentAnalysis){showToast('⚠ Run analysis first');return;}
  const r=currentAnalysis,p=r.patient;
  const now=new Date();
  const ds=now.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const ts=now.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
  const reportId='RPT-'+Date.now().toString(36).toUpperCase();
  const bpStr=(p.bpSys&&p.bpDia)?`${p.bpSys}/${p.bpDia} mmHg`:'—';
  const elevated=r.diseases.filter(d=>d.cls!=='low');
  const confirmed=r.diseases.filter(d=>d.cls==='high');
  const riskRows=r.diseases.map(d=>`<div class="report-risk-row"><span>${d.icon} ${d.name}</span><div style="display:flex;align-items:center;gap:10px"><div style="width:100px;height:5px;background:rgba(255,255,255,0.07);border-radius:3px;overflow:hidden"><div style="height:100%;width:${d.score}%;background:${d.cls==='high'?'var(--rose)':d.cls==='mod'?'var(--amber)':'var(--green)'};border-radius:3px"></div></div><span style="font-family:'JetBrains Mono',monospace;font-size:12px">${d.score}%</span><span class="risk-pill pill-${d.cls}">${d.label}</span></div></div>`).join('');
  const xaiItems=r.factors.map(f=>`<div style="padding:4px 0 4px 8px;font-size:12px;color:${f.level==='high'?'var(--rose)':f.level==='mod'?'var(--amber)':'var(--muted)'}">${f.icon} <strong>${f.label}</strong> — ${f.detail}</div>`).join('');
  const testSec=elevated.map(d=>`<div style="margin-bottom:10px"><div style="font-size:11px;font-weight:700;color:var(--teal);text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px">${DISEASE_META[d.id].icon} ${d.name}</div>${TEST_MAP[d.id].map(t=>`<div style="padding:3px 0;font-size:12px;color:var(--muted)">• ${t}</div>`).join('')}</div>`).join('')||'<p style="color:var(--faint);font-size:12px">No specific tests required.</p>';
  const specSec=[...new Set(elevated.map(d=>SPECIALIST_MAP[d.id]))].map(deptId=>{const doc=DOCTORS.find(d=>d.dept===deptId&&d.today)||DOCTORS.find(d=>d.dept===deptId);return doc?`<div style="padding:5px 0;font-size:12.5px"><strong>${doc.name}</strong> — <span style="color:var(--muted)">${doc.role}</span><br/><span style="font-size:11px;color:var(--faint)">📍 ${doc.room} · ${doc.phone}</span></div>`:''}).join('')||'<p style="color:var(--faint);font-size:12px">No specialist referral required.</p>';
  const confirmedSec=confirmed.length?confirmed.map(d=>`<div style="color:var(--rose);font-size:12.5px;padding:3px 0">${d.icon} ${d.name} — High Risk (Auto-recorded at ${ts})</div>`).join(''):'<p style="color:var(--faint);font-size:12px">No high-risk diagnoses confirmed.</p>';

  document.getElementById('report-area').innerHTML=`<div class="report-doc">
    <div class="report-top">
      <div class="rt-logo"><span style="font-size:36px">🏥</span><div><div class="rt-hosp-name">ClinAI Clinical Decision Support System</div><div class="rt-tagline">Explainable AI Based Multi-Disease Prediction Platform</div></div></div>
      <div class="rt-meta"><div>${ds}</div><div>${ts}</div><div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--teal);margin-top:4px">${reportId}</div><div style="margin-top:6px;padding:3px 10px;border:1px solid var(--teal);border-radius:4px;font-size:10px;color:var(--teal);text-align:center">CONFIDENTIAL</div></div>
    </div>
    <div class="report-section">Patient Information</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 24px">
      <div class="report-row"><span class="rr-label">Patient Name</span><span class="rr-val">${p.name}</span></div>
      <div class="report-row"><span class="rr-label">Patient ID</span><span class="rr-val">${p.id}</span></div>
      <div class="report-row"><span class="rr-label">Age / Gender</span><span class="rr-val">${p.age}y / ${p.gender}</span></div>
      <div class="report-row"><span class="rr-label">Blood Group</span><span class="rr-val">${p.blood}</span></div>
      <div class="report-row"><span class="rr-label">Contact</span><span class="rr-val">${p.phone}</span></div>
      <div class="report-row"><span class="rr-label">Referring Doctor</span><span class="rr-val">${p.refDoc}</span></div>
      <div class="report-row"><span class="rr-label">Blood Pressure</span><span class="rr-val">${bpStr}</span></div>
      <div class="report-row"><span class="rr-label">Fasting Glucose</span><span class="rr-val">${p.glucose||'—'} mg/dL</span></div>
      <div class="report-row"><span class="rr-label">BMI</span><span class="rr-val">${p.bmi||'—'} kg/m²</span></div>
      <div class="report-row"><span class="rr-label">Cholesterol</span><span class="rr-val">${p.chol||'—'} mg/dL</span></div>
      <div class="report-row"><span class="rr-label">HbA1c</span><span class="rr-val">${p.hba1c||'—'}%</span></div>
      <div class="report-row"><span class="rr-label">Creatinine</span><span class="rr-val">${p.creatinine||'—'} mg/dL</span></div>
      <div class="report-row" style="grid-column:1/-1"><span class="rr-label">Assessed By</span><span class="rr-val">${p.assessedByDoctor||'—'} at ${ts} on ${ds}</span></div>
      <div class="report-row" style="grid-column:1/-1"><span class="rr-label">Symptoms</span><span class="rr-val">${p.symptoms.length?p.symptoms.join(', '):'None'}</span></div>
    </div>
    <div class="report-section">Multi-Disease Risk Assessment (AI)</div>${riskRows}
    <div class="report-section">Confirmed High-Risk Diagnoses (Auto-Recorded)</div>${confirmedSec}
    <div class="report-section">Explainable AI — Contributing Factors</div>
    <div style="background:rgba(255,255,255,0.03);border-radius:10px;padding:12px">${xaiItems||'<p style="color:var(--faint);font-size:12px">No significant factors.</p>'}</div>
    <div class="report-section">Recommended Diagnostic Tests</div>${testSec}
    <div class="report-section">Specialist Referrals</div>${specSec}
    <div class="report-footer">
      <p>⚠ This report is generated by an AI-based Clinical Decision Support System and is for physician reference only.</p>
      <p>ClinAI CDSS v2.0 · ${reportId} · Generated ${ds} at ${ts} · ${CURRENT_DOCTOR?.name||'—'}</p>
    </div>
  </div>`;
  showSection('report',document.querySelector('[data-section=report]'));
  showToast('✅ Report generated');
}

function downloadReportPDF() {
  if(!currentAnalysis){showToast('⚠ Generate a report first');return;}
  try{localStorage.setItem('clinai_report',JSON.stringify(currentAnalysis));}catch(e){}
  const win=window.open('report.html','_blank');
  if(!win) showToast('Allow popups to open the report');
}

// ══════════════════════════════════════════════
//  UTILITIES
// ══════════════════════════════════════════════
function fmtDT(iso) {
  try {
    const d=new Date(iso);
    return d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})+' '+d.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  } catch(e){return '—';}
}
function initials(name) { return name.split(' ').filter(Boolean).slice(0,2).map(n=>n[0].toUpperCase()).join(''); }
function animCount(id,target) {
  const el=document.getElementById(id); if(!el) return;
  const start=parseInt(el.textContent)||0;
  if(start===target) return;
  let cur=start; const step=(target-start)/40;
  const t=setInterval(()=>{cur+=step;if((step>0&&cur>=target)||(step<0&&cur<=target)){el.textContent=target;clearInterval(t);}else{el.textContent=Math.round(cur);}},18);
}
function showToast(msg) {
  const t=document.getElementById('toast'); if(!t) return;
  t.textContent=msg; t.classList.add('show');
  clearTimeout(t._tid); t._tid=setTimeout(()=>t.classList.remove('show'),3000);
}

// ══════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded',()=>{
  initSession();
  updateClock();
  setInterval(updateClock,1000);
  refreshDashboard();
  renderDoctors('all');
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal();closeLogoutModal();}});
  document.querySelectorAll('.sym-card').forEach(card=>{
    card.setAttribute('tabindex','0');
    card.addEventListener('keydown',e=>{
      if(e.key===' '||e.key==='Enter'){e.preventDefault();const cb=card.querySelector('input');cb.checked=!cb.checked;toggleSym(cb);}
    });
  });
  document.getElementById('main-content')?.addEventListener('click',()=>{
    const sb=document.getElementById('sidebar'); if(sb.classList.contains('open')) sb.classList.remove('open');
  });
});
