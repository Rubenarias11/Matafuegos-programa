// Dirección (termina en /exec) de tu Google Apps Script. Vacío = solo se guarda en este navegador.
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzcoCykWdMAFdhMG4LB8v4c5zAZIrqb9tMa5Pdy4GR8O-Fca63Bfq53kj3ZKSV6lz2dGg/exec";

// [clave, título (igual que en la página de la AGC), e = dato del extintor / s = dato de la estampilla, 1 = fecha MM/AAAA]
const CAMPOS = [
  ["domicilio","Domicilio instalación","e"],["fabricante","Empresa fabricante","e"],
  ["recargadora","Empresa recargadora","s"],["fecha_mant","Fecha mantenimiento","s",1],
  ["venc_mant","Fecha vencimiento mantenimiento","s",1],["fecha_fab","Fecha fabricación","e",1],
  ["venc_vida","Fecha vencimiento vida útil","e",1],["venc_ph","Fecha vencimiento PH","s",1],
  ["nro_tarjeta","Nro. tarjeta","s"],["agente","Agente extintor","e"],
  ["capacidad","Capacidad","e"],["nro_extintor","Nro. extintor","e"],["uso","Uso","e"]
];
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let datos = [], urlActual = "", foto = "", stream = null;
try { datos = JSON.parse(localStorage.getItem("extintores_v2") || "[]"); } catch (e) {}
const msg = (t, c) => { $("estado").textContent = t; $("estado").className = c || ""; };

$("form").insertAdjacentHTML("beforeend",
  '<div class="dos">' + CAMPOS.map(([k, l, a, f]) =>
    `<div><label for="f_${k}">${l}</label><input id="f_${k}" autocomplete="off"${f ? ' inputmode="numeric" placeholder="MM/AAAA" maxlength="7"' : ""}></div>`).join("") + "</div>" +
  '<h2>Resumen</h2><ul id="resumen"></ul>' +
  '<label for="foto">Foto de la etiqueta (respaldo)</label><input id="foto" type="file" accept="image/*" capture="environment">' +
  '<div class="dos"><button type="button" id="bGuardar">Guardar</button><button type="button" class="sec" id="bCancelar" style="color:#14202e;background:#fff">Cancelar</button></div>');
$("form").onsubmit = e => e.preventDefault();
$("form").addEventListener("input", resumen);

// ---- Fechas MM/AAAA: un mes vale hasta su último día ----
const parseMA = s => { const m = /^(\d{1,2})\/(\d{4})$/.exec((s || "").trim()); return m ? { mes: +m[1], anio: +m[2] } : null; };
const finMes = s => { const p = parseMA(s); return p ? new Date(p.anio, p.mes, 0).getTime() : null; };
const orden = s => { const p = parseMA(s); return p ? p.anio * 100 + p.mes : 0; };
const restarAnios = (s, n) => { const p = parseMA(s); return p ? String(p.mes).padStart(2, "0") + "/" + (p.anio - n) : ""; };
const unidad = d => d >= 60 ? Math.round(d / 30) + " meses" : d + " días";
const plazo = s => { const t = finMes(s); if (!t) return ""; const d = Math.round((t - new Date().setHours(0,0,0,0)) / 864e5); return d < 0 ? "(vencido hace " + unidad(-d) + ")" : "(faltan " + unidad(d) + ")"; };
const edad = s => { const p = parseMA(s); if (!p) return ""; const a = Math.floor((Date.now() - new Date(p.anio, p.mes - 1, 1)) / (365.25 * 864e5)); return a >= 0 ? " (" + a + " años)" : ""; };
const ultima = e => [...e.estampillas].sort((a, b) => orden(a.fecha_mant) - orden(b.fecha_mant)).pop();
function estado(e) {
  const u = ultima(e) || {};
  const f = [u.venc_mant, u.venc_ph, e.venc_vida].map(finMes).filter(Boolean);
  if (!f.length) return "SIN_DATOS";
  const m = Math.min(...f), h = new Date().setHours(0, 0, 0, 0);
  return m < h ? "VENCIDO" : m < h + 30 * 864e5 ? "POR_VENCER" : "VIGENTE";
}

// Resumen en vivo: cuándo fue cada cosa y cuándo vence
function resumen() {
  const g = k => $("f_" + k).value.trim(), L = [];
  const ph = restarAnios(g("venc_ph"), 5);
  const est = estado({ venc_vida: g("venc_vida"), estampillas: [{ fecha_mant: g("fecha_mant"), venc_mant: g("venc_mant"), venc_ph: g("venc_ph") }] });
  if (est !== "SIN_DATOS") L.push("Estado: " + est.replace("_", " "));
  if (g("fecha_mant") || g("venc_mant")) L.push(`Último mantenimiento: ${g("fecha_mant") || "?"}. Vence: ${g("venc_mant") || "?"} ${plazo(g("venc_mant"))}`);
  if (ph) L.push(`Prueba hidráulica hecha: ${ph} (calculada: vencimiento menos 5 años). Vence: ${g("venc_ph")} ${plazo(g("venc_ph"))}`);
  if (g("fecha_fab")) L.push(`Fabricado: ${g("fecha_fab")}${edad(g("fecha_fab"))}`);
  if (g("venc_vida")) L.push(`Vida útil hasta: ${g("venc_vida")} ${plazo(g("venc_vida"))}`);
  $("resumen").innerHTML = L.map(x => `<li>${esc(x)}</li>`).join("") || "<li>Completá las fechas para ver el resumen.</li>";
}

// ---- Lectura del QR: detector nativo si existe, si no jsQR ----
const det = "BarcodeDetector" in window ? new BarcodeDetector({ formats: ["qr_code"] }) : null;
async function leerQR(src, w, h) {
  if (det) { try { const r = await det.detect(src); if (r.length) return r[0].rawValue; } catch (e) {} }
  if (window.jsQR) { const c = $("cv"); c.width = w; c.height = h; const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(src, 0, 0, w, h);
    const r = jsQR(x.getImageData(0, 0, w, h).data, w, h); return r && r.data; }
  return null;
}
function parar() { if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } $("visor").classList.remove("on"); $("bCam").textContent = "Escanear con cámara"; }
async function ciclo() {
  if (!stream) return; const v = $("v");
  if (v.videoWidth) { const k = Math.min(1, 720 / v.videoWidth); const t = await leerQR(v, v.videoWidth * k | 0, v.videoHeight * k | 0); if (t) { parar(); return exito(t); } }
  setTimeout(ciclo, 200);
}
$("bCam").onclick = async () => {
  if (stream) { parar(); return msg("Escaneo detenido."); }
  msg("Abriendo la cámara… si Chrome te pide permiso, tocá Permitir.");
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    $("v").srcObject = stream; await $("v").play(); $("visor").classList.add("on"); $("bCam").textContent = "Detener"; msg("Buscando el QR…"); ciclo();
  } catch (e) { stream = null; msg("La cámara en vivo no está disponible acá. Usá “Foto del QR”, que funciona igual.", "mal"); }
};
$("fQR").onchange = async e => {
  const f = e.target.files[0]; if (!f) return; msg("Leyendo la foto…");
  try { const b = await createImageBitmap(f); const k = Math.min(1, 1000 / b.width); const t = await leerQR(b, b.width * k | 0, b.height * k | 0);
    t ? exito(t) : msg("No se encontró un QR en la foto. Probá acercarte y que se vea entero.", "mal"); }
  catch (err) { msg("No se pudo leer esa imagen.", "mal"); }
  e.target.value = "";
};
$("bUrl").onclick = () => { const u = $("urlManual").value.trim(); if (u) exito(u); };
function exito(t) {
  if (!/^https?:\/\//.test(t)) return msg("El QR se leyó, pero no es un enlace web: " + t.slice(0, 60), "mal");
  msg("QR leído correctamente", "ok"); abrir(t);
}

async function abrir(url) {
  urlActual = url; foto = "";
  const ex = datos.find(e => e.estampillas.some(s => s.url_qr === url));
  if (ex) { $("form").hidden = true; return msg("Ese QR ya estaba guardado: " + ex.fabricante + " Nro. " + ex.nro_extintor, "ok"); }
  CAMPOS.forEach(([k]) => $("f_" + k).value = ""); resumen();
  const a = document.createElement("a"); a.href = url; a.target = "_blank"; a.rel = "noopener"; a.textContent = "Ver la página oficial"; a.style.color = "#0b57d0";
  $("aviso").replaceChildren(a, " y completá los datos."); $("form").hidden = false; $("form").scrollIntoView({ behavior: "smooth" });
  if (SCRIPT_URL) {
    msg("QR leído. Buscando los datos en la AGC…", "ok");
    try {
      const r = await (await fetch(SCRIPT_URL + "?url=" + encodeURIComponent(url))).json();
      if (r.error) throw new Error(r.error);
      let n = 0; CAMPOS.forEach(([k]) => { if (r[k]) { $("f_" + k).value = r[k]; n++; } });
      if (!n) throw new Error("la página no devolvió datos");
      resumen(); msg("QR leído y " + n + " datos cargados. Revisalos y guardá.", "ok");
    } catch (e) { msg("QR leído, pero no se pudieron traer los datos solos (" + (e.message || "sin conexión") + "). Completalos a mano.", "mal"); }
  }
}
$("foto").onchange = e => {
  const f = e.target.files[0]; if (!f) return; const im = new Image();
  im.onload = () => { const k = Math.min(1, 800 / im.width), c = document.createElement("canvas"); c.width = im.width * k; c.height = im.height * k;
    c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); foto = c.toDataURL("image/jpeg", .6); };
  im.src = URL.createObjectURL(f);
};
$("bCancelar").onclick = () => { $("form").hidden = true; };
$("bGuardar").onclick = () => {
  const v = k => $("f_" + k).value.trim();
  if (!v("nro_extintor") || !v("fabricante")) return msg("Completá al menos Nro. extintor y Empresa fabricante.", "mal");
  if (CAMPOS.some(c => c[3] && v(c[0]) && !parseMA(v(c[0])))) return msg("Revisá las fechas: van como MM/AAAA, por ejemplo 08/2027.", "mal");
  const de = a => Object.fromEntries(CAMPOS.filter(c => c[2] === a).map(c => [c[0], v(c[0])]));
  let e = datos.find(x => x.nro_extintor.toLowerCase() === v("nro_extintor").toLowerCase() && x.fabricante.toLowerCase() === v("fabricante").toLowerCase());
  if (!e) { e = { ...de("e"), estampillas: [] }; datos.push(e); }
  const s = { ...de("s"), url_qr: urlActual, foto, fecha_carga: new Date().toISOString().slice(0, 10) };
  e.estampillas.push(s);
  try { localStorage.setItem("extintores_v2", JSON.stringify(datos)); } catch (x) { msg("Guardado sin foto: no hay más espacio en el navegador.", "mal"); }
  if (SCRIPT_URL) fetch(SCRIPT_URL, { method: "POST", mode: "no-cors", body: JSON.stringify({ extintor: { ...e, estampillas: undefined }, estampilla: { ...s, foto: "" } }) }).catch(() => {});
  $("form").hidden = true; msg("Extintor guardado", "ok"); listar();
};
function listar() {
  $("lista").innerHTML = datos.map(e => {
    const s = estado(e), u = ultima(e) || {}, ph = restarAnios(u.venc_ph, 5);
    return `<details class="tarjeta ${s}"><summary><span>${esc(e.fabricante)}, Nro. ${esc(e.nro_extintor)}</span><span class="badge ${s}">${s.replace("_", " ")}</span></summary><ul>
      <li>Último mantenimiento: ${esc(u.fecha_mant) || "-"}. Vence: ${esc(u.venc_mant) || "-"} ${esc(plazo(u.venc_mant))}</li>
      <li>Prueba hidráulica hecha: ${esc(ph) || "-"} (calculada). Vence: ${esc(u.venc_ph) || "-"} ${esc(plazo(u.venc_ph))}</li>
      <li>Fabricado: ${esc(e.fecha_fab) || "-"}${esc(edad(e.fecha_fab))}. Vida útil hasta: ${esc(e.venc_vida) || "-"} ${esc(plazo(e.venc_vida))}</li>
      <li>Agente: ${esc(e.agente)}. Capacidad: ${esc(e.capacidad)}. Uso: ${esc(e.uso)}</li>
      <li>Recargadora: ${esc(u.recargadora)}. Nro. tarjeta: ${esc(u.nro_tarjeta)}</li>
      <li>Domicilio: ${esc(e.domicilio)}</li>
      <li>Estampillas registradas: ${e.estampillas.length}. <a href="${esc(u.url_qr)}" target="_blank" rel="noopener">Ver página oficial</a></li></ul>
      ${u.foto ? `<img src="${u.foto}" alt="Foto de la etiqueta">` : ""}</details>`;
  }).join("") || "<p>Todavía no hay extintores. Escaneá el primero.</p>";
}
listar();
