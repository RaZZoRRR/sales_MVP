import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// Вставьте сюда значения из Supabase Project Settings -> API.
const SUPABASE_URL = "";
const SUPABASE_ANON_KEY = "";

const DEMO_PRODUCTS = [
  ["Прайм год","Прайм год",0.50,"fixed"],
  ["Прайм мес","Прайм мес — новая подписка",0.25,"fixed"],
  ["Прайм мес","Прайм мес — переход с текущей",0.20,"fixed"],
  ["Кк","Кредитная карта",0.88,"fixed"],
  ["ЗЛС","ЗЛС",null,"zls"],
  ["Зд","СберЗдоровье",0.37,"health"],
  ["Зд","Опции 1100",0.11,"health_option"],
  ["Зд","Опции 2200",0.22,"health_option"],
  ["Право","СберПраво",null,"unknown"],
  ["Колонка","Колонка SberBoom mini",0.25,"fixed"],
  ["Тонометр","Тонометр",0.15,"fixed"],
  ["Свое дело","«Свое дело»",0.22,"fixed"],
  ["ПДС","ПДС",1.02,"fixed"],
  ["ОПС","Внутренний перевод",0.43,"fixed"],
  ["ОПС","Внешний перевод",1.20,"fixed"],
  ["Пенс","Перевод пенсии",0.62,"fixed"],
  ["Премьер","СберПремьер",0.20,"fixed"],
  ["ЮЛ","ИП с QR",1.60,"fixed"],
  ["ЮЛ","ИП без QR",1.30,"fixed"],
  ["ЮЛ","ООО",1.30,"fixed"],
  ["ЮЛ","Зарплатный проект",1.75,"fixed"],
  ["ЮЛ","Регистрация ИП/ООО",0.67,"fixed"],
  ["ЮЛ","Токен",0.65,"fixed"],
  ["Гч","Госключ",0.10,"fixed"],
  ["Сим","Новый номер",0.20,"fixed"],
  ["Сим","Переход со своим",0.55,"fixed"],
  ["Сим","SIM по заказу",0.10,"fixed"],
  ["Обновление тарифа","Обновление тарифа",0.25,"fixed"]
].map((x,i)=>({id:i+1,category:x[0],name:x[1],unit_price:x[2],price_rule:x[3]}));

const configured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const supabase = configured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const counts = new Map();

const todayKey = () => new Date().toISOString().slice(0,10);
const money = n => Number(n || 0).toFixed(2).replace(".", ",");
document.querySelector("#today").textContent = new Date().toLocaleDateString("ru-RU",{day:"numeric",month:"long",year:"numeric"});

function zlsUp(amount){
  if(amount < 1000) return 0.08;
  if(amount < 3000) return 0.25;
  return 0.35 + 0.10 * Math.floor((amount - 3000) / 1000);
}

function groups(products){
  return products.reduce((m,p)=>{
    (m[p.category] ||= []).push(p);
    return m;
  },{});
}

function render(products){
  const box=document.querySelector("#categories");
  box.innerHTML="";
  const g=groups(products);
  Object.entries(g).forEach(([cat,items])=>{
    const wrap=document.createElement("div");
    wrap.className="category";
    const head=document.createElement("div");
    head.className="category-head";
    head.innerHTML=`<span class="category-name">${cat}</span><span class="category-total" data-cat="${cat}">0</span>`;
    wrap.appendChild(head);
    items.forEach(p=>{
      const row=document.createElement("div");
      row.className="product-row";
      const value=counts.get(p.id)?.qty || 0;
      const price=p.unit_price==null?"":`<small>${money(p.unit_price)} у.е.</small>`;
      row.innerHTML=`<div class="product-info"><span>${p.name}</span>${price}</div>
        <div class="stepper">
          <button data-action="minus">−</button><span class="qty">${value}</span><button data-action="plus">+</button>
        </div>`;
      row.querySelector('[data-action="minus"]').onclick=()=>change(p,-1);
      row.querySelector('[data-action="plus"]').onclick=()=>change(p,1);
      wrap.appendChild(row);
    });
    box.appendChild(wrap);
  });
  updateSummary(products);
}

async function change(p,delta){
  if(p.price_rule==="unknown"){
    alert("Для СберПраво цена пока не указана в исходном документе.");
    return;
  }
  if(p.price_rule==="zls"){
    const raw=prompt("Введите сумму ЗЛС в рублях:");
    if(raw===null)return;
    const amount=Number(String(raw).replace(",","."));
    if(!Number.isFinite(amount)||amount<=0){alert("Введите корректную сумму.");return;}
    const up=zlsUp(amount);
    if(delta<0){return;}
    await addSale(p,1,up);
    return;
  }
  if(p.price_rule==="health"){
    await addSale(p,1,0.37);
    return;
  }
  if(p.price_rule==="health_option"){
    await addSale(p,1,p.unit_price);
    return;
  }
  if(delta>0) await addSale(p,1,p.unit_price);
  else {
    const current=counts.get(p.id)?.qty || 0;
    if(current<=0)return;
    counts.set(p.id,{qty:current-1,up:(counts.get(p.id).up||0)-Number(p.unit_price||0)});
    await persistLocal();
    render(DEMO_PRODUCTS);
  }
}

async function addSale(p,qty,up){
  const current=counts.get(p.id)||{qty:0,up:0};
  counts.set(p.id,{qty:current.qty+qty,up:current.up+up});
  if(configured){
    const {error}=await supabase.from("sales").insert({
      product_id:p.id,quantity:qty,unit_price_at_sale:up,sale_date:todayKey()
    });
    if(error) alert("Не удалось сохранить продажу: "+error.message);
  } else {
    await persistLocal();
  }
  render(DEMO_PRODUCTS);
}

async function persistLocal(){
  localStorage.setItem("sales_mvp_counts",JSON.stringify([...counts.entries()]));
}

async function load(){
  document.querySelector("#configWarning").classList.toggle("hidden",configured);
  if(configured){
    const {data:products,error}=await supabase.from("products").select("*").eq("active",true).order("category").order("name");
    if(error){alert(error.message);render(DEMO_PRODUCTS);return;}
    const {data:sales,error:e2}=await supabase.from("sales").select("product_id,quantity,unit_price_at_sale").eq("sale_date",todayKey());
    if(e2){alert(e2.message);render(products);return;}
    counts.clear();
    (sales||[]).forEach(s=>{
      const x=counts.get(s.product_id)||{qty:0,up:0};
      x.qty+=s.quantity; x.up+=Number(s.unit_price_at_sale||0)*s.quantity;
      counts.set(s.product_id,x);
    });
    render(products);
  } else {
    counts.clear();
    try{JSON.parse(localStorage.getItem("sales_mvp_counts")||"[]").forEach(([id,v])=>counts.set(Number(id),v));}catch{}
    render(DEMO_PRODUCTS);
  }
}

function updateSummary(products){
  let qty=0,up=0;
  counts.forEach(v=>{qty+=v.qty;up+=v.up});
  document.querySelector("#totalQty").textContent=qty;
  document.querySelector("#totalUp").textContent=money(up);
  document.querySelectorAll("[data-cat]").forEach(el=>{
    const cat=el.dataset.cat;
    let q=0;
    (groups(products)[cat]||[]).forEach(p=>q+=counts.get(p.id)?.qty||0);
    el.textContent=q ? `${q} продаж` : "";
  });
  const report=document.querySelector("#report");
  report.innerHTML="";
  let has=false;
  Object.entries(groups(products)).forEach(([cat,items])=>{
    const active=items.filter(p=>(counts.get(p.id)?.qty||0)>0);
    if(!active.length)return;
    has=true;
    const catRow=document.createElement("div");
    catRow.className="report-row";
    catRow.innerHTML=`<strong>${cat}</strong><strong>${active.reduce((s,p)=>s+(counts.get(p.id)?.qty||0),0)}</strong>`;
    report.appendChild(catRow);
    active.forEach(p=>{
      const v=counts.get(p.id);
      const r=document.createElement("div");r.className="report-row report-sub";
      r.innerHTML=`<span>${p.name}</span><span>${v.qty}</span>`;
      report.appendChild(r);
    });
  });
  if(!has) report.innerHTML='<div class="empty">Пока нет продаж.</div>';
  const total=document.createElement("div");total.className="report-row report-total";
  total.innerHTML=`<span>УП</span><span>${money(up)}</span>`;
  report.appendChild(total);
}

document.querySelector("#refreshBtn").onclick=load;
load();
