import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const uid = () => Math.random().toString(36).slice(2, 9);
const fR = v => `R$ ${(+v || 0).toFixed(2).replace(".", ",")}`;
const fP = v => `${(+v || 0).toFixed(1)}%`;
const UNITS = ["kg", "g", "litro", "L", "ml", "unidade", "cx", "pct"];
const COLORS = ["#7c3aed", "#8b5cf6", "#a78bfa", "#6d28d9", "#c4b5fd", "#4c1d95", "#5b21b6"];
const CANAIS = ["Presencial", "WhatsApp", "Instagram", "iFood", "Telefone", "Outro"];
const COMPAT = { kg:["kg","g"],g:["g","kg"],litro:["litro","L","ml"],L:["litro","L","ml"],ml:["ml","litro","L"],unidade:["unidade"],cx:["cx"],pct:["pct"] };
const FACTORS = { kg:1,g:0.001,litro:1,L:1,ml:0.001 };
const cvt = (qty, from, to) => { if (from===to) return qty; const f=FACTORS[from],t=FACTORS[to]; return (f!=null&&t!=null)?qty*f/t:qty; };
const compatUnits = base => COMPAT[base] || [base];

const ROLES = { Admin: "Admin", Comprador: "Comprador", Vendedor: "Vendedor" };
const ROLE_COLORS = { Admin:{bg:"#ede9fe",color:"#5b21b6"},Comprador:{bg:"#dbeafe",color:"#1e40af"},Vendedor:{bg:"#dcfce7",color:"#166534"} };
const PERMS = {
  Admin:     { tabs:[0,1,2,3,4,5,6,7,8,9,10,11], editPrecos:true,  canConfirmarPedido:true  },
  Comprador: { tabs:[1,2,5,6,7],                  editPrecos:false, canConfirmarPedido:true  },
  Vendedor:  { tabs:[4,6],                        editPrecos:false, canConfirmarPedido:false },
};
const canTab = (role, idx) => PERMS[role]?.tabs.includes(idx) ?? false;

// ── localStorage helpers ─────────────────────────────────────────────────
function lsGet(key, def) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; }
}
function lsSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { console.warn("localStorage erro:", e); }
}

const S = {
  inp: { padding:"8px 12px",border:"1px solid #ddd6fe",borderRadius:8,fontSize:14,outline:"none",width:"100%",boxSizing:"border-box",color:"#1f2937",background:"white" },
  btn: { padding:"9px 18px",background:"#7c3aed",color:"white",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600,whiteSpace:"nowrap" },
  btn2:{ padding:"9px 18px",background:"#f5f3ff",color:"#7c3aed",border:"1px solid #ddd6fe",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:500 },
  bsm: { padding:"4px 10px",background:"#f5f3ff",color:"#7c3aed",border:"1px solid #ddd6fe",borderRadius:6,cursor:"pointer",fontSize:12 },
  td:  { padding:"10px 12px",color:"#374151",borderBottom:"1px solid #f3f4f6",verticalAlign:"middle" },
  th:  { padding:"9px 12px",textAlign:"left",color:"#5b21b6",fontWeight:600,borderBottom:"1px solid #e9d5ff",background:"#f5f3ff",fontSize:12,textTransform:"uppercase",letterSpacing:".5px" },
  lbl: { fontSize:12,color:"#6b7280",display:"block",marginBottom:4,fontWeight:500 },
};

function Card({ title, children, right }) {
  return (
    <div style={{ background:"white",borderRadius:12,boxShadow:"0 2px 8px rgba(124,58,237,.08)",border:"1px solid #f3e8ff",padding:20,marginBottom:20 }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
        <h2 style={{ margin:0,fontSize:15,fontWeight:700,color:"#3730a3" }}>{title}</h2>
        {right}
      </div>
      {children}
    </div>
  );
}
function Lbl({ s }) { return <label style={S.lbl}>{s}</label>; }
function G({ cols, gap=10, mb=12, children }) { return <div style={{ display:"grid",gridTemplateColumns:cols,gap,marginBottom:mb }}>{children}</div>; }
function Pill({ label, color, bg }) { return <span style={{ background:bg,color,padding:"2px 10px",borderRadius:20,fontSize:12,fontWeight:600 }}>{label}</span>; }
function KPI({ label, value, sub, color="#3730a3" }) {
  return (
    <div style={{ background:"white",border:"1px solid #f3e8ff",borderRadius:10,padding:16,textAlign:"center" }}>
      <p style={{ margin:0,fontSize:12,color:"#9ca3af" }}>{label}</p>
      <p style={{ margin:"6px 0 2px",fontSize:20,fontWeight:700,color }}>{value}</p>
      {sub && <p style={{ margin:0,fontSize:12,color:"#9ca3af" }}>{sub}</p>}
    </div>
  );
}

// ── LOGIN ────────────────────────────────────────────────────────────────
function LoginScreen({ usuarios, onLogin }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  function tentar() {
    const u = usuarios.find(u => u.nome.toLowerCase()===user.toLowerCase() && u.senha===pass);
    if (!u) { setErr("Usuário ou senha incorretos."); return; }
    if (!u.ativo) { setErr("Usuário inativo. Contate o administrador."); return; }
    onLogin(u);
  }
  return (
    <div style={{ minHeight:"100vh",background:"linear-gradient(135deg,#6d28d9,#4338ca)",display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div style={{ background:"white",borderRadius:20,padding:40,width:360,boxShadow:"0 20px 60px rgba(0,0,0,.2)" }}>
        <div style={{ textAlign:"center",marginBottom:28 }}>
          <div style={{ fontSize:56 }}>🫐</div>
          <h1 style={{ margin:"10px 0 4px",fontSize:24,fontWeight:800,color:"#3730a3" }}>NaGarrafa</h1>
          <p style={{ margin:0,fontSize:13,color:"#9ca3af" }}>Faça login para continuar</p>
        </div>
        <div style={{ marginBottom:14 }}>
          <Lbl s="Usuário" />
          <input style={S.inp} placeholder="Nome de usuário" value={user} onChange={e=>{ setUser(e.target.value); setErr(""); }} onKeyDown={e=>e.key==="Enter"&&tentar()} />
        </div>
        <div style={{ marginBottom:20 }}>
          <Lbl s="Senha" />
          <input style={S.inp} type="password" placeholder="Senha" value={pass} onChange={e=>{ setPass(e.target.value); setErr(""); }} onKeyDown={e=>e.key==="Enter"&&tentar()} />
        </div>
        {err && <p style={{ margin:"0 0 14px",fontSize:13,color:"#ef4444",background:"#fef2f2",padding:"8px 12px",borderRadius:8 }}>⚠️ {err}</p>}
        <button style={{ ...S.btn,width:"100%",padding:12,fontSize:15 }} onClick={tentar}>Entrar</button>

      </div>
    </div>
  );
}

// ── USUÁRIOS ─────────────────────────────────────────────────────────────
function UsuariosTab({ usuarios, setUsuarios, currentUser }) {
  const blank = { nome:"",senha:"",role:"Vendedor",ativo:true };
  const [f, setF] = useState(blank);
  const [eid, setEid] = useState(null);
  const [showPass, setShowPass] = useState({});
  function salvar() {
    if (!f.nome.trim()) return alert("Informe o nome.");
    if (!eid && !f.senha.trim()) return alert("Informe a senha.");
    if (!eid && usuarios.find(u=>u.nome.toLowerCase()===f.nome.toLowerCase())) return alert("Usuário já existe.");
    const it = eid ? usuarios.find(u=>u.id===eid) : { id:uid() };
    const updated = { ...it,nome:f.nome.trim(),role:f.role,ativo:f.ativo,...(f.senha?{senha:f.senha}:{}) };
    setUsuarios(eid?usuarios.map(u=>u.id===eid?updated:u):[...usuarios,updated]);
    setF(blank); setEid(null);
  }
  function editar(u) { setF({ nome:u.nome,senha:"",role:u.role,ativo:u.ativo }); setEid(u.id); }
  function remover(id) { if(id===currentUser.id)return alert("Não pode remover seu próprio usuário."); if(window.confirm("Remover?"))setUsuarios(usuarios.filter(u=>u.id!==id)); }
  function toggle(id) { if(id===currentUser.id)return alert("Não pode desativar seu próprio usuário."); setUsuarios(usuarios.map(u=>u.id===id?{...u,ativo:!u.ativo}:u)); }
  return (
    <>
      <Card title={eid?"✏️ Editar Usuário":"➕ Novo Usuário"}>
        <G cols="2fr 2fr 1fr 1fr auto">
          <div><Lbl s="Nome *"/><input style={S.inp} placeholder="Ex: Maria" value={f.nome} onChange={e=>setF({...f,nome:e.target.value})}/></div>
          <div><Lbl s={eid?"Nova senha (deixe em branco para manter)":"Senha *"}/><input style={S.inp} type="password" placeholder={eid?"••••••":"Mínimo 4 caracteres"} value={f.senha} onChange={e=>setF({...f,senha:e.target.value})}/></div>
          <div><Lbl s="Perfil"/><select style={S.inp} value={f.role} onChange={e=>setF({...f,role:e.target.value})}>{Object.keys(ROLES).map(r=><option key={r}>{r}</option>)}</select></div>
          <div><Lbl s="Status"/><select style={S.inp} value={f.ativo?"Ativo":"Inativo"} onChange={e=>setF({...f,ativo:e.target.value==="Ativo"})}><option>Ativo</option><option>Inativo</option></select></div>
          <div style={{ display:"flex",alignItems:"flex-end",gap:6 }}>{eid&&<button style={S.btn2} onClick={()=>{setF(blank);setEid(null)}}>✕</button>}<button style={S.btn} onClick={salvar}>{eid?"✓":"+"}</button></div>
        </G>
      </Card>
      <Card title="🔐 Matriz de Permissões">
        <table style={{ width:"100%",borderCollapse:"collapse",fontSize:13 }}>
          <thead><tr><th style={S.th}>Funcionalidade</th>{Object.keys(ROLES).map(r=><th key={r} style={{ ...S.th,textAlign:"center" }}><Pill label={r} color={ROLE_COLORS[r].color} bg={ROLE_COLORS[r].bg}/></th>)}</tr></thead>
          <tbody>
            {[["🧂 Insumos / 📋 Fichas",true,false,false],["📥 Compras",true,true,false],["📦 Estoque",true,true,false],["🏭 Produção",true,true,false],["💰 Preços — Editar",true,false,false],["💰 Preços — Visualizar",true,false,true],["📝 Pedidos",true,true,true],["🛒 Vendas",true,true,false],["✅ Confirmar Pedidos",true,true,false],["🏢 Despesas",true,false,false],["📊 DRE / 🎯 Dashboard",true,false,false],["👥 Gerenciar Usuários",true,false,false]].map(([label,adm,comp,vend])=>(
              <tr key={label}><td style={{ ...S.td,fontWeight:500 }}>{label}</td>{[adm,comp,vend].map((v,i)=><td key={i} style={{ ...S.td,textAlign:"center" }}>{v?"✅":<span style={{ color:"#d1d5db" }}>—</span>}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card title={`👥 Usuários (${usuarios.length})`}>
        <table style={{ width:"100%",borderCollapse:"collapse",fontSize:14 }}>
          <thead><tr>{["Usuário","Perfil","Senha","Status","Ações"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {usuarios.map(u=>(
              <tr key={u.id} style={{ background:!u.ativo?"#f9fafb":"white" }}>
                <td style={{ ...S.td,fontWeight:600,opacity:u.ativo?1:.5 }}>{u.nome}{u.id===currentUser.id&&<span style={{ fontSize:11,color:"#7c3aed",background:"#f5f3ff",padding:"1px 6px",borderRadius:10,marginLeft:4 }}>você</span>}</td>
                <td style={S.td}><Pill label={u.role} color={ROLE_COLORS[u.role].color} bg={ROLE_COLORS[u.role].bg}/></td>
                <td style={S.td}><span style={{ fontFamily:"monospace",letterSpacing:2,color:"#9ca3af" }}>{showPass[u.id]?u.senha:"••••••"}</span><button style={{ ...S.bsm,marginLeft:6,fontSize:11 }} onClick={()=>setShowPass(p=>({...p,[u.id]:!p[u.id]}))}>{showPass[u.id]?"🙈":"👁️"}</button></td>
                <td style={S.td}><button onClick={()=>toggle(u.id)} style={{ ...S.bsm,background:u.ativo?"#dcfce7":"#f3f4f6",color:u.ativo?"#065f46":"#6b7280" }}>{u.ativo?"✅ Ativo":"⚪ Inativo"}</button></td>
                <td style={S.td}><button style={S.bsm} onClick={()=>editar(u)}>✏️</button><button style={{ ...S.bsm,color:"#ef4444",marginLeft:6 }} onClick={()=>remover(u.id)}>🗑️</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

// ── INSUMOS ──────────────────────────────────────────────────────────────
function InsumosDefTab({ idef, setIdef }) {
  const blank = { nome:"",unidade:"kg" };
  const [f, setF] = useState(blank);
  const [eid, setEid] = useState(null);
  function salvar() { if(!f.nome.trim())return alert("Informe o nome."); const it={id:eid||uid(),nome:f.nome.trim(),unidade:f.unidade}; setIdef(eid?idef.map(i=>i.id===eid?it:i):[...idef,it]); setF(blank);setEid(null); }
  function editar(i) { setF({nome:i.nome,unidade:i.unidade});setEid(i.id); }
  function remover(id) { if(window.confirm("Remover insumo?"))setIdef(idef.filter(i=>i.id!==id)); }
  return (
    <>
      <Card title="➕ Cadastrar Insumo">
        <p style={{ margin:"0 0 14px",fontSize:13,color:"#6b7280" }}>Cadastre os ingredientes usados na produção. O custo será definido ao registrar compras.</p>
        <G cols="3fr 1fr auto">
          <div><Lbl s="Nome *"/><input style={S.inp} placeholder="Ex: Polpa de Açaí" value={f.nome} onChange={e=>setF({...f,nome:e.target.value})}/></div>
          <div><Lbl s="Unidade"/><select style={S.inp} value={f.unidade} onChange={e=>setF({...f,unidade:e.target.value})}>{UNITS.map(u=><option key={u}>{u}</option>)}</select></div>
          <div style={{ display:"flex",alignItems:"flex-end",gap:6 }}>{eid&&<button style={S.btn2} onClick={()=>{setF(blank);setEid(null)}}>✕</button>}<button style={S.btn} onClick={salvar}>{eid?"✓ Atualizar":"+ Adicionar"}</button></div>
        </G>
      </Card>
      <Card title={`📋 Insumos (${idef.length})`}>
        <table style={{ width:"100%",borderCollapse:"collapse",fontSize:14 }}>
          <thead><tr>{["Insumo","Unidade","Ações"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {!idef.length&&<tr><td colSpan={3} style={{ ...S.td,textAlign:"center",color:"#9ca3af",padding:32 }}>Nenhum insumo cadastrado. Adicione acima 👆</td></tr>}
            {idef.map(i=>(
              <tr key={i.id}><td style={{ ...S.td,fontWeight:500 }}>{i.nome}</td><td style={S.td}>{i.unidade}</td>
                <td style={S.td}><button style={S.bsm} onClick={()=>editar(i)}>✏️</button><button style={{ ...S.bsm,color:"#ef4444",marginLeft:6 }} onClick={()=>remover(i.id)}>🗑️</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

// ── COMPRAS ──────────────────────────────────────────────────────────────
function ComprasTab({ entradas, setEntradas, idef }) {
  const today = new Date().toISOString().slice(0,10);
  const blank = { insumoId:"",qtd:"",custoTotal:"",data:today };
  const [f, setF] = useState(blank);
  const ins = idef.find(i=>i.id===f.insumoId);
  const cuUnit = f.qtd&&+f.qtd>0&&f.custoTotal?+f.custoTotal/+f.qtd:null;
  function custMedioAtual(iid) { const es=entradas.filter(e=>e.insumoId===iid); const tQ=es.reduce((s,e)=>s+e.qtd,0),tC=es.reduce((s,e)=>s+e.custoTotal,0); return tQ>0?tC/tQ:0; }
  function novoCM() { const es=entradas.filter(e=>e.insumoId===f.insumoId); const tQ=es.reduce((s,e)=>s+e.qtd,0)+(+f.qtd||0),tC=es.reduce((s,e)=>s+e.custoTotal,0)+(+f.custoTotal||0); return tQ>0?tC/tQ:0; }
  function salvar() {
    if(!f.insumoId)return alert("Selecione o insumo.");
    if(!f.qtd||+f.qtd<=0)return alert("Informe a quantidade.");
    if(!f.custoTotal||+f.custoTotal<=0)return alert("Informe o valor pago.");
    setEntradas([...entradas,{id:uid(),insumoId:f.insumoId,qtd:+f.qtd,custoTotal:+f.custoTotal,data:f.data}]);
    setF({...blank,data:f.data});
  }
  return (
    <>
      {!idef.length&&<div style={{ background:"#fffbeb",border:"1px solid #fde68a",borderRadius:10,padding:14,marginBottom:16,color:"#92400e",fontSize:13 }}>⚠️ Cadastre insumos antes de registrar compras.</div>}
      <Card title="📥 Registrar Compra">
        <G cols="2fr 1fr 1fr 1fr auto">
          <div><Lbl s="Insumo *"/><select style={S.inp} value={f.insumoId} onChange={e=>setF({...f,insumoId:e.target.value})}><option value="">Selecione...</option>{idef.map(i=>{const cm=custMedioAtual(i.id);return<option key={i.id} value={i.id}>{i.nome} ({i.unidade}){cm>0?" — CM: "+fR(cm):""}</option>;})}</select></div>
          <div><Lbl s={`Qtd.${ins?" ("+ins.unidade+")":""} *`}/><input style={S.inp} type="number" step="0.001" min="0" value={f.qtd} onChange={e=>setF({...f,qtd:e.target.value})}/></div>
          <div><Lbl s="Valor pago (R$) *"/><input style={S.inp} type="number" step="0.01" min="0" value={f.custoTotal} onChange={e=>setF({...f,custoTotal:e.target.value})}/></div>
          <div><Lbl s="Data"/><input style={S.inp} type="date" value={f.data} onChange={e=>setF({...f,data:e.target.value})}/></div>
          <div style={{ display:"flex",alignItems:"flex-end" }}><button style={S.btn} onClick={salvar}>+ Registrar</button></div>
        </G>
        {cuUnit!==null&&ins&&(
          <div style={{ display:"flex",gap:10,flexWrap:"wrap",marginTop:6 }}>
            <span style={{ fontSize:13,color:"#7c3aed",background:"#f5f3ff",padding:"5px 12px",borderRadius:8 }}>💡 Custo desta compra: <strong>{fR(cuUnit)}/{ins.unidade}</strong></span>
            {custMedioAtual(f.insumoId)>0&&<span style={{ fontSize:13,color:"#059669",background:"#ecfdf5",padding:"5px 12px",borderRadius:8 }}>📊 Novo CM: <strong>{fR(novoCM())}/{ins.unidade}</strong></span>}
          </div>
        )}
      </Card>
      <Card title={`📋 Histórico de Compras (${entradas.length})`}>
        <table style={{ width:"100%",borderCollapse:"collapse",fontSize:14 }}>
          <thead><tr>{["Data","Insumo","Qtd.","Valor Pago","Custo/un","Ações"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {!entradas.length&&<tr><td colSpan={6} style={{ ...S.td,textAlign:"center",color:"#9ca3af",padding:32 }}>Nenhuma compra registrada.</td></tr>}
            {[...entradas].sort((a,b)=>(b.data||"").localeCompare(a.data||"")).map(e=>{const ins2=idef.find(i=>i.id===e.insumoId);return(
              <tr key={e.id}><td style={S.td}>{e.data||"—"}</td><td style={{ ...S.td,fontWeight:500 }}>{ins2?.nome||"—"}</td><td style={S.td}>{e.qtd} {ins2?.unidade}</td><td style={S.td}>{fR(e.custoTotal)}</td><td style={{ ...S.td,color:"#7c3aed",fontWeight:600 }}>{fR(e.qtd>0?e.custoTotal/e.qtd:0)}/{ins2?.unidade}</td>
                <td style={S.td}><button style={{ ...S.bsm,color:"#ef4444" }} onClick={()=>{if(window.confirm("Remover?"))setEntradas(entradas.filter(x=>x.id!==e.id))}}>🗑️</button></td>
              </tr>
            );})}
          </tbody>
        </table>
      </Card>
    </>
  );
}

// ── ESTOQUE ──────────────────────────────────────────────────────────────
function EstoqueTab({ idefComCusto }) {
  const totalValor = idefComCusto.reduce((s,i)=>s+Math.max(0,i.estoque)*i.custMedio,0);
  return (
    <>
      <G cols="1fr 1fr 1fr 1fr" gap={12} mb={20}>
        <KPI label="📦 Em estoque" value={idefComCusto.filter(i=>i.estoque>0.001).length} color="#7c3aed"/>
        <KPI label="⚠️ Zerado/negativo" value={idefComCusto.filter(i=>i.estoque<=0.001).length} color="#ef4444"/>
        <KPI label="💰 Valor total" value={fR(totalValor)} color="#059669"/>
        <KPI label="🛒 Total de tipos" value={idefComCusto.length} color="#3730a3"/>
      </G>
      <Card title="📦 Estoque — Custo Médio Ponderado">
        <p style={{ margin:"0 0 14px",fontSize:13,color:"#6b7280" }}>Custo médio = <strong>Σ(valor pago) ÷ Σ(qtd comprada)</strong></p>
        <table style={{ width:"100%",borderCollapse:"collapse",fontSize:14 }}>
          <thead><tr>{["Insumo","Un.","Total Comprado","Total Consumido","Estoque Atual","Custo Médio","Valor em Estoque","Status"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {!idefComCusto.length&&<tr><td colSpan={8} style={{ ...S.td,textAlign:"center",color:"#9ca3af",padding:32 }}>Nenhum insumo cadastrado.</td></tr>}
            {idefComCusto.map(i=>{const neg=i.estoque<-0.0001,bx=i.estoque>=-0.0001&&i.estoque<0.5;return(
              <tr key={i.id} style={{ background:neg?"#fef2f2":bx?"#fffbeb":"white" }}>
                <td style={{ ...S.td,fontWeight:600 }}>{i.nome}</td><td style={S.td}>{i.unidade}</td>
                <td style={S.td}>{i.totalEntradas.toFixed(3)}</td><td style={S.td}>{i.totalConsumido.toFixed(3)}</td>
                <td style={{ ...S.td,fontWeight:700,color:neg?"#ef4444":bx?"#d97706":"#059669",fontSize:15 }}>{i.estoque.toFixed(3)} {i.unidade}</td>
                <td style={{ ...S.td,color:"#7c3aed",fontWeight:700 }}>{i.custMedio>0?`${fR(i.custMedio)}/${i.unidade}`:<span style={{ color:"#9ca3af",fontSize:12 }}>Sem compras</span>}</td>
                <td style={{ ...S.td,fontWeight:600 }}>{fR(Math.max(0,i.estoque)*i.custMedio)}</td>
                <td style={S.td}>{neg?<Pill label="❌ Negativo" color="#991b1b" bg="#fee2e2"/>:bx?<Pill label="⚠️ Baixo" color="#92400e" bg="#fef3c7"/>:<Pill label="✅ OK" color="#065f46" bg="#d1fae5"/>}</td>
              </tr>
            );})}
          </tbody>
        </table>
      </Card>
    </>
  );
}

// ── FICHAS ───────────────────────────────────────────────────────────────
function FichasTab({ fichas, fichasCalc, setFichas, idef, custMedioFn }) {
  const blank = { nome:"",ings:[] };
  const [f, setF] = useState(blank);
  const [eid, setEid] = useState(null);
  const [nIng, setNIng] = useState({ iid:"",qtd:"",un:"" });
  function handleIns(iid) { const ins=idef.find(i=>i.id===iid); setNIng({iid,qtd:"",un:ins?ins.unidade:""}); }
  function custoIng(ing) { const ins=idef.find(i=>i.id===ing.iid); if(!ins)return 0; return custMedioFn(ing.iid)*cvt(ing.qtd,ing.un||ins.unidade,ins.unidade); }
  const custoF = f.ings.reduce((s,i)=>s+custoIng(i),0);
  const insAt = idef.find(i=>i.id===nIng.iid);
  const unOpts = insAt?compatUnits(insAt.unidade):[];
  const prev = insAt&&nIng.qtd&&+nIng.qtd>0&&nIng.un?custoIng({iid:nIng.iid,qtd:+nIng.qtd,un:nIng.un}):null;
  function addIng() { if(!nIng.iid||!nIng.qtd||+nIng.qtd<=0)return alert("Selecione o insumo e informe a quantidade."); setF({...f,ings:[...f.ings,{id:uid(),iid:nIng.iid,qtd:+nIng.qtd,un:nIng.un}]}); setNIng({iid:"",qtd:"",un:""}); }
  function salvar() { if(!f.nome.trim())return alert("Informe o nome."); if(!f.ings.length)return alert("Adicione ao menos um ingrediente."); const it={id:eid||uid(),nome:f.nome.trim(),ings:f.ings}; setFichas(eid?fichas.map(p=>p.id===eid?it:p):[...fichas,it]); setF(blank);setEid(null); }
  function editar(p) { setF({nome:p.nome,ings:p.ings||[]}); setEid(p.id); }
  function remover(id) { if(window.confirm("Remover ficha?"))setFichas(fichas.filter(p=>p.id!==id)); }
  return (
    <>
      <Card title={eid?"✏️ Editar Ficha":"📋 Nova Ficha Técnica"}>
        <div style={{ marginBottom:14 }}><Lbl s="Nome do produto *"/><input style={{ ...S.inp,maxWidth:440 }} placeholder="Ex: Açaí Tradicional 500ml" value={f.nome} onChange={e=>setF({...f,nome:e.target.value})}/></div>
        <hr style={{ border:"none",borderTop:"1px solid #f3e8ff",margin:"0 0 14px" }}/>
        <h3 style={{ margin:"0 0 10px",fontSize:13,color:"#5b21b6",fontWeight:700,textTransform:"uppercase" }}>Ingredientes</h3>
        {!idef.length?<p style={{ color:"#d97706",background:"#fffbeb",padding:10,borderRadius:8,fontSize:13 }}>⚠️ Cadastre insumos primeiro.</p>:(
          <>
            <div style={{ background:"#f9f7ff",border:"1px solid #e9d5ff",borderRadius:10,padding:14,marginBottom:12 }}>
              <G cols="2.5fr 1fr 1fr auto" gap={8} mb={0}>
                <div><Lbl s="Insumo"/><select style={S.inp} value={nIng.iid} onChange={e=>handleIns(e.target.value)}><option value="">Selecione...</option>{idef.map(i=>{const cm=custMedioFn(i.id);return<option key={i.id} value={i.id}>{i.nome} ({i.unidade}){cm>0?" → CM: "+fR(cm)+"/"+i.unidade:" → sem compras"}</option>;})}</select></div>
                <div><Lbl s="Quantidade"/><input style={S.inp} type="number" step="0.001" min="0" placeholder="Ex: 300" value={nIng.qtd} disabled={!nIng.iid} onChange={e=>setNIng({...nIng,qtd:e.target.value})}/></div>
                <div><Lbl s="Unidade"/><select style={{ ...S.inp,background:!nIng.iid?"#f3f4f6":"white" }} value={nIng.un} disabled={!nIng.iid} onChange={e=>setNIng({...nIng,un:e.target.value})}><option value="">—</option>{unOpts.map(u=><option key={u} value={u}>{u}</option>)}</select></div>
                <div style={{ display:"flex",alignItems:"flex-end" }}><button style={S.btn} onClick={addIng}>+ Add</button></div>
              </G>
              {prev!==null&&<div style={{ marginTop:10,fontSize:13,color:"#7c3aed",background:"#ede9fe",padding:"5px 12px",borderRadius:8,display:"inline-flex",gap:8,flexWrap:"wrap" }}>
                <span>{nIng.qtd} {nIng.un}{nIng.un!==insAt?.unidade&&<span style={{ color:"#9ca3af" }}> = {cvt(+nIng.qtd,nIng.un,insAt.unidade).toFixed(4)} {insAt?.unidade}</span>}</span>
                <span>· CM: <strong>{fR(custMedioFn(nIng.iid))}/{insAt?.unidade}</strong></span>
                <span>→ Custo: <strong>{fR(prev)}</strong></span>
              </div>}
            </div>
            {f.ings.length>0&&(
              <table style={{ width:"100%",borderCollapse:"collapse",fontSize:13,marginBottom:10 }}>
                <thead><tr>{["Insumo","Qtd.","Un.","Qtd. convertida","Custo Médio","Custo",""].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {f.ings.map(ing=>{const ins2=idef.find(i=>i.id===ing.iid);const qc=ins2?cvt(ing.qtd,ing.un||ins2.unidade,ins2.unidade):0;const sc=ing.un&&ing.un!==ins2?.unidade;const cm2=custMedioFn(ing.iid);return(
                    <tr key={ing.id}><td style={S.td}>{ins2?.nome||"—"}</td><td style={{ ...S.td,fontWeight:600 }}>{ing.qtd} <span style={{ color:"#7c3aed" }}>{ing.un||ins2?.unidade}</span></td><td style={{ ...S.td,color:"#7c3aed" }}>{ing.un||ins2?.unidade}</td><td style={{ ...S.td,color:"#9ca3af",fontSize:12 }}>{sc?`${qc.toFixed(4)} ${ins2?.unidade}`:"—"}</td><td style={S.td}>{cm2>0?`${fR(cm2)}/${ins2?.unidade}`:<span style={{ color:"#ef4444",fontSize:12 }}>Sem compras</span>}</td><td style={{ ...S.td,fontWeight:700,color:"#7c3aed" }}>{fR(custoIng(ing))}</td><td style={S.td}><button style={{ ...S.bsm,color:"#ef4444" }} onClick={()=>setF({...f,ings:f.ings.filter(i=>i.id!==ing.id)})}>🗑️</button></td></tr>
                  );})}
                  <tr style={{ background:"#f5f3ff" }}><td colSpan={5} style={{ ...S.td,fontWeight:700,textAlign:"right",color:"#3730a3" }}>Custo Total Unitário:</td><td style={{ ...S.td,fontWeight:700,color:"#7c3aed",fontSize:16 }}>{fR(custoF)}</td><td style={S.td}/></tr>
                </tbody>
              </table>
            )}
          </>
        )}
        <div style={{ display:"flex",gap:8,justifyContent:"flex-end" }}>{eid&&<button style={S.btn2} onClick={()=>{setF(blank);setEid(null)}}>Cancelar</button>}<button style={S.btn} onClick={salvar}>{eid?"✓ Salvar":"✓ Criar Ficha"}</button></div>
      </Card>
      <Card title={`📦 Fichas (${fichasCalc.length})`}>
        {!fichasCalc.length&&<p style={{ color:"#9ca3af",textAlign:"center",padding:24 }}>Nenhuma ficha cadastrada.</p>}
        {fichasCalc.map(p=>(
          <div key={p.id} style={{ border:"1px solid #e9d5ff",borderRadius:10,padding:14,marginBottom:10 }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8,marginBottom:8 }}>
              <h3 style={{ margin:0,color:"#3730a3",fontSize:15 }}>{p.nome}</h3>
              <div style={{ display:"flex",gap:8,alignItems:"center" }}><span style={{ fontWeight:700,color:"#7c3aed",fontSize:16 }}>{fR(p.custo)}/un</span><button style={S.bsm} onClick={()=>editar(p)}>✏️ Editar</button><button style={{ ...S.bsm,color:"#ef4444" }} onClick={()=>remover(p.id)}>🗑️</button></div>
            </div>
            <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>{(p.ings||[]).map(ing=>{const ins2=idef.find(i=>i.id===ing.iid);return ins2&&<span key={ing.id} style={{ fontSize:12,background:"#f5f3ff",color:"#5b21b6",padding:"3px 10px",borderRadius:20 }}>{ins2.nome}: {ing.qtd} {ing.un||ins2.unidade}</span>;})}</div>
          </div>
        ))}
      </Card>
    </>
  );
}

// ── PREÇOS ───────────────────────────────────────────────────────────────
function PrecosTab({ fichasCalc, margens, sm, getPreco, precos, sp, canEdit }) {
  const [simFid, setSimFid] = useState("");
  const [simM, setSimM] = useState(40);
  useEffect(()=>{ if(fichasCalc.length&&!simFid)setSimFid(fichasCalc[0].id); },[fichasCalc]);
  return (
    <>
      {!canEdit&&<div style={{ background:"#fffbeb",border:"1px solid #fde68a",borderRadius:10,padding:12,marginBottom:16,fontSize:13,color:"#92400e" }}>👁️ Você tem permissão apenas para <strong>visualizar</strong> os preços.</div>}
      <Card title="💰 Preços dos Produtos">
        {!fichasCalc.length&&<p style={{ color:"#9ca3af",textAlign:"center",padding:24 }}>Nenhum produto cadastrado.</p>}
        {fichasCalc.map(fc=>{
          const m=+(margens[fc.id]??40),pCalc=getPreco(fc.id),pm=precos[fc.id];
          const pEx=pm!=null?pm:pCalc,mCal=pEx>0&&fc.custo>0?(1-fc.custo/pEx)*100:0,manual=pm!=null;
          return(
            <div key={fc.id} style={{ border:`1px solid ${manual?"#6ee7b7":"#e9d5ff"}`,borderRadius:10,padding:16,marginBottom:12,background:manual?"#f0fdf9":"white" }}>
              <div style={{ display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:12,alignItems:"flex-start" }}>
                <div style={{ minWidth:180 }}>
                  <p style={{ margin:"0 0 4px",fontWeight:700,color:"#3730a3",fontSize:15 }}>{fc.nome}</p>
                  <span style={{ fontSize:13,color:"#6b7280" }}>Custo médio: <strong style={{ color:"#7c3aed" }}>{fR(fc.custo)}</strong></span>
                  {manual&&<div style={{ marginTop:6,fontSize:12,color:"#059669",background:"#dcfce7",padding:"3px 8px",borderRadius:6,display:"inline-block" }}>✏️ Preço manual</div>}
                </div>
                <div style={{ display:"flex",gap:14,alignItems:"flex-end",flexWrap:"wrap" }}>
                  {canEdit?(
                    <>
                      <div style={{ opacity:manual?.4:1,pointerEvents:manual?"none":"auto" }}>
                        <Lbl s="Margem (%)"/>
                        <div style={{ display:"flex",alignItems:"center",gap:8 }}><input type="range" min="1" max="90" value={m} onChange={e=>sm({...margens,[fc.id]:+e.target.value})} style={{ width:90,accentColor:"#7c3aed" }}/><input type="number" min="1" max="90" value={m} onChange={e=>sm({...margens,[fc.id]:Math.min(90,Math.max(1,+e.target.value))})} style={{ ...S.inp,width:54,textAlign:"center",padding:"6px 8px" }}/><span style={{ fontSize:13,color:"#7c3aed" }}>%</span></div>
                      </div>
                      <div style={{ display:"flex",alignItems:"center",height:40,color:"#c4b5fd",fontSize:20 }}>⟷</div>
                      <div>
                        <Lbl s="Preço de venda (R$)"/>
                        <div style={{ display:"flex",gap:6,alignItems:"center" }}>
                          <input type="number" step="0.01" min="0" placeholder={fR(pCalc).replace("R$ ","")} value={pm??""} onChange={e=>{const v=e.target.value;if(v===""||+v<=0){const np={...precos};delete np[fc.id];sp(np);}else{const nm=+v>0&&fc.custo>0?Math.min(90,Math.max(1,(1-fc.custo/+v)*100)):m;sp({...precos,[fc.id]:+v});sm({...margens,[fc.id]:+nm.toFixed(1)});}}} style={{ ...S.inp,width:110,fontWeight:700,color:manual?"#059669":"#374151" }}/>
                          {manual&&<button onClick={()=>{const np={...precos};delete np[fc.id];sp(np);}} style={{ ...S.bsm,color:"#ef4444",padding:"6px 8px" }}>✕</button>}
                        </div>
                      </div>
                    </>
                  ):(
                    <div style={{ textAlign:"center" }}><p style={{ margin:0,fontSize:11,color:"#9ca3af" }}>Preço de venda</p><p style={{ margin:"4px 0 0",fontSize:28,fontWeight:700,color:"#059669" }}>{fR(pEx)}</p></div>
                  )}
                  {[["Margem",fP(manual?mCal:m),manual?"#059669":"#6d28d9"],["Markup",fP(fc.custo>0?(pEx-fc.custo)/fc.custo*100:0),"#6d28d9"],["Lucro/un",fR(pEx-fc.custo),"#2563eb"]].map(([l,v,c])=>(
                    <div key={l} style={{ textAlign:"center" }}><p style={{ margin:0,fontSize:11,color:"#9ca3af" }}>{l}</p><p style={{ margin:"4px 0 0",fontSize:20,fontWeight:700,color:c }}>{v}</p></div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </Card>
      {canEdit&&fichasCalc.length>0&&(
        <Card title="🧪 Simulador de Cenários">
          <G cols="1fr 1fr" gap={16} mb={16}>
            <div><Lbl s="Produto"/><select style={S.inp} value={simFid} onChange={e=>setSimFid(e.target.value)}>{fichasCalc.map(f=><option key={f.id} value={f.id}>{f.nome}</option>)}</select></div>
            <div><Lbl s={`Margem simulada: ${simM}%`}/><input type="range" min="1" max="90" value={simM} onChange={e=>setSimM(+e.target.value)} style={{ width:"100%",marginTop:10,accentColor:"#7c3aed" }}/></div>
          </G>
          {simFid&&(()=>{const fc=fichasCalc.find(p=>p.id===simFid);if(!fc)return null;const pts=[10,20,30,40,50,60,70].map(m=>({m:`${m}%`,p:+(fc.custo/(1-m/100)).toFixed(2),l:+(fc.custo/(1-m/100)-fc.custo).toFixed(2)}));const sp2=fc.custo/(1-simM/100);return(<><G cols="1fr 1fr 1fr" gap={12} mb={16}>{[["Custo médio",fR(fc.custo),"#7c3aed","#f5f3ff"],[`Preço c/ ${simM}%`,fR(sp2),"#059669","#ecfdf5"],["Lucro/un",fR(sp2-fc.custo),"#2563eb","#eff6ff"]].map(([l,v,c,bg])=><div key={l} style={{ background:bg,borderRadius:10,padding:14,textAlign:"center" }}><p style={{ margin:0,fontSize:12,color:"#6b7280" }}>{l}</p><p style={{ margin:"6px 0 0",fontSize:20,fontWeight:700,color:c }}>{v}</p></div>)}</G><ResponsiveContainer width="100%" height={200}><BarChart data={pts}><CartesianGrid strokeDasharray="3 3" stroke="#f3e8ff"/><XAxis dataKey="m" tick={{ fontSize:12 }}/><YAxis tickFormatter={v=>`R$${v.toFixed(0)}`} tick={{ fontSize:12 }}/><Tooltip formatter={(v,n)=>[fR(v),n==="p"?"Preço":"Lucro/un"]}/><Bar dataKey="p" name="p" fill="#7c3aed" radius={[4,4,0,0]}/><Bar dataKey="l" name="l" fill="#a78bfa" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></>);})()}
        </Card>
      )}
    </>
  );
}

// ── PRODUÇÃO ─────────────────────────────────────────────────────────────
function ProducaoTab({ producoes, setProducoes, fichasCalc, idef, estoqueInsumoFn, estoqueProdutoFn }) {
  const today = new Date().toISOString().slice(0,10);
  const blank = { fichaId:"",qtd:"",data:today };
  const [f, setF] = useState(blank);
  const fcAt = fichasCalc.find(p=>p.id===f.fichaId);
  const nec = fcAt&&f.qtd&&+f.qtd>0?(fcAt.ings||[]).map(ing=>{const ins=idef.find(i=>i.id===ing.iid);if(!ins)return null;const qn=cvt(ing.qtd,ing.un||ins.unidade,ins.unidade)*(+f.qtd);const es=estoqueInsumoFn(ing.iid);return{nome:ins.nome,un:ins.unidade,qn,es,ok:es>=qn};}).filter(Boolean):[];
  const custoProd = fcAt?fcAt.custo*(+f.qtd||0):0;
  function registrar() {
    if(!f.fichaId)return alert("Selecione o produto.");
    if(!f.qtd||+f.qtd<=0)return alert("Informe a quantidade.");
    const insuf=nec.filter(n=>!n.ok);
    if(insuf.length&&!window.confirm(`⚠️ Estoque insuficiente:\n${insuf.map(n=>`• ${n.nome}: precisa ${n.qn.toFixed(3)}, tem ${n.es.toFixed(3)}`).join("\n")}\n\nRegistrar mesmo assim?`))return;
    setProducoes([...producoes,{id:uid(),fichaId:f.fichaId,qtdProduzida:+f.qtd,data:f.data,custoUnit:fcAt?.custo||0}]);
    setF({...blank,data:f.data});
  }
  function remover(id) { if(window.confirm("Remover produção?"))setProducoes(producoes.filter(p=>p.id!==id)); }
  return (
    <>
      <Card title="🏭 Registrar Lote de Produção">
        {!fichasCalc.length?<p style={{ color:"#d97706",background:"#fffbeb",padding:10,borderRadius:8,fontSize:13 }}>⚠️ Cadastre fichas técnicas antes de registrar produções.</p>:(
          <>
            <G cols="2fr 1fr 1fr auto">
              <div><Lbl s="Produto *"/><select style={S.inp} value={f.fichaId} onChange={e=>setF({...f,fichaId:e.target.value})}><option value="">Selecione...</option>{fichasCalc.map(p=><option key={p.id} value={p.id}>{p.nome} — {fR(p.custo)}/un</option>)}</select></div>
              <div><Lbl s="Qtd. a produzir *"/><input style={S.inp} type="number" min="1" step="1" value={f.qtd} onChange={e=>setF({...f,qtd:e.target.value})}/></div>
              <div><Lbl s="Data"/><input style={S.inp} type="date" value={f.data} onChange={e=>setF({...f,data:e.target.value})}/></div>
              <div style={{ display:"flex",alignItems:"flex-end" }}><button style={S.btn} onClick={registrar}>✓ Produzir</button></div>
            </G>
            {fcAt&&f.qtd&&+f.qtd>0&&<div style={{ marginTop:12,background:"#f5f3ff",borderRadius:10,padding:14 }}><p style={{ margin:"0 0 10px",fontWeight:600,color:"#3730a3",fontSize:13 }}>📋 Consumo para {f.qtd} un de "{fcAt.nome}":</p><div style={{ display:"flex",flexWrap:"wrap",gap:8,marginBottom:10 }}>{nec.map((n,i)=><div key={i} style={{ background:n.ok?"#dcfce7":"#fee2e2",border:`1px solid ${n.ok?"#86efac":"#fca5a5"}`,borderRadius:8,padding:"8px 12px",fontSize:13 }}><strong>{n.nome}:</strong> {n.qn.toFixed(3)} {n.un}<span style={{ fontSize:11,marginLeft:8,color:n.ok?"#065f46":"#991b1b" }}>{n.ok?`✅ ${n.es.toFixed(3)}`:`❌ ${n.es.toFixed(3)}`}</span></div>)}</div><p style={{ margin:0,fontSize:13,color:"#3730a3" }}>💰 Custo do lote: <strong>{fR(custoProd)}</strong></p></div>}
          </>
        )}
      </Card>
      <Card title="🛍️ Estoque de Produtos Acabados">
        <table style={{ width:"100%",borderCollapse:"collapse",fontSize:14 }}>
          <thead><tr>{["Produto","Custo Médio/un","Total Produzido","Total Vendido","Em Estoque","Valor em Estoque","Status"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {!fichasCalc.length&&<tr><td colSpan={7} style={{ ...S.td,textAlign:"center",color:"#9ca3af",padding:32 }}>Nenhum produto cadastrado.</td></tr>}
            {fichasCalc.map(fc=>{const prod=producoes.filter(p=>p.fichaId===fc.id).reduce((s,p)=>s+p.qtdProduzida,0);const estoqP=estoqueProdutoFn(fc.id),vendTotal=prod-estoqP;const neg=estoqP<0,zero=estoqP===0;return(
              <tr key={fc.id} style={{ background:neg?"#fef2f2":zero?"#f9fafb":"white" }}>
                <td style={{ ...S.td,fontWeight:600 }}>{fc.nome}</td><td style={{ ...S.td,color:"#7c3aed",fontWeight:700 }}>{fR(fc.custo)}</td><td style={S.td}>{prod} un</td><td style={S.td}>{vendTotal} un</td>
                <td style={{ ...S.td,fontWeight:700,fontSize:15,color:neg?"#ef4444":zero?"#9ca3af":"#059669" }}>{estoqP} un</td>
                <td style={{ ...S.td,fontWeight:600 }}>{fR(Math.max(0,estoqP)*fc.custo)}</td>
                <td style={S.td}>{neg?<Pill label="❌ Negativo" color="#991b1b" bg="#fee2e2"/>:zero?<Pill label="⚪ Zerado" color="#6b7280" bg="#f3f4f6"/>:<Pill label="✅ Em estoque" color="#065f46" bg="#d1fae5"/>}</td>
              </tr>
            );})}
          </tbody>
        </table>
      </Card>
      <Card title={`📋 Histórico de Produções (${producoes.length})`}>
        <table style={{ width:"100%",borderCollapse:"collapse",fontSize:14 }}>
          <thead><tr>{["Data","Produto","Qtd.","Custo/un","Custo do Lote","Ações"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {!producoes.length&&<tr><td colSpan={6} style={{ ...S.td,textAlign:"center",color:"#9ca3af",padding:28 }}>Nenhuma produção registrada.</td></tr>}
            {[...producoes].sort((a,b)=>(b.data||"").localeCompare(a.data||"")).map(p=>{const fc=fichasCalc.find(f2=>f2.id===p.fichaId);return(
              <tr key={p.id}><td style={S.td}>{p.data||"—"}</td><td style={{ ...S.td,fontWeight:500 }}>{fc?.nome||"—"}</td><td style={S.td}>{p.qtdProduzida} un</td><td style={{ ...S.td,color:"#7c3aed" }}>{fR(fc?.custo||p.custoUnit)}/un</td><td style={{ ...S.td,fontWeight:600 }}>{fR((fc?.custo||p.custoUnit)*p.qtdProduzida)}</td><td style={S.td}><button style={{ ...S.bsm,color:"#ef4444" }} onClick={()=>remover(p.id)}>🗑️</button></td></tr>
            );})}
          </tbody>
        </table>
      </Card>
    </>
  );
}

// ── PEDIDOS ──────────────────────────────────────────────────────────────
function PedidosTab({ pedidos, setPedidos, fichasCalc, getPreco, setVendas, vendas, estoqueProdutoFn, canConfirmar }) {
  const today = new Date().toISOString().slice(0,10);
  const blank = { fichaId:"",qtd:"",data:today,canal:"Presencial",obs:"" };
  const [f, setF] = useState(blank);
  const [filtro, setFiltro] = useState("Todos");
  function registrar() { if(!f.fichaId)return alert("Selecione o produto."); if(!f.qtd||+f.qtd<=0)return alert("Informe a quantidade."); setPedidos([...pedidos,{id:uid(),fichaId:f.fichaId,qtd:+f.qtd,data:f.data,canal:f.canal,obs:f.obs,status:"Pendente"}]); setF({...blank,data:f.data,canal:f.canal}); }
  function confirmar(pedido) { const es=estoqueProdutoFn(pedido.fichaId); if(es<pedido.qtd&&!window.confirm(`⚠️ Estoque: ${es} un. Confirmar mesmo assim?`))return; setPedidos(pedidos.map(p=>p.id===pedido.id?{...p,status:"Confirmado"}:p)); setVendas([...vendas,{id:uid(),fichaId:pedido.fichaId,qtd:pedido.qtd,data:pedido.data,pedidoId:pedido.id}]); }
  function cancelar(id) { if(window.confirm("Cancelar?"))setPedidos(pedidos.map(p=>p.id===id?{...p,status:"Cancelado"}:p)); }
  function remover(id) { if(window.confirm("Excluir?"))setPedidos(pedidos.filter(p=>p.id!==id)); }
  const pendentes=pedidos.filter(p=>p.status==="Pendente").length,confirmados=pedidos.filter(p=>p.status==="Confirmado").length,cancelados=pedidos.filter(p=>p.status==="Cancelado").length;
  const recPot=pedidos.filter(p=>p.status==="Pendente").reduce((s,p)=>s+p.qtd*getPreco(p.fichaId),0);
  const recConf=pedidos.filter(p=>p.status==="Confirmado").reduce((s,p)=>s+p.qtd*getPreco(p.fichaId),0);
  const canalCount=CANAIS.map(c=>({canal:c,total:pedidos.filter(p=>p.canal===c).length})).filter(c=>c.total>0);
  const lista=filtro==="Todos"?pedidos:pedidos.filter(p=>p.status===filtro);
  const st=s=>s==="Confirmado"?{color:"#065f46",bg:"#d1fae5",label:"✅ Confirmado"}:s==="Cancelado"?{color:"#991b1b",bg:"#fee2e2",label:"❌ Cancelado"}:{color:"#92400e",bg:"#fef3c7",label:"⏳ Pendente"};
  return (
    <>
      <Card title="➕ Registrar Pedido">
        <G cols="2fr 1fr 1fr 1fr auto">
          <div><Lbl s="Produto *"/><select style={S.inp} value={f.fichaId} onChange={e=>setF({...f,fichaId:e.target.value})}><option value="">Selecione...</option>{fichasCalc.map(p=><option key={p.id} value={p.id}>{p.nome} — {fR(getPreco(p.id))}/un · Est: {estoqueProdutoFn(p.id)} un</option>)}</select></div>
          <div><Lbl s="Quantidade *"/><input style={S.inp} type="number" min="1" step="1" value={f.qtd} onChange={e=>setF({...f,qtd:e.target.value})}/></div>
          <div><Lbl s="Data"/><input style={S.inp} type="date" value={f.data} onChange={e=>setF({...f,data:e.target.value})}/></div>
          <div><Lbl s="Canal"/><select style={S.inp} value={f.canal} onChange={e=>setF({...f,canal:e.target.value})}>{CANAIS.map(c=><option key={c}>{c}</option>)}</select></div>
          <div style={{ display:"flex",alignItems:"flex-end" }}><button style={S.btn} onClick={registrar}>+ Registrar</button></div>
        </G>
        <div><Lbl s="Observações (opcional)"/><input style={{ ...S.inp,maxWidth:480 }} placeholder="Ex: sem granola, entregar às 18h..." value={f.obs} onChange={e=>setF({...f,obs:e.target.value})}/></div>
        {f.fichaId&&f.qtd&&+f.qtd>0&&<div style={{ marginTop:10 }}><span style={{ fontSize:13,color:"#7c3aed",background:"#f5f3ff",padding:"5px 12px",borderRadius:8 }}>💰 Valor: <strong>{fR(getPreco(f.fichaId)*(+f.qtd))}</strong></span></div>}
      </Card>
      <G cols="repeat(5,1fr)" gap={12} mb={20}>
        <KPI label="📋 Total" value={pedidos.length} color="#3730a3"/><KPI label="⏳ Pendentes" value={pendentes} color="#d97706"/><KPI label="✅ Confirmados" value={confirmados} color="#059669"/><KPI label="❌ Cancelados" value={cancelados} color="#ef4444"/><KPI label="💵 Rec. Potencial" value={fR(recPot)} color="#7c3aed" sub="(pendentes)"/>
      </G>
      {canalCount.length>0&&<div style={{ background:"white",border:"1px solid #f3e8ff",borderRadius:10,padding:"12px 16px",marginBottom:20,display:"flex",gap:10,flexWrap:"wrap",alignItems:"center" }}><span style={{ fontSize:13,fontWeight:600,color:"#3730a3" }}>📡 Canais:</span>{canalCount.map(c=><span key={c.canal} style={{ background:"#f5f3ff",color:"#5b21b6",padding:"4px 12px",borderRadius:20,fontSize:13 }}>{c.canal}: <strong>{c.total}</strong></span>)}<span style={{ marginLeft:"auto",fontSize:13,color:"#059669",fontWeight:600 }}>Receita confirmada: {fR(recConf)}</span></div>}
      <Card title={`📋 Pedidos (${pedidos.length})`} right={<div style={{ display:"flex",gap:6 }}>{["Todos","Pendente","Confirmado","Cancelado"].map(s=><button key={s} onClick={()=>setFiltro(s)} style={{ ...S.bsm,background:filtro===s?"#7c3aed":"#f5f3ff",color:filtro===s?"white":"#7c3aed",fontWeight:filtro===s?700:500 }}>{s}</button>)}</div>}>
        <table style={{ width:"100%",borderCollapse:"collapse",fontSize:14 }}>
          <thead><tr>{["Data","Produto","Qtd","Canal","Valor","Obs.","Status","Ações"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {!lista.length&&<tr><td colSpan={8} style={{ ...S.td,textAlign:"center",color:"#9ca3af",padding:28 }}>Nenhum pedido {filtro!=="Todos"?`com status "${filtro}"`:"registrado"}.</td></tr>}
            {[...lista].sort((a,b)=>(b.data||"").localeCompare(a.data||"")).map(p=>{const fc=fichasCalc.find(f2=>f2.id===p.fichaId),estS=st(p.status);return(
              <tr key={p.id}><td style={S.td}>{p.data||"—"}</td><td style={{ ...S.td,fontWeight:500 }}>{fc?.nome||"—"}</td><td style={S.td}>{p.qtd} un</td><td style={S.td}><span style={{ background:"#ede9fe",color:"#5b21b6",padding:"2px 8px",borderRadius:20,fontSize:12 }}>{p.canal}</span></td><td style={{ ...S.td,fontWeight:600,color:"#7c3aed" }}>{fR(p.qtd*getPreco(p.fichaId))}</td><td style={{ ...S.td,fontSize:12,color:"#9ca3af",maxWidth:100,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{p.obs||"—"}</td><td style={S.td}><Pill label={estS.label} color={estS.color} bg={estS.bg}/></td>
                <td style={S.td}>{p.status==="Pendente"&&canConfirmar&&<button style={{ ...S.bsm,background:"#dcfce7",color:"#065f46",border:"1px solid #86efac",marginRight:4 }} onClick={()=>confirmar(p)}>✅ Confirmar</button>}{p.status==="Pendente"&&canConfirmar&&<button style={{ ...S.bsm,color:"#b45309",marginRight:4 }} onClick={()=>cancelar(p.id)}>✕ Cancelar</button>}{p.status==="Pendente"&&!canConfirmar&&<span style={{ fontSize:12,color:"#9ca3af" }}>Aguardando</span>}<button style={{ ...S.bsm,color:"#ef4444",marginLeft:4 }} onClick={()=>remover(p.id)}>🗑️</button></td>
              </tr>
            );})}
          </tbody>
        </table>
      </Card>
    </>
  );
}

// ── VENDAS ───────────────────────────────────────────────────────────────
function VendasTab({ vendas, setVendas, fichasCalc, getPreco, estoqueProdutoFn }) {
  const today = new Date().toISOString().slice(0,10);
  const blank = { fichaId:"",qtd:"",data:today };
  const [f, setF] = useState(blank);
  const totRec = vendas.reduce((s,v)=>s+v.qtd*getPreco(v.fichaId),0);
  function add() { if(!f.fichaId||!f.qtd||+f.qtd<=0)return alert("Selecione o produto e a quantidade."); const es=estoqueProdutoFn(f.fichaId); if(es<+f.qtd&&!window.confirm(`⚠️ Estoque: ${es} un. Vender mesmo assim?`))return; setVendas([...vendas,{id:uid(),fichaId:f.fichaId,qtd:+f.qtd,data:f.data}]); setF({...blank,data:f.data}); }
  function remover(id) { if(window.confirm("Remover venda?"))setVendas(vendas.filter(v=>v.id!==id)); }
  return (
    <>
      <Card title="🛒 Registrar Venda">
        {!fichasCalc.length?<p style={{ color:"#d97706",background:"#fffbeb",padding:10,borderRadius:8,fontSize:13 }}>⚠️ Cadastre produtos e produção primeiro.</p>:(
          <>
            <G cols="3fr 1fr 1fr auto" mb={8}>
              <div><Lbl s="Produto *"/><select style={S.inp} value={f.fichaId} onChange={e=>setF({...f,fichaId:e.target.value})}><option value="">Selecione...</option>{fichasCalc.map(p=><option key={p.id} value={p.id}>{p.nome} — {fR(getPreco(p.id))}/un · Est: {estoqueProdutoFn(p.id)} un</option>)}</select></div>
              <div><Lbl s="Quantidade *"/><input style={S.inp} type="number" min="1" step="1" value={f.qtd} onChange={e=>setF({...f,qtd:e.target.value})}/></div>
              <div><Lbl s="Data da venda"/><input style={S.inp} type="date" value={f.data} onChange={e=>setF({...f,data:e.target.value})}/></div>
              <div style={{ display:"flex",alignItems:"flex-end" }}><button style={S.btn} onClick={add}>+ Registrar</button></div>
            </G>
            {f.fichaId&&f.qtd&&+f.qtd>0&&<div style={{ display:"flex",gap:10,flexWrap:"wrap" }}><span style={{ fontSize:13,color:"#059669",background:"#ecfdf5",padding:"5px 12px",borderRadius:8 }}>💰 Receita: <strong>{fR(getPreco(f.fichaId)*(+f.qtd))}</strong></span><span style={{ fontSize:13,color:"#7c3aed",background:"#f5f3ff",padding:"5px 12px",borderRadius:8 }}>📦 Estoque após: <strong>{estoqueProdutoFn(f.fichaId)-(+f.qtd)} un</strong></span></div>}
          </>
        )}
      </Card>
      <G cols="1fr 1fr 1fr" gap={12} mb={20}><KPI label="📦 Total vendido" value={vendas.reduce((s,v)=>s+v.qtd,0)+" un"} color="#7c3aed"/><KPI label="🧾 Lançamentos" value={vendas.length} color="#4f46e5"/><KPI label="💵 Receita Total" value={fR(totRec)} color="#059669"/></G>
      <Card title={`📋 Vendas (${vendas.length})`}>
        <table style={{ width:"100%",borderCollapse:"collapse",fontSize:14 }}>
          <thead><tr>{["Produto","Qtd","Preço Unit.","Receita","Data","Ações"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {!vendas.length&&<tr><td colSpan={6} style={{ ...S.td,textAlign:"center",color:"#9ca3af",padding:28 }}>Nenhuma venda registrada.</td></tr>}
            {vendas.map(v=>{const fc=fichasCalc.find(p=>p.id===v.fichaId),pr=getPreco(v.fichaId);return(
              <tr key={v.id}><td style={{ ...S.td,fontWeight:500 }}>{fc?.nome||"—"}</td><td style={S.td}>{v.qtd} un</td><td style={S.td}>{fR(pr)}</td><td style={{ ...S.td,fontWeight:700,color:"#059669" }}>{fR(v.qtd*pr)}</td><td style={S.td}>{v.data||"—"}</td><td style={S.td}><button style={{ ...S.bsm,color:"#ef4444" }} onClick={()=>remover(v.id)}>🗑️</button></td></tr>
            );})}
            {vendas.length>0&&<tr style={{ background:"#ecfdf5" }}><td colSpan={3} style={{ ...S.td,fontWeight:700,textAlign:"right",color:"#065f46" }}>Receita Total:</td><td style={{ ...S.td,fontWeight:700,color:"#059669",fontSize:15 }}>{fR(totRec)}</td><td colSpan={2} style={S.td}/></tr>}
          </tbody>
        </table>
      </Card>
    </>
  );
}

// ── DESPESAS ─────────────────────────────────────────────────────────────
function DespesasTab({ despesas, setDespesas }) {
  const blank = { descricao:"",tipo:"Fixa",valor:"" };
  const [f, setF] = useState(blank);
  const [eid, setEid] = useState(null);
  function salvar() { if(!f.descricao.trim()||!f.valor||+f.valor<=0)return alert("Preencha todos os campos."); const it={id:eid||uid(),descricao:f.descricao.trim(),tipo:f.tipo,valor:+f.valor}; setDespesas(eid?despesas.map(d=>d.id===eid?it:d):[...despesas,it]); setF(blank);setEid(null); }
  function editar(d) { setF({descricao:d.descricao,tipo:d.tipo,valor:d.valor});setEid(d.id); }
  function remover(id) { if(window.confirm("Remover?"))setDespesas(despesas.filter(d=>d.id!==id)); }
  const fx=despesas.filter(d=>d.tipo==="Fixa").reduce((s,d)=>s+(+d.valor||0),0),vr=despesas.filter(d=>d.tipo==="Variável").reduce((s,d)=>s+(+d.valor||0),0);
  return (
    <>
      <Card title="➕ Nova Despesa">
        <G cols="3fr 1fr 1fr auto">
          <div><Lbl s="Descrição *"/><input style={S.inp} placeholder="Ex: Energia elétrica" value={f.descricao} onChange={e=>setF({...f,descricao:e.target.value})}/></div>
          <div><Lbl s="Tipo"/><select style={S.inp} value={f.tipo} onChange={e=>setF({...f,tipo:e.target.value})}><option>Fixa</option><option>Variável</option></select></div>
          <div><Lbl s="Valor mensal (R$) *"/><input style={S.inp} type="number" step="0.01" value={f.valor} onChange={e=>setF({...f,valor:e.target.value})}/></div>
          <div style={{ display:"flex",alignItems:"flex-end",gap:6 }}>{eid&&<button style={S.btn2} onClick={()=>{setF(blank);setEid(null)}}>✕</button>}<button style={S.btn} onClick={salvar}>{eid?"✓":"+"}</button></div>
        </G>
      </Card>
      <G cols="1fr 1fr 1fr" gap={12} mb={20}><KPI label="🔵 Fixas" value={fR(fx)} color="#1d4ed8"/><KPI label="🟡 Variáveis" value={fR(vr)} color="#d97706"/><KPI label="💰 Total" value={fR(fx+vr)} color="#7c3aed"/></G>
      <Card title={`🏢 Despesas (${despesas.length})`}>
        <table style={{ width:"100%",borderCollapse:"collapse",fontSize:14 }}>
          <thead><tr>{["Descrição","Tipo","Valor Mensal","Ações"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {!despesas.length&&<tr><td colSpan={4} style={{ ...S.td,textAlign:"center",color:"#9ca3af",padding:28 }}>Nenhuma despesa cadastrada.</td></tr>}
            {despesas.map(d=><tr key={d.id}><td style={{ ...S.td,fontWeight:500 }}>{d.descricao}</td><td style={S.td}><Pill label={d.tipo} color={d.tipo==="Fixa"?"#1d4ed8":"#b45309"} bg={d.tipo==="Fixa"?"#eff6ff":"#fffbeb"}/></td><td style={{ ...S.td,fontWeight:600 }}>{fR(d.valor)}</td><td style={S.td}><button style={S.bsm} onClick={()=>editar(d)}>✏️</button><button style={{ ...S.bsm,color:"#ef4444",marginLeft:6 }} onClick={()=>remover(d.id)}>🗑️</button></td></tr>)}
            {despesas.length>0&&<tr style={{ background:"#f5f3ff" }}><td colSpan={2} style={{ ...S.td,fontWeight:700,color:"#3730a3" }}>Total Mensal</td><td style={{ ...S.td,fontWeight:700,color:"#7c3aed" }}>{fR(fx+vr)}</td><td style={S.td}/></tr>}
          </tbody>
        </table>
      </Card>
    </>
  );
}

// ── DRE ──────────────────────────────────────────────────────────────────
function DRETab({ recBruta, cmv, lucBruto, totDesp, lucOp, mbPct, moPct, despesas }) {
  function exportCSV() { const rows=[["Descrição","Valor (R$)","% Receita"],["Receita Bruta",recBruta.toFixed(2),"100.0%"],["(-) CMV",(-cmv).toFixed(2),recBruta>0?fP(-cmv/recBruta*100):"-"],["(=) Lucro Bruto",lucBruto.toFixed(2),fP(mbPct)],...despesas.map(d=>[d.descricao,(-d.valor).toFixed(2),recBruta>0?fP(-d.valor/recBruta*100):"-"]),["(=) Lucro Operacional",lucOp.toFixed(2),fP(moPct)]]; const a=document.createElement("a");a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(rows.map(r=>r.join(";")).join("\n"));a.download="DRE_AcaiControl.csv";a.click(); }
  function Row({ label,value,indent=0,bold=false,color,bg,sep }) { return(<tr style={{ background:bg,borderTop:sep?"2px solid #ddd6fe":"none" }}><td style={{ ...S.td,paddingLeft:16+indent*20,fontWeight:bold?700:400,color:color||"#374151",fontSize:bold?15:14 }}>{label}</td><td style={{ ...S.td,textAlign:"right",fontWeight:bold?700:500,color:color||"#374151",fontSize:bold?15:14 }}>{fR(value)}</td><td style={{ ...S.td,textAlign:"right",fontSize:13,color:"#9ca3af" }}>{recBruta>0?fP(value/recBruta*100):"—"}</td></tr>); }
  return (
    <>
      <G cols="repeat(4,1fr)" gap={12} mb={20}><KPI label="💵 Receita Bruta" value={fR(recBruta)} color="#059669"/><KPI label="📈 Lucro Bruto" value={fR(lucBruto)} color={lucBruto>=0?"#7c3aed":"#ef4444"}/><KPI label="📊 Margem Bruta" value={fP(mbPct)} color={mbPct>=0?"#6d28d9":"#ef4444"}/><KPI label="🏆 Lucro Operacional" value={fR(lucOp)} color={lucOp>=0?"#1d4ed8":"#ef4444"}/></G>
      <Card title="📊 DRE — Demonstrativo de Resultado" right={<button style={S.btn2} onClick={exportCSV}>📥 Exportar CSV</button>}>
        <table style={{ width:"100%",borderCollapse:"collapse" }}>
          <thead><tr style={{ background:"#4c1d95" }}>{["Descrição","Valor (R$)","% Receita"].map(h=><th key={h} style={{ ...S.th,background:"#4c1d95",color:"white",textAlign:h!=="Descrição"?"right":"left" }}>{h}</th>)}</tr></thead>
          <tbody>
            <Row label="(+) RECEITA BRUTA" value={recBruta} bold color="#059669" bg="#f0fdf4"/>
            <Row label="(-) CMV" value={-cmv} indent={1} color="#dc2626"/>
            <Row label="(=) LUCRO BRUTO" value={lucBruto} bold bg="#f5f3ff" sep color={lucBruto>=0?"#7c3aed":"#ef4444"}/>
            <Row label="(-) DESPESAS OPERACIONAIS" value={-totDesp} bold color="#d97706" sep/>
            {despesas.map(d=><Row key={d.id} label={`${d.tipo==="Fixa"?"🔵":"🟡"} ${d.descricao}`} value={-d.valor} indent={2}/>)}
            <Row label="(=) LUCRO OPERACIONAL" value={lucOp} bold bg={lucOp>=0?"#ecfdf5":"#fef2f2"} sep color={lucOp>=0?"#059669":"#ef4444"}/>
            <tr style={{ background:"#f5f3ff" }}><td style={{ ...S.td,fontWeight:700,color:"#3730a3" }}>📐 Margem Operacional</td><td style={{ ...S.td,textAlign:"right",fontWeight:700,color:moPct>=0?"#7c3aed":"#ef4444",fontSize:16 }}>{fP(moPct)}</td><td style={S.td}/></tr>
          </tbody>
        </table>
      </Card>
    </>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────
function DashboardTab({ fichasCalc, vendas, margens, getPreco, recBruta, lucOp, totDesp, despesas }) {
  const porProd=fichasCalc.map(fc=>{const qtd=vendas.filter(v=>v.fichaId===fc.id).reduce((s,v)=>s+v.qtd,0),rec=qtd*getPreco(fc.id),cus=qtd*fc.custo;return{nome:fc.nome.length>14?fc.nome.slice(0,14)+"…":fc.nome,qtd,receita:rec,custo:cus,lucro:rec-cus,margem:+(margens[fc.id]??40)};}).filter(p=>p.qtd>0);
  const maisLuc=[...porProd].sort((a,b)=>b.lucro-a.lucro)[0];
  const margemMed=fichasCalc.length?fichasCalc.reduce((s,f)=>s+(+(margens[f.id]??40)),0)/fichasCalc.length:0;
  const totFix=despesas.filter(d=>d.tipo==="Fixa").reduce((s,d)=>s+(+d.valor||0),0);
  const avgMC=fichasCalc.length?fichasCalc.reduce((s,f)=>s+(getPreco(f.id)-f.custo),0)/fichasCalc.length:0;
  const be=avgMC>0?Math.ceil(totFix/avgMC):null;
  const cmvT=vendas.reduce((s,v)=>{const f=fichasCalc.find(p=>p.id===v.fichaId);return s+(f?v.qtd*f.custo:0);},0);
  const pie=[{name:"CMV",value:cmvT},{name:"Desp. Op.",value:totDesp},{name:"Lucro Op.",value:Math.max(0,lucOp)}].filter(d=>d.value>0);
  return (
    <>
      <G cols="repeat(2,1fr)" gap={12} mb={20}><KPI label="💵 Receita Total" value={fR(recBruta)} color="#059669"/><KPI label="📈 Lucro Operacional" value={fR(lucOp)} color={lucOp>=0?"#1d4ed8":"#ef4444"} sub={lucOp<0?"⚠️ Resultado negativo":""}/><KPI label="📊 Margem Média" value={fP(margemMed)} color="#6d28d9" sub={`${fichasCalc.length} produto(s)`}/><KPI label="🏆 Mais Lucrativo" value={maisLuc?.nome||"—"} color="#3730a3" sub={maisLuc?`Lucro: ${fR(maisLuc.lucro)}`:"Sem vendas"}/></G>
      {be!==null&&<div style={{ background:"#fefce8",border:"1px solid #fde68a",borderRadius:10,padding:16,marginBottom:20,display:"flex",gap:12 }}><span style={{ fontSize:28 }}>⚖️</span><div><p style={{ margin:"0 0 4px",fontWeight:700,color:"#78350f" }}>Ponto de Equilíbrio</p><p style={{ margin:0,fontSize:14,color:"#92400e" }}>Para cobrir despesas fixas de <strong>{fR(totFix)}/mês</strong>, venda ao menos <strong>{be} unidades/mês</strong>. MC média: <strong>{fR(avgMC)}/un</strong>.</p></div></div>}
      {!porProd.length?<div style={{ textAlign:"center",padding:"48px 24px",color:"#9ca3af",background:"white",borderRadius:12,border:"1px solid #f3e8ff" }}><span style={{ fontSize:52 }}>📊</span><p style={{ marginTop:12 }}>Registre vendas para visualizar os gráficos.</p></div>
      :<G cols="1fr 1fr" gap={20} mb={0}>
        <Card title="📦 Receita e Lucro por Produto"><ResponsiveContainer width="100%" height={220}><BarChart data={porProd}><CartesianGrid strokeDasharray="3 3" stroke="#f3e8ff"/><XAxis dataKey="nome" tick={{ fontSize:11 }}/><YAxis tickFormatter={v=>`R$${v.toFixed(0)}`} tick={{ fontSize:11 }}/><Tooltip formatter={v=>fR(v)}/><Bar dataKey="receita" name="Receita" fill="#7c3aed" radius={[4,4,0,0]}/><Bar dataKey="lucro" name="Lucro" fill="#a78bfa" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></Card>
        <Card title="🍩 Composição da Receita"><ResponsiveContainer width="100%" height={220}><PieChart><Pie data={pie} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={11}>{pie.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip formatter={v=>fR(v)}/></PieChart></ResponsiveContainer></Card>
      </G>}
    </>
  );
}

// ── APP PRINCIPAL ─────────────────────────────────────────────────────────
const DEFAULT_ADMIN = [{ id:"admin-root",nome:"admin",senha:"admin123",role:"Admin",ativo:true }];
const STORAGE_KEYS = ["ac4_usr","ac4_idef","ac4_ent","ac4_fic","ac4_mar","ac4_pre","ac4_des","ac4_prod","ac4_ped","ac4_ven"];
const STORAGE_DEFS = [DEFAULT_ADMIN,[],[],{},{},{},[],[],[],[]];

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [tab, setTab] = useState(0);
  const [usuarios, setUsuarios]     = useState(() => lsGet("ac4_usr", DEFAULT_ADMIN));
  const [idef, setIdef]             = useState(() => lsGet("ac4_idef", []));
  const [entradas, setEntradas]     = useState(() => lsGet("ac4_ent", []));
  const [fichas, setFichas]         = useState(() => lsGet("ac4_fic", []));
  const [margens, setMargens]       = useState(() => lsGet("ac4_mar", {}));
  const [precos, setPrecos]         = useState(() => lsGet("ac4_pre", {}));
  const [despesas, setDespesas]     = useState(() => lsGet("ac4_des", []));
  const [producoes, setProducoes]   = useState(() => lsGet("ac4_prod", []));
  const [pedidos, setPedidos]       = useState(() => lsGet("ac4_ped", []));
  const [vendas, setVendas]         = useState(() => lsGet("ac4_ven", []));

  // persist to localStorage whenever state changes
  useEffect(() => { lsSet("ac4_usr",  usuarios);  }, [usuarios]);
  useEffect(() => { lsSet("ac4_idef", idef);      }, [idef]);
  useEffect(() => { lsSet("ac4_ent",  entradas);  }, [entradas]);
  useEffect(() => { lsSet("ac4_fic",  fichas);    }, [fichas]);
  useEffect(() => { lsSet("ac4_mar",  margens);   }, [margens]);
  useEffect(() => { lsSet("ac4_pre",  precos);    }, [precos]);
  useEffect(() => { lsSet("ac4_des",  despesas);  }, [despesas]);
  useEffect(() => { lsSet("ac4_prod", producoes); }, [producoes]);
  useEffect(() => { lsSet("ac4_ped",  pedidos);   }, [pedidos]);
  useEffect(() => { lsSet("ac4_ven",  vendas);    }, [vendas]);

  function custMedioFn(iid) { const es=entradas.filter(e=>e.insumoId===iid); const tQ=es.reduce((s,e)=>s+e.qtd,0),tC=es.reduce((s,e)=>s+e.custoTotal,0); return tQ>0?tC/tQ:0; }
  function estoqueInsumoFn(iid) { const ins=idef.find(i=>i.id===iid);if(!ins)return 0; const tE=entradas.filter(e=>e.insumoId===iid).reduce((s,e)=>s+e.qtd,0); const tC=producoes.reduce((s,prod)=>{const fc=fichas.find(f=>f.id===prod.fichaId);if(!fc)return s;const m=(fc.ings||[]).find(i=>i.iid===iid);if(!m)return s;return s+cvt(m.qtd,m.un||ins.unidade,ins.unidade)*prod.qtdProduzida;},0); return tE-tC; }
  function estoqueProdutoFn(fichaId) { const p=producoes.filter(p=>p.fichaId===fichaId).reduce((s,p)=>s+p.qtdProduzida,0); const v=vendas.filter(v=>v.fichaId===fichaId).reduce((s,v)=>s+v.qtd,0); return p-v; }

  const idefComCusto=idef.map(ins=>({...ins,custMedio:custMedioFn(ins.id),estoque:estoqueInsumoFn(ins.id),totalEntradas:entradas.filter(e=>e.insumoId===ins.id).reduce((s,e)=>s+e.qtd,0),totalConsumido:producoes.reduce((s,prod)=>{const fc=fichas.find(f=>f.id===prod.fichaId);if(!fc)return s;const m=(fc.ings||[]).find(i=>i.iid===ins.id);if(!m)return s;return s+cvt(m.qtd,m.un||ins.unidade,ins.unidade)*prod.qtdProduzida;},0)}));
  const fichasCalc=fichas.map(f=>({...f,custo:(f.ings||[]).reduce((s,ing)=>{const ins=idef.find(i=>i.id===ing.iid);if(!ins)return s;return s+custMedioFn(ing.iid)*cvt(ing.qtd,ing.un||ins.unidade,ins.unidade);},0)}));
  function getPreco(fid) { if(precos[fid]!=null)return precos[fid]; const f=fichasCalc.find(p=>p.id===fid),m=+(margens[fid]??40); return f&&m<100?f.custo/(1-m/100):0; }

  const recBruta=vendas.reduce((s,v)=>s+v.qtd*getPreco(v.fichaId),0);
  const cmv=vendas.reduce((s,v)=>{const f=fichasCalc.find(p=>p.id===v.fichaId);return s+(f?v.qtd*f.custo:0);},0);
  const lucBruto=recBruta-cmv,totDesp=despesas.reduce((s,d)=>s+(+d.valor||0),0),lucOp=lucBruto-totDesp;
  const mbPct=recBruta>0?lucBruto/recBruta*100:0,moPct=recBruta>0?lucOp/recBruta*100:0;

  const ALL_TABS=["🧂 Insumos","📥 Compras","📦 Estoque","📋 Fichas","💰 Preços","🏭 Produção","📝 Pedidos","🛒 Vendas","🏢 Despesas","📊 DRE","🎯 Dashboard","👥 Usuários"];
  const ALL_BADGES=[idef.length,entradas.length,null,fichas.length,null,producoes.length,pedidos.filter(p=>p.status==="Pendente").length,vendas.length,despesas.length,null,null,usuarios.length];

  if (!currentUser) return <LoginScreen usuarios={usuarios} onLogin={u=>{setCurrentUser(u);setTab(PERMS[u.role].tabs[0]);}} />;

  const role=currentUser.role,perm=PERMS[role];
  const visibleTabs=ALL_TABS.map((t,i)=>({label:t,idx:i,badge:ALL_BADGES[i]})).filter(t=>canTab(role,t.idx));

  return (
    <div style={{ fontFamily:"system-ui,-apple-system,sans-serif",minHeight:"100vh",background:"#f5f3ff" }}>
      <div style={{ background:"linear-gradient(135deg,#6d28d9,#4338ca)",color:"white",padding:"14px 24px",boxShadow:"0 4px 16px rgba(109,40,217,.3)" }}>
        <div style={{ maxWidth:1300,margin:"0 auto",display:"flex",alignItems:"center",gap:12 }}>
          <span style={{ fontSize:36 }}>🫐</span>
          <div><h1 style={{ margin:0,fontSize:22,fontWeight:800 }}>NaGarrafa</h1><p style={{ margin:0,fontSize:12,opacity:.75 }}>Estoque · Custo Médio · Produção · DRE</p></div>
          <div style={{ marginLeft:"auto",display:"flex",gap:12,alignItems:"center" }}>
            <div style={{ fontSize:13,opacity:.85,display:"flex",gap:16 }}><span>Receita: <strong>{fR(recBruta)}</strong></span><span style={{ color:lucOp>=0?"#86efac":"#fca5a5" }}>Resultado: <strong>{fR(lucOp)}</strong></span></div>
            <div style={{ display:"flex",alignItems:"center",gap:8,background:"rgba(255,255,255,.15)",borderRadius:20,padding:"6px 14px" }}>
              <span style={{ fontSize:13,fontWeight:600 }}>👤 {currentUser.nome}</span>
              <Pill label={role} color={ROLE_COLORS[role].color} bg={ROLE_COLORS[role].bg}/>
              <button onClick={()=>setCurrentUser(null)} style={{ background:"rgba(255,255,255,.2)",border:"none",color:"white",cursor:"pointer",borderRadius:6,padding:"3px 8px",fontSize:12 }}>Sair</button>
            </div>
          </div>
        </div>
      </div>
      <div style={{ background:"white",borderBottom:"1px solid #e9d5ff",overflowX:"auto" }}>
        <div style={{ maxWidth:1300,margin:"0 auto",display:"flex" }}>
          {visibleTabs.map(t=>(
            <button key={t.idx} onClick={()=>setTab(t.idx)} style={{ padding:"12px 12px",fontSize:13,fontWeight:500,border:"none",background:"transparent",cursor:"pointer",whiteSpace:"nowrap",borderBottom:tab===t.idx?"2px solid #7c3aed":"2px solid transparent",color:tab===t.idx?"#7c3aed":"#6b7280",display:"flex",alignItems:"center",gap:5 }}>
              {t.label}{t.badge>0&&<span style={{ fontSize:11,background:tab===t.idx?"#7c3aed":"#e9d5ff",color:tab===t.idx?"white":"#7c3aed",padding:"1px 6px",borderRadius:10,fontWeight:700 }}>{t.badge}</span>}
            </button>
          ))}
        </div>
      </div>
      <div style={{ maxWidth:1300,margin:"0 auto",padding:"20px 20px 40px" }}>
        {tab===0  && <InsumosDefTab idef={idef} setIdef={setIdef}/>}
        {tab===1  && <ComprasTab entradas={entradas} setEntradas={setEntradas} idef={idef}/>}
        {tab===2  && <EstoqueTab idefComCusto={idefComCusto}/>}
        {tab===3  && <FichasTab fichas={fichas} fichasCalc={fichasCalc} setFichas={setFichas} idef={idef} custMedioFn={custMedioFn}/>}
        {tab===4  && <PrecosTab fichasCalc={fichasCalc} margens={margens} sm={setMargens} getPreco={getPreco} precos={precos} sp={setPrecos} canEdit={perm.editPrecos}/>}
        {tab===5  && <ProducaoTab producoes={producoes} setProducoes={setProducoes} fichasCalc={fichasCalc} idef={idef} estoqueInsumoFn={estoqueInsumoFn} estoqueProdutoFn={estoqueProdutoFn}/>}
        {tab===6  && <PedidosTab pedidos={pedidos} setPedidos={setPedidos} fichasCalc={fichasCalc} getPreco={getPreco} setVendas={setVendas} vendas={vendas} estoqueProdutoFn={estoqueProdutoFn} canConfirmar={perm.canConfirmarPedido}/>}
        {tab===7  && <VendasTab vendas={vendas} setVendas={setVendas} fichasCalc={fichasCalc} getPreco={getPreco} estoqueProdutoFn={estoqueProdutoFn}/>}
        {tab===8  && <DespesasTab despesas={despesas} setDespesas={setDespesas}/>}
        {tab===9  && <DRETab recBruta={recBruta} cmv={cmv} lucBruto={lucBruto} totDesp={totDesp} lucOp={lucOp} mbPct={mbPct} moPct={moPct} despesas={despesas}/>}
        {tab===10 && <DashboardTab fichasCalc={fichasCalc} vendas={vendas} margens={margens} getPreco={getPreco} recBruta={recBruta} lucOp={lucOp} totDesp={totDesp} despesas={despesas}/>}
        {tab===11 && <UsuariosTab usuarios={usuarios} setUsuarios={setUsuarios} currentUser={currentUser}/>}
      </div>
    </div>
  );
}
