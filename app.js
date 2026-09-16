const SUPABASE_URL = 'https://gcitjmdiklpjadynwtoa.supabase.co/';
const SUPABASE_KEY = 'sb_publishable_kZVY1DPvAZ4yoG60EAUNOw_iOCNnssL';

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

async function testSupabase() {
  const { data, error } = await db
    .from('products')
    .select('*');

  console.log('Products:', data);
  console.log('Error:', error);
}

testSupabase();

const DEFAULT_PRODUCTS=[["Прайм год","Прайм год",.50,"fixed"],["Прайм мес","Прайм мес — новая подписка",.25,"fixed"],["Прайм мес","Прайм мес — переход с текущей",.20,"fixed"],["Кк","Кредитная карта",.88,"fixed"],["ЗЛС","ЗЛС",null,"zls"],["Зд","СберЗдоровье",.37,"health"],["Зд","Опции 1100",.11,"health_option"],["Зд","Опции 2200",.22,"health_option"],["Право","СберПраво",null,"unknown"],["Колонка","Колонка SberBoom mini",.25,"fixed"],["Тонометр","Тонометр",.15,"fixed"],["Свое дело","«Свое дело»",.22,"fixed"],["ПДС","ПДС",1.02,"fixed"],["ОПС","Внутренний перевод",.43,"fixed"],["ОПС","Внешний перевод",1.20,"fixed"],["Пенс","Перевод пенсии",.62,"fixed"],["Премьер","СберПремьер",.20,"fixed"],["ЮЛ","ИП с QR",1.60,"fixed"],["ЮЛ","ИП без QR",1.30,"fixed"],["ЮЛ","ООО",1.30,"fixed"],["ЮЛ","Зарплатный проект",1.75,"fixed"],["ЮЛ","Регистрация ИП/ООО",.67,"fixed"],["ЮЛ","Токен",.65,"fixed"],["Гч","Госключ",.10,"fixed"],["Сим","Новый номер",.20,"fixed"],["Сим","Переход со своим",.55,"fixed"],["Сим","SIM по заказу",.10,"fixed"],["Обновление тарифа","Обновление тарифа",.25,"fixed"]].map((x,i)=>({id:String(i+1),category:x[0],name:x[1],shortName:x[1],unit_price:x[2],price_rule:x[3],active:true}));
async function loadProducts() {
  const { data, error } = await db
    .from('products')
    .select('*')
    .eq('status', 'active')
    .order('id');

  if (error) {
    console.error('Ошибка загрузки products:', error);
    products = DEFAULT_PRODUCTS;
    return;
  }

  products = data.map(p => ({
    id: String(p.id),
    category: p.category,
    name: p.name,
    shortName: p.short_name || p.name,
    unit_price: p.unit_price,
    price_rule: p.price_rule,
    active: p.status === 'active'
  }));

  console.log('Товары из Supabase:', products);
}
let products=[],sales=new Map();
const money=n=>Number(n||0).toFixed(2).replace(".",",");
function zlsUp(a){if(a<1000)return .08;if(a<3000)return .25;return .35+.10*Math.floor((a-3000)/1000)}
function groups(ps){return ps.reduce((m,p)=>{(m[p.category]??=[]).push(p);return m},{})}
async function loadProducts(){
  const { data, error } = await db
    .from('products')
    .select('*')
    .eq('status', 'active')
    .order('id');

  if (error) {
    console.error('Ошибка загрузки products:', error);
    products = structuredClone(DEFAULT_PRODUCTS);
    return;
  }

  products = data.map(p => ({
    id: String(p.id),
    category: p.category,
    name: p.name,
    shortName: p.short_name || p.name,
    unit_price: p.unit_price,
    price_rule: p.price_rule,
    active: p.status === 'active'
  }));

  console.log('Товары из Supabase:', products);
}function saveProducts(){localStorage.setItem("sales_mvp_products",JSON.stringify(products))}
function loadSales(){try{sales=new Map(JSON.parse(localStorage.getItem("sales_mvp_operations")||"[]").map(([id,v])=>[String(id),v]))}catch{sales=new Map()}}
function saveSales(){localStorage.setItem("sales_mvp_operations",JSON.stringify([...sales]))}
function addSale(p,amount,up){const v=sales.get(p.id)||{sales:[]};v.sales.push({saleAmount:amount,up:Number(up||0),createdAt:new Date().toISOString()});sales.set(p.id,v);saveSales();renderSales()}
function removeLast(p){const v=sales.get(p.id);if(!v?.sales.length)return;v.sales.pop();v.sales.length?sales.set(p.id,v):sales.delete(p.id);saveSales();renderSales()}
function change(p,d){if(p.price_rule==="unknown"){alert("Для СберПраво пока не указана цена.");return}if(d<0){removeLast(p);return}if(p.price_rule==="zls"){const raw=prompt("Введите сумму ЗЛС в рублях:");if(raw===null)return;const a=Number(String(raw).replace(",","."));if(!Number.isFinite(a)||a<=0){alert("Введите корректную сумму.");return}addSale(p,a,zlsUp(a));return}addSale(p,null,p.unit_price)}
function renderSales(){const box=document.querySelector("#categories");box.innerHTML="";for(const[cat,items]of Object.entries(groups(products))){const wrap=document.createElement("div");wrap.className="category";const head=document.createElement("div");head.className="category-head";const q=items.reduce((n,p)=>n+(sales.get(p.id)?.sales.length||0),0);head.innerHTML=`<span class="category-name">${cat}</span><span class="category-total">${q?q+" продаж":""}</span>`;wrap.append(head);for(const p of items.filter(x=>x.active)){const v=sales.get(p.id)||{sales:[]},row=document.createElement("div");row.className="product-row";row.innerHTML=`<div class="product-info"><span>${p.name}</span>${p.unit_price==null?"":`<small>${money(p.unit_price)} УП</small>`}</div><div class="stepper"><button>−</button><span class="qty">${v.sales.length}</span><button>+</button></div>`;row.querySelectorAll("button")[0].onclick=()=>change(p,-1);row.querySelectorAll("button")[1].onclick=()=>change(p,1);wrap.append(row)}box.append(wrap)}updateReport()}
function updateReport(){let qty=0,up=0;sales.forEach(v=>v.sales.forEach(s=>{qty++;up+=s.up}));document.querySelector("#totalQty").textContent=qty;document.querySelector("#totalUp").textContent=money(up);const report=document.querySelector("#report");report.innerHTML="";let has=false;for(const[cat,items]of Object.entries(groups(products))){const active=items.filter(p=>(sales.get(p.id)?.sales.length||0)>0);if(!active.length)continue;has=true;const multi=active.length>1;const catQty=active.reduce((n,p)=>n+sales.get(p.id).sales.length,0),catUp=active.reduce((n,p)=>n+sales.get(p.id).sales.reduce((s,x)=>s+x.up,0),0);if(multi){const h=document.createElement("div");h.className="report-row";h.innerHTML=`<strong>${cat}</strong><strong>${catQty} — ${money(catUp)} УП</strong>`;report.append(h)}for(const p of active){const v=sales.get(p.id),u=v.sales.reduce((s,x)=>s+x.up,0),r=document.createElement("div");r.className="report-row"+(multi?" report-sub":"");if(p.price_rule==="zls")r.innerHTML=`<span>ЗЛС: ${v.sales.map((s,i)=>`${i+1} (${Number(s.saleAmount).toLocaleString("ru-RU")})`).join(", ")}</span><strong>${money(u)} УП</strong>`;else r.innerHTML=`<span>${p.shortName||p.name}</span><strong>${v.sales.length} — ${money(u)} УП</strong>`;report.append(r)}}if(!has)report.innerHTML='<div class="empty">Пока нет продаж.</div>';const t=document.createElement("div");t.className="report-row report-total";t.innerHTML=`<span>ВСЕГО УП</span><span>${money(up)}</span>`;report.append(t)}
function renderSettings(){const list=document.querySelector("#productList");list.innerHTML="";for(const p of products){const e=document.createElement("div");e.className="admin-item";e.innerHTML=`<div><strong>${p.category} — ${p.name}</strong><div class="admin-meta">${p.unit_price==null?"спец. расчёт":money(p.unit_price)+" УП"} · ${p.price_rule}</div></div><button class="edit-btn">Изменить</button>`;e.querySelector("button").onclick=()=>editProduct(p.id);list.append(e)}}
function editProduct(id){const p=products.find(x=>x.id===id);if(!p)return;editId.value=p.id;category.value=p.category;name.value=p.name;shortName.value=p.shortName||"";price.value=p.unit_price??"";rule.value=p.price_rule;cancelEdit.classList.remove("hidden");window.scrollTo({top:0,behavior:"smooth"})}
function resetForm(){productForm.reset();editId.value="";cancelEdit.classList.add("hidden");rule.value="fixed"}
productForm.onsubmit = async e => {
  e.preventDefault();

  const id = editId.value;

  const p = {
    category: category.value.trim(),
    name: name.value.trim(),
    short_name: shortName.value.trim() || name.value.trim(),
    unit_price: price.value === "" ? null : Number(price.value),
    price_rule: rule.value,
    status: "active"
  };

  if (id) {
    const { data, error } = await db
      .from("products")
      .update(p)
      .eq("id", Number(id))
      .select()
      .single();

    if (error) {
      console.error("Ошибка сохранения:", error);
      alert("Не удалось сохранить изменения.");
      return;
    }

    products = products.map(x =>
      x.id === String(data.id)
        ? {
            id: String(data.id),
            category: data.category,
            name: data.name,
            shortName: data.short_name || data.name,
            unit_price: data.unit_price,
            price_rule: data.price_rule,
            active: data.status === "active"
          }
        : x
    );
  }

  resetForm();
  renderSettings();
  renderSales();
};cancelEdit.onclick=resetForm;
resetSalesBtn.onclick = () => {
  const ok = confirm(
    "Сбросить все введённые продажи за сегодня?"
  );

  if (!ok) return;

  sales = new Map();
  saveSales();
  renderSales();
};
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");salesPage.classList.toggle("hidden",b.dataset.page!=="salesPage");settingsPage.classList.toggle("hidden",b.dataset.page!=="settingsPage");if(b.dataset.page==="settingsPage")renderSettings()});
settingsBtn.onclick=()=>document.querySelector('[data-page="settingsPage"]').click();
today.textContent=new Date().toLocaleDateString("ru-RU",{day:"numeric",month:"long",year:"numeric"});
loadSales();

loadProducts().then(() => {
  renderSales();
});
