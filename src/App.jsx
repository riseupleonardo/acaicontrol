import { useState, useEffect, useRef, Fragment } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const uid = () => Math.random().toString(36).slice(2, 9);
const fR  = v => `R$ ${(+v||0).toFixed(2).replace(".",",")}`;
const fP  = v => `${(+v||0).toFixed(1)}%`;
const UNITS  = ["kg","g","litro","L","ml","unidade","cx","pct"];
const COLORS = ["#7c3aed","#8b5cf6","#a78bfa","#6d28d9","#c4b5fd","#4c1d95","#5b21b6"];
const CANAIS = ["Presencial","WhatsApp","Instagram","iFood","Telefone","Outro"];
const MESES  = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const PAGAMENTOS_SAIDA  = ["Pix RiseUp","Cartão Léo","Cartão Victor","Dinheiro"];
const PAGAMENTOS_ENTRADA= ["Dinheiro","Pix","Cartão"];
const PAG_CORES = {
  "Pix RiseUp":  {bg:"#ede9fe",c:"#5b21b6"},
  "Cartão Léo":  {bg:"#dbeafe",c:"#1e40af"},
  "Cartão Victor":{bg:"#fce7f3",c:"#9d174d"},
  "Dinheiro":    {bg:"#dcfce7",c:"#065f46"},
  "Pix":         {bg:"#ede9fe",c:"#5b21b6"},
  "Cartão":      {bg:"#dbeafe",c:"#1e40af"},
};
const COMPAT = {kg:["kg","g"],g:["g","kg"],litro:["litro","L","ml"],L:["litro","L","ml"],ml:["ml","litro","L"],unidade:["unidade"],cx:["cx"],pct:["pct"]};
const FACTORS = {kg:1,g:0.001,litro:1,L:1,ml:0.001};
const cvt = (qty,from,to) => { if(from===to)return qty; const f=FACTORS[from],t=FACTORS[to]; return (f!=null&&t!=null)?qty*f/t:qty; };
const compatUnits = base => COMPAT[base]||[base];
// Normaliza pedidos/vendas antigos (fichaId/qtd) e novos (items:[])
const getItems = r => (r.items&&r.items.length) ? r.items : (r.fichaId ? [{fichaId:r.fichaId,qtd:r.qtd,id:r.id}] : []);
// Normaliza entradas antigas (item direto) e novas (compra com items:[])
const flatEntradas = ents => ents.flatMap(e=>
  e.items ? e.items.map(it=>({...it,data:e.data,pagamento:e.pagamento,compraId:e.id})) : [e]
);

const ROLES = {Admin:"Admin",Comprador:"Comprador",Vendedor:"Vendedor"};
const ROLE_COLORS = {Admin:{bg:"#ede9fe",color:"#5b21b6"},Comprador:{bg:"#dbeafe",color:"#1e40af"},Vendedor:{bg:"#dcfce7",color:"#166534"}};
const PERMS = {
  Admin:     {tabs:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14],editPrecos:true, canConfirmarPedido:true},
  Comprador: {tabs:[1,2,5,6,7,12,13,14],                 editPrecos:false,canConfirmarPedido:true},
  Vendedor:  {tabs:[4,6,13],                              editPrecos:false,canConfirmarPedido:false},
};
const canTab = (role,idx) => PERMS[role]?.tabs.includes(idx)??false;

const CSS_VARS = `
:root{--bg:#f5f3ff;--card:#fff;--card2:#f9f7ff;--border:#f3e8ff;--border2:#ddd6fe;--border3:#e9d5ff;--border4:#f3f4f6;--text:#1f2937;--text2:#374151;--text3:#6b7280;--text4:#9ca3af;--thead-bg:#f5f3ff;--thead-c:#5b21b6;--inp:#fff;--btn2-bg:#f5f3ff;--bsm-bg:#f5f3ff;--shadow:rgba(124,58,237,.08);--tab-border:#e9d5ff;--tab-bg:#fff;--accent-soft:#f5f3ff;--accent-soft-c:#7c3aed;}
[data-theme="dark"]{--bg:#0d0d1a;--card:#16162e;--card2:#111128;--border:#252050;--border2:#3a306a;--border3:#2a2058;--border4:#1e1e38;--text:#e2e8f0;--text2:#cbd5e1;--text3:#94a3b8;--text4:#64748b;--thead-bg:#1a1042;--thead-c:#a78bfa;--inp:#0e0e22;--btn2-bg:#1a1040;--bsm-bg:#1a1040;--shadow:rgba(0,0,0,.3);--tab-border:#252050;--tab-bg:#16162e;--accent-soft:#1e1040;--accent-soft-c:#a78bfa;}
`;

function lsGet(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch{return d;}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){console.warn(e);}}

const S = {
  inp: {padding:"8px 12px",border:"1px solid var(--border2)",borderRadius:8,fontSize:14,outline:"none",width:"100%",boxSizing:"border-box",color:"var(--text)",background:"var(--inp)"},
  btn: {padding:"9px 18px",background:"#7c3aed",color:"white",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600,whiteSpace:"nowrap"},
  btn2:{padding:"9px 18px",background:"var(--btn2-bg)",color:"#7c3aed",border:"1px solid var(--border2)",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:500},
  bsm: {padding:"4px 10px",background:"var(--bsm-bg)",color:"#7c3aed",border:"1px solid var(--border2)",borderRadius:6,cursor:"pointer",fontSize:12},
  td:  {padding:"10px 12px",color:"var(--text2)",borderBottom:"1px solid var(--border4)",verticalAlign:"middle"},
  th:  {padding:"9px 12px",textAlign:"left",color:"var(--thead-c)",fontWeight:600,borderBottom:"1px solid var(--border3)",background:"var(--thead-bg)",fontSize:12,textTransform:"uppercase",letterSpacing:".5px"},
  lbl: {fontSize:12,color:"var(--text3)",display:"block",marginBottom:4,fontWeight:500},
};

function Card({title,children,right}){
  return(
    <div style={{background:"var(--card)",borderRadius:12,boxShadow:"0 2px 8px var(--shadow)",border:"1px solid var(--border)",padding:20,marginBottom:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <h2 style={{margin:0,fontSize:15,fontWeight:700,color:"#7c3aed"}}>{title}</h2>
        {right}
      </div>
      {children}
    </div>
  );
}
function Lbl({s}){return <label style={S.lbl}>{s}</label>;}
function G({cols,gap=10,mb=12,children}){return <div style={{display:"grid",gridTemplateColumns:cols,gap,marginBottom:mb}}>{children}</div>;}
function Pill({label,color,bg}){return <span style={{background:bg,color,padding:"2px 10px",borderRadius:20,fontSize:12,fontWeight:600}}>{label}</span>;}
function KPI({label,value,sub,color="#3730a3"}){
  return(
    <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:10,padding:16,textAlign:"center"}}>
      <p style={{margin:0,fontSize:12,color:"var(--text4)"}}>{label}</p>
      <p style={{margin:"6px 0 2px",fontSize:20,fontWeight:700,color}}>{value}</p>
      {sub&&<p style={{margin:0,fontSize:12,color:"var(--text4)"}}>{sub}</p>}
    </div>
  );
}

function LoginScreen({usuarios,onLogin}){
  const [user,setUser]=useState("");const [pass,setPass]=useState("");const [err,setErr]=useState("");
  function tentar(){const u=usuarios.find(u=>u.nome.toLowerCase()===user.toLowerCase()&&u.senha===pass);if(!u){setErr("Usuário ou senha incorretos.");return;}if(!u.ativo){setErr("Usuário inativo.");return;}onLogin(u);}
  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#020208,#080518)",display:"flex",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(124,58,237,.15),transparent 70%)",top:"20%",left:"30%",pointerEvents:"none"}}/>
      <div style={{position:"absolute",width:300,height:300,borderRadius:"50%",background:"radial-gradient(circle,rgba(67,56,202,.12),transparent 70%)",bottom:"15%",right:"25%",pointerEvents:"none"}}/>
      <div style={{background:"rgba(22,22,46,0.85)",backdropFilter:"blur(12px)",borderRadius:20,padding:44,width:380,boxShadow:"0 25px 60px rgba(0,0,0,.6)",border:"1px solid rgba(124,58,237,.25)",position:"relative",zIndex:1}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:60,filter:"drop-shadow(0 0 20px rgba(124,58,237,.6))"}}>🫐</div>
          <h1 style={{margin:"12px 0 6px",fontSize:28,fontWeight:800,color:"#fff",letterSpacing:"-1px"}}>NaGarrafa</h1>
          <p style={{margin:0,fontSize:13,color:"rgba(255,255,255,.45)"}}>Sistema de Gestão</p>
        </div>
        <div style={{marginBottom:14}}><label style={{fontSize:12,color:"rgba(255,255,255,.5)",display:"block",marginBottom:5,fontWeight:500,textTransform:"uppercase"}}>Usuário</label><input style={{...S.inp,background:"rgba(255,255,255,.07)",border:"1px solid rgba(124,58,237,.35)",color:"#fff",borderRadius:10}} placeholder="Nome de usuário" value={user} onChange={e=>{setUser(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&tentar()}/></div>
        <div style={{marginBottom:24}}><label style={{fontSize:12,color:"rgba(255,255,255,.5)",display:"block",marginBottom:5,fontWeight:500,textTransform:"uppercase"}}>Senha</label><input style={{...S.inp,background:"rgba(255,255,255,.07)",border:"1px solid rgba(124,58,237,.35)",color:"#fff",borderRadius:10}} type="password" placeholder="••••••••" value={pass} onChange={e=>{setPass(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&tentar()}/></div>
        {err&&<p style={{margin:"0 0 16px",fontSize:13,color:"#fca5a5",background:"rgba(239,68,68,.15)",padding:"10px 14px",borderRadius:10,border:"1px solid rgba(239,68,68,.3)"}}>⚠️ {err}</p>}
        <button style={{...S.btn,width:"100%",padding:13,fontSize:15,borderRadius:10,background:"linear-gradient(135deg,#7c3aed,#5b21b6)",boxShadow:"0 4px 20px rgba(124,58,237,.4)"}} onClick={tentar}>Entrar</button>
      </div>
    </div>
  );
}

function UsuariosTab({usuarios,setUsuarios,currentUser}){
  const blank={nome:"",senha:"",role:"Vendedor",ativo:true};const [f,setF]=useState(blank);const [eid,setEid]=useState(null);const [showPass,setShowPass]=useState({});
  function salvar(){if(!f.nome.trim())return alert("Informe o nome.");if(!eid&&!f.senha.trim())return alert("Informe a senha.");if(!eid&&usuarios.find(u=>u.nome.toLowerCase()===f.nome.toLowerCase()))return alert("Usuário já existe.");const it=eid?usuarios.find(u=>u.id===eid):{id:uid()};const up={...it,nome:f.nome.trim(),role:f.role,ativo:f.ativo,...(f.senha?{senha:f.senha}:{})};setUsuarios(eid?usuarios.map(u=>u.id===eid?up:u):[...usuarios,up]);setF(blank);setEid(null);}
  function editar(u){setF({nome:u.nome,senha:"",role:u.role,ativo:u.ativo});setEid(u.id);}
  function remover(id){if(id===currentUser.id)return alert("Não pode remover seu próprio usuário.");if(window.confirm("Remover?"))setUsuarios(usuarios.filter(u=>u.id!==id));}
  function toggle(id){if(id===currentUser.id)return alert("Não pode desativar seu próprio usuário.");setUsuarios(usuarios.map(u=>u.id===id?{...u,ativo:!u.ativo}:u));}
  return(<>
    <Card title={eid?"✏️ Editar Usuário":"➕ Novo Usuário"}>
      <G cols="2fr 2fr 1fr 1fr auto">
        <div><Lbl s="Nome *"/><input style={S.inp} placeholder="Ex: Maria" value={f.nome} onChange={e=>setF({...f,nome:e.target.value})}/></div>
        <div><Lbl s={eid?"Nova senha (em branco p/ manter)":"Senha *"}/><input style={S.inp} type="password" placeholder={eid?"••••••":"Mínimo 4 caracteres"} value={f.senha} onChange={e=>setF({...f,senha:e.target.value})}/></div>
        <div><Lbl s="Perfil"/><select style={S.inp} value={f.role} onChange={e=>setF({...f,role:e.target.value})}>{Object.keys(ROLES).map(r=><option key={r}>{r}</option>)}</select></div>
        <div><Lbl s="Status"/><select style={S.inp} value={f.ativo?"Ativo":"Inativo"} onChange={e=>setF({...f,ativo:e.target.value==="Ativo"})}><option>Ativo</option><option>Inativo</option></select></div>
        <div style={{display:"flex",alignItems:"flex-end",gap:6}}>{eid&&<button style={S.btn2} onClick={()=>{setF(blank);setEid(null)}}>✕</button>}<button style={S.btn} onClick={salvar}>{eid?"✓":"+"}</button></div>
      </G>
    </Card>
    <Card title="🔐 Matriz de Permissões">
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
        <thead><tr><th style={S.th}>Funcionalidade</th>{Object.keys(ROLES).map(r=><th key={r} style={{...S.th,textAlign:"center"}}><Pill label={r} color={ROLE_COLORS[r].color} bg={ROLE_COLORS[r].bg}/></th>)}</tr></thead>
        <tbody>{[["🧂 Insumos / 📋 Fichas",true,false,false],["📥 Compras",true,true,false],["📦 Estoque",true,true,false],["🏭 Produção",true,true,false],["💰 Preços — Editar",true,false,false],["💰 Preços — Visualizar",true,false,true],["📝 Pedidos",true,true,true],["🛒 Vendas",true,true,false],["✅ Confirmar Pedidos",true,true,false],["🏢 Despesas",true,false,false],["📊 DRE / 🎯 Dashboard",true,false,false],["🛍️ Lista de Compras",true,true,false],["👥 Gerenciar Usuários",true,false,false]].map(([label,a,b,c])=>(
          <tr key={label}><td style={{...S.td,fontWeight:500}}>{label}</td>{[a,b,c].map((v,i)=><td key={i} style={{...S.td,textAlign:"center"}}>{v?"✅":<span style={{color:"var(--border4)"}}>—</span>}</td>)}</tr>
        ))}</tbody>
      </table>
    </Card>
    <Card title={`👥 Usuários (${usuarios.length})`}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:14}}>
        <thead><tr>{["Usuário","Perfil","Senha","Status","Ações"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
        <tbody>{usuarios.map(u=>(
          <tr key={u.id}>
            <td style={{...S.td,fontWeight:600}}>{u.nome}{u.id===currentUser.id&&<span style={{fontSize:11,color:"#7c3aed",background:"var(--accent-soft)",padding:"1px 6px",borderRadius:10,marginLeft:4}}>você</span>}</td>
            <td style={S.td}><Pill label={u.role} color={ROLE_COLORS[u.role].color} bg={ROLE_COLORS[u.role].bg}/></td>
            <td style={S.td}><span style={{fontFamily:"monospace",letterSpacing:2,color:"var(--text4)"}}>{showPass[u.id]?u.senha:"••••••"}</span><button style={{...S.bsm,marginLeft:6,fontSize:11}} onClick={()=>setShowPass(p=>({...p,[u.id]:!p[u.id]}))}>{showPass[u.id]?"🙈":"👁️"}</button></td>
            <td style={S.td}><button onClick={()=>toggle(u.id)} style={{...S.bsm,background:u.ativo?"#dcfce7":"var(--card2)",color:u.ativo?"#065f46":"var(--text3)"}}>{u.ativo?"✅ Ativo":"⚪ Inativo"}</button></td>
            <td style={S.td}><button style={S.bsm} onClick={()=>editar(u)}>✏️</button><button style={{...S.bsm,color:"#ef4444",marginLeft:6}} onClick={()=>remover(u.id)}>🗑️</button></td>
          </tr>
        ))}</tbody>
      </table>
    </Card>
  </>);
}

// ── INSUMOS — agora com campo capacidadeUnitaria ──────────────────────────
function InsumosDefTab({idef,setIdef}){
  const blank={nome:"",unidade:"kg",capacidadeUnitaria:""};
  const [f,setF]=useState(blank);const [eid,setEid]=useState(null);
  function salvar(){
    if(!f.nome.trim())return alert("Informe o nome.");
    const it={
      id:eid||uid(),
      nome:f.nome.trim(),
      unidade:f.unidade,
      capacidadeUnitaria:f.capacidadeUnitaria&&+f.capacidadeUnitaria>0?+f.capacidadeUnitaria:null
    };
    setIdef(eid?idef.map(i=>i.id===eid?it:i):[...idef,it]);
    setF(blank);setEid(null);
  }
  return(<>
    <Card title="➕ Cadastrar Insumo">
      <p style={{margin:"0 0 14px",fontSize:13,color:"var(--text3)"}}>
        Cadastre os ingredientes usados na produção. A <strong>capacidade unitária</strong> representa o tamanho da embalagem comercial (ex: 1 kg por pacote) — usada para sugerir quantidades de compra sem sobra.
      </p>
      <G cols="2.5fr 1fr 1fr auto">
        <div><Lbl s="Nome *"/><input style={S.inp} placeholder="Ex: Polpa de Açaí" value={f.nome} onChange={e=>setF({...f,nome:e.target.value})}/></div>
        <div><Lbl s="Unidade"/><select style={S.inp} value={f.unidade} onChange={e=>setF({...f,unidade:e.target.value})}>{UNITS.map(u=><option key={u}>{u}</option>)}</select></div>
        <div>
          <Lbl s="Cap. unitária (embalagem)"/>
          <div style={{position:"relative"}}>
            <input style={{...S.inp,paddingRight:36}} type="number" step="0.001" min="0" placeholder={`Ex: 1 (${f.unidade})`} value={f.capacidadeUnitaria} onChange={e=>setF({...f,capacidadeUnitaria:e.target.value})}/>
            <span style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",fontSize:12,color:"var(--text4)",pointerEvents:"none"}}>{f.unidade}</span>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"flex-end",gap:6}}>
          {eid&&<button style={S.btn2} onClick={()=>{setF(blank);setEid(null)}}>✕</button>}
          <button style={S.btn} onClick={salvar}>{eid?"✓ Atualizar":"+ Adicionar"}</button>
        </div>
      </G>
      <p style={{margin:"8px 0 0",fontSize:12,color:"var(--text4)"}}>💡 Dica: se o açaí vem em pacotes de 1 kg, informe 1. Se vem em embalagens de 500 g, informe 0.5 (em kg) ou 500 (em g).</p>
    </Card>
    <Card title={`📋 Insumos (${idef.length})`}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:14}}>
        <thead><tr>{["Insumo","Unidade","Cap. Unitária (embalagem)","Ações"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
        <tbody>
          {!idef.length&&<tr><td colSpan={4} style={{...S.td,textAlign:"center",color:"var(--text4)",padding:32}}>Nenhum insumo cadastrado. Adicione acima 👆</td></tr>}
          {idef.map(i=>(
            <tr key={i.id}>
              <td style={{...S.td,fontWeight:500}}>{i.nome}</td>
              <td style={S.td}>{i.unidade}</td>
              <td style={S.td}>
                {i.capacidadeUnitaria
                  ? <span style={{background:"var(--accent-soft)",color:"#7c3aed",padding:"2px 10px",borderRadius:20,fontSize:12,fontWeight:600}}>{i.capacidadeUnitaria} {i.unidade}/emb.</span>
                  : <span style={{color:"var(--text4)",fontSize:12}}>— não definida</span>}
              </td>
              <td style={S.td}>
                <button style={S.bsm} onClick={()=>{setF({nome:i.nome,unidade:i.unidade,capacidadeUnitaria:i.capacidadeUnitaria||""});setEid(i.id)}}>✏️</button>
                <button style={{...S.bsm,color:"#ef4444",marginLeft:6}} onClick={()=>{if(window.confirm("Remover?"))setIdef(idef.filter(x=>x.id!==i.id))}}>🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  </>);
}

function ComprasTab({entradas,setEntradas,idef,custMedioFn}){
  const today=new Date().toISOString().slice(0,10);
  // Cabeçalho da compra
  const blankH={data:today,pagamento:"Pix RiseUp",fornecedor:""};
  // Item do carrinho
  const blankItem={insumoId:"",numEmb:"",precoUnit:""};
  const [h,setH]=useState(blankH);
  const [nItem,setNItem]=useState(blankItem);
  const [carrinho,setCarrinho]=useState([]);
  const [expanded,setExpanded]=useState({});

  const ins=idef.find(i=>i.id===nItem.insumoId);
  const cap=ins?.capacidadeUnitaria;
  const qtdItem=cap&&+nItem.numEmb>0?+nItem.numEmb*+cap:+nItem.numEmb||0;
  const custoItem=+nItem.numEmb>0&&+nItem.precoUnit>0?+nItem.numEmb*(+nItem.precoUnit):0;

  // Normaliza todas as entradas para cálculo de CM (usa flatEntradas global)
  const flatEnt=flatEntradas(entradas);
  function cmAtual(iid){const es=flatEnt.filter(e=>e.insumoId===iid);const tQ=es.reduce((s,e)=>s+e.qtd,0),tC=es.reduce((s,e)=>s+e.custoTotal,0);return tQ>0?tC/tQ:0;}

  function addItem(){
    if(!nItem.insumoId)return alert("Selecione o insumo.");
    if(!nItem.numEmb||+nItem.numEmb<=0)return alert("Informe a quantidade.");
    if(!nItem.precoUnit||+nItem.precoUnit<=0)return alert("Informe o preço.");
    const qtd=+qtdItem.toFixed(6);
    const custo=+custoItem.toFixed(4);
    const ex=carrinho.find(i=>i.insumoId===nItem.insumoId);
    if(ex){
      setCarrinho(carrinho.map(i=>i.insumoId===nItem.insumoId
        ?{...i,numEmb:i.numEmb+(+nItem.numEmb),qtd:i.qtd+qtd,custoTotal:i.custoTotal+custo}:i));
    } else {
      setCarrinho([...carrinho,{
        id:uid(),insumoId:nItem.insumoId,
        numEmb:+nItem.numEmb,precoUnit:+nItem.precoUnit,
        capUsada:cap||null,qtd,custoTotal:custo,
      }]);
    }
    setNItem(blankItem);
  }

  function removerItem(id){setCarrinho(carrinho.filter(i=>i.id!==id));}

  function salvarCompra(){
    if(!h.fornecedor.trim())return alert("Informe o fornecedor/estabelecimento.");
    if(!carrinho.length)return alert("Adicione ao menos um item à compra.");
    const totalCompra=carrinho.reduce((s,i)=>s+i.custoTotal,0);
    setEntradas([...entradas,{
      id:uid(),data:h.data,pagamento:h.pagamento,fornecedor:h.fornecedor.trim(),
      items:carrinho,totalCompra:+totalCompra.toFixed(4),
    }]);
    setCarrinho([]);
    setH({...blankH,data:h.data,pagamento:h.pagamento});
  }

  // Normaliza histórico: novas compras (items[]) e antigas (item direto)
  const comprasHist=[...entradas].sort((a,b)=>(b.data||"").localeCompare(a.data||"")).map(e=>{
    if(e.items){
      return{id:e.id,data:e.data,pagamento:e.pagamento,fornecedor:e.fornecedor||"—",
        items:e.items,total:e.totalCompra||e.items.reduce((s,i)=>s+i.custoTotal,0)};
    }
    // Compatibilidade: entrada antiga = 1 item
    const i2=idef.find(i=>i.id===e.insumoId);
    return{id:e.id,data:e.data,pagamento:e.pagamento||"—",fornecedor:"—",
      items:[{...e,nome:i2?.nome}],total:e.custoTotal};
  });

  const totalCarrinho=carrinho.reduce((s,i)=>s+i.custoTotal,0);
  const prontoPraAdicionar=nItem.insumoId&&+nItem.numEmb>0&&+nItem.precoUnit>0;
  const prontoPraSalvar=carrinho.length>0&&h.fornecedor.trim();

  return(<>
    {!idef.length&&<div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:10,padding:14,marginBottom:16,color:"#92400e",fontSize:13}}>⚠️ Cadastre insumos antes de registrar compras.</div>}

    <Card title="📥 Nova Compra">
      {/* ── Cabeçalho: data, fornecedor, pagamento ── */}
      <G cols="1fr 2fr 1fr" gap={10} mb={12}>
        <div><Lbl s="📅 Data da compra"/><input style={S.inp} type="date" value={h.data} onChange={e=>setH({...h,data:e.target.value})}/></div>
        <div><Lbl s="🏪 Fornecedor / Estabelecimento *"/><input style={S.inp} placeholder="Ex: Mercadão, Açaí do Norte..." value={h.fornecedor} onChange={e=>setH({...h,fornecedor:e.target.value})}/></div>
        <div><Lbl s="💳 Meio de pagamento"/><select style={S.inp} value={h.pagamento} onChange={e=>setH({...h,pagamento:e.target.value})}>{PAGAMENTOS_SAIDA.map(p=><option key={p}>{p}</option>)}</select></div>
      </G>

      <hr style={{border:"none",borderTop:"1px solid var(--border)",margin:"0 0 14px"}}/>

      {/* ── Adicionar itens ── */}
      <p style={{margin:"0 0 10px",fontSize:13,fontWeight:700,color:"#7c3aed"}}>🛒 Itens da Compra</p>
      <div style={{background:"var(--card2)",border:"1px solid var(--border3)",borderRadius:10,padding:14,marginBottom:12}}>
        <G cols="2.5fr 1fr 1fr auto" gap={8} mb={0}>
          <div>
            <Lbl s="Insumo"/>
            <select style={S.inp} value={nItem.insumoId} onChange={e=>setNItem({...blankItem,insumoId:e.target.value})}>
              <option value="">Selecione...</option>
              {idef.map(i=>{
                const c=cmAtual(i.id);
                const capInfo=i.capacidadeUnitaria?` · emb. ${i.capacidadeUnitaria} ${i.unidade}`:"";
                return<option key={i.id} value={i.id}>{i.nome} ({i.unidade}){capInfo}{c>0?" — CM: "+fR(c):""}</option>;
              })}
            </select>
          </div>
          <div>
            <Lbl s={cap?"Qtd. embalagens":"Quantidade"}/>
            <input style={S.inp} type="number" step="1" min="1" placeholder={cap?"Ex: 5":"Ex: 10"}
              value={nItem.numEmb} onChange={e=>setNItem({...nItem,numEmb:e.target.value})}
              onKeyDown={e=>e.key==="Enter"&&addItem()}/>
            {cap&&+nItem.numEmb>0&&<div style={{fontSize:11,color:"#7c3aed",marginTop:3}}>= {qtdItem.toFixed(3)} {ins?.unidade}</div>}
          </div>
          <div>
            <Lbl s={cap?"Preço/embalagem (R$)":"Preço/unidade (R$)"}/>
            <input style={S.inp} type="number" step="0.01" min="0" placeholder="R$"
              value={nItem.precoUnit} onChange={e=>setNItem({...nItem,precoUnit:e.target.value})}
              onKeyDown={e=>e.key==="Enter"&&addItem()}/>
            {custoItem>0&&<div style={{fontSize:11,color:"#059669",marginTop:3}}>Total: {fR(custoItem)}</div>}
          </div>
          <div style={{display:"flex",alignItems:"flex-end"}}>
            <button style={{...S.btn,opacity:prontoPraAdicionar?1:.45,cursor:prontoPraAdicionar?"pointer":"not-allowed"}} onClick={addItem} disabled={!prontoPraAdicionar}>
              + Add
            </button>
          </div>
        </G>
        {!ins&&nItem.insumoId===("")&&<p style={{margin:"8px 0 0",fontSize:12,color:"var(--text4)"}}>Selecione um insumo para adicionar itens à compra.</p>}
      </div>

      {/* ── Tabela do carrinho ── */}
      {carrinho.length>0&&(
        <>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,marginBottom:12}}>
            <thead><tr>{["Insumo","Emb.","Qtd. total","Preço/emb.","Custo/un","Subtotal",""].map(h2=><th key={h2} style={S.th}>{h2}</th>)}</tr></thead>
            <tbody>
              {carrinho.map(item=>{
                const i2=idef.find(i=>i.id===item.insumoId);
                const cuUnit=item.qtd>0?item.custoTotal/item.qtd:0;
                return(
                  <tr key={item.id}>
                    <td style={{...S.td,fontWeight:600}}>{i2?.nome||"—"}</td>
                    <td style={S.td}>{item.capUsada?<span>{item.numEmb} × {item.capUsada} {i2?.unidade}</span>:<span style={{color:"var(--text4)"}}>—</span>}</td>
                    <td style={S.td}><span style={{fontWeight:700,color:"#059669"}}>{item.qtd.toFixed(3)}</span> <span style={{fontSize:11,color:"var(--text4)"}}>{i2?.unidade}</span></td>
                    <td style={S.td}>{fR(item.precoUnit)}</td>
                    <td style={{...S.td,color:"#7c3aed",fontWeight:600}}>{fR(cuUnit)}/{i2?.unidade}</td>
                    <td style={{...S.td,fontWeight:700,color:"#1d4ed8"}}>{fR(item.custoTotal)}</td>
                    <td style={S.td}><button style={{...S.bsm,color:"#ef4444"}} onClick={()=>removerItem(item.id)}>🗑️</button></td>
                  </tr>
                );
              })}
              <tr style={{background:"rgba(29,78,216,.06)"}}>
                <td colSpan={5} style={{...S.td,fontWeight:700,textAlign:"right",color:"#1d4ed8"}}>Total da compra:</td>
                <td style={{...S.td,fontWeight:800,color:"#1d4ed8",fontSize:15}}>{fR(totalCarrinho)}</td>
                <td style={S.td}/>
              </tr>
            </tbody>
          </table>

          {/* Resumo e botão salvar */}
          <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <span style={{fontSize:13,background:"var(--card2)",border:"1px solid var(--border)",padding:"5px 12px",borderRadius:8,color:"var(--text3)"}}>
                🏪 {h.fornecedor||"sem fornecedor"}
              </span>
              <span style={{fontSize:13,background:PAG_CORES[h.pagamento]?.bg||"var(--card2)",color:PAG_CORES[h.pagamento]?.c||"var(--text3)",padding:"5px 12px",borderRadius:8,fontWeight:600}}>
                💳 {h.pagamento}
              </span>
              <span style={{fontSize:13,color:"var(--text3)",background:"var(--card2)",border:"1px solid var(--border)",padding:"5px 12px",borderRadius:8}}>
                📦 {carrinho.length} item{carrinho.length!==1?"s":""}
              </span>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button style={S.btn2} onClick={()=>setCarrinho([])}>🗑️ Limpar</button>
              <button
                style={{...S.btn,opacity:prontoPraSalvar?1:.45,cursor:prontoPraSalvar?"pointer":"not-allowed"}}
                onClick={salvarCompra} disabled={!prontoPraSalvar}
              >
                {prontoPraSalvar?"✓ Salvar Compra — "+fR(totalCarrinho):"✓ Salvar Compra"}
              </button>
            </div>
          </div>
          {!h.fornecedor.trim()&&<p style={{margin:"8px 0 0",fontSize:12,color:"#ef4444"}}>⚠️ Preencha o fornecedor para salvar.</p>}
        </>
      )}
      {!carrinho.length&&(
        <p style={{textAlign:"center",color:"var(--text4)",padding:"16px 0",fontSize:13}}>
          Adicione ao menos um item usando o seletor acima.
        </p>
      )}
    </Card>

    {/* ── Histórico agrupado ── */}
    <Card title={`📋 Histórico de Compras (${comprasHist.length} compra${comprasHist.length!==1?"s":""})`}>
      {!comprasHist.length&&<p style={{textAlign:"center",color:"var(--text4)",padding:32}}>Nenhuma compra registrada.</p>}
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:14}}>
        <thead><tr>{["Data","Fornecedor","Itens","Total","💳 Pagamento","Ações"].map(h2=><th key={h2} style={S.th}>{h2}</th>)}</tr></thead>
        <tbody>
          {comprasHist.map(c=>{
            const isOpen=expanded[c.id];
            const pc=PAG_CORES[c.pagamento];
            return(
              <Fragment key={c.id}>
                <tr style={{background:isOpen?"rgba(124,58,237,.04)":"transparent",cursor:"pointer"}} onClick={()=>setExpanded(ex=>({...ex,[c.id]:!ex[c.id]}))}>
                  <td style={{...S.td,fontWeight:700,whiteSpace:"nowrap"}}>{c.data||"—"}</td>
                  <td style={{...S.td,fontWeight:600,color:"#3730a3"}}>{c.fornecedor}</td>
                  <td style={S.td}>
                    <span style={{background:"var(--accent-soft)",color:"#7c3aed",padding:"2px 10px",borderRadius:20,fontSize:12,fontWeight:700}}>
                      {c.items.length} item{c.items.length!==1?"s":""}
                    </span>
                  </td>
                  <td style={{...S.td,fontWeight:800,color:"#1d4ed8",fontSize:15}}>{fR(c.total)}</td>
                  <td style={S.td}>{c.pagamento&&c.pagamento!=="—"?<span style={{background:pc?.bg||"var(--card2)",color:pc?.c||"var(--text3)",padding:"2px 10px",borderRadius:20,fontSize:12,fontWeight:600}}>{c.pagamento}</span>:<span style={{color:"var(--text4)"}}>—</span>}</td>
                  <td style={S.td}>
                    <button style={{...S.bsm,marginRight:4}} onClick={e=>{e.stopPropagation();setExpanded(ex=>({...ex,[c.id]:!ex[c.id]}))}}>
                      {isOpen?"▲ Recolher":"▼ Detalhar"}
                    </button>
                    <button style={{...S.bsm,color:"#ef4444"}} onClick={e=>{e.stopPropagation();if(window.confirm("Remover esta compra?"))setEntradas(entradas.filter(x=>x.id!==c.id))}}>🗑️</button>
                  </td>
                </tr>
                {isOpen&&(
                  <tr>
                    <td colSpan={6} style={{padding:0,borderBottom:"1px solid var(--border3)"}}>
                      <div style={{background:"rgba(124,58,237,.04)",borderLeft:"3px solid #a78bfa",padding:"10px 20px"}}>
                        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                          <thead><tr>{["Insumo","Embalagens","Qtd. total","Preço/emb.","Custo/un","Subtotal"].map(h2=><th key={h2} style={{...S.th,background:"transparent",borderBottom:"1px solid var(--border2)"}}>{h2}</th>)}</tr></thead>
                          <tbody>
                            {c.items.map((it,idx)=>{
                              const i2=idef.find(i=>i.id===it.insumoId);
                              const cuU=it.qtd>0?it.custoTotal/it.qtd:0;
                              return(
                                <tr key={it.id||idx}>
                                  <td style={{...S.td,fontWeight:600,border:"none"}}>{i2?.nome||it.nome||"—"}</td>
                                  <td style={{...S.td,border:"none"}}>{it.capUsada?`${it.numEmb||"?"} × ${it.capUsada} ${i2?.unidade}`:"—"}</td>
                                  <td style={{...S.td,border:"none"}}><span style={{fontWeight:700,color:"#059669"}}>{(+it.qtd||0).toFixed(3)}</span> {i2?.unidade}</td>
                                  <td style={{...S.td,border:"none"}}>{it.precoUnit?fR(it.precoUnit):"—"}</td>
                                  <td style={{...S.td,color:"#7c3aed",fontWeight:600,border:"none"}}>{cuU>0?`${fR(cuU)}/${i2?.unidade}`:"—"}</td>
                                  <td style={{...S.td,fontWeight:700,color:"#1d4ed8",border:"none"}}>{fR(it.custoTotal)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </Card>
  </>);
}

function EstoqueTab({idefComCusto}){
  const totalValor=idefComCusto.reduce((s,i)=>s+Math.max(0,i.estoque)*i.custMedio,0);
  return(<>
    <G cols="1fr 1fr 1fr 1fr" gap={12} mb={20}>
      <KPI label="📦 Em estoque" value={idefComCusto.filter(i=>i.estoque>0.001).length} color="#7c3aed"/>
      <KPI label="⚠️ Zerado/negativo" value={idefComCusto.filter(i=>i.estoque<=0.001).length} color="#ef4444"/>
      <KPI label="💰 Valor total" value={fR(totalValor)} color="#059669"/>
      <KPI label="🛒 Total de tipos" value={idefComCusto.length} color="#3730a3"/>
    </G>
    <Card title="📦 Estoque — Custo Médio Ponderado">
      <p style={{margin:"0 0 14px",fontSize:13,color:"var(--text3)"}}>Custo médio = <strong>Σ(valor pago) ÷ Σ(qtd comprada)</strong></p>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:14}}>
        <thead><tr>{["Insumo","Un.","Total Comprado","Total Consumido","Estoque Atual","Custo Médio","Valor em Estoque","Status"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
        <tbody>
          {!idefComCusto.length&&<tr><td colSpan={8} style={{...S.td,textAlign:"center",color:"var(--text4)",padding:32}}>Nenhum insumo cadastrado.</td></tr>}
          {idefComCusto.map(i=>{const neg=i.estoque<-0.0001,bx=i.estoque>=-0.0001&&i.estoque<0.5;return(
            <tr key={i.id} style={{background:neg?"rgba(239,68,68,.08)":bx?"rgba(245,158,11,.06)":"transparent"}}>
              <td style={{...S.td,fontWeight:600}}>{i.nome}</td><td style={S.td}>{i.unidade}</td>
              <td style={S.td}>{i.totalEntradas.toFixed(3)}</td><td style={S.td}>{i.totalConsumido.toFixed(3)}</td>
              <td style={{...S.td,fontWeight:700,color:neg?"#ef4444":bx?"#d97706":"#059669",fontSize:15}}>{i.estoque.toFixed(3)} {i.unidade}</td>
              <td style={{...S.td,color:"#7c3aed",fontWeight:700}}>{i.custMedio>0?`${fR(i.custMedio)}/${i.unidade}`:<span style={{color:"var(--text4)",fontSize:12}}>Sem compras</span>}</td>
              <td style={{...S.td,fontWeight:600}}>{fR(Math.max(0,i.estoque)*i.custMedio)}</td>
              <td style={S.td}>{neg?<Pill label="❌ Negativo" color="#991b1b" bg="#fee2e2"/>:bx?<Pill label="⚠️ Baixo" color="#92400e" bg="#fef3c7"/>:<Pill label="✅ OK" color="#065f46" bg="#d1fae5"/>}</td>
            </tr>
          );})}
        </tbody>
      </table>
    </Card>
  </>);
}

function FichasTab({fichas,fichasCalc,setFichas,idef,custMedioFn}){
  const blank={nome:"",ings:[]};const [f,setF]=useState(blank);const [eid,setEid]=useState(null);
  const [nIng,setNIng]=useState({iid:"",qtd:"",un:""});
  function handleIns(iid){const ins=idef.find(i=>i.id===iid);setNIng({iid,qtd:"",un:ins?ins.unidade:""});}
  function custoIng(ing){const ins=idef.find(i=>i.id===ing.iid);if(!ins)return 0;return custMedioFn(ing.iid)*cvt(ing.qtd,ing.un||ins.unidade,ins.unidade);}
  const custoF=f.ings.reduce((s,i)=>s+custoIng(i),0);
  const insAt=idef.find(i=>i.id===nIng.iid);
  const unOpts=insAt?compatUnits(insAt.unidade):[];
  const prev=insAt&&nIng.qtd&&+nIng.qtd>0&&nIng.un?custoIng({iid:nIng.iid,qtd:+nIng.qtd,un:nIng.un}):null;
  function addIng(){if(!nIng.iid||!nIng.qtd||+nIng.qtd<=0)return alert("Selecione o insumo e informe a quantidade.");setF({...f,ings:[...f.ings,{id:uid(),iid:nIng.iid,qtd:+nIng.qtd,un:nIng.un}]});setNIng({iid:"",qtd:"",un:""});}
  function salvar(){if(!f.nome.trim())return alert("Informe o nome.");if(!f.ings.length)return alert("Adicione ao menos um ingrediente.");const it={id:eid||uid(),nome:f.nome.trim(),ings:f.ings};setFichas(eid?fichas.map(p=>p.id===eid?it:p):[...fichas,it]);setF(blank);setEid(null);}
  function editar(p){setF({nome:p.nome,ings:p.ings||[]});setEid(p.id);}
  function remover(id){if(window.confirm("Remover ficha?"))setFichas(fichas.filter(p=>p.id!==id));}
  return(<>
    <Card title={eid?"✏️ Editar Ficha":"📋 Nova Ficha Técnica"}>
      <div style={{marginBottom:14}}><Lbl s="Nome do produto *"/><input style={{...S.inp,maxWidth:440}} placeholder="Ex: Açaí Tradicional 500ml" value={f.nome} onChange={e=>setF({...f,nome:e.target.value})}/></div>
      <hr style={{border:"none",borderTop:"1px solid var(--border)",margin:"0 0 14px"}}/>
      <h3 style={{margin:"0 0 10px",fontSize:13,color:"#7c3aed",fontWeight:700,textTransform:"uppercase"}}>Ingredientes</h3>
      {!idef.length?<p style={{color:"#d97706",background:"rgba(245,158,11,.1)",padding:10,borderRadius:8,fontSize:13}}>⚠️ Cadastre insumos primeiro.</p>:(
        <>
          <div style={{background:"var(--card2)",border:"1px solid var(--border3)",borderRadius:10,padding:14,marginBottom:12}}>
            <G cols="2.5fr 1fr 1fr auto" gap={8} mb={0}>
              <div><Lbl s="Insumo"/><select style={S.inp} value={nIng.iid} onChange={e=>handleIns(e.target.value)}><option value="">Selecione...</option>{idef.map(i=>{const c=custMedioFn(i.id);return<option key={i.id} value={i.id}>{i.nome} ({i.unidade}){c>0?" → CM: "+fR(c)+"/"+i.unidade:" → sem compras"}</option>;})}</select></div>
              <div><Lbl s="Quantidade"/><input style={S.inp} type="number" step="0.001" min="0" placeholder="Ex: 300" value={nIng.qtd} disabled={!nIng.iid} onChange={e=>setNIng({...nIng,qtd:e.target.value})}/></div>
              <div><Lbl s="Unidade"/><select style={{...S.inp,background:!nIng.iid?"var(--card2)":"var(--inp)"}} value={nIng.un} disabled={!nIng.iid} onChange={e=>setNIng({...nIng,un:e.target.value})}><option value="">—</option>{unOpts.map(u=><option key={u} value={u}>{u}</option>)}</select></div>
              <div style={{display:"flex",alignItems:"flex-end"}}><button style={S.btn} onClick={addIng}>+ Add</button></div>
            </G>
            {prev!==null&&<div style={{marginTop:10,fontSize:13,color:"#7c3aed",background:"var(--accent-soft)",padding:"5px 12px",borderRadius:8,display:"inline-flex",gap:8,flexWrap:"wrap"}}>
              <span>{nIng.qtd} {nIng.un}{nIng.un!==insAt?.unidade&&<span style={{color:"var(--text3)"}}> = {cvt(+nIng.qtd,nIng.un,insAt.unidade).toFixed(4)} {insAt?.unidade}</span>}</span>
              <span>· CM: <strong>{fR(custMedioFn(nIng.iid))}/{insAt?.unidade}</strong></span>
              <span>→ Custo: <strong>{fR(prev)}</strong></span>
            </div>}
          </div>
          {f.ings.length>0&&(
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,marginBottom:10}}>
              <thead><tr>{["Insumo","Qtd.","Un.","Qtd. convertida","Custo Médio","Custo",""].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>
                {f.ings.map(ing=>{const i2=idef.find(i=>i.id===ing.iid);const qc=i2?cvt(ing.qtd,ing.un||i2.unidade,i2.unidade):0;const sc=ing.un&&ing.un!==i2?.unidade;const c2=custMedioFn(ing.iid);return(
                  <tr key={ing.id}><td style={S.td}>{i2?.nome||"—"}</td><td style={{...S.td,fontWeight:600}}>{ing.qtd} <span style={{color:"#7c3aed"}}>{ing.un||i2?.unidade}</span></td><td style={{...S.td,color:"#7c3aed"}}>{ing.un||i2?.unidade}</td><td style={{...S.td,color:"var(--text4)",fontSize:12}}>{sc?`${qc.toFixed(4)} ${i2?.unidade}`:"—"}</td><td style={S.td}>{c2>0?`${fR(c2)}/${i2?.unidade}`:<span style={{color:"#ef4444",fontSize:12}}>Sem compras</span>}</td><td style={{...S.td,fontWeight:700,color:"#7c3aed"}}>{fR(custoIng(ing))}</td><td style={S.td}><button style={{...S.bsm,color:"#ef4444"}} onClick={()=>setF({...f,ings:f.ings.filter(i=>i.id!==ing.id)})}>🗑️</button></td></tr>
                );})}
                <tr style={{background:"var(--card2)"}}><td colSpan={5} style={{...S.td,fontWeight:700,textAlign:"right",color:"#7c3aed"}}>Custo Total Unitário:</td><td style={{...S.td,fontWeight:700,color:"#7c3aed",fontSize:16}}>{fR(custoF)}</td><td style={S.td}/></tr>
              </tbody>
            </table>
          )}
        </>
      )}
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>{eid&&<button style={S.btn2} onClick={()=>{setF(blank);setEid(null)}}>Cancelar</button>}<button style={S.btn} onClick={salvar}>{eid?"✓ Salvar":"✓ Criar Ficha"}</button></div>
    </Card>
    <Card title={`📦 Fichas (${fichasCalc.length})`}>
      {!fichasCalc.length&&<p style={{color:"var(--text4)",textAlign:"center",padding:24}}>Nenhuma ficha cadastrada.</p>}
      {fichasCalc.map(p=>(
        <div key={p.id} style={{border:"1px solid var(--border3)",borderRadius:10,padding:14,marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8,marginBottom:8}}>
            <h3 style={{margin:0,color:"#7c3aed",fontSize:15}}>{p.nome}</h3>
            <div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{fontWeight:700,color:"#7c3aed",fontSize:16}}>{fR(p.custo)}/un</span><button style={S.bsm} onClick={()=>editar(p)}>✏️ Editar</button><button style={{...S.bsm,color:"#ef4444"}} onClick={()=>remover(p.id)}>🗑️</button></div>
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{(p.ings||[]).map(ing=>{const i2=idef.find(i=>i.id===ing.iid);return i2&&<span key={ing.id} style={{fontSize:12,background:"var(--accent-soft)",color:"var(--accent-soft-c)",padding:"3px 10px",borderRadius:20}}>{i2.nome}: {ing.qtd} {ing.un||i2.unidade}</span>;})}</div>
        </div>
      ))}
    </Card>
  </>);
}

function PrecosTab({fichasCalc,margens,sm,getPreco,precos,sp,canEdit}){
  const [simFid,setSimFid]=useState("");const [simM,setSimM]=useState(40);
  useEffect(()=>{if(fichasCalc.length&&!simFid)setSimFid(fichasCalc[0].id);},[fichasCalc]);
  return(<>
    {!canEdit&&<div style={{background:"rgba(245,158,11,.1)",border:"1px solid #fde68a",borderRadius:10,padding:12,marginBottom:16,fontSize:13,color:"#d97706"}}>👁️ Você tem permissão apenas para <strong>visualizar</strong> os preços.</div>}
    <Card title="💰 Preços dos Produtos">
      {!fichasCalc.length&&<p style={{color:"var(--text4)",textAlign:"center",padding:24}}>Nenhum produto cadastrado.</p>}
      {fichasCalc.map(fc=>{
        const m=+(margens[fc.id]??40),pC=getPreco(fc.id),pm=precos[fc.id];
        const pEx=pm!=null?pm:pC,mCal=pEx>0&&fc.custo>0?(1-fc.custo/pEx)*100:0,manual=pm!=null;
        return(
          <div key={fc.id} style={{border:`1px solid ${manual?"#6ee7b7":"var(--border3)"}`,borderRadius:10,padding:16,marginBottom:12,background:manual?"rgba(5,150,105,.06)":"var(--card)"}}>
            <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:12,alignItems:"flex-start"}}>
              <div style={{minWidth:180}}>
                <p style={{margin:"0 0 4px",fontWeight:700,color:"#7c3aed",fontSize:15}}>{fc.nome}</p>
                <span style={{fontSize:13,color:"var(--text3)"}}>Custo médio: <strong style={{color:"#7c3aed"}}>{fR(fc.custo)}</strong></span>
                {manual&&<div style={{marginTop:6,fontSize:12,color:"#059669",background:"rgba(5,150,105,.1)",padding:"3px 8px",borderRadius:6,display:"inline-block"}}>✏️ Preço manual</div>}
              </div>
              <div style={{display:"flex",gap:14,alignItems:"flex-end",flexWrap:"wrap"}}>
                {canEdit?(
                  <>
                    <div style={{opacity:manual?.4:1,pointerEvents:manual?"none":"auto"}}>
                      <Lbl s="Margem (%)"/>
                      <div style={{display:"flex",alignItems:"center",gap:8}}><input type="range" min="1" max="90" value={m} onChange={e=>sm({...margens,[fc.id]:+e.target.value})} style={{width:90,accentColor:"#7c3aed"}}/><input type="number" min="1" max="90" value={m} onChange={e=>sm({...margens,[fc.id]:Math.min(90,Math.max(1,+e.target.value))})} style={{...S.inp,width:54,textAlign:"center",padding:"6px 8px"}}/><span style={{fontSize:13,color:"#7c3aed"}}>%</span></div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",height:40,color:"#7c3aed",fontSize:20,opacity:.4}}>⟷</div>
                    <div>
                      <Lbl s="Preço de venda (R$)"/>
                      <div style={{display:"flex",gap:6,alignItems:"center"}}>
                        <input type="number" step="0.01" min="0" placeholder={fR(pC).replace("R$ ","")} value={pm??""} onChange={e=>{const v=e.target.value;if(v===""||+v<=0){const np={...precos};delete np[fc.id];sp(np);}else{const nm=+v>0&&fc.custo>0?Math.min(90,Math.max(1,(1-fc.custo/+v)*100)):m;sp({...precos,[fc.id]:+v});sm({...margens,[fc.id]:+nm.toFixed(1)});}}} style={{...S.inp,width:110,fontWeight:700,color:manual?"#059669":"var(--text)"}}/>
                        {manual&&<button onClick={()=>{const np={...precos};delete np[fc.id];sp(np);}} style={{...S.bsm,color:"#ef4444",padding:"6px 8px"}}>✕</button>}
                      </div>
                    </div>
                  </>
                ):(
                  <div style={{textAlign:"center"}}><p style={{margin:0,fontSize:11,color:"var(--text4)"}}>Preço de venda</p><p style={{margin:"4px 0 0",fontSize:28,fontWeight:700,color:"#059669"}}>{fR(pEx)}</p></div>
                )}
                {[["Margem",fP(manual?mCal:m),manual?"#059669":"#6d28d9"],["Markup",fP(fc.custo>0?(pEx-fc.custo)/fc.custo*100:0),"#6d28d9"],["Lucro/un",fR(pEx-fc.custo),"#2563eb"]].map(([l,v,c])=>(
                  <div key={l} style={{textAlign:"center"}}><p style={{margin:0,fontSize:11,color:"var(--text4)"}}>{l}</p><p style={{margin:"4px 0 0",fontSize:20,fontWeight:700,color:c}}>{v}</p></div>
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
          <div><Lbl s={`Margem simulada: ${simM}%`}/><input type="range" min="1" max="90" value={simM} onChange={e=>setSimM(+e.target.value)} style={{width:"100%",marginTop:10,accentColor:"#7c3aed"}}/></div>
        </G>
        {simFid&&(()=>{const fc=fichasCalc.find(p=>p.id===simFid);if(!fc)return null;const pts=[10,20,30,40,50,60,70].map(m=>({m:`${m}%`,p:+(fc.custo/(1-m/100)).toFixed(2),l:+(fc.custo/(1-m/100)-fc.custo).toFixed(2)}));const sp2=fc.custo/(1-simM/100);return(<><G cols="1fr 1fr 1fr" gap={12} mb={16}>{[["Custo médio",fR(fc.custo),"#7c3aed","var(--accent-soft)"],[`Preço c/ ${simM}%`,fR(sp2),"#059669","rgba(5,150,105,.08)"],["Lucro/un",fR(sp2-fc.custo),"#2563eb","rgba(37,99,235,.06)"]].map(([l,v,c,bg])=><div key={l} style={{background:bg,borderRadius:10,padding:14,textAlign:"center"}}><p style={{margin:0,fontSize:12,color:"var(--text3)"}}>{l}</p><p style={{margin:"6px 0 0",fontSize:20,fontWeight:700,color:c}}>{v}</p></div>)}</G><ResponsiveContainer width="100%" height={200}><BarChart data={pts}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/><XAxis dataKey="m" tick={{fontSize:12,fill:"var(--text3)"}}/><YAxis tickFormatter={v=>`R$${v.toFixed(0)}`} tick={{fontSize:12,fill:"var(--text3)"}}/><Tooltip formatter={(v,n)=>[fR(v),n==="p"?"Preço":"Lucro/un"]}/><Bar dataKey="p" name="p" fill="#7c3aed" radius={[4,4,0,0]}/><Bar dataKey="l" name="l" fill="#a78bfa" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></>);})()}
      </Card>
    )}
  </>);
}

function ProducaoTab({producoes,setProducoes,fichasCalc,idef,estoqueInsumoFn,estoqueProdutoFn}){
  const today=new Date().toISOString().slice(0,10);
  const blank={fichaId:"",qtd:"",data:today};const [f,setF]=useState(blank);
  const fcAt=fichasCalc.find(p=>p.id===f.fichaId);
  const nec=fcAt&&f.qtd&&+f.qtd>0?(fcAt.ings||[]).map(ing=>{const ins=idef.find(i=>i.id===ing.iid);if(!ins)return null;const qn=cvt(ing.qtd,ing.un||ins.unidade,ins.unidade)*(+f.qtd);const es=estoqueInsumoFn(ing.iid);return{nome:ins.nome,un:ins.unidade,qn,es,ok:es>=qn};}).filter(Boolean):[];
  const custoProd=fcAt?fcAt.custo*(+f.qtd||0):0;
  function registrar(){if(!f.fichaId)return alert("Selecione o produto.");if(!f.qtd||+f.qtd<=0)return alert("Informe a quantidade.");const insuf=nec.filter(n=>!n.ok);if(insuf.length&&!window.confirm(`⚠️ Estoque insuficiente:\n${insuf.map(n=>`• ${n.nome}: precisa ${n.qn.toFixed(3)}, tem ${n.es.toFixed(3)}`).join("\n")}\n\nRegistrar mesmo assim?`))return;setProducoes([...producoes,{id:uid(),fichaId:f.fichaId,qtdProduzida:+f.qtd,data:f.data,custoUnit:fcAt?.custo||0}]);setF({...blank,data:f.data});}
  function remover(id){if(window.confirm("Remover?"))setProducoes(producoes.filter(p=>p.id!==id));}
  return(<>
    <Card title="🏭 Registrar Lote de Produção">
      {!fichasCalc.length?<p style={{color:"#d97706",background:"rgba(245,158,11,.1)",padding:10,borderRadius:8,fontSize:13}}>⚠️ Cadastre fichas técnicas antes.</p>:(
        <>
          <G cols="2fr 1fr 1fr auto">
            <div><Lbl s="Produto *"/><select style={S.inp} value={f.fichaId} onChange={e=>setF({...f,fichaId:e.target.value})}><option value="">Selecione...</option>{fichasCalc.map(p=><option key={p.id} value={p.id}>{p.nome} — {fR(p.custo)}/un</option>)}</select></div>
            <div><Lbl s="Qtd. a produzir *"/><input style={S.inp} type="number" min="1" step="1" value={f.qtd} onChange={e=>setF({...f,qtd:e.target.value})}/></div>
            <div><Lbl s="Data"/><input style={S.inp} type="date" value={f.data} onChange={e=>setF({...f,data:e.target.value})}/></div>
            <div style={{display:"flex",alignItems:"flex-end"}}><button style={S.btn} onClick={registrar}>✓ Produzir</button></div>
          </G>
          {fcAt&&f.qtd&&+f.qtd>0&&<div style={{marginTop:12,background:"var(--card2)",borderRadius:10,padding:14}}><p style={{margin:"0 0 10px",fontWeight:600,color:"#7c3aed",fontSize:13}}>📋 Consumo para {f.qtd} un de "{fcAt.nome}":</p><div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:10}}>{nec.map((n,i)=><div key={i} style={{background:n.ok?"rgba(5,150,105,.1)":"rgba(239,68,68,.1)",border:`1px solid ${n.ok?"#86efac":"#fca5a5"}`,borderRadius:8,padding:"8px 12px",fontSize:13,color:"var(--text)"}}><strong>{n.nome}:</strong> {n.qn.toFixed(3)} {n.un}<span style={{fontSize:11,marginLeft:8,color:n.ok?"#059669":"#ef4444"}}>{n.ok?`✅ ${n.es.toFixed(3)}`:`❌ ${n.es.toFixed(3)}`}</span></div>)}</div><p style={{margin:0,fontSize:13,color:"#7c3aed"}}>💰 Custo do lote: <strong>{fR(custoProd)}</strong></p></div>}
        </>
      )}
    </Card>
    <Card title="🛍️ Estoque de Produtos Acabados">
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:14}}>
        <thead><tr>{["Produto","Custo Médio/un","Total Produzido","Total Vendido","Em Estoque","Valor em Estoque","Status"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
        <tbody>
          {!fichasCalc.length&&<tr><td colSpan={7} style={{...S.td,textAlign:"center",color:"var(--text4)",padding:32}}>Nenhum produto cadastrado.</td></tr>}
          {fichasCalc.map(fc=>{const prod=producoes.filter(p=>p.fichaId===fc.id).reduce((s,p)=>s+p.qtdProduzida,0);const estoqP=estoqueProdutoFn(fc.id),vendTotal=prod-estoqP;const neg=estoqP<0,zero=estoqP===0;return(
            <tr key={fc.id} style={{background:neg?"rgba(239,68,68,.07)":zero?"var(--card2)":"transparent"}}>
              <td style={{...S.td,fontWeight:600}}>{fc.nome}</td><td style={{...S.td,color:"#7c3aed",fontWeight:700}}>{fR(fc.custo)}</td><td style={S.td}>{prod} un</td><td style={S.td}>{vendTotal} un</td>
              <td style={{...S.td,fontWeight:700,fontSize:15,color:neg?"#ef4444":zero?"var(--text4)":"#059669"}}>{estoqP} un</td>
              <td style={{...S.td,fontWeight:600}}>{fR(Math.max(0,estoqP)*fc.custo)}</td>
              <td style={S.td}>{neg?<Pill label="❌ Negativo" color="#991b1b" bg="#fee2e2"/>:zero?<Pill label="⚪ Zerado" color="#6b7280" bg="#f3f4f6"/>:<Pill label="✅ Em estoque" color="#065f46" bg="#d1fae5"/>}</td>
            </tr>
          );})}
        </tbody>
      </table>
    </Card>
    <Card title={`📋 Histórico de Produções (${producoes.length})`}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:14}}>
        <thead><tr>{["Data","Produto","Qtd.","Custo/un","Custo do Lote","Ações"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
        <tbody>
          {!producoes.length&&<tr><td colSpan={6} style={{...S.td,textAlign:"center",color:"var(--text4)",padding:28}}>Nenhuma produção registrada.</td></tr>}
          {[...producoes].sort((a,b)=>(b.data||"").localeCompare(a.data||"")).map(p=>{const fc=fichasCalc.find(f2=>f2.id===p.fichaId);return(
            <tr key={p.id}><td style={S.td}>{p.data||"—"}</td><td style={{...S.td,fontWeight:500}}>{fc?.nome||"—"}</td><td style={S.td}>{p.qtdProduzida} un</td><td style={{...S.td,color:"#7c3aed"}}>{fR(fc?.custo||p.custoUnit)}/un</td><td style={{...S.td,fontWeight:600}}>{fR((fc?.custo||p.custoUnit)*p.qtdProduzida)}</td><td style={S.td}><button style={{...S.bsm,color:"#ef4444"}} onClick={()=>remover(p.id)}>🗑️</button></td></tr>
          );})}
        </tbody>
      </table>
    </Card>
  </>);
}

function PedidosTab({pedidos,setPedidos,fichasCalc,getPreco,setVendas,vendas,estoqueProdutoFn,canConfirmar,idef,custMedioFn}){
  const today=new Date().toISOString().slice(0,10);
  const blankOrder={data:today,canal:"Presencial",obs:"",cliente:"",usaEmbalagem:false,embQtd:"",embInsumoId:"",desconto:"",usaTele:false,teleValor:""};
  const blankItem={fichaId:"",qtd:""};
  const [f,setF]=useState(blankOrder);
  const [nItem,setNItem]=useState(blankItem);
  const [carrinho,setCarrinho]=useState([]);
  const [filtro,setFiltro]=useState("Todos");

  const insEmb=idef.filter(i=>i.nome.toLowerCase().includes("embalagem")||i.nome.toLowerCase().includes("sacola")||i.nome.toLowerCase().includes("caixa"));
  const cmEmb=f.embInsumoId?custMedioFn(f.embInsumoId):0;
  const custoEmb=f.usaEmbalagem&&+f.embQtd>0&&cmEmb>0?cmEmb*(+f.embQtd):0;
  const totalCarrinho=carrinho.reduce((s,i)=>s+i.qtd*getPreco(i.fichaId),0);

  function addItem(){
    if(!nItem.fichaId)return alert("Selecione o produto.");
    if(!nItem.qtd||+nItem.qtd<=0)return alert("Informe a quantidade.");
    const ex=carrinho.find(i=>i.fichaId===nItem.fichaId);
    if(ex){setCarrinho(carrinho.map(i=>i.fichaId===nItem.fichaId?{...i,qtd:i.qtd+(+nItem.qtd)}:i));}
    else{setCarrinho([...carrinho,{id:uid(),fichaId:nItem.fichaId,qtd:+nItem.qtd}]);}
    setNItem(blankItem);
  }
  function removeItem(id){setCarrinho(carrinho.filter(i=>i.id!==id));}
  function updateItemQtd(id,val){if(+val>0)setCarrinho(carrinho.map(i=>i.id===id?{...i,qtd:+val}:i));}

  function registrar(){
    if(!carrinho.length)return alert("Adicione ao menos um item ao pedido.");
    if(f.usaEmbalagem&&!f.embInsumoId)return alert("Selecione o insumo de embalagem.");
    if(f.usaEmbalagem&&(!f.embQtd||+f.embQtd<=0))return alert("Informe a quantidade de embalagens.");
    setPedidos([...pedidos,{
      id:uid(),items:carrinho,data:f.data,canal:f.canal,obs:f.obs,cliente:f.cliente.trim(),status:"Pendente",
      usaEmbalagem:f.usaEmbalagem,embQtd:f.usaEmbalagem?+f.embQtd:0,embInsumoId:f.embInsumoId,embalagemCusto:custoEmb,
      usaTele:f.usaTele,teleValor:f.usaTele?+f.teleValor||0:0,
      desconto:+f.desconto||0,
    }]);
    setCarrinho([]);
    setF({...blankOrder,data:f.data,canal:f.canal});
  }

  function confirmar(pedido){
    const items=getItems(pedido);
    let bloqueou=false;
    for(const item of items){
      const es=estoqueProdutoFn(item.fichaId);
      if(es<item.qtd){
        const fc=fichasCalc.find(f=>f.id===item.fichaId);
        if(!window.confirm(`⚠️ Estoque insuficiente para "${fc?.nome||"?"}":\n  Tem: ${es} un  |  Precisa: ${item.qtd} un\n\nConfirmar assim mesmo?`)){bloqueou=true;break;}
      }
    }
    if(bloqueou)return;
    setPedidos(pedidos.map(p=>p.id===pedido.id?{...p,status:"Confirmado"}:p));
    setVendas([...vendas,{
      id:uid(),items,data:pedido.data,pedidoId:pedido.id,
      embalagemCusto:pedido.embalagemCusto||0,embQtd:pedido.embQtd||0,embInsumoId:pedido.embInsumoId||"",
      desconto:pedido.desconto||0,teleValor:pedido.teleValor||0,
    }]);
  }
  function cancelar(id){if(window.confirm("Cancelar?"))setPedidos(pedidos.map(p=>p.id===id?{...p,status:"Cancelado"}:p));}
  function remover(id){if(window.confirm("Excluir?"))setPedidos(pedidos.filter(p=>p.id!==id));}

  const pend=pedidos.filter(p=>p.status==="Pendente").length,
        conf=pedidos.filter(p=>p.status==="Confirmado").length,
        canc=pedidos.filter(p=>p.status==="Cancelado").length;
  const recPot=pedidos.filter(p=>p.status==="Pendente").reduce((s,p)=>s+getItems(p).reduce((ss,i)=>ss+i.qtd*getPreco(i.fichaId),0),0);
  const recConf=pedidos.filter(p=>p.status==="Confirmado").reduce((s,p)=>s+getItems(p).reduce((ss,i)=>ss+i.qtd*getPreco(i.fichaId),0),0);
  const canalCount=CANAIS.map(c=>({canal:c,total:pedidos.filter(p=>p.canal===c).length})).filter(c=>c.total>0);
  const lista=filtro==="Todos"?pedidos:pedidos.filter(p=>p.status===filtro);
  const st=s=>s==="Confirmado"?{color:"#065f46",bg:"#d1fae5",label:"✅ Confirmado"}:s==="Cancelado"?{color:"#991b1b",bg:"#fee2e2",label:"❌ Cancelado"}:{color:"#92400e",bg:"#fef3c7",label:"⏳ Pendente"};

  return(<>
    <Card title="➕ Registrar Pedido">
      {/* ── Carrinho ── */}
      <div style={{background:"var(--card2)",border:"1px solid var(--border3)",borderRadius:10,padding:14,marginBottom:12}}>
        <p style={{margin:"0 0 10px",fontSize:13,fontWeight:700,color:"#7c3aed"}}>🛒 Itens do Pedido</p>
        <G cols="3fr 1fr auto" mb={carrinho.length>0?12:0}>
          <div><Lbl s="Produto"/><select style={S.inp} value={nItem.fichaId} onChange={e=>setNItem({...nItem,fichaId:e.target.value})}><option value="">Selecione...</option>{fichasCalc.map(p=><option key={p.id} value={p.id}>{p.nome} — {fR(getPreco(p.id))}/un · Est: {estoqueProdutoFn(p.id)} un</option>)}</select></div>
          <div><Lbl s="Quantidade"/><input style={S.inp} type="number" min="1" step="1" placeholder="Ex: 10" value={nItem.qtd} onChange={e=>setNItem({...nItem,qtd:e.target.value})} onKeyDown={e=>e.key==="Enter"&&addItem()}/></div>
          <div style={{display:"flex",alignItems:"flex-end"}}><button style={S.btn} onClick={addItem}>+ Adicionar</button></div>
        </G>
        {carrinho.length>0?(
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead><tr>{["Produto","Estoque","Qtd. no pedido","Preço/un","Subtotal",""].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {carrinho.map(item=>{
                const fc=fichasCalc.find(f=>f.id===item.fichaId);
                const pr=getPreco(item.fichaId);
                const es=estoqueProdutoFn(item.fichaId);
                const insuf=es<item.qtd;
                return(
                  <tr key={item.id} style={{background:insuf?"rgba(239,68,68,.05)":"transparent"}}>
                    <td style={{...S.td,fontWeight:600,color:insuf?"#ef4444":"var(--text)"}}>
                      {fc?.nome||"—"}
                      {insuf&&<span style={{fontSize:11,color:"#ef4444",marginLeft:6,fontWeight:400}}>⚠️ insuf.</span>}
                    </td>
                    <td style={{...S.td,color:insuf?"#ef4444":"#059669",fontWeight:600}}>{es} un</td>
                    <td style={S.td}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <input type="number" min="1" step="1" value={item.qtd}
                          onChange={e=>updateItemQtd(item.id,e.target.value)}
                          style={{...S.inp,width:72,padding:"3px 8px",textAlign:"center"}}/>
                        <span style={{color:"var(--text3)",fontSize:12}}>un</span>
                      </div>
                    </td>
                    <td style={S.td}>{fR(pr)}</td>
                    <td style={{...S.td,fontWeight:700,color:"#7c3aed"}}>{fR(pr*item.qtd)}</td>
                    <td style={S.td}><button style={{...S.bsm,color:"#ef4444"}} onClick={()=>removeItem(item.id)}>🗑️</button></td>
                  </tr>
                );
              })}
              <tr style={{background:"rgba(124,58,237,.06)"}}>
                <td colSpan={4} style={{...S.td,fontWeight:700,textAlign:"right",color:"#7c3aed"}}>Total dos produtos:</td>
                <td style={{...S.td,fontWeight:700,color:"#7c3aed",fontSize:15}}>{fR(totalCarrinho)}</td>
                <td style={S.td}/>
              </tr>
            </tbody>
          </table>
        ):(
          <p style={{margin:"8px 0 0",fontSize:13,color:"var(--text4)",textAlign:"center",padding:"12px 0"}}>Nenhum item adicionado. Use o seletor acima para montar o pedido.</p>
        )}
      </div>

      {/* ── Data / Canal / Cliente ── */}
      <G cols="1fr 1fr 1fr" gap={10} mb={10}>
        <div><Lbl s="Data"/><input style={S.inp} type="date" value={f.data} onChange={e=>setF({...f,data:e.target.value})}/></div>
        <div><Lbl s="Canal"/><select style={S.inp} value={f.canal} onChange={e=>setF({...f,canal:e.target.value})}>{CANAIS.map(c=><option key={c}>{c}</option>)}</select></div>
        <div><Lbl s="👤 Cliente (opcional)"/><input style={S.inp} placeholder="Ex: João Silva" value={f.cliente} onChange={e=>setF({...f,cliente:e.target.value})}/></div>
      </G>

      {/* ── Embalagem · Tele · Desconto ── */}
      <div style={{background:"var(--card2)",border:"1px solid var(--border3)",borderRadius:10,padding:14,marginBottom:10}}>
        <G cols="1fr 1fr 1fr" gap={16} mb={0}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
              <input type="checkbox" id="pedUsaEmb" checked={f.usaEmbalagem} onChange={e=>setF({...f,usaEmbalagem:e.target.checked,embQtd:"",embInsumoId:""})} style={{width:16,height:16,accentColor:"#7c3aed",cursor:"pointer"}}/>
              <label htmlFor="pedUsaEmb" style={{fontSize:14,fontWeight:600,color:"#7c3aed",cursor:"pointer"}}>📦 Embalagem?</label>
            </div>
            {f.usaEmbalagem&&(<G cols="1fr 1fr" gap={8} mb={0}>
              <div><Lbl s="Insumo"/><select style={S.inp} value={f.embInsumoId} onChange={e=>setF({...f,embInsumoId:e.target.value})}><option value="">Selecione...</option>{(insEmb.length?insEmb:idef).map(i=>{const c=custMedioFn(i.id);return<option key={i.id} value={i.id}>{i.nome} — {c>0?fR(c):"sem compras"}/{i.unidade}</option>;})}</select></div>
              <div><Lbl s="Qtd."/><input style={S.inp} type="number" min="1" step="1" placeholder="Ex: 2" value={f.embQtd} onChange={e=>setF({...f,embQtd:e.target.value})}/></div>
            </G>)}
            {f.usaEmbalagem&&f.embInsumoId&&+f.embQtd>0&&cmEmb>0&&<div style={{marginTop:8,fontSize:13,background:"rgba(245,158,11,.1)",color:"#d97706",padding:"6px 12px",borderRadius:8}}>📦 {f.embQtd} × {fR(cmEmb)} = <strong>{fR(custoEmb)}</strong></div>}
            {f.usaEmbalagem&&f.embInsumoId&&cmEmb===0&&<p style={{fontSize:12,color:"#ef4444",marginTop:6}}>⚠️ Sem custo médio.</p>}
          </div>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
              <input type="checkbox" id="pedUsaTele" checked={f.usaTele} onChange={e=>setF({...f,usaTele:e.target.checked,teleValor:""})} style={{width:16,height:16,accentColor:"#059669",cursor:"pointer"}}/>
              <label htmlFor="pedUsaTele" style={{fontSize:14,fontWeight:600,color:"#059669",cursor:"pointer"}}>🛵 Tele entrega?</label>
            </div>
            {f.usaTele&&(<><Lbl s="Valor (R$)"/><input style={S.inp} type="number" step="0.01" min="0" placeholder="Ex: 5,00" value={f.teleValor} onChange={e=>setF({...f,teleValor:e.target.value})}/>{+f.teleValor>0&&<div style={{marginTop:8,fontSize:13,background:"rgba(5,150,105,.1)",color:"#059669",padding:"6px 12px",borderRadius:8}}>🛵 +{fR(+f.teleValor)}</div>}</>)}
          </div>
          <div>
            <Lbl s="🏷️ Desconto (R$)"/>
            <input style={S.inp} type="number" step="0.01" min="0" placeholder="0,00" value={f.desconto} onChange={e=>setF({...f,desconto:e.target.value})}/>
            {+f.desconto>0&&<p style={{fontSize:12,color:"#ef4444",marginTop:6}}>Desconto de <strong>{fR(+f.desconto)}</strong></p>}
          </div>
        </G>
      </div>

      <div style={{marginBottom:12}}><Lbl s="Observações (opcional)"/><input style={{...S.inp,maxWidth:480}} placeholder="Ex: sem granola, entregar às 18h..." value={f.obs} onChange={e=>setF({...f,obs:e.target.value})}/></div>

      {/* Resumo e botão registrar */}
      {carrinho.length>0&&<div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}}>
        <span style={{fontSize:13,color:"#7c3aed",background:"var(--accent-soft)",padding:"5px 12px",borderRadius:8}}>🛒 {carrinho.length} item(s): <strong>{fR(totalCarrinho)}</strong></span>
        {f.usaTele&&+f.teleValor>0&&<span style={{fontSize:13,color:"#059669",background:"rgba(5,150,105,.1)",padding:"5px 12px",borderRadius:8}}>🛵 <strong>+{fR(+f.teleValor)}</strong></span>}
        {custoEmb>0&&<span style={{fontSize:13,color:"#d97706",background:"rgba(245,158,11,.1)",padding:"5px 12px",borderRadius:8}}>📦 <strong>-{fR(custoEmb)}</strong></span>}
        {+f.desconto>0&&<span style={{fontSize:13,color:"#ef4444",background:"rgba(239,68,68,.1)",padding:"5px 12px",borderRadius:8}}>🏷️ <strong>-{fR(+f.desconto)}</strong></span>}
        <span style={{fontSize:13,color:"#059669",background:"rgba(5,150,105,.12)",padding:"5px 14px",borderRadius:8,fontWeight:700,border:"1px solid #6ee7b7"}}>
          Total: <strong>{fR(totalCarrinho+(f.usaTele?+f.teleValor||0:0)-custoEmb-(+f.desconto||0))}</strong>
        </span>
      </div>}
      <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
        {carrinho.length>0&&<button style={S.btn2} onClick={()=>setCarrinho([])}>🗑️ Limpar itens</button>}
        <button style={{...S.btn,opacity:carrinho.length===0?.45:1,cursor:carrinho.length===0?"not-allowed":"pointer"}} onClick={registrar} disabled={carrinho.length===0}>
          ✓ Registrar Pedido{carrinho.length>0?` (${carrinho.length} item${carrinho.length!==1?"s":""})` : ""}
        </button>
      </div>
    </Card>

    <G cols="repeat(5,1fr)" gap={12} mb={20}>
      <KPI label="📋 Total" value={pedidos.length} color="#3730a3"/>
      <KPI label="⏳ Pendentes" value={pend} color="#d97706"/>
      <KPI label="✅ Confirmados" value={conf} color="#059669"/>
      <KPI label="❌ Cancelados" value={canc} color="#ef4444"/>
      <KPI label="💵 Rec. Potencial" value={fR(recPot)} color="#7c3aed" sub="(pendentes)"/>
    </G>
    {canalCount.length>0&&<div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:10,padding:"12px 16px",marginBottom:20,display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}><span style={{fontSize:13,fontWeight:600,color:"#7c3aed"}}>📡 Canais:</span>{canalCount.map(c=><span key={c.canal} style={{background:"var(--accent-soft)",color:"var(--accent-soft-c)",padding:"4px 12px",borderRadius:20,fontSize:13}}>{c.canal}: <strong>{c.total}</strong></span>)}<span style={{marginLeft:"auto",fontSize:13,color:"#059669",fontWeight:600}}>Receita confirmada: {fR(recConf)}</span></div>}

    <Card title={`📋 Pedidos (${pedidos.length})`} right={<div style={{display:"flex",gap:6}}>{["Todos","Pendente","Confirmado","Cancelado"].map(s=><button key={s} onClick={()=>setFiltro(s)} style={{...S.bsm,background:filtro===s?"#7c3aed":"var(--bsm-bg)",color:filtro===s?"white":"#7c3aed",fontWeight:filtro===s?700:500}}>{s}</button>)}</div>}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:14}}>
        <thead><tr>{["Data","Cliente","Itens do Pedido","Canal","Valor Total","📦","🛵","🏷️","Obs.","Status","Ações"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
        <tbody>
          {!lista.length&&<tr><td colSpan={11} style={{...S.td,textAlign:"center",color:"var(--text4)",padding:28}}>Nenhum pedido {filtro!=="Todos"?`com status "${filtro}"`:"registrado"}.</td></tr>}
          {[...lista].sort((a,b)=>(b.data||"").localeCompare(a.data||"")).map(p=>{
            const its=getItems(p);
            const recTotal=its.reduce((s,i)=>s+i.qtd*getPreco(i.fichaId),0);
            const estS=st(p.status);
            const i2=idef.find(i=>i.id===p.embInsumoId);
            return(
              <tr key={p.id}>
                <td style={S.td}>{p.data||"—"}</td>
                <td style={{...S.td,fontWeight:600,color:"#7c3aed"}}>{p.cliente||<span style={{color:"var(--text4)",fontWeight:400,fontSize:12}}>—</span>}</td>
                <td style={S.td}>
                  {its.map((item,idx)=>{
                    const fc=fichasCalc.find(f=>f.id===item.fichaId);
                    return(
                      <div key={item.fichaId||idx} style={{fontSize:13,marginBottom:idx<its.length-1?4:0,display:"flex",alignItems:"center",gap:6}}>
                        <span style={{fontWeight:600}}>{fc?.nome||"—"}</span>
                        <span style={{background:"var(--accent-soft)",color:"#7c3aed",padding:"1px 7px",borderRadius:20,fontSize:11,fontWeight:700}}>{item.qtd} un</span>
                        <span style={{color:"var(--text4)",fontSize:11}}>{fR(item.qtd*getPreco(item.fichaId))}</span>
                      </div>
                    );
                  })}
                </td>
                <td style={S.td}><span style={{background:"var(--accent-soft)",color:"var(--accent-soft-c)",padding:"2px 8px",borderRadius:20,fontSize:12}}>{p.canal}</span></td>
                <td style={{...S.td,fontWeight:700,color:"#7c3aed"}}>{fR(recTotal)}</td>
                <td style={S.td}>{(p.embQtd||0)>0?<span style={{fontSize:12,color:"#d97706",fontWeight:600}}>📦 {p.embQtd}{i2&&<><br/><span style={{fontSize:10,color:"var(--text4)"}}>{fR(p.embalagemCusto||0)}</span></>}</span>:<span style={{color:"var(--border3)"}}>—</span>}</td>
                <td style={S.td}>{(p.teleValor||0)>0?<span style={{color:"#059669",fontWeight:600}}>🛵 {fR(p.teleValor)}</span>:<span style={{color:"var(--border3)"}}>—</span>}</td>
                <td style={S.td}>{(p.desconto||0)>0?<span style={{color:"#ef4444",fontWeight:600}}>-{fR(p.desconto)}</span>:<span style={{color:"var(--border3)"}}>—</span>}</td>
                <td style={{...S.td,fontSize:12,color:"var(--text4)",maxWidth:90,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.obs||"—"}</td>
                <td style={S.td}><Pill label={estS.label} color={estS.color} bg={estS.bg}/></td>
                <td style={S.td}>
                  {p.status==="Pendente"&&canConfirmar&&<button style={{...S.bsm,background:"#dcfce7",color:"#065f46",border:"1px solid #86efac",marginRight:4}} onClick={()=>confirmar(p)}>✅ Confirmar</button>}
                  {p.status==="Pendente"&&canConfirmar&&<button style={{...S.bsm,color:"#b45309",marginRight:4}} onClick={()=>cancelar(p.id)}>✕</button>}
                  {p.status==="Pendente"&&!canConfirmar&&<span style={{fontSize:12,color:"var(--text4)"}}>Aguardando</span>}
                  <button style={{...S.bsm,color:"#ef4444",marginLeft:4}} onClick={()=>remover(p.id)}>🗑️</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  </>);
}

function VendasTab({vendas,setVendas,fichasCalc,getPreco,estoqueProdutoFn,idef,custMedioFn}){
  const today=new Date().toISOString().slice(0,10);
  const blankOrder={data:today,usaEmbalagem:false,embQtd:"",embInsumoId:"",desconto:"",usaTele:false,teleValor:"",pagamento:"Dinheiro"};
  const blankItem={fichaId:"",qtd:""};
  const [f,setF]=useState(blankOrder);
  const [nItem,setNItem]=useState(blankItem);
  const [carrinho,setCarrinho]=useState([]);

  const insEmb=idef.filter(i=>i.nome.toLowerCase().includes("embalagem")||i.nome.toLowerCase().includes("sacola")||i.nome.toLowerCase().includes("caixa"));
  const cmEmb=f.embInsumoId?custMedioFn(f.embInsumoId):0;
  const custoEmb=f.usaEmbalagem&&+f.embQtd>0&&cmEmb>0?cmEmb*(+f.embQtd):0;
  const totalCarrinho=carrinho.reduce((s,i)=>s+i.qtd*getPreco(i.fichaId),0);

  const totRec=vendas.reduce((s,v)=>s+getItems(v).reduce((ss,i)=>ss+i.qtd*getPreco(i.fichaId),0),0);
  const totTele=vendas.reduce((s,v)=>s+(v.teleValor||0),0);
  const totDesc=vendas.reduce((s,v)=>s+(v.desconto||0),0);
  const totEmb=vendas.reduce((s,v)=>s+(v.embalagemCusto||0),0);

  function addItem(){
    if(!nItem.fichaId)return alert("Selecione o produto.");
    if(!nItem.qtd||+nItem.qtd<=0)return alert("Informe a quantidade.");
    const ex=carrinho.find(i=>i.fichaId===nItem.fichaId);
    if(ex){setCarrinho(carrinho.map(i=>i.fichaId===nItem.fichaId?{...i,qtd:i.qtd+(+nItem.qtd)}:i));}
    else{setCarrinho([...carrinho,{id:uid(),fichaId:nItem.fichaId,qtd:+nItem.qtd}]);}
    setNItem(blankItem);
  }
  function removeItem(id){setCarrinho(carrinho.filter(i=>i.id!==id));}
  function updateItemQtd(id,val){if(+val>0)setCarrinho(carrinho.map(i=>i.id===id?{...i,qtd:+val}:i));}

  function add(){
    if(!carrinho.length)return alert("Adicione ao menos um produto.");
    if(f.usaEmbalagem&&!f.embInsumoId)return alert("Selecione o insumo de embalagem.");
    if(f.usaEmbalagem&&(!f.embQtd||+f.embQtd<=0))return alert("Informe a quantidade de embalagens.");
    let bloqueou=false;
    for(const item of carrinho){
      const es=estoqueProdutoFn(item.fichaId);
      if(es<item.qtd){
        const fc=fichasCalc.find(f=>f.id===item.fichaId);
        if(!window.confirm(`⚠️ Estoque insuficiente para "${fc?.nome||"?"}":\n  Tem: ${es} un  |  Precisa: ${item.qtd} un\n\nVender assim mesmo?`)){bloqueou=true;break;}
      }
    }
    if(bloqueou)return;
    setVendas([...vendas,{
      id:uid(),items:carrinho,data:f.data,
      embalagemCusto:custoEmb,embQtd:f.usaEmbalagem?+f.embQtd:0,embInsumoId:f.embInsumoId,
      desconto:+f.desconto||0,teleValor:f.usaTele?+f.teleValor||0:0,
      pagamento:f.pagamento,
    }]);
    setCarrinho([]);
    setF({...blankOrder,data:f.data,pagamento:f.pagamento});
  }
  function remover(id){if(window.confirm("Remover venda?"))setVendas(vendas.filter(v=>v.id!==id));}

  return(<>
    <Card title="🛒 Registrar Venda">
      {!fichasCalc.length?<p style={{color:"#d97706",background:"rgba(245,158,11,.1)",padding:10,borderRadius:8,fontSize:13}}>⚠️ Cadastre produtos e produção primeiro.</p>:(
        <>
          {/* Carrinho */}
          <div style={{background:"var(--card2)",border:"1px solid var(--border3)",borderRadius:10,padding:14,marginBottom:12}}>
            <p style={{margin:"0 0 10px",fontSize:13,fontWeight:700,color:"#7c3aed"}}>🛒 Itens da Venda</p>
            <G cols="3fr 1fr auto" mb={carrinho.length>0?12:0}>
              <div><Lbl s="Produto"/><select style={S.inp} value={nItem.fichaId} onChange={e=>setNItem({...nItem,fichaId:e.target.value})}><option value="">Selecione...</option>{fichasCalc.map(p=><option key={p.id} value={p.id}>{p.nome} — {fR(getPreco(p.id))}/un · Est: {estoqueProdutoFn(p.id)} un</option>)}</select></div>
              <div><Lbl s="Quantidade"/><input style={S.inp} type="number" min="1" step="1" placeholder="Ex: 10" value={nItem.qtd} onChange={e=>setNItem({...nItem,qtd:e.target.value})} onKeyDown={e=>e.key==="Enter"&&addItem()}/></div>
              <div style={{display:"flex",alignItems:"flex-end"}}><button style={S.btn} onClick={addItem}>+ Adicionar</button></div>
            </G>
            {carrinho.length>0?(
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr>{["Produto","Estoque","Qtd.","Preço/un","Subtotal",""].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {carrinho.map(item=>{
                    const fc=fichasCalc.find(f=>f.id===item.fichaId);
                    const pr=getPreco(item.fichaId);
                    const es=estoqueProdutoFn(item.fichaId);
                    const insuf=es<item.qtd;
                    return(
                      <tr key={item.id} style={{background:insuf?"rgba(239,68,68,.05)":"transparent"}}>
                        <td style={{...S.td,fontWeight:600,color:insuf?"#ef4444":"var(--text)"}}>
                          {fc?.nome||"—"}{insuf&&<span style={{fontSize:11,color:"#ef4444",marginLeft:6,fontWeight:400}}>⚠️ insuf.</span>}
                        </td>
                        <td style={{...S.td,color:insuf?"#ef4444":"#059669",fontWeight:600}}>{es} un</td>
                        <td style={S.td}>
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <input type="number" min="1" step="1" value={item.qtd}
                              onChange={e=>updateItemQtd(item.id,e.target.value)}
                              style={{...S.inp,width:72,padding:"3px 8px",textAlign:"center"}}/>
                            <span style={{color:"var(--text3)",fontSize:12}}>un</span>
                          </div>
                        </td>
                        <td style={S.td}>{fR(pr)}</td>
                        <td style={{...S.td,fontWeight:700,color:"#7c3aed"}}>{fR(pr*item.qtd)}</td>
                        <td style={S.td}><button style={{...S.bsm,color:"#ef4444"}} onClick={()=>removeItem(item.id)}>🗑️</button></td>
                      </tr>
                    );
                  })}
                  <tr style={{background:"rgba(124,58,237,.06)"}}>
                    <td colSpan={4} style={{...S.td,fontWeight:700,textAlign:"right",color:"#7c3aed"}}>Total dos produtos:</td>
                    <td style={{...S.td,fontWeight:700,color:"#7c3aed",fontSize:15}}>{fR(totalCarrinho)}</td>
                    <td style={S.td}/>
                  </tr>
                </tbody>
              </table>
            ):(
              <p style={{margin:"8px 0 0",fontSize:13,color:"var(--text4)",textAlign:"center",padding:"12px 0"}}>Nenhum item adicionado. Use o seletor acima para montar a venda.</p>
            )}
          </div>

          {/* Data + Pagamento */}
          <G cols="1fr 1fr" gap={10} mb={10}>
            <div><Lbl s="Data da venda"/><input style={S.inp} type="date" value={f.data} onChange={e=>setF({...f,data:e.target.value})}/></div>
            <div>
              <Lbl s="💳 Meio de pagamento"/>
              <select style={S.inp} value={f.pagamento} onChange={e=>setF({...f,pagamento:e.target.value})}>
                {PAGAMENTOS_ENTRADA.map(p=><option key={p}>{p}</option>)}
              </select>
            </div>
          </G>
          <div style={{background:"var(--card2)",border:"1px solid var(--border3)",borderRadius:10,padding:14,marginBottom:10}}>
            <G cols="1fr 1fr 1fr" gap={16} mb={0}>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                  <input type="checkbox" id="usaEmb" checked={f.usaEmbalagem} onChange={e=>setF({...f,usaEmbalagem:e.target.checked,embQtd:"",embInsumoId:""})} style={{width:16,height:16,accentColor:"#7c3aed",cursor:"pointer"}}/>
                  <label htmlFor="usaEmb" style={{fontSize:14,fontWeight:600,color:"#7c3aed",cursor:"pointer"}}>📦 Usar embalagem?</label>
                </div>
                {f.usaEmbalagem&&(<G cols="1fr 1fr" gap={8} mb={0}>
                  <div><Lbl s="Insumo de embalagem"/><select style={S.inp} value={f.embInsumoId} onChange={e=>setF({...f,embInsumoId:e.target.value})}><option value="">Selecione...</option>{(insEmb.length?insEmb:idef).map(i=>{const c=custMedioFn(i.id);return<option key={i.id} value={i.id}>{i.nome} — {c>0?fR(c):"sem compras"}/{i.unidade}</option>;})}</select></div>
                  <div><Lbl s="Qtd. de embalagens"/><input style={S.inp} type="number" min="1" step="1" placeholder="Ex: 2" value={f.embQtd} onChange={e=>setF({...f,embQtd:e.target.value})}/></div>
                </G>)}
                {f.usaEmbalagem&&f.embInsumoId&&+f.embQtd>0&&cmEmb>0&&<div style={{marginTop:8,fontSize:13,background:"rgba(245,158,11,.1)",color:"#d97706",padding:"6px 12px",borderRadius:8}}>📦 {f.embQtd} un × {fR(cmEmb)} = <strong>{fR(custoEmb)}</strong></div>}
                {f.usaEmbalagem&&f.embInsumoId&&cmEmb===0&&<p style={{fontSize:12,color:"#ef4444",marginTop:6}}>⚠️ Sem custo médio.</p>}
              </div>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                  <input type="checkbox" id="usaTele" checked={f.usaTele} onChange={e=>setF({...f,usaTele:e.target.checked,teleValor:""})} style={{width:16,height:16,accentColor:"#059669",cursor:"pointer"}}/>
                  <label htmlFor="usaTele" style={{fontSize:14,fontWeight:600,color:"#059669",cursor:"pointer"}}>🛵 Tele entrega?</label>
                </div>
                {f.usaTele&&(<><Lbl s="Valor da tele entrega (R$)"/><input style={S.inp} type="number" step="0.01" min="0" placeholder="Ex: 5,00" value={f.teleValor} onChange={e=>setF({...f,teleValor:e.target.value})}/>{+f.teleValor>0&&<div style={{marginTop:8,fontSize:13,background:"rgba(5,150,105,.1)",color:"#059669",padding:"6px 12px",borderRadius:8}}>🛵 +{fR(+f.teleValor)} por pedido</div>}</>)}
              </div>
              <div>
                <Lbl s="🏷️ Desconto (R$)"/>
                <input style={S.inp} type="number" step="0.01" min="0" placeholder="0,00" value={f.desconto} onChange={e=>setF({...f,desconto:e.target.value})}/>
                {+f.desconto>0&&<p style={{fontSize:12,color:"#ef4444",marginTop:6}}>Desconto de <strong>{fR(+f.desconto)}</strong></p>}
              </div>
            </G>
          </div>

          {carrinho.length>0&&<div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:12}}>
            <span style={{fontSize:13,color:"#7c3aed",background:"var(--accent-soft)",padding:"5px 12px",borderRadius:8}}>🛒 {carrinho.length} item(s): <strong>{fR(totalCarrinho)}</strong></span>
            {f.usaTele&&+f.teleValor>0&&<span style={{fontSize:13,color:"#059669",background:"rgba(5,150,105,.1)",padding:"5px 12px",borderRadius:8}}>🛵 <strong>+{fR(+f.teleValor)}</strong></span>}
            {custoEmb>0&&<span style={{fontSize:13,color:"#d97706",background:"rgba(245,158,11,.1)",padding:"5px 12px",borderRadius:8}}>📦 <strong>-{fR(custoEmb)}</strong></span>}
            {+f.desconto>0&&<span style={{fontSize:13,color:"#ef4444",background:"rgba(239,68,68,.1)",padding:"5px 12px",borderRadius:8}}>🏷️ <strong>-{fR(+f.desconto)}</strong></span>}
            <span style={{fontSize:13,color:"#059669",background:"rgba(5,150,105,.12)",padding:"5px 14px",borderRadius:8,fontWeight:700,border:"1px solid #6ee7b7"}}>
              Total: <strong>{fR(totalCarrinho+(f.usaTele?+f.teleValor||0:0)-custoEmb-(+f.desconto||0))}</strong>
            </span>
          </div>}
          <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
            {carrinho.length>0&&<button style={S.btn2} onClick={()=>setCarrinho([])}>🗑️ Limpar itens</button>}
            <button style={{...S.btn,opacity:carrinho.length===0?.45:1,cursor:carrinho.length===0?"not-allowed":"pointer"}} onClick={add} disabled={carrinho.length===0}>
              + Registrar Venda{carrinho.length>0?` (${carrinho.length} item${carrinho.length!==1?"s":""})`:""}
            </button>
          </div>
        </>
      )}
    </Card>

    <G cols="repeat(5,1fr)" gap={12} mb={20}>
      <KPI label="📦 Total vendido" value={vendas.reduce((s,v)=>s+getItems(v).reduce((ss,i)=>ss+i.qtd,0),0)+" un"} color="#7c3aed"/>
      <KPI label="💵 Receita Produtos" value={fR(totRec)} color="#059669"/>
      <KPI label="🛵 Tele Entregas" value={fR(totTele)} color="#059669"/>
      <KPI label="🏷️ Descontos" value={fR(totDesc)} color="#ef4444"/>
      <KPI label="📦 Embalagens" value={fR(totEmb)} color="#d97706"/>
    </G>

    <Card title={`📋 Vendas (${vendas.length})`}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:14}}>
        <thead><tr>{["Data","Itens Vendidos","Receita","💳 Pagamento","🛵 Tele","Embalagem","Desconto","Ações"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
        <tbody>
          {!vendas.length&&<tr><td colSpan={8} style={{...S.td,textAlign:"center",color:"var(--text4)",padding:28}}>Nenhuma venda registrada.</td></tr>}
          {vendas.map(v=>{
            const its=getItems(v);
            const recV=its.reduce((s,i)=>s+i.qtd*getPreco(i.fichaId),0);
            const i2=idef.find(i=>i.id===v.embInsumoId);
            const pc=PAG_CORES[v.pagamento];
            return(
              <tr key={v.id}>
                <td style={S.td}>{v.data||"—"}</td>
                <td style={S.td}>
                  {its.map((item,idx)=>{
                    const fc=fichasCalc.find(p=>p.id===item.fichaId);
                    return(<div key={item.fichaId||idx} style={{fontSize:13,marginBottom:idx<its.length-1?4:0,display:"flex",alignItems:"center",gap:6}}><span style={{fontWeight:600}}>{fc?.nome||"—"}</span><span style={{background:"var(--accent-soft)",color:"#7c3aed",padding:"1px 7px",borderRadius:20,fontSize:11,fontWeight:700}}>{item.qtd} un</span><span style={{color:"var(--text4)",fontSize:11}}>{fR(item.qtd*getPreco(item.fichaId))}</span></div>);
                  })}
                </td>
                <td style={{...S.td,fontWeight:700,color:"#059669"}}>{fR(recV)}</td>
                <td style={S.td}>{v.pagamento?<span style={{background:pc?.bg||"var(--card2)",color:pc?.c||"var(--text3)",padding:"2px 10px",borderRadius:20,fontSize:12,fontWeight:600}}>{v.pagamento}</span>:<span style={{color:"var(--text4)",fontSize:12}}>—</span>}</td>
                <td style={S.td}>{(v.teleValor||0)>0?<span style={{color:"#059669",fontWeight:600}}>🛵 {fR(v.teleValor)}</span>:<span style={{color:"var(--border3)"}}>—</span>}</td>
                <td style={S.td}>{(v.embQtd||0)>0?<span style={{fontSize:12}}><span style={{color:"#d97706",fontWeight:600}}>📦 {v.embQtd} un</span><br/><span style={{color:"var(--text4)",fontSize:11}}>{i2?.nome||""} — {fR(v.embalagemCusto)}</span></span>:<span style={{color:"var(--border3)"}}>—</span>}</td>
                <td style={S.td}>{(v.desconto||0)>0?<span style={{color:"#ef4444",fontWeight:600}}>-{fR(v.desconto)}</span>:<span style={{color:"var(--border3)"}}>—</span>}</td>
                <td style={S.td}><button style={{...S.bsm,color:"#ef4444"}} onClick={()=>remover(v.id)}>🗑️</button></td>
              </tr>
            );
          })}
          {vendas.length>0&&(
            <tr style={{background:"rgba(5,150,105,.06)"}}>
              <td colSpan={2} style={{...S.td,fontWeight:700,textAlign:"right",color:"#065f46"}}>Totais:</td>
              <td style={{...S.td,fontWeight:700,color:"#059669",fontSize:15}}>{fR(totRec)}</td>
              <td style={S.td}/>
              <td style={{...S.td,color:"#059669",fontWeight:600}}>{totTele>0?fR(totTele):"—"}</td>
              <td style={{...S.td,color:"#d97706",fontWeight:600}}>{totEmb>0?fR(totEmb):"—"}</td>
              <td style={{...S.td,color:"#ef4444",fontWeight:600}}>{totDesc>0?`-${fR(totDesc)}`:"—"}</td>
              <td style={S.td}/>
            </tr>
          )}
        </tbody>
      </table>
    </Card>
  </>);
}

function DespesasTab({despesas,setDespesas}){
  const blank={descricao:"",tipo:"Fixa",valor:""};const [f,setF]=useState(blank);const [eid,setEid]=useState(null);
  function salvar(){if(!f.descricao.trim()||!f.valor||+f.valor<=0)return alert("Preencha todos os campos.");const it={id:eid||uid(),descricao:f.descricao.trim(),tipo:f.tipo,valor:+f.valor};setDespesas(eid?despesas.map(d=>d.id===eid?it:d):[...despesas,it]);setF(blank);setEid(null);}
  function editar(d){setF({descricao:d.descricao,tipo:d.tipo,valor:d.valor});setEid(d.id);}
  function remover(id){if(window.confirm("Remover?"))setDespesas(despesas.filter(d=>d.id!==id));}
  const fx=despesas.filter(d=>d.tipo==="Fixa").reduce((s,d)=>s+(+d.valor||0),0),vr=despesas.filter(d=>d.tipo==="Variável").reduce((s,d)=>s+(+d.valor||0),0);
  return(<>
    <Card title="➕ Nova Despesa">
      <G cols="3fr 1fr 1fr auto">
        <div><Lbl s="Descrição *"/><input style={S.inp} placeholder="Ex: Energia elétrica" value={f.descricao} onChange={e=>setF({...f,descricao:e.target.value})}/></div>
        <div><Lbl s="Tipo"/><select style={S.inp} value={f.tipo} onChange={e=>setF({...f,tipo:e.target.value})}><option>Fixa</option><option>Variável</option></select></div>
        <div><Lbl s="Valor mensal (R$) *"/><input style={S.inp} type="number" step="0.01" value={f.valor} onChange={e=>setF({...f,valor:e.target.value})}/></div>
        <div style={{display:"flex",alignItems:"flex-end",gap:6}}>{eid&&<button style={S.btn2} onClick={()=>{setF(blank);setEid(null)}}>✕</button>}<button style={S.btn} onClick={salvar}>{eid?"✓":"+"}</button></div>
      </G>
    </Card>
    <G cols="1fr 1fr 1fr" gap={12} mb={20}><KPI label="🔵 Fixas" value={fR(fx)} color="#1d4ed8"/><KPI label="🟡 Variáveis" value={fR(vr)} color="#d97706"/><KPI label="💰 Total" value={fR(fx+vr)} color="#7c3aed"/></G>
    <Card title={`🏢 Despesas (${despesas.length})`}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:14}}>
        <thead><tr>{["Descrição","Tipo","Valor Mensal","Ações"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
        <tbody>
          {!despesas.length&&<tr><td colSpan={4} style={{...S.td,textAlign:"center",color:"var(--text4)",padding:28}}>Nenhuma despesa cadastrada.</td></tr>}
          {despesas.map(d=><tr key={d.id}><td style={{...S.td,fontWeight:500}}>{d.descricao}</td><td style={S.td}><Pill label={d.tipo} color={d.tipo==="Fixa"?"#1d4ed8":"#b45309"} bg={d.tipo==="Fixa"?"#eff6ff":"#fffbeb"}/></td><td style={{...S.td,fontWeight:600}}>{fR(d.valor)}</td><td style={S.td}><button style={S.bsm} onClick={()=>editar(d)}>✏️</button><button style={{...S.bsm,color:"#ef4444",marginLeft:6}} onClick={()=>remover(d.id)}>🗑️</button></td></tr>)}
          {despesas.length>0&&<tr style={{background:"var(--card2)"}}><td colSpan={2} style={{...S.td,fontWeight:700,color:"#7c3aed"}}>Total Mensal</td><td style={{...S.td,fontWeight:700,color:"#7c3aed"}}>{fR(fx+vr)}</td><td style={S.td}/></tr>}
        </tbody>
      </table>
    </Card>
  </>);
}

function DRETab({vendas,fichasCalc,getPreco,despesas}){
  const now=new Date();
  const [mes,setMes]=useState(now.getMonth()+1);
  const [ano,setAno]=useState(now.getFullYear());
  const [filtroAtivo,setFiltroAtivo]=useState(false);
  const anosDisp=[...new Set(vendas.map(v=>v.data?.slice(0,4)).filter(Boolean))].sort();
  const vf=filtroAtivo?vendas.filter(v=>{if(!v.data)return false;const[y,m]=v.data.split("-");return +m===mes&&+y===ano;}):vendas;
  const recPorProd=fichasCalc.map(fc=>{
    const qtd=vf.reduce((s,v)=>s+getItems(v).filter(i=>i.fichaId===fc.id).reduce((ss,i)=>ss+i.qtd,0),0);
    const rec=qtd*getPreco(fc.id);
    return{id:fc.id,nome:fc.nome,rec,qtd};
  }).filter(p=>p.qtd>0);
  const recProd=recPorProd.reduce((s,p)=>s+p.rec,0);
  const recTele=vf.reduce((s,v)=>s+(v.teleValor||0),0);
  const recTotal=recProd+recTele;
  const cmv=vf.reduce((s,v)=>s+getItems(v).reduce((ss,i)=>{const f=fichasCalc.find(p=>p.id===i.fichaId);return ss+(f?i.qtd*f.custo:0);},0),0);
  const totEmb=vf.reduce((s,v)=>s+(v.embalagemCusto||0),0);
  const totDesc=vf.reduce((s,v)=>s+(v.desconto||0),0);
  const lucBruto=recTotal-cmv-totEmb-totDesc;
  const totDesp=despesas.reduce((s,d)=>s+(+d.valor||0),0);
  const lucOp=lucBruto-totDesp;
  const mbPct=recTotal>0?lucBruto/recTotal*100:0;
  const moPct=recTotal>0?lucOp/recTotal*100:0;
  const label=filtroAtivo?`${MESES[mes-1]}/${ano}`:"Todo o período";
  function pct(v){return recTotal>0?fP(v/recTotal*100):"—";}
  function exportCSV(){
    const rows=[["Período",label,""],["Descrição","Valor (R$)","% Receita Total"],["FATURAMENTO DE PRODUTOS",recProd.toFixed(2),pct(recProd)],...recPorProd.map(p=>[`  ↳ ${p.nome} (${p.qtd} un)`,p.rec.toFixed(2),pct(p.rec)]),recTele>0?["RECEITA TELE ENTREGA",recTele.toFixed(2),pct(recTele)]:[],...[["RECEITA TOTAL",recTotal.toFixed(2),"100.0%"],["(-) CMV",(-cmv).toFixed(2),pct(-cmv)]],...(totEmb>0?[["(-) Embalagens",(-totEmb).toFixed(2),pct(-totEmb)]]:[]),...(totDesc>0?[["(-) Descontos",(-totDesc).toFixed(2),pct(-totDesc)]]:[]),["(=) LUCRO BRUTO",lucBruto.toFixed(2),fP(mbPct)],...despesas.map(d=>[d.descricao,(-d.valor).toFixed(2),pct(-d.valor)]),["(=) LUCRO OPERACIONAL",lucOp.toFixed(2),fP(moPct)]].filter(r=>r.length>0);
    const a=document.createElement("a");a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(rows.map(r=>r.join(";")).join("\n"));a.download=`DRE_NaGarrafa_${label.replace("/","_")}.csv`;a.click();
  }
  function DreRow({lbl,val,indent,bold,color,bg,sep}){indent=indent||0;bold=bold||false;bg=bg||"transparent";sep=sep||false;return(<tr style={{background:bg,borderTop:sep?"2px solid var(--border3)":"none"}}><td style={{...S.td,paddingLeft:16+indent*18,fontWeight:bold?700:400,color:color||"var(--text)",fontSize:bold?15:14}}>{lbl}</td><td style={{...S.td,textAlign:"right",fontWeight:bold?700:500,color:color||"var(--text)",fontSize:bold?15:14}}>{fR(val)}</td><td style={{...S.td,textAlign:"right",fontSize:13,color:"var(--text4)"}}>{pct(val)}</td></tr>);}
  function SubRow({nome,val,qtd}){return(<tr style={{background:"rgba(5,150,105,.02)"}}><td style={{...S.td,paddingLeft:34,fontSize:13,color:"var(--text3)"}}>↳ {nome} <span style={{color:"var(--text4)",fontSize:11}}>({qtd} un)</span></td><td style={{...S.td,textAlign:"right",fontSize:13,color:"#059669"}}>{fR(val)}</td><td style={{...S.td,textAlign:"right",fontSize:12,color:"var(--text4)"}}>{pct(val)}</td></tr>);}
  return(<>
    <Card title="🗓️ Filtro de Período">
      <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}><input type="checkbox" id="filtroAtivo" checked={filtroAtivo} onChange={e=>setFiltroAtivo(e.target.checked)} style={{width:16,height:16,accentColor:"#7c3aed",cursor:"pointer"}}/><label htmlFor="filtroAtivo" style={{fontSize:14,fontWeight:600,color:"#7c3aed",cursor:"pointer"}}>Filtrar por período</label></div>
        <div style={{display:"flex",gap:8,opacity:filtroAtivo?1:.4,pointerEvents:filtroAtivo?"auto":"none"}}>
          <div><Lbl s="Mês"/><select style={{...S.inp,width:150}} value={mes} onChange={e=>setMes(+e.target.value)}>{MESES.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}</select></div>
          <div><Lbl s="Ano"/><select style={{...S.inp,width:100}} value={ano} onChange={e=>setAno(+e.target.value)}>{[...new Set([...anosDisp,String(now.getFullYear())])].sort().map(a=><option key={a} value={a}>{a}</option>)}</select></div>
        </div>
        <div style={{marginLeft:8,marginTop:16}}><span style={{fontSize:13,background:filtroAtivo?"var(--accent-soft)":"var(--card2)",color:filtroAtivo?"#7c3aed":"var(--text3)",padding:"6px 14px",borderRadius:20,fontWeight:600}}>{filtroAtivo?`📅 ${label}`:"📅 Todo o período"}</span></div>
        {filtroAtivo&&<div style={{marginTop:16}}><span style={{fontSize:13,color:"#059669",background:"rgba(5,150,105,.1)",padding:"6px 14px",borderRadius:20}}>🧾 {vf.length} venda(s)</span></div>}
      </div>
    </Card>
    <G cols="repeat(4,1fr)" gap={12} mb={20}>
      <KPI label="💵 Faturamento Produtos" value={fR(recProd)} color="#059669"/>
      <KPI label="🛵 Receita Tele" value={fR(recTele)} color="#059669"/>
      <KPI label="📈 Lucro Bruto" value={fR(lucBruto)} color={lucBruto>=0?"#7c3aed":"#ef4444"}/>
      <KPI label="🏆 Lucro Operacional" value={fR(lucOp)} color={lucOp>=0?"#1d4ed8":"#ef4444"}/>
    </G>
    <Card title={`📊 DRE Gerencial — ${label}`} right={<button style={S.btn2} onClick={exportCSV}>📥 Exportar CSV</button>}>
      <table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><tr style={{background:"#4c1d95"}}>{["Descrição","Valor (R$)","% Receita"].map(h=><th key={h} style={{...S.th,background:"#4c1d95",color:"white",textAlign:h!=="Descrição"?"right":"left"}}>{h}</th>)}</tr></thead>
        <tbody>
          <DreRow lbl="(+) FATURAMENTO DE PRODUTOS" val={recProd} bold color="#059669" bg="rgba(5,150,105,.07)"/>
          {recPorProd.map(p=><SubRow key={p.id} nome={p.nome} val={p.rec} qtd={p.qtd}/>)}
          {recTele>0&&<DreRow lbl="(+) RECEITA DE TELE ENTREGA" val={recTele} bold color="#059669" bg="rgba(5,150,105,.04)"/>}
          <DreRow lbl="(=) RECEITA TOTAL" val={recTotal} bold color="#059669" bg="rgba(5,150,105,.1)" sep/>
          <DreRow lbl="(-) CMV — Custo das Mercadorias Vendidas" val={-cmv} indent={1} color="#ef4444"/>
          {totEmb>0&&<DreRow lbl="(-) Custos de Embalagem" val={-totEmb} indent={1} color="#ef4444"/>}
          {totDesc>0&&<DreRow lbl="(-) Descontos Concedidos" val={-totDesc} indent={1} color="#ef4444"/>}
          <DreRow lbl="(=) LUCRO BRUTO" val={lucBruto} bold bg="var(--card2)" sep color={lucBruto>=0?"#7c3aed":"#ef4444"}/>
          <DreRow lbl="(-) DESPESAS OPERACIONAIS" val={-totDesp} bold color="#d97706" sep/>
          {despesas.map(d=><DreRow key={d.id} lbl={`${d.tipo==="Fixa"?"🔵":"🟡"} ${d.descricao}`} val={-d.valor} indent={1}/>)}
          <DreRow lbl="(=) LUCRO OPERACIONAL" val={lucOp} bold bg={lucOp>=0?"rgba(5,150,105,.07)":"rgba(239,68,68,.07)"} sep color={lucOp>=0?"#059669":"#ef4444"}/>
          <tr style={{background:"var(--card2)"}}><td style={{...S.td,fontWeight:700,color:"#7c3aed"}}>📐 Margem Operacional</td><td style={{...S.td,textAlign:"right",fontWeight:700,color:moPct>=0?"#7c3aed":"#ef4444",fontSize:16}}>{fP(moPct)}</td><td style={{...S.td,textAlign:"right",fontSize:13,color:"var(--text4)"}}>{fP(moPct)}</td></tr>
        </tbody>
      </table>
    </Card>
  </>);
}

function DashboardTab({fichasCalc,vendas,margens,getPreco,recBruta,lucOp,totDesp,despesas}){
  const porProd=fichasCalc.map(fc=>{
    const qtd=vendas.reduce((s,v)=>s+getItems(v).filter(i=>i.fichaId===fc.id).reduce((ss,i)=>ss+i.qtd,0),0);
    const rec=qtd*getPreco(fc.id),cus=qtd*fc.custo;
    return{nome:fc.nome.length>14?fc.nome.slice(0,14)+"…":fc.nome,qtd,receita:rec,custo:cus,lucro:rec-cus,margem:+(margens[fc.id]??40)};
  }).filter(p=>p.qtd>0);
  const maisLuc=[...porProd].sort((a,b)=>b.lucro-a.lucro)[0];
  const margemMed=fichasCalc.length?fichasCalc.reduce((s,f)=>s+(+(margens[f.id]??40)),0)/fichasCalc.length:0;
  const totFix=despesas.filter(d=>d.tipo==="Fixa").reduce((s,d)=>s+(+d.valor||0),0);
  const avgMC=fichasCalc.length?fichasCalc.reduce((s,f)=>s+(getPreco(f.id)-f.custo),0)/fichasCalc.length:0;
  const be=avgMC>0?Math.ceil(totFix/avgMC):null;
  const cmvT=vendas.reduce((s,v)=>s+getItems(v).reduce((ss,i)=>{const f=fichasCalc.find(p=>p.id===i.fichaId);return ss+(f?i.qtd*f.custo:0);},0),0);
  const pie=[{name:"CMV",value:cmvT},{name:"Desp. Op.",value:totDesp},{name:"Lucro Op.",value:Math.max(0,lucOp)}].filter(d=>d.value>0);
  return(<>
    <G cols="repeat(2,1fr)" gap={12} mb={20}>
      <KPI label="💵 Receita Total" value={fR(recBruta)} color="#059669"/>
      <KPI label="📈 Lucro Operacional" value={fR(lucOp)} color={lucOp>=0?"#1d4ed8":"#ef4444"} sub={lucOp<0?"⚠️ Resultado negativo":""}/>
      <KPI label="📊 Margem Média" value={fP(margemMed)} color="#6d28d9" sub={`${fichasCalc.length} produto(s)`}/>
      <KPI label="🏆 Mais Lucrativo" value={maisLuc?.nome||"—"} color="#3730a3" sub={maisLuc?`Lucro: ${fR(maisLuc.lucro)}`:"Sem vendas"}/>
    </G>
    {be!==null&&<div style={{background:"rgba(245,158,11,.1)",border:"1px solid #fde68a",borderRadius:10,padding:16,marginBottom:20,display:"flex",gap:12}}><span style={{fontSize:28}}>⚖️</span><div><p style={{margin:"0 0 4px",fontWeight:700,color:"#d97706"}}>Ponto de Equilíbrio</p><p style={{margin:0,fontSize:14,color:"var(--text2)"}}>Para cobrir despesas fixas de <strong>{fR(totFix)}/mês</strong>, venda ao menos <strong>{be} unidades/mês</strong>. MC média: <strong>{fR(avgMC)}/un</strong>.</p></div></div>}
    {!porProd.length
      ?<div style={{textAlign:"center",padding:"48px 24px",color:"var(--text4)",background:"var(--card)",borderRadius:12,border:"1px solid var(--border)"}}><span style={{fontSize:52}}>📊</span><p style={{marginTop:12}}>Registre vendas para visualizar os gráficos.</p></div>
      :<G cols="1fr 1fr" gap={20} mb={0}>
        <Card title="📦 Receita e Lucro por Produto"><ResponsiveContainer width="100%" height={220}><BarChart data={porProd}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/><XAxis dataKey="nome" tick={{fontSize:11,fill:"var(--text3)"}}/><YAxis tickFormatter={v=>`R$${v.toFixed(0)}`} tick={{fontSize:11,fill:"var(--text3)"}}/><Tooltip contentStyle={{background:"var(--card)",border:"1px solid var(--border)",color:"var(--text)"}} formatter={v=>fR(v)}/><Bar dataKey="receita" name="Receita" fill="#7c3aed" radius={[4,4,0,0]}/><Bar dataKey="lucro" name="Lucro" fill="#a78bfa" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></Card>
        <Card title="🍩 Composição da Receita"><ResponsiveContainer width="100%" height={220}><PieChart><Pie data={pie} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={11}>{pie.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip contentStyle={{background:"var(--card)",border:"1px solid var(--border)",color:"var(--text)"}} formatter={v=>fR(v)}/></PieChart></ResponsiveContainer></Card>
      </G>
    }
  </>);
}

// ── LISTA DE COMPRAS ────────────────────────────────────────────────────────
function ListaComprasTab({fichasCalc, idef, setIdef, estoqueInsumoFn, custMedioFn}) {
  const [plano, setPlano] = useState([]);
  const [selFicha, setSelFicha] = useState("");
  const [selQtd, setSelQtd] = useState("");
  const [editCap, setEditCap] = useState({});

  function addAoPlano() {
    if (!selFicha) return alert("Selecione um produto.");
    if (!selQtd || +selQtd <= 0) return alert("Informe a quantidade a produzir.");
    const ex = plano.find(p => p.fichaId === selFicha);
    if (ex) {
      setPlano(plano.map(p => p.fichaId === selFicha ? {...p, qtd: p.qtd + (+selQtd)} : p));
    } else {
      setPlano([...plano, {id: uid(), fichaId: selFicha, qtd: +selQtd}]);
    }
    setSelQtd("");
    setSelFicha("");
  }

  function removerDoPlano(id) {
    setPlano(plano.filter(p => p.id !== id));
  }

  function atualizarQtd(id, val) {
    if (+val <= 0) return;
    setPlano(plano.map(p => p.id === id ? {...p, qtd: +val} : p));
  }

  // Calcular necessidades por insumo
  const necessidades = {};
  plano.forEach(({fichaId, qtd}) => {
    const ficha = fichasCalc.find(f => f.id === fichaId);
    if (!ficha) return;
    (ficha.ings || []).forEach(ing => {
      const ins = idef.find(i => i.id === ing.iid);
      if (!ins) return;
      const qtdNec = cvt(ing.qtd, ing.un || ins.unidade, ins.unidade) * qtd;
      necessidades[ing.iid] = (necessidades[ing.iid] || 0) + qtdNec;
    });
  });

  const lista = Object.entries(necessidades).map(([iid, qtdNec]) => {
    const ins = idef.find(i => i.id === iid);
    if (!ins) return null;
    const estoque = Math.max(0, estoqueInsumoFn(iid));
    const faltante = Math.max(0, qtdNec - estoque);
    const cap = ins.capacidadeUnitaria;
    let embalagens = null;
    let qtdSugerida = faltante;
    let sobra = 0;
    if (cap && +cap > 0 && faltante > 0) {
      embalagens = Math.ceil(faltante / +cap);
      qtdSugerida = embalagens * +cap;
      sobra = qtdSugerida - faltante;
    }
    const cm = custMedioFn(iid);
    const custoEstimado = cm > 0 ? qtdSugerida * cm : 0;
    return {iid, nome: ins.nome, unidade: ins.unidade, qtdNec, estoque, faltante, cap, embalagens, qtdSugerida, sobra, cm, custoEstimado, ok: faltante <= 0.0001};
  }).filter(Boolean).sort((a, b) => (a.ok ? 1 : -1) - (b.ok ? 1 : -1));

  const listaComprar = lista.filter(i => !i.ok);
  const listaOk = lista.filter(i => i.ok);
  const totalCusto = listaComprar.reduce((s, i) => s + i.custoEstimado, 0);
  const semCapacidade = listaComprar.filter(i => !i.cap).length;

  function salvarCap(iid) {
    const val = editCap[iid];
    if (!val || +val <= 0) return alert("Informe uma capacidade válida.");
    setIdef(idef.map(i => i.id === iid ? {...i, capacidadeUnitaria: +val} : i));
    setEditCap(ec => { const n = {...ec}; delete n[iid]; return n; });
  }

  function exportTxt() {
    const linhas = ["========================================"];
    linhas.push("    🛍️  LISTA DE COMPRAS — NaGarrafa");
    linhas.push("========================================\n");
    linhas.push("📋 PLANEJAMENTO DE PRODUÇÃO:");
    plano.forEach(p => {
      const f = fichasCalc.find(fc => fc.id === p.fichaId);
      linhas.push(`   • ${f?.nome || "?"}: ${p.qtd} unidade(s)`);
    });
    linhas.push("\n🛒 O QUE COMPRAR:");
    if (listaComprar.length === 0) {
      linhas.push("   ✅ Estoque suficiente! Nada a comprar.");
    } else {
      listaComprar.forEach(i => {
        const emb = i.embalagens ? ` → ${i.embalagens} embalagem(ns) de ${i.cap} ${i.unidade}` : "";
        const custo = i.cm > 0 ? ` — est. ${fR(i.custoEstimado)}` : "";
        linhas.push(`   • ${i.nome}: ${i.qtdSugerida.toFixed(3)} ${i.unidade}${emb}${custo}`);
        if (i.sobra > 0) linhas.push(`     (sobra ${i.sobra.toFixed(3)} ${i.unidade} no estoque)`);
      });
    }
    if (totalCusto > 0) linhas.push(`\n💰 CUSTO TOTAL ESTIMADO: ${fR(totalCusto)}`);
    linhas.push("\n========================================");
    const blob = new Blob([linhas.join("\n")], {type: "text/plain;charset=utf-8"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "lista_compras_nagarrafa.txt";
    a.click();
  }

  const custoTotalLote = plano.reduce((s, p) => {
    const fc = fichasCalc.find(f => f.id === p.fichaId);
    return s + (fc ? fc.custo * p.qtd : 0);
  }, 0);

  return (
    <>
      {/* Planejamento */}
      <Card title="🗂️ Plano de Produção">
        <p style={{margin:"0 0 14px", fontSize:13, color:"var(--text3)"}}>
          Informe quantas unidades deseja produzir. O sistema calcula automaticamente o que precisa ser comprado, descontando o estoque atual e sugerindo quantidades ideais de acordo com a embalagem dos insumos.
        </p>
        {!fichasCalc.length && (
          <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:10,padding:14,color:"#92400e",fontSize:13}}>
            ⚠️ Cadastre fichas técnicas para usar a lista de compras.
          </div>
        )}
        {fichasCalc.length > 0 && (
          <>
            <G cols="3fr 1fr auto" mb={plano.length > 0 ? 14 : 0}>
              <div>
                <Lbl s="Produto"/>
                <select style={S.inp} value={selFicha} onChange={e => setSelFicha(e.target.value)}>
                  <option value="">Selecione um produto...</option>
                  {fichasCalc.map(f => <option key={f.id} value={f.id}>{f.nome} — custo {fR(f.custo)}/un</option>)}
                </select>
              </div>
              <div>
                <Lbl s="Qtd. a produzir"/>
                <input style={S.inp} type="number" min="1" step="1" placeholder="Ex: 50" value={selQtd}
                  onChange={e => setSelQtd(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addAoPlano()}/>
              </div>
              <div style={{display:"flex", alignItems:"flex-end"}}>
                <button style={S.btn} onClick={addAoPlano}>+ Adicionar</button>
              </div>
            </G>

            {plano.length > 0 && (
              <div style={{background:"var(--card2)", border:"1px solid var(--border3)", borderRadius:10, overflow:"hidden"}}>
                <table style={{width:"100%", borderCollapse:"collapse", fontSize:14}}>
                  <thead>
                    <tr>
                      {["Produto", "Custo/un", "Qtd. a produzir", "Custo do lote", ""].map(h =>
                        <th key={h} style={S.th}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {plano.map(p => {
                      const fc = fichasCalc.find(f => f.id === p.fichaId);
                      return (
                        <tr key={p.id}>
                          <td style={{...S.td, fontWeight:600, color:"#7c3aed"}}>{fc?.nome || "—"}</td>
                          <td style={S.td}>{fR(fc?.custo || 0)}/un</td>
                          <td style={S.td}>
                            <div style={{display:"flex", alignItems:"center", gap:8}}>
                              <input type="number" min="1" step="1" value={p.qtd}
                                onChange={e => atualizarQtd(p.id, e.target.value)}
                                style={{...S.inp, width:80, padding:"4px 8px", textAlign:"center"}}/>
                              <span style={{color:"var(--text3)", fontSize:13}}>un</span>
                            </div>
                          </td>
                          <td style={{...S.td, fontWeight:700, color:"#059669"}}>{fR((fc?.custo || 0) * p.qtd)}</td>
                          <td style={S.td}>
                            <button style={{...S.bsm, color:"#ef4444"}} onClick={() => removerDoPlano(p.id)}>🗑️</button>
                          </td>
                        </tr>
                      );
                    })}
                    <tr style={{background:"rgba(124,58,237,.06)"}}>
                      <td colSpan={3} style={{...S.td, fontWeight:700, textAlign:"right", color:"#7c3aed"}}>
                        Custo total dos lotes:
                      </td>
                      <td style={{...S.td, fontWeight:700, color:"#7c3aed", fontSize:15}}>{fR(custoTotalLote)}</td>
                      <td style={S.td}/>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Resultado */}
      {plano.length > 0 && lista.length > 0 && (
        <>
          {/* KPIs */}
          <G cols="repeat(4,1fr)" gap={12} mb={20}>
            <KPI label="🛒 Insumos a comprar" value={listaComprar.length} color={listaComprar.length > 0 ? "#7c3aed" : "#059669"}/>
            <KPI label="✅ Já em estoque" value={listaOk.length} color="#059669"/>
            <KPI label="💰 Custo estimado" value={totalCusto > 0 ? fR(totalCusto) : "—"} color="#1d4ed8" sub={totalCusto === 0 ? "Sem CM cadastrado" : ""}/>
            <KPI label="📦 Custo total lotes" value={fR(custoTotalLote)} color="#6d28d9"/>
          </G>

          {/* Aviso sobre capacidade não definida */}
          {semCapacidade > 0 && (
            <div style={{background:"rgba(245,158,11,.08)", border:"1px solid #fde68a", borderRadius:10, padding:"12px 16px", marginBottom:16, display:"flex", gap:10, alignItems:"center"}}>
              <span style={{fontSize:22}}>📦</span>
              <div style={{fontSize:13, color:"#d97706"}}>
                <strong>{semCapacidade} insumo(s)</strong> sem capacidade unitária definida. Defina o tamanho da embalagem na tabela abaixo para receber sugestões de quantidades exatas. Você também pode editar em <strong>🧂 Insumos</strong>.
              </div>
            </div>
          )}

          {/* Lista principal */}
          <Card
            title={listaComprar.length === 0 ? "✅ Nada a comprar!" : `🛒 Lista de Compras (${listaComprar.length} insumo${listaComprar.length !== 1 ? "s" : ""})`}
            right={
              <div style={{display:"flex", gap:8}}>
                {plano.length > 0 && <button style={{...S.btn2, fontSize:12, padding:"6px 14px"}} onClick={() => setPlano([])}>🗑️ Limpar plano</button>}
                <button style={{...S.btn, fontSize:12, padding:"6px 14px"}} onClick={exportTxt}>📥 Exportar .txt</button>
              </div>
            }
          >
            {listaComprar.length === 0 ? (
              <div style={{textAlign:"center", padding:"28px", background:"rgba(5,150,105,.07)", borderRadius:10, color:"#059669"}}>
                <div style={{fontSize:36, marginBottom:8}}>🎉</div>
                <p style={{margin:0, fontWeight:600, fontSize:15}}>Estoque suficiente para toda a produção planejada!</p>
                <p style={{margin:"6px 0 0", fontSize:13, color:"var(--text3)"}}>Nenhuma compra necessária.</p>
              </div>
            ) : (
              <table style={{width:"100%", borderCollapse:"collapse", fontSize:14}}>
                <thead>
                  <tr>
                    {["Insumo", "Necessário", "Em Estoque", "Faltante", "Embalagem", "Qtd. Sugerida", "Custo Est."].map(h =>
                      <th key={h} style={S.th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {listaComprar.map(item => (
                    <tr key={item.iid} style={{borderLeft: item.cap ? "3px solid #7c3aed" : "3px solid #fde68a"}}>
                      <td style={{...S.td, fontWeight:700}}>{item.nome}</td>

                      <td style={S.td}>
                        <span style={{fontWeight:600}}>{item.qtdNec.toFixed(3)}</span>
                        <span style={{color:"var(--text4)", marginLeft:4, fontSize:12}}>{item.unidade}</span>
                      </td>

                      <td style={S.td}>
                        <span style={{color: item.estoque > 0 ? "#d97706" : "var(--text4)", fontWeight: item.estoque > 0 ? 600 : 400}}>
                          {item.estoque.toFixed(3)}
                        </span>
                        <span style={{color:"var(--text4)", marginLeft:4, fontSize:12}}>{item.unidade}</span>
                      </td>

                      <td style={S.td}>
                        <span style={{color:"#ef4444", fontWeight:700}}>{item.faltante.toFixed(3)}</span>
                        <span style={{color:"var(--text4)", marginLeft:4, fontSize:12}}>{item.unidade}</span>
                      </td>

                      {/* Embalagem */}
                      <td style={S.td}>
                        {item.cap ? (
                          <div style={{display:"flex", alignItems:"center", gap:6}}>
                            <span style={{background:"var(--accent-soft)", color:"#7c3aed", padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:600, whiteSpace:"nowrap"}}>
                              {item.cap} {item.unidade}
                            </span>
                            <button style={{...S.bsm, fontSize:10, padding:"2px 6px"}}
                              onClick={() => setEditCap({...editCap, [item.iid]: item.cap})}>✏️</button>
                          </div>
                        ) : editCap[item.iid] !== undefined ? (
                          <div style={{display:"flex", gap:4, alignItems:"center", flexWrap:"wrap"}}>
                            <input type="number" step="0.001" min="0.001"
                              placeholder={`Em ${item.unidade}`}
                              value={editCap[item.iid]}
                              onChange={e => setEditCap({...editCap, [item.iid]: e.target.value})}
                              style={{...S.inp, width:70, padding:"3px 6px", fontSize:12}}/>
                            <span style={{fontSize:12, color:"var(--text3)"}}>{item.unidade}</span>
                            <button style={{...S.bsm, fontSize:11, background:"#dcfce7", color:"#065f46", border:"1px solid #86efac"}}
                              onClick={() => salvarCap(item.iid)}>✓</button>
                            <button style={{...S.bsm, fontSize:11}}
                              onClick={() => setEditCap(ec => {const n={...ec}; delete n[item.iid]; return n;})}>✕</button>
                          </div>
                        ) : (
                          <button style={{...S.bsm, fontSize:11, color:"#d97706", borderColor:"#fde68a", background:"rgba(253,230,138,.2)", whiteSpace:"nowrap"}}
                            onClick={() => setEditCap({...editCap, [item.iid]: ""})}>
                            + Definir embalagem
                          </button>
                        )}
                        {editCap[item.iid] !== undefined && item.cap && (
                          <div style={{display:"flex", gap:4, alignItems:"center", flexWrap:"wrap", marginTop:4}}>
                            <input type="number" step="0.001" min="0.001"
                              value={editCap[item.iid]}
                              onChange={e => setEditCap({...editCap, [item.iid]: e.target.value})}
                              style={{...S.inp, width:70, padding:"3px 6px", fontSize:12}}/>
                            <span style={{fontSize:12, color:"var(--text3)"}}>{item.unidade}</span>
                            <button style={{...S.bsm, fontSize:11, background:"#dcfce7", color:"#065f46", border:"1px solid #86efac"}}
                              onClick={() => salvarCap(item.iid)}>✓ Salvar</button>
                            <button style={{...S.bsm, fontSize:11}}
                              onClick={() => setEditCap(ec => {const n={...ec}; delete n[item.iid]; return n;})}>✕</button>
                          </div>
                        )}
                      </td>

                      {/* Qtd sugerida */}
                      <td style={S.td}>
                        {item.embalagens ? (
                          <div>
                            <div style={{fontWeight:700, color:"#7c3aed", fontSize:15}}>
                              {item.qtdSugerida.toFixed(3)} <span style={{fontSize:12, fontWeight:400}}>{item.unidade}</span>
                            </div>
                            <div style={{marginTop:3}}>
                              <span style={{background:"rgba(124,58,237,.1)", color:"#7c3aed", padding:"2px 8px", borderRadius:20, fontSize:11, fontWeight:600}}>
                                {item.embalagens} emb. × {item.cap} {item.unidade}
                              </span>
                            </div>
                            {item.sobra > 0.001 && (
                              <div style={{fontSize:11, color:"#059669", marginTop:3}}>
                                ↳ sobra {item.sobra.toFixed(3)} {item.unidade} no estoque
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <span style={{fontWeight:700, color:"#ef4444"}}>{item.faltante.toFixed(3)}</span>
                            <span style={{fontSize:12, color:"var(--text4)", marginLeft:4}}>{item.unidade}</span>
                            <div style={{fontSize:11, color:"#d97706", marginTop:2}}>↳ defina embalagem para sugestão</div>
                          </div>
                        )}
                      </td>

                      {/* Custo estimado */}
                      <td style={S.td}>
                        {item.cm > 0 ? (
                          <div>
                            <div style={{fontWeight:700, color:"#1d4ed8", fontSize:14}}>{fR(item.custoEstimado)}</div>
                            <div style={{fontSize:11, color:"var(--text4)", marginTop:2}}>CM: {fR(item.cm)}/{item.unidade}</div>
                          </div>
                        ) : (
                          <span style={{fontSize:12, color:"var(--text4)"}}>Sem CM</span>
                        )}
                      </td>
                    </tr>
                  ))}

                  {/* Total */}
                  <tr style={{background:"rgba(29,78,216,.06)", borderTop:"2px solid var(--border3)"}}>
                    <td colSpan={6} style={{...S.td, fontWeight:700, textAlign:"right", color:"#1d4ed8"}}>
                      💰 Custo total estimado de compra:
                    </td>
                    <td style={{...S.td, fontWeight:700, color:"#1d4ed8", fontSize:16}}>
                      {totalCusto > 0 ? fR(totalCusto) : <span style={{color:"var(--text4)", fontSize:13}}>— sem CM</span>}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </Card>

          {/* Em estoque */}
          {listaOk.length > 0 && (
            <Card title={`✅ Já em estoque — não precisa comprar (${listaOk.length})`}>
              <div style={{display:"flex", gap:10, flexWrap:"wrap"}}>
                {listaOk.map(item => (
                  <div key={item.iid} style={{background:"rgba(5,150,105,.07)", border:"1px solid #6ee7b7", borderRadius:10, padding:"10px 16px", minWidth:200}}>
                    <div style={{fontWeight:700, color:"#059669", fontSize:13, marginBottom:4}}>✅ {item.nome}</div>
                    <div style={{fontSize:12, color:"var(--text3)"}}>
                      Precisa: <strong>{item.qtdNec.toFixed(3)} {item.unidade}</strong>
                    </div>
                    <div style={{fontSize:12, color:"var(--text3)"}}>
                      Estoque: <strong style={{color:"#059669"}}>{item.estoque.toFixed(3)} {item.unidade}</strong>
                    </div>
                    {item.estoque - item.qtdNec > 0.001 && (
                      <div style={{fontSize:11, color:"var(--text4)", marginTop:3}}>
                        sobra {(item.estoque - item.qtdNec).toFixed(3)} {item.unidade}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {plano.length > 0 && lista.length === 0 && (
        <div style={{textAlign:"center", padding:40, color:"var(--text4)", background:"var(--card)", borderRadius:12, border:"1px solid var(--border)"}}>
          <span style={{fontSize:40}}>🔍</span>
          <p>Nenhum insumo encontrado nos produtos selecionados. Verifique as fichas técnicas.</p>
        </div>
      )}

      {plano.length === 0 && fichasCalc.length > 0 && (
        <div style={{textAlign:"center", padding:"40px 24px", color:"var(--text4)", background:"var(--card)", borderRadius:12, border:"1px solid var(--border)"}}>
          <div style={{fontSize:48, marginBottom:12}}>🛍️</div>
          <p style={{fontWeight:600, fontSize:15, color:"var(--text3)", margin:"0 0 8px"}}>Adicione produtos ao plano de produção</p>
          <p style={{margin:0, fontSize:13}}>Selecione um produto acima e informe quantas unidades quer produzir.</p>
        </div>
      )}
    </>
  );
}

// ── CLIENTES ────────────────────────────────────────────────────────────────
function ClientesTab({pedidos,fichasCalc,getPreco}){
  const [busca,setBusca]=useState("");
  const [sel,setSel]=useState(null);
  const [ordenar,setOrdenar]=useState("recentes"); // recentes | nome | pedidos | valor

  // Agrupa pedidos por cliente (normaliza nome vazio → "Sem nome")
  const porCliente={};
  pedidos.forEach(p=>{
    const nome=(p.cliente||"").trim()||"— Sem nome —";
    if(!porCliente[nome])porCliente[nome]=[];
    porCliente[nome].push(p);
  });

  // Constrói lista de clientes com métricas
  let clientes=Object.entries(porCliente).map(([nome,peds])=>{
    const total=peds.reduce((s,p)=>s+getItems(p).reduce((ss,i)=>ss+i.qtd*getPreco(i.fichaId),0),0);
    const pedConf=peds.filter(p=>p.status==="Confirmado").length;
    const datas=peds.map(p=>p.data).filter(Boolean).sort();
    const ultima=datas[datas.length-1];
    // Favoritos: produtos mais pedidos por este cliente
    const contProd={};
    peds.forEach(p=>getItems(p).forEach(i=>{contProd[i.fichaId]=(contProd[i.fichaId]||0)+i.qtd;}));
    const favs=Object.entries(contProd).sort((a,b)=>b[1]-a[1]).slice(0,3)
      .map(([fid,qtd])=>({fid,qtd,nome:fichasCalc.find(f=>f.id===fid)?.nome||"?"}));
    return{nome,peds,total,pedConf,ultima,favs,qtdPedidos:peds.length};
  });

  // Ordena
  if(ordenar==="recentes") clientes.sort((a,b)=>(b.ultima||"").localeCompare(a.ultima||""));
  else if(ordenar==="nome") clientes.sort((a,b)=>a.nome.localeCompare(b.nome));
  else if(ordenar==="pedidos") clientes.sort((a,b)=>b.qtdPedidos-a.qtdPedidos);
  else if(ordenar==="valor") clientes.sort((a,b)=>b.total-a.total);

  // Filtro de busca
  const filtrados=busca.trim()
    ?clientes.filter(c=>c.nome.toLowerCase().includes(busca.toLowerCase()))
    :clientes;

  const clienteSel=sel?clientes.find(c=>c.nome===sel):null;

  // Métricas gerais
  const totalClientes=clientes.filter(c=>c.nome!=="— Sem nome —").length;
  const totalReceita=clientes.reduce((s,c)=>s+c.total,0);
  const maisFreq=[...clientes].sort((a,b)=>b.qtdPedidos-a.qtdPedidos)[0];
  const maiorTicket=[...clientes].filter(c=>c.qtdPedidos>0).sort((a,b)=>(b.total/b.qtdPedidos)-(a.total/a.qtdPedidos))[0];

  const st=s=>s==="Confirmado"?{color:"#065f46",bg:"#d1fae5",label:"✅"}:s==="Cancelado"?{color:"#991b1b",bg:"#fee2e2",label:"❌"}:{color:"#92400e",bg:"#fef3c7",label:"⏳"};

  return(<>
    {/* KPIs */}
    <G cols="repeat(4,1fr)" gap={12} mb={20}>
      <KPI label="👥 Clientes identificados" value={totalClientes} color="#7c3aed"/>
      <KPI label="📋 Total de pedidos" value={pedidos.length} color="#3730a3"/>
      <KPI label="💵 Receita total" value={fR(totalReceita)} color="#059669"/>
      <KPI label="🏆 Mais frequente" value={maisFreq?.nome||"—"} color="#d97706" sub={maisFreq?`${maisFreq.qtdPedidos} pedido(s)`:""}/>
    </G>

    {/* Painel de detalhe do cliente */}
    {clienteSel&&(
      <Card title={`👤 ${clienteSel.nome}`} right={<button style={S.btn2} onClick={()=>setSel(null)}>✕ Fechar</button>}>
        {/* Resumo do cliente */}
        <G cols="repeat(4,1fr)" gap={12} mb={16}>
          <KPI label="📋 Pedidos" value={clienteSel.qtdPedidos} color="#7c3aed"/>
          <KPI label="✅ Confirmados" value={clienteSel.pedConf} color="#059669"/>
          <KPI label="💰 Receita total" value={fR(clienteSel.total)} color="#1d4ed8"/>
          <KPI label="🎯 Ticket médio" value={clienteSel.qtdPedidos>0?fR(clienteSel.total/clienteSel.qtdPedidos):"—"} color="#6d28d9"/>
        </G>

        {/* Produtos favoritos */}
        {clienteSel.favs.length>0&&(
          <div style={{marginBottom:16}}>
            <p style={{margin:"0 0 8px",fontSize:13,fontWeight:700,color:"#7c3aed"}}>⭐ Produtos mais pedidos</p>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {clienteSel.favs.map((f,i)=>(
                <div key={f.fid} style={{background:i===0?"rgba(124,58,237,.1)":"var(--card2)",border:`1px solid ${i===0?"var(--border2)":"var(--border)"}`,borderRadius:10,padding:"10px 16px",display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:18}}>{i===0?"🥇":i===1?"🥈":"🥉"}</span>
                  <div>
                    <p style={{margin:0,fontWeight:700,fontSize:13,color:"var(--text)"}}>{f.nome}</p>
                    <p style={{margin:0,fontSize:12,color:"var(--text3)"}}>{f.qtd} unidade(s) no total</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Histórico de pedidos do cliente */}
        <p style={{margin:"0 0 8px",fontSize:13,fontWeight:700,color:"#7c3aed"}}>📅 Histórico de pedidos</p>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead><tr>{["Data","Itens","Canal","Valor","Status","Obs."].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {[...clienteSel.peds].sort((a,b)=>(b.data||"").localeCompare(a.data||"")).map(p=>{
              const its=getItems(p);
              const recP=its.reduce((s,i)=>s+i.qtd*getPreco(i.fichaId),0);
              const estS=st(p.status);
              return(
                <tr key={p.id}>
                  <td style={{...S.td,fontWeight:600,whiteSpace:"nowrap"}}>{p.data||"—"}</td>
                  <td style={S.td}>
                    <div style={{display:"flex",flexDirection:"column",gap:3}}>
                      {its.map((item,idx)=>{
                        const fc=fichasCalc.find(f=>f.id===item.fichaId);
                        return(
                          <div key={item.fichaId||idx} style={{display:"flex",alignItems:"center",gap:6}}>
                            <span style={{fontWeight:600,fontSize:12}}>{fc?.nome||"—"}</span>
                            <span style={{background:"var(--accent-soft)",color:"#7c3aed",padding:"1px 6px",borderRadius:20,fontSize:11,fontWeight:700}}>{item.qtd} un</span>
                          </div>
                        );
                      })}
                    </div>
                  </td>
                  <td style={S.td}><span style={{background:"var(--accent-soft)",color:"var(--accent-soft-c)",padding:"2px 8px",borderRadius:20,fontSize:11}}>{p.canal||"—"}</span></td>
                  <td style={{...S.td,fontWeight:700,color:"#7c3aed"}}>{fR(recP)}</td>
                  <td style={S.td}><Pill label={estS.label} color={estS.color} bg={estS.bg}/></td>
                  <td style={{...S.td,fontSize:12,color:"var(--text4)",maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.obs||"—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    )}

    {/* Lista de clientes */}
    <Card
      title={`👥 Clientes (${filtrados.length})`}
      right={
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <input style={{...S.inp,width:200,padding:"5px 10px",fontSize:13}} placeholder="🔍 Buscar cliente..." value={busca} onChange={e=>setBusca(e.target.value)}/>
          <select style={{...S.inp,width:"auto",padding:"5px 10px",fontSize:13}} value={ordenar} onChange={e=>setOrdenar(e.target.value)}>
            <option value="recentes">↓ Mais recentes</option>
            <option value="nome">↓ Nome A–Z</option>
            <option value="pedidos">↓ Mais pedidos</option>
            <option value="valor">↓ Maior receita</option>
          </select>
        </div>
      }
    >
      {!filtrados.length&&(
        <div style={{textAlign:"center",padding:32,color:"var(--text4)"}}>
          {pedidos.length===0
            ?"Nenhum pedido registrado ainda."
            :"Nenhum cliente encontrado com esse nome."}
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:12}}>
        {filtrados.map(c=>{
          const isSel=sel===c.nome;
          const semNome=c.nome==="— Sem nome —";
          return(
            <div
              key={c.nome}
              onClick={()=>setSel(isSel?null:c.nome)}
              style={{
                border:`2px solid ${isSel?"#7c3aed":"var(--border)"}`,
                borderRadius:12,padding:16,cursor:"pointer",
                background:isSel?"rgba(124,58,237,.07)":"var(--card)",
                transition:"all .15s",
              }}
            >
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:40,height:40,borderRadius:"50%",background:semNome?"var(--card2)":"linear-gradient(135deg,#7c3aed,#5b21b6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:"white",fontWeight:700,flexShrink:0}}>
                    {semNome?"?":c.nome[0].toUpperCase()}
                  </div>
                  <div>
                    <p style={{margin:0,fontWeight:700,fontSize:14,color:semNome?"var(--text4)":"var(--text)"}}>{c.nome}</p>
                    <p style={{margin:0,fontSize:12,color:"var(--text4)"}}>
                      {c.ultima?`Último pedido: ${c.ultima}`:"Sem data registrada"}
                    </p>
                  </div>
                </div>
                <span style={{fontSize:12,background:"var(--accent-soft)",color:"#7c3aed",padding:"3px 8px",borderRadius:20,fontWeight:700,flexShrink:0}}>
                  {c.qtdPedidos} pedido{c.qtdPedidos!==1?"s":""}
                </span>
              </div>

              {/* Favoritos resumidos */}
              {c.favs.length>0&&(
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
                  {c.favs.map((f,i)=>(
                    <span key={f.fid} style={{fontSize:11,background:"var(--card2)",color:"var(--text3)",padding:"2px 8px",borderRadius:20,border:"1px solid var(--border)"}}>
                      {i===0?"⭐":""} {f.nome} ×{f.qtd}
                    </span>
                  ))}
                </div>
              )}

              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",borderTop:"1px solid var(--border4)",paddingTop:10,marginTop:4}}>
                <span style={{fontSize:13,color:"var(--text3)"}}>
                  <span style={{color:"#059669",fontWeight:700}}>{fR(c.total)}</span> em receita
                </span>
                <span style={{fontSize:12,color:isSel?"#7c3aed":"var(--text4)",fontWeight:600}}>
                  {isSel?"▲ Fechar":"▼ Ver histórico"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  </>);
}

// ── FLUXO DE CAIXA ─────────────────────────────────────────────────────────
function FluxoCaixaTab({entradas,vendas,fichasCalc,getPreco,idef}){
  const now=new Date();
  const [mes,setMes]=useState(now.getMonth()+1);
  const [ano,setAno]=useState(now.getFullYear());
  const [filtroAtivo,setFiltroAtivo]=useState(false);
  const [filtPag,setFiltPag]=useState("Todos");

  // Monta lista unificada de movimentos
  // SAÍDAS: agrupadas por compra (data + fornecedor + total)
  const saidas=entradas.map(e=>{
    if(e.items){
      // Nova compra agrupada
      return{
        id:e.id,tipo:"saída",data:e.data||"",
        descricao:`Compra — ${e.fornecedor||"?"}`,
        detalhe:`${e.items.length} item${e.items.length!==1?"s":""}`,
        valor:e.totalCompra||e.items.reduce((s,i)=>s+i.custoTotal,0),
        pagamento:e.pagamento||"—",
      };
    }
    // Entrada antiga (item individual)
    const i2=idef.find(i=>i.id===e.insumoId);
    return{
      id:e.id,tipo:"saída",data:e.data||"",
      descricao:`Compra: ${i2?.nome||"?"}`,
      detalhe:e.numEmb?`${e.numEmb} emb. × ${fR(e.precoUnit)}`:"",
      valor:e.custoTotal,
      pagamento:e.pagamento||"—",
    };
  });

  const entradas2=vendas.map(v=>{
    const its=getItems(v);
    const rec=its.reduce((s,i)=>s+i.qtd*getPreco(i.fichaId),0);
    const nomes=its.map(i=>{const fc=fichasCalc.find(f=>f.id===i.fichaId);return `${fc?.nome||"?"}(${i.qtd})`;}).join(", ");
    const tele=v.teleValor||0;
    const desc=v.desconto||0;
    const total=rec+tele-desc;
    return{
      id:v.id,tipo:"entrada",data:v.data||"",
      descricao:`Venda: ${nomes}`,
      detalhe:[tele>0?`+tele ${fR(tele)}`:"",desc>0?`-desc ${fR(desc)}`:""].filter(Boolean).join(" "),
      valor:total,
      pagamento:v.pagamento||"—",
    };
  });

  let movimentos=[...saidas,...entradas2].sort((a,b)=>{
    if(a.data!==b.data)return (b.data||"").localeCompare(a.data||"");
    return a.tipo==="entrada"?-1:1;
  });

  // Filtros
  if(filtroAtivo){
    movimentos=movimentos.filter(m=>{
      if(!m.data)return false;
      const[y,mo]=m.data.split("-");
      return +mo===mes&&+y===ano;
    });
  }
  if(filtPag!=="Todos"){
    const tipo=filtPag==="Entradas"?"entrada":filtPag==="Saídas"?"saída":null;
    if(tipo)movimentos=movimentos.filter(m=>m.tipo===tipo);
    else movimentos=movimentos.filter(m=>m.pagamento===filtPag);
  }

  const totalEntradas=movimentos.filter(m=>m.tipo==="entrada").reduce((s,m)=>s+m.valor,0);
  const totalSaidas=movimentos.filter(m=>m.tipo==="saída").reduce((s,m)=>s+m.valor,0);
  const saldo=totalEntradas-totalSaidas;

  // Saldo acumulado por movimento (em ordem cronológica ascendente)
  const cronologico=[...movimentos].reverse();
  let acc=0;
  const comSaldo=cronologico.map(m=>{
    acc+= m.tipo==="entrada"?m.valor:-m.valor;
    return{...m,saldoAcum:acc};
  }).reverse();

  // Breakdown por meio de pagamento
  const porMeio={};
  movimentos.forEach(m=>{
    const k=m.pagamento||"—";
    if(!porMeio[k])porMeio[k]={pag:k,entradas:0,saidas:0};
    if(m.tipo==="entrada")porMeio[k].entradas+=m.valor;
    else porMeio[k].saidas+=m.valor;
  });
  const breakdownMeio=Object.values(porMeio).sort((a,b)=>(b.entradas+b.saidas)-(a.entradas+a.saidas));

  const anosDisp=[...new Set([...entradas,...vendas].map(x=>x.data?.slice(0,4)).filter(Boolean))].sort();
  const todosMetodos=["Todos","Entradas","Saídas",...PAGAMENTOS_SAIDA,...PAGAMENTOS_ENTRADA.filter(p=>!PAGAMENTOS_SAIDA.includes(p))];

  return(<>
    {/* Filtros */}
    <Card title="🗓️ Filtros">
      <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <input type="checkbox" id="fcFiltro" checked={filtroAtivo} onChange={e=>setFiltroAtivo(e.target.checked)} style={{width:16,height:16,accentColor:"#7c3aed",cursor:"pointer"}}/>
          <label htmlFor="fcFiltro" style={{fontSize:14,fontWeight:600,color:"#7c3aed",cursor:"pointer"}}>Filtrar por período</label>
        </div>
        <div style={{display:"flex",gap:8,opacity:filtroAtivo?1:.4,pointerEvents:filtroAtivo?"auto":"none"}}>
          <div><Lbl s="Mês"/><select style={{...S.inp,width:150}} value={mes} onChange={e=>setMes(+e.target.value)}>{MESES.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}</select></div>
          <div><Lbl s="Ano"/><select style={{...S.inp,width:100}} value={ano} onChange={e=>setAno(+e.target.value)}>{[...new Set([...anosDisp,String(now.getFullYear())])].sort().map(a=><option key={a} value={a}>{a}</option>)}</select></div>
        </div>
        <div>
          <Lbl s="Tipo / Pagamento"/>
          <select style={{...S.inp,width:180}} value={filtPag} onChange={e=>setFiltPag(e.target.value)}>
            {todosMetodos.map(m=><option key={m}>{m}</option>)}
          </select>
        </div>
      </div>
    </Card>

    {/* KPIs */}
    <G cols="repeat(4,1fr)" gap={12} mb={20}>
      <KPI label="📥 Total Entradas" value={fR(totalEntradas)} color="#059669"/>
      <KPI label="📤 Total Saídas" value={fR(totalSaidas)} color="#ef4444"/>
      <KPI label="💰 Saldo do período" value={fR(saldo)} color={saldo>=0?"#1d4ed8":"#ef4444"} sub={saldo>=0?"✅ Positivo":"⚠️ Negativo"}/>
      <KPI label="🔄 Movimentos" value={movimentos.length} color="#7c3aed"/>
    </G>

    {/* Breakdown por meio de pagamento */}
    {breakdownMeio.length>0&&(
      <Card title="💳 Por meio de pagamento">
        <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
          {breakdownMeio.map(b=>{
            const pc=PAG_CORES[b.pag];
            const sl=b.entradas-b.saidas;
            return(
              <div key={b.pag} style={{background:pc?pc.bg:"var(--card2)",border:`1px solid ${pc?"var(--border2)":"var(--border)"}`,borderRadius:12,padding:"14px 18px",minWidth:180,flex:"1 1 180px"}}>
                <p style={{margin:"0 0 8px",fontWeight:700,fontSize:14,color:pc?.c||"var(--text)"}}>{b.pag}</p>
                {b.entradas>0&&<p style={{margin:"0 0 2px",fontSize:13,color:"#059669"}}>↑ Entradas: <strong>{fR(b.entradas)}</strong></p>}
                {b.saidas>0&&<p style={{margin:"0 0 2px",fontSize:13,color:"#ef4444"}}>↓ Saídas: <strong>{fR(b.saidas)}</strong></p>}
                <p style={{margin:"6px 0 0",fontSize:13,fontWeight:700,color:sl>=0?"#1d4ed8":"#ef4444",borderTop:"1px solid rgba(0,0,0,.08)",paddingTop:6}}>Saldo: {fR(sl)}</p>
              </div>
            );
          })}
        </div>
      </Card>
    )}

    {/* Extrato */}
    <Card title={`📋 Extrato (${comSaldo.length} movimentos)`}>
      {!comSaldo.length&&(
        <div style={{textAlign:"center",padding:32,color:"var(--text4)"}}>Nenhum movimento no período.</div>
      )}
      {comSaldo.length>0&&(
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:14}}>
          <thead>
            <tr>{["Data","Tipo","Descrição","Detalhe","💳 Pagamento","Valor","Saldo acum."].map(h=><th key={h} style={S.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {comSaldo.map((m,idx)=>{
              const isE=m.tipo==="entrada";
              const pc=PAG_CORES[m.pagamento];
              return(
                <tr key={m.id+idx} style={{background:isE?"rgba(5,150,105,.03)":"rgba(239,68,68,.03)"}}>
                  <td style={{...S.td,whiteSpace:"nowrap",fontWeight:600}}>{m.data||"—"}</td>
                  <td style={S.td}>
                    <span style={{
                      background:isE?"rgba(5,150,105,.12)":"rgba(239,68,68,.12)",
                      color:isE?"#065f46":"#991b1b",
                      padding:"2px 10px",borderRadius:20,fontSize:12,fontWeight:700,
                    }}>
                      {isE?"📥 Entrada":"📤 Saída"}
                    </span>
                  </td>
                  <td style={{...S.td,fontWeight:500}}>{m.descricao}</td>
                  <td style={{...S.td,fontSize:12,color:"var(--text4)"}}>{m.detalhe||"—"}</td>
                  <td style={S.td}>
                    {m.pagamento&&m.pagamento!=="—"
                      ?<span style={{background:pc?.bg||"var(--card2)",color:pc?.c||"var(--text3)",padding:"2px 10px",borderRadius:20,fontSize:12,fontWeight:600}}>{m.pagamento}</span>
                      :<span style={{color:"var(--text4)",fontSize:12}}>—</span>
                    }
                  </td>
                  <td style={{...S.td,fontWeight:700,fontSize:14,color:isE?"#059669":"#ef4444",whiteSpace:"nowrap"}}>
                    {isE?"+":"-"}{fR(m.valor)}
                  </td>
                  <td style={{...S.td,fontWeight:700,color:m.saldoAcum>=0?"#1d4ed8":"#ef4444",whiteSpace:"nowrap"}}>
                    {fR(m.saldoAcum)}
                  </td>
                </tr>
              );
            })}
            {/* Linha de totais */}
            <tr style={{background:"var(--card2)",borderTop:"2px solid var(--border3)"}}>
              <td colSpan={5} style={{...S.td,fontWeight:700,textAlign:"right",color:"var(--text2)"}}>Totais do período:</td>
              <td style={{...S.td,fontWeight:700,fontSize:14}}>
                <span style={{color:"#059669",display:"block"}}>+{fR(totalEntradas)}</span>
                <span style={{color:"#ef4444",display:"block"}}>-{fR(totalSaidas)}</span>
              </td>
              <td style={{...S.td,fontWeight:800,fontSize:15,color:saldo>=0?"#1d4ed8":"#ef4444"}}>
                {fR(saldo)}
              </td>
            </tr>
          </tbody>
        </table>
      )}
    </Card>
  </>);
}


// ── APP PRINCIPAL ──────────────────────────────────────────────────────────
const DEFAULT_ADMIN=[{id:"admin-root",nome:"admin",senha:"admin123",role:"Admin",ativo:true}];

export default function App(){
  const [dark,setDark]=useState(()=>lsGet("nagarrafa-theme","light")==="dark");
  const [currentUser,setCurrentUser]=useState(null);
  const [tab,setTab]=useState(0);
  const [sidebarOpen,setSidebarOpen]=useState(()=>lsGet("nagarrafa-sidebar",true));
  const [usuarios,setUsuarios]  =useState(()=>lsGet("ac4_usr",DEFAULT_ADMIN));
  const [idef,setIdef]          =useState(()=>lsGet("ac4_idef",[]));
  const [entradas,setEntradas]  =useState(()=>lsGet("ac4_ent",[]));
  const [fichas,setFichas]      =useState(()=>lsGet("ac4_fic",[]));
  const [margens,setMargens]    =useState(()=>lsGet("ac4_mar",{}));
  const [precos,setPrecos]      =useState(()=>lsGet("ac4_pre",{}));
  const [despesas,setDespesas]  =useState(()=>lsGet("ac4_des",[]));
  const [producoes,setProducoes]=useState(()=>lsGet("ac4_prod",[]));
  const [pedidos,setPedidos]    =useState(()=>lsGet("ac4_ped",[]));
  const [vendas,setVendas]      =useState(()=>lsGet("ac4_ven",[]));

  useEffect(()=>{const s=document.createElement("style");s.id="ng-theme";s.textContent=CSS_VARS;document.head.appendChild(s);return()=>s.remove();},[]);
  useEffect(()=>{document.documentElement.setAttribute("data-theme",dark?"dark":"light");lsSet("nagarrafa-theme",dark?"dark":"light");},[dark]);
  useEffect(()=>{lsSet("nagarrafa-sidebar",sidebarOpen);},[sidebarOpen]);
  useEffect(()=>{lsSet("ac4_usr",  usuarios);},[usuarios]);
  useEffect(()=>{lsSet("ac4_idef", idef);},[idef]);
  useEffect(()=>{lsSet("ac4_ent",  entradas);},[entradas]);
  useEffect(()=>{lsSet("ac4_fic",  fichas);},[fichas]);
  useEffect(()=>{lsSet("ac4_mar",  margens);},[margens]);
  useEffect(()=>{lsSet("ac4_pre",  precos);},[precos]);
  useEffect(()=>{lsSet("ac4_des",  despesas);},[despesas]);
  useEffect(()=>{lsSet("ac4_prod", producoes);},[producoes]);
  useEffect(()=>{lsSet("ac4_ped",  pedidos);},[pedidos]);
  useEffect(()=>{lsSet("ac4_ven",  vendas);},[vendas]);

  const flatEnt=flatEntradas(entradas);
  function custMedioFn(iid){const es=flatEnt.filter(e=>e.insumoId===iid);const tQ=es.reduce((s,e)=>s+e.qtd,0),tC=es.reduce((s,e)=>s+e.custoTotal,0);return tQ>0?tC/tQ:0;}
  function estoqueInsumoFn(iid){const ins=idef.find(i=>i.id===iid);if(!ins)return 0;const tE=flatEnt.filter(e=>e.insumoId===iid).reduce((s,e)=>s+e.qtd,0);const tC=producoes.reduce((s,prod)=>{const fc=fichas.find(f=>f.id===prod.fichaId);if(!fc)return s;const m=(fc.ings||[]).find(i=>i.iid===iid);if(!m)return s;return s+cvt(m.qtd,m.un||ins.unidade,ins.unidade)*prod.qtdProduzida;},0);return tE-tC;}
  function estoqueProdutoFn(fichaId){
    const p=producoes.filter(p=>p.fichaId===fichaId).reduce((s,p)=>s+p.qtdProduzida,0);
    const v=vendas.reduce((s,v)=>s+getItems(v).filter(i=>i.fichaId===fichaId).reduce((ss,i)=>ss+i.qtd,0),0);
    return p-v;
  }
  const idefComCusto=idef.map(ins=>({...ins,custMedio:custMedioFn(ins.id),estoque:estoqueInsumoFn(ins.id),totalEntradas:flatEnt.filter(e=>e.insumoId===ins.id).reduce((s,e)=>s+e.qtd,0),totalConsumido:producoes.reduce((s,prod)=>{const fc=fichas.find(f=>f.id===prod.fichaId);if(!fc)return s;const m=(fc.ings||[]).find(i=>i.iid===ins.id);if(!m)return s;return s+cvt(m.qtd,m.un||ins.unidade,ins.unidade)*prod.qtdProduzida;},0)}));
  const fichasCalc=fichas.map(f=>({...f,custo:(f.ings||[]).reduce((s,ing)=>{const ins=idef.find(i=>i.id===ing.iid);if(!ins)return s;return s+custMedioFn(ing.iid)*cvt(ing.qtd,ing.un||ins.unidade,ins.unidade);},0)}));
  function getPreco(fid){if(precos[fid]!=null)return precos[fid];const f=fichasCalc.find(p=>p.id===fid),m=+(margens[fid]??40);return f&&m<100?f.custo/(1-m/100):0;}

  const recBruta=vendas.reduce((s,v)=>s+getItems(v).reduce((ss,i)=>ss+i.qtd*getPreco(i.fichaId),0),0);
  const cmv=vendas.reduce((s,v)=>s+getItems(v).reduce((ss,i)=>{const f=fichasCalc.find(p=>p.id===i.fichaId);return ss+(f?i.qtd*f.custo:0);},0),0);
  const lucBruto=recBruta-cmv,totDesp=despesas.reduce((s,d)=>s+(+d.valor||0),0),lucOp=lucBruto-totDesp;

  const TAB_DEFS=[
    {idx:0, icon:"🧂", label:"Insumos"},
    {idx:1, icon:"📥", label:"Compras"},
    {idx:2, icon:"📦", label:"Estoque"},
    {idx:3, icon:"📋", label:"Fichas Técnicas"},
    {idx:4, icon:"💰", label:"Preços"},
    {idx:5, icon:"🏭", label:"Produção"},
    {idx:6, icon:"📝", label:"Pedidos"},
    {idx:7, icon:"🛒", label:"Vendas"},
    {idx:8, icon:"🏢", label:"Despesas"},
    {idx:9, icon:"📊", label:"DRE"},
    {idx:10,icon:"🎯", label:"Dashboard"},
    {idx:11,icon:"👥", label:"Usuários"},
    {idx:12,icon:"🛍️", label:"Lista de Compras"},
    {idx:13,icon:"👤", label:"Clientes"},
    {idx:14,icon:"💵", label:"Fluxo de Caixa"},
  ];
  const ALL_BADGES=[idef.length,entradas.length,null,fichas.length,null,producoes.length,pedidos.filter(p=>p.status==="Pendente").length,vendas.length,despesas.length,null,null,usuarios.length,null,null,null];

  if(!currentUser)return <LoginScreen usuarios={usuarios} onLogin={u=>{setCurrentUser(u);setTab(PERMS[u.role].tabs[0]);}}/>;

  const role=currentUser.role,perm=PERMS[role];
  const visibleTabs=TAB_DEFS.filter(t=>canTab(role,t.idx));
  const SW=sidebarOpen?224:64;
  const activeTab=TAB_DEFS.find(t=>t.idx===tab);

  return(
    <div style={{fontFamily:"system-ui,-apple-system,sans-serif",minHeight:"100vh",background:"var(--bg)",display:"flex"}}>
      {/* ── SIDEBAR ── */}
      <div style={{position:"fixed",left:0,top:0,height:"100vh",width:SW,background:"linear-gradient(180deg,#3b0f8e 0%,#2d0a6e 60%,#1a0645 100%)",transition:"width .22s cubic-bezier(.4,0,.2,1)",overflowX:"hidden",overflowY:"auto",zIndex:200,display:"flex",flexDirection:"column",boxShadow:"3px 0 20px rgba(0,0,0,.35)"}}>
        {/* Logo + toggle */}
        <div style={{display:"flex",alignItems:"center",padding:sidebarOpen?"18px 16px":"18px 0",justifyContent:sidebarOpen?"space-between":"center",borderBottom:"1px solid rgba(255,255,255,.08)",minHeight:72,flexShrink:0}}>
          {sidebarOpen&&(
            <div style={{display:"flex",alignItems:"center",gap:10,overflow:"hidden"}}>
              <span style={{fontSize:28,filter:"drop-shadow(0 0 10px rgba(167,139,250,.7))",flexShrink:0}}>🫐</span>
              <div style={{overflow:"hidden"}}>
                <p style={{margin:0,fontSize:16,fontWeight:800,color:"#fff",letterSpacing:"-0.5px",whiteSpace:"nowrap"}}>NaGarrafa</p>
                <p style={{margin:0,fontSize:10,color:"rgba(255,255,255,.4)",whiteSpace:"nowrap"}}>Sistema de Gestão</p>
              </div>
            </div>
          )}
          {!sidebarOpen&&<span style={{fontSize:24,filter:"drop-shadow(0 0 8px rgba(167,139,250,.6))"}}>🫐</span>}
          <button onClick={()=>setSidebarOpen(o=>!o)} title={sidebarOpen?"Recolher":"Expandir"} style={{background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.15)",color:"white",cursor:"pointer",borderRadius:8,width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>
            {sidebarOpen?"◀":"▶"}
          </button>
        </div>
        {/* Nav items */}
        <nav style={{flex:1,padding:"10px 0",overflowY:"auto",overflowX:"hidden"}}>
          {visibleTabs.map(t=>{
            const isAct=tab===t.idx;
            const badge=ALL_BADGES[t.idx];
            return(
              <button key={t.idx} onClick={()=>setTab(t.idx)} title={!sidebarOpen?t.label:undefined}
                style={{display:"flex",alignItems:"center",gap:sidebarOpen?12:0,justifyContent:sidebarOpen?"flex-start":"center",width:"100%",border:"none",cursor:"pointer",padding:sidebarOpen?"10px 18px":"10px 0",background:isAct?"rgba(167,139,250,.2)":"transparent",borderLeft:isAct?"3px solid #a78bfa":"3px solid transparent",borderRight:"none",transition:"background .15s",textAlign:"left"}}
                onMouseEnter={e=>{if(!isAct)e.currentTarget.style.background="rgba(255,255,255,.07)";}}
                onMouseLeave={e=>{if(!isAct)e.currentTarget.style.background="transparent";}}
              >
                <span style={{fontSize:18,flexShrink:0,lineHeight:1,filter:isAct?"drop-shadow(0 0 6px rgba(167,139,250,.8))":"none",position:"relative"}}>
                  {t.icon}
                  {!sidebarOpen&&badge>0&&<span style={{position:"absolute",top:-5,right:-6,background:"#a78bfa",color:"white",fontSize:9,fontWeight:800,padding:"1px 4px",borderRadius:10,lineHeight:1.4}}>{badge>99?"99+":badge}</span>}
                </span>
                {sidebarOpen&&(
                  <>
                    <span style={{fontSize:13,fontWeight:isAct?700:400,color:isAct?"#e9d5ff":"rgba(255,255,255,.75)",whiteSpace:"nowrap",overflow:"hidden",flex:1}}>{t.label}</span>
                    {badge>0&&<span style={{background:isAct?"#a78bfa":"rgba(167,139,250,.35)",color:"white",fontSize:11,fontWeight:700,padding:"1px 7px",borderRadius:20,flexShrink:0}}>{badge}</span>}
                  </>
                )}
              </button>
            );
          })}
        </nav>
        {/* Footer: usuário */}
        <div style={{borderTop:"1px solid rgba(255,255,255,.08)",padding:sidebarOpen?"14px 16px":"12px 0",flexShrink:0,display:"flex",flexDirection:"column",gap:8,alignItems:sidebarOpen?"stretch":"center"}}>
          {sidebarOpen?(
            <>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,#7c3aed,#a78bfa)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"white",fontWeight:700,flexShrink:0}}>{currentUser.nome[0].toUpperCase()}</div>
                <div style={{overflow:"hidden",flex:1}}>
                  <p style={{margin:0,fontSize:13,fontWeight:600,color:"white",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{currentUser.nome}</p>
                  <Pill label={role} color={ROLE_COLORS[role].color} bg={ROLE_COLORS[role].bg}/>
                </div>
              </div>
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>setDark(d=>!d)} style={{flex:1,background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.15)",color:"white",cursor:"pointer",borderRadius:8,padding:"6px 8px",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>{dark?"☀️ Claro":"🌙 Escuro"}</button>
                <button onClick={()=>setCurrentUser(null)} style={{flex:1,background:"rgba(239,68,68,.15)",border:"1px solid rgba(239,68,68,.3)",color:"#fca5a5",cursor:"pointer",borderRadius:8,padding:"6px 8px",fontSize:13}}>Sair</button>
              </div>
            </>
          ):(
            <>
              <button onClick={()=>setDark(d=>!d)} title={dark?"Modo claro":"Modo escuro"} style={{background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.15)",color:"white",cursor:"pointer",borderRadius:8,width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{dark?"☀️":"🌙"}</button>
              <button onClick={()=>setCurrentUser(null)} title="Sair" style={{background:"rgba(239,68,68,.15)",border:"1px solid rgba(239,68,68,.3)",color:"#fca5a5",cursor:"pointer",borderRadius:8,width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🚪</button>
            </>
          )}
        </div>
      </div>

      {/* ── ÁREA PRINCIPAL ── */}
      <div style={{marginLeft:SW,transition:"margin-left .22s cubic-bezier(.4,0,.2,1)",flex:1,minHeight:"100vh",display:"flex",flexDirection:"column"}}>
        {/* Topbar */}
        <div style={{background:"linear-gradient(135deg,#5b21b6,#3730a3)",color:"white",padding:"12px 24px",boxShadow:"0 2px 12px rgba(0,0,0,.2)",display:"flex",alignItems:"center",gap:16,position:"sticky",top:0,zIndex:100}}>
          <h2 style={{margin:0,fontSize:16,fontWeight:700,color:"#e9d5ff"}}>{activeTab?.icon} {activeTab?.label}</h2>
          <div style={{marginLeft:"auto",display:"flex",gap:20,alignItems:"center"}}>
            <span style={{fontSize:13,opacity:.9}}>Receita: <strong>{fR(recBruta)}</strong></span>
            <span style={{fontSize:13,color:lucOp>=0?"#86efac":"#fca5a5"}}>Resultado: <strong>{fR(lucOp)}</strong></span>
          </div>
        </div>
        {/* Conteúdo */}
        <div style={{flex:1,padding:"24px 24px 48px"}}>
          {tab===0  && <InsumosDefTab idef={idef} setIdef={setIdef}/>}
          {tab===1  && <ComprasTab entradas={entradas} setEntradas={setEntradas} idef={idef} custMedioFn={custMedioFn}/>}
          {tab===2  && <EstoqueTab idefComCusto={idefComCusto}/>}
          {tab===3  && <FichasTab fichas={fichas} fichasCalc={fichasCalc} setFichas={setFichas} idef={idef} custMedioFn={custMedioFn}/>}
          {tab===4  && <PrecosTab fichasCalc={fichasCalc} margens={margens} sm={setMargens} getPreco={getPreco} precos={precos} sp={setPrecos} canEdit={perm.editPrecos}/>}
          {tab===5  && <ProducaoTab producoes={producoes} setProducoes={setProducoes} fichasCalc={fichasCalc} idef={idef} estoqueInsumoFn={estoqueInsumoFn} estoqueProdutoFn={estoqueProdutoFn}/>}
          {tab===6  && <PedidosTab pedidos={pedidos} setPedidos={setPedidos} fichasCalc={fichasCalc} getPreco={getPreco} setVendas={setVendas} vendas={vendas} estoqueProdutoFn={estoqueProdutoFn} canConfirmar={perm.canConfirmarPedido} idef={idef} custMedioFn={custMedioFn}/>}
          {tab===7  && <VendasTab vendas={vendas} setVendas={setVendas} fichasCalc={fichasCalc} getPreco={getPreco} estoqueProdutoFn={estoqueProdutoFn} idef={idef} custMedioFn={custMedioFn}/>}
          {tab===8  && <DespesasTab despesas={despesas} setDespesas={setDespesas}/>}
          {tab===9  && <DRETab vendas={vendas} fichasCalc={fichasCalc} getPreco={getPreco} despesas={despesas}/>}
          {tab===10 && <DashboardTab fichasCalc={fichasCalc} vendas={vendas} margens={margens} getPreco={getPreco} recBruta={recBruta} lucOp={lucOp} totDesp={totDesp} despesas={despesas}/>}
          {tab===11 && <UsuariosTab usuarios={usuarios} setUsuarios={setUsuarios} currentUser={currentUser}/>}
          {tab===12 && <ListaComprasTab fichasCalc={fichasCalc} idef={idef} setIdef={setIdef} estoqueInsumoFn={estoqueInsumoFn} custMedioFn={custMedioFn}/>}
          {tab===13 && <ClientesTab pedidos={pedidos} fichasCalc={fichasCalc} getPreco={getPreco}/>}
          {tab===14 && <FluxoCaixaTab entradas={entradas} vendas={vendas} fichasCalc={fichasCalc} getPreco={getPreco} idef={idef}/>}
        </div>
      </div>
    </div>
  );
}
