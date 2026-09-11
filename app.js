const PRODUCTS=[
["Прайм год","Прайм год",.50,"fixed"],["Прайм мес","Прайм мес — новая подписка",.25,"fixed"],["Прайм мес","Прайм мес — переход с текущей",.20,"fixed"],
["Кк","Кредитная карта",.88,"fixed"],["ЗЛС","ЗЛС",null,"zls"],["Зд","СберЗдоровье",.37,"health"],["Зд","Опции 1100",.11,"health_option"],["Зд","Опции 2200",.22,"health_option"],
["Право","СберПраво",null,"unknown"],["Колонка","Колонка SberBoom mini",.25,"fixed"],["Тонометр","Тонометр",.15,"fixed"],["Свое дело","«Свое дело»",.22,"fixed"],
["ПДС","ПДС",1.02,"fixed"],["ОПС","Внутренний перевод",.43,"fixed"],["ОПС","Внешний перевод",1.20,"fixed"],["Пенс","Перевод пенсии",.62,"fixed"],
["Премьер","СберПремьер",.20,"fixed"],["ЮЛ","ИП с QR",1.60,"fixed"],["ЮЛ","ИП без QR",1.30,"fixed"],["ЮЛ","ООО",1.30,"fixed"],
["ЮЛ","Зарплатный проект",1.75,"fixed"],["ЮЛ","Регистрация ИП/ООО",.67,"fixed"],["ЮЛ","Токен",.65,"fixed"],
["Гч","Госключ",.10,"fixed"],["Сим","Новый номер",.20,"fixed"],["Сим","Переход со своим",.55,"fixed"],["Сим","SIM по заказу",.10,"fixed"],
["Обновление тарифа","Обновление тарифа",.25,"fixed"]
].map((x,i)=>({id:i+1,category:x[0],name:x[1],unit_price:x[2],price_rule:x[3]}));

const counts=new Map();
const money=n=>Number(n||0).toFixed(2).replace(".",",");
document.querySelector("#today").textContent=new Date().toLocaleDateString("ru-RU",{day:"numeric",month:"long",year:"numeric"});

function zlsUp(a){if(a<1000)return .08;if(a<3000)return .25;return .35+.10*Math.floor((a-3000)/1000)}
function groups(ps){return ps.reduce((m,p)=>{(m[p.category]??=[]).push(p);return m},{})}

function render(ps){
 const box=document.querySelector("#categories");box.innerHTML="";
 for(const [cat,items] of Object.entries(groups(ps))){
  const wrap=document.createElement("div");wrap.className="category";
  const head=document.createElement("div");head.className="category-head";
  head.innerHTML=`<span class="category-name">${cat}</span><span class="category-total" data-cat="${cat}"></span>`;wrap.append(head);
  for(const p of items){
   const v=counts.get(p.id)||{sales:[]},row=document.createElement("div");row.className="product-row";
   const price=p.unit_price==null?"":`<small>${money(p.unit_price)} у.е.</small>`;
   row.innerHTML=`<div class="product-info"><span>${p.name}</span>${price}</div><div class="stepper"><button>−</button><span class="qty">${v.sales.length}</span><button>+</button></div>`;
   row.querySelectorAll("button")[0].onclick=()=>change(p,-1);row.querySelectorAll("button")[1].onclick=()=>change(p,1);wrap.append(row);
  } box.append(wrap);
 }
 updateReport(ps);
}

async function change(p,d){
 if(p.price_rule==="unknown"){alert("Для СберПраво цена пока не указана.");return}
 if(d<0){removeLast(p);return}
 if(p.price_rule==="zls"){
  const raw=prompt("Введите сумму ЗЛС в рублях:");if(raw===null)return;
  const a=Number(String(raw).replace(",","."));if(!Number.isFinite(a)||a<=0){alert("Введите корректную сумму.");return}
  addSale(p,a,zlsUp(a));return
 }
 if(p.price_rule==="health"){addSale(p,null,.37);return}
 addSale(p,null,p.unit_price)
}
function addSale(p,amount,up){
 const v=counts.get(p.id)||{sales:[]};
 v.sales.push({saleAmount:amount,up:Number(up||0),createdAt:new Date().toISOString()});
 counts.set(p.id,v);save();render(PRODUCTS)
}
function removeLast(p){
 const v=counts.get(p.id);if(!v?.sales.length)return;
 v.sales.pop();if(v.sales.length)counts.set(p.id,v);else counts.delete(p.id);save();render(PRODUCTS)
}
function save(){localStorage.setItem("sales_mvp_operations",JSON.stringify([...counts]))}
function load(){
 try{for(const [id,v] of JSON.parse(localStorage.getItem("sales_mvp_operations")||"[]"))counts.set(Number(id),v)}catch{}
 render(PRODUCTS)
}
function updateReport(ps){
 let qty=0,up=0;counts.forEach(v=>v.sales.forEach(s=>{qty++;up+=s.up}));
 document.querySelector("#totalQty").textContent=qty;document.querySelector("#totalUp").textContent=money(up);
 const report=document.querySelector("#report");report.innerHTML="";let has=false;
 for(const [cat,items] of Object.entries(groups(ps))){
  const active=items.filter(p=>(counts.get(p.id)?.sales.length||0)>0);if(!active.length)continue;has=true;
  const catQty=active.reduce((n,p)=>n+counts.get(p.id).sales.length,0),catUp=active.reduce((n,p)=>n+counts.get(p.id).sales.reduce((s,x)=>s+x.up,0),0);
  const h=document.createElement("div");h.className="report-row";h.innerHTML=`<strong>${cat}</strong><strong>${catQty} — ${money(catUp)} УП</strong>`;report.append(h);
  for(const p of active){
   const v=counts.get(p.id),r=document.createElement("div");r.className="report-row report-sub";
   if(p.price_rule==="zls"){
    r.innerHTML=`<span>ЗЛС: ${v.sales.map((s,i)=>`${i+1} (${formatAmount(s.saleAmount)})`).join(", ")}</span><strong>${money(v.sales.reduce((s,x)=>s+x.up,0))} УП</strong>`;
   }else{
    r.innerHTML=`<span>${p.name}</span><strong>${v.sales.length} — ${money(v.sales.reduce((s,x)=>s+x.up,0))} УП</strong>`;
   }
   report.append(r);
  }
 }
 if(!has)report.innerHTML='<div class="empty">Пока нет продаж.</div>';
 const total=document.createElement("div");total.className="report-row report-total";total.innerHTML=`<span>ВСЕГО УП</span><span>${money(up)}</span>`;report.append(total)
}
function formatAmount(v){return v==null?"":Number(v).toLocaleString("ru-RU")}
document.querySelector("#refreshBtn").onclick=load;load();