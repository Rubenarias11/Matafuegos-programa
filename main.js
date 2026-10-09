// Cuando tengas el Apps Script de Google Sheets, pegá acá su dirección (termina en /exec).
// GET ?url=... debe devolver los datos del QR; POST recibe lo que se guarda. Vacío = solo guarda en este navegador.
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzcoCykWdMAFdhMG4LB8v4c5zAZIrqb9tMa5Pdy4GR8O-Fca63Bfq53kj3ZKSV6lz2dGg/exec";
const CAMPOS=[["nro_extintor","Nº de extintor","text"],["fabricante","Fabricante","text"],["agente_extintor","Agente extintor","text"],["capacidad_kg","Capacidad (kg)","number"],["fecha_fabricacion","Fabricación","month"],["venc_vida_util","Vence vida útil","month"],["nro_tarjeta","Nº de tarjeta","text"],["empresa_recargadora","Recargadora","text"],["fecha_mantenimiento","Mantenimiento","month"],["venc_mantenimiento","Vence mantenimiento","month"],["venc_ph","Vence prueba hidráulica","month"]];
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let datos=[],urlActual="",foto="",stream=null;
try{datos=JSON.parse(localStorage.getItem("extintores")||"[]")}catch(e){}
const msg=(t,c)=>{$("estado").textContent=t;$("estado").className=c||""};

$("form").insertAdjacentHTML("beforeend",
 '<div class="dos">'+CAMPOS.map(([k,l,t])=>`<div><label for="f_${k}">${l}</label><input id="f_${k}" type="${t}"${t==="number"?' step="0.5"':""}></div>`).join("")+'</div>'+
 '<label for="foto">Foto de la etiqueta (respaldo)</label><input id="foto" type="file" accept="image/*" capture="environment">'+
 '<div class="dos"><button type="button" id="bGuardar">Guardar</button><button type="button" class="sec" id="bCancelar" style="color:#14202e;background:#fff">Cancelar</button></div>');

// ---- Lectura del QR: detector nativo si existe, si no jsQR ----
const det="BarcodeDetector" in window?new BarcodeDetector({formats:["qr_code"]}):null;
async function leerQR(src,w,h){
  if(det){try{const r=await det.detect(src);if(r.length)return r[0].rawValue}catch(e){}}
  if(window.jsQR){const c=$("cv");c.width=w;c.height=h;const x=c.getContext("2d",{willReadFrequently:true});x.drawImage(src,0,0,w,h);
    const r=jsQR(x.getImageData(0,0,w,h).data,w,h);return r&&r.data}
  return null;
}
function parar(){if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}$("visor").classList.remove("on");$("bCam").textContent="Escanear con cámara"}
async function ciclo(){
  if(!stream)return;const v=$("v");
  if(v.videoWidth){const k=Math.min(1,720/v.videoWidth);const t=await leerQR(v,v.videoWidth*k|0,v.videoHeight*k|0);if(t){parar();return exito(t)}}
  setTimeout(ciclo,200);
}
$("bCam").onclick=async()=>{
  if(stream){parar();return msg("Escaneo detenido.")}
  msg("Abriendo la cámara… si Chrome te pide permiso, tocá Permitir.");
  try{
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}});
    $("v").srcObject=stream;await $("v").play();$("visor").classList.add("on");$("bCam").textContent="Detener";msg("Buscando el QR…");ciclo();
  }catch(e){stream=null;msg("La cámara en vivo no está disponible acá. Usá “Foto del QR”, que funciona igual.","mal")}
};
$("fQR").onchange=async e=>{
  const f=e.target.files[0];if(!f)return;msg("Leyendo la foto…");
  try{const b=await createImageBitmap(f);const k=Math.min(1,1000/b.width);const t=await leerQR(b,b.width*k|0,b.height*k|0);
    t?exito(t):msg("No se encontró un QR en la foto. Probá acercarte y que se vea entero.","mal")}
  catch(err){msg("No se pudo leer esa imagen.","mal")}
  e.target.value="";
};
$("bUrl").onclick=()=>{const u=$("urlManual").value.trim();if(u)exito(u)};
function exito(t){
  if(!/^https?:\/\//.test(t))return msg("El QR se leyó, pero no es un enlace web: "+t.slice(0,60),"mal");
  msg("QR leído correctamente","ok");abrir(t);
}

// ---- Datos y estado ----
const finMes=m=>{if(!m)return null;const[a,b]=m.split("-").map(Number);return new Date(a,b,0).getTime()};
const ultima=e=>[...e.estampillas].sort((a,b)=>(a.fecha_mantenimiento||"").localeCompare(b.fecha_mantenimiento||"")).pop();
function estado(e){
  const u=ultima(e);const f=[u&&u.venc_mantenimiento,u&&u.venc_ph,e.venc_vida_util].map(finMes).filter(Boolean);
  if(!f.length)return"SIN_DATOS";const m=Math.min(...f),h=new Date().setHours(0,0,0,0);
  return m<h?"VENCIDO":m<h+30*864e5?"POR_VENCER":"VIGENTE";
}
async function abrir(url){
  urlActual=url;foto="";
  const ex=datos.find(e=>e.estampillas.some(s=>s.url_qr===url));
  if(ex){$("form").hidden=true;return msg("Ese QR ya estaba guardado: "+ex.fabricante+" Nº "+ex.nro_extintor,"ok")}
  CAMPOS.forEach(([k])=>$("f_"+k).value="");
  const a=document.createElement("a");a.href=url;a.target="_blank";a.rel="noopener";a.textContent="Ver la página oficial";a.style.color="#0b57d0";
  $("aviso").replaceChildren(a," y completá los datos.");$("form").hidden=false;$("form").scrollIntoView({behavior:"smooth"});
  if(SCRIPT_URL){
    try{const r=await(await fetch(SCRIPT_URL+"?url="+encodeURIComponent(url))).json();
      CAMPOS.forEach(([k])=>{if(r[k])$("f_"+k).value=r[k]});msg("QR leído y datos cargados. Revisalos y guardá.","ok")}
    catch(e){msg("QR leído. No se pudieron traer los datos solos: completalos a mano.","ok")}
  }
}
$("foto").onchange=e=>{
  const f=e.target.files[0];if(!f)return;const im=new Image();
  im.onload=()=>{const k=Math.min(1,800/im.width),c=document.createElement("canvas");c.width=im.width*k;c.height=im.height*k;
    c.getContext("2d").drawImage(im,0,0,c.width,c.height);foto=c.toDataURL("image/jpeg",.6)};
  im.src=URL.createObjectURL(f);
};
$("bCancelar").onclick=()=>{$("form").hidden=true};
$("bGuardar").onclick=()=>{
  const v=k=>$("f_"+k).value.trim();
  if(!v("nro_extintor")||!v("fabricante"))return msg("Completá al menos Nº de extintor y fabricante.","mal");
  let e=datos.find(x=>x.nro_extintor.toLowerCase()===v("nro_extintor").toLowerCase()&&x.fabricante.toLowerCase()===v("fabricante").toLowerCase());
  if(!e){e={nro_extintor:v("nro_extintor"),fabricante:v("fabricante"),agente_extintor:v("agente_extintor"),capacidad_kg:v("capacidad_kg"),fecha_fabricacion:v("fecha_fabricacion"),venc_vida_util:v("venc_vida_util"),estampillas:[]};datos.push(e)}
  const s={url_qr:urlActual,nro_tarjeta:v("nro_tarjeta"),empresa_recargadora:v("empresa_recargadora"),fecha_mantenimiento:v("fecha_mantenimiento"),venc_mantenimiento:v("venc_mantenimiento"),venc_ph:v("venc_ph"),foto_etiqueta:foto,fecha_carga:new Date().toISOString().slice(0,10)};
  e.estampillas.push(s);
  try{localStorage.setItem("extintores",JSON.stringify(datos))}catch(x){msg("Guardado sin foto: no hay más espacio en el navegador.","mal")}
  if(SCRIPT_URL)fetch(SCRIPT_URL,{method:"POST",mode:"no-cors",body:JSON.stringify({extintor:{...e,estampillas:undefined},estampilla:{...s,foto_etiqueta:""}})}).catch(()=>{});
  $("form").hidden=true;msg("Extintor guardado","ok");listar();
};
function listar(){
  $("lista").innerHTML=datos.map(e=>{const s=estado(e),u=ultima(e);
    return `<div class="fila ${s}"><div><b>${esc(e.fabricante)}, Nº ${esc(e.nro_extintor)}</b><small>Vence mant.: ${esc(u.venc_mantenimiento)}. PH: ${esc(u.venc_ph)}</small><b class="e">${s.replace("_"," ")}</b></div>${u.foto_etiqueta?`<img src="${u.foto_etiqueta}" alt="Etiqueta">`:""}</div>`}).join("")||"<p>Todavía no hay extintores. Escaneá el primero.</p>";
}
listar();
