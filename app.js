/* SEERTECH · Órdenes de Trabajo — app para técnicos y administrador */
'use strict';
const VERSION_APP = '1.2.0';
const MAX_FOTOS = 8;
const TIPOS = window.TIPOS_OT, ORDEN_TIPOS = window.ORDEN_TIPOS;
const tipoDe = ot => (ot && TIPOS[ot.tipo]) ? ot.tipo : 'campana';
const CLI = ['nombre', 'comercial', 'contacto', 'telefono', 'direccion', 'zona'];

const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => [...(el || document).querySelectorAll(s)];
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------------- almacenamiento ---------------- */
const LS = {
  get(k, d) { try { const v = localStorage.getItem('seertech_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('seertech_' + k, JSON.stringify(v)); } catch (e) { /* sin espacio */ } },
  del(k) { try { localStorage.removeItem('seertech_' + k); } catch (e) { } }
};
const DB = {
  _db: null,
  abrir() {
    if (this._db) return Promise.resolve(this._db);
    return new Promise((ok, mal) => {
      const r = indexedDB.open('seertech-ot', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('ots', { keyPath: 'idLocal' });
      r.onsuccess = () => { this._db = r.result; ok(r.result); };
      r.onerror = () => mal(r.error);
    });
  },
  async tx(modo, fn) {
    const db = await this.abrir();
    return new Promise((ok, mal) => {
      const t = db.transaction('ots', modo), s = t.objectStore('ots');
      const r = fn(s);
      t.oncomplete = () => ok(r && r.result);
      t.onerror = () => mal(t.error);
    });
  },
  todos() { return this.tx('readonly', s => s.getAll()); },
  guardar(reg) { reg.actualizada = Date.now(); return this.tx('readwrite', s => s.put(reg)); },
  borrar(id) { return this.tx('readwrite', s => s.delete(id)); },
  uno(id) { return this.tx('readonly', s => s.get(id)); }
};

/* ---------------- estado ---------------- */
const S = {
  auth: LS.get('auth', null),
  api: LS.get('api', '') || (window.SEERTECH_API || ''),
  clientes: LS.get('clientes', []),
  lista: LS.get('lista', []),
  panel: null,
  ot: null,           // {modo, reg?, numero?, revisionBase?, fotos, firmas}
  enviando: false,
  filtro: 'todas'
};
const esAdmin = () => S.auth && S.auth.rol === 'admin';

/* ---------------- utilidades de interfaz ---------------- */
function toast(t, ms) {
  const el = $('#toast'); el.textContent = t; el.classList.add('ver');
  clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove('ver'), ms || 3200);
}
function cargando(t) { $('#cargando').hidden = !t; if (t) $('#cargando-txt').textContent = t; }
function modal(html, botones, alAbrir) {
  return new Promise(ok => {
    $('#modal-txt').innerHTML = html;
    const cont = $('#modal-botones'); cont.innerHTML = '';
    botones.forEach(b => {
      const el = document.createElement('button');
      el.className = 'btn ' + (b.clase || ''); el.textContent = b.texto;
      el.onclick = () => { const fn = typeof b.valor === 'function'; const v = b.valor === undefined ? b.texto : (fn ? b.valor() : b.valor); if (fn && v === false) return; $('#modal').hidden = true; ok(v); };
      cont.appendChild(el);
    });
    $('#modal').hidden = false;
    if (alAbrir) alAbrir();
  });
}
const confirmar = (html, si, no) => modal(html, [{ texto: no || 'Cancelar', valor: false }, { texto: si || 'Aceptar', clase: 'prim', valor: true }]);
function pedirTexto(html, placeholder, boton) {
  return modal(html + `<textarea id="m-txt" rows="4" class="inp" placeholder="${esc(placeholder || '')}"></textarea>`,
    [{ texto: 'Cancelar', valor: null }, { texto: boton || 'Enviar', clase: 'prim', valor: () => $('#m-txt').value.trim() || false }],
    () => $('#m-txt').focus());
}
function pedirPIN(titulo) {
  return modal(`<b>${esc(titulo || 'PIN de administrador')}</b><input id="m-pin" type="password" inputmode="numeric" class="inp grande" autocomplete="off" placeholder="••••">`,
    [{ texto: 'Cancelar', valor: null }, { texto: 'Continuar', clase: 'prim', valor: () => $('#m-pin').value.trim() || false }],
    () => $('#m-pin').focus());
}
function uid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}
const hoy = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); return { fecha: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`, hora: `${p(d.getHours())}:${p(d.getMinutes())}` }; };
const fechaCorta = f => { if (!f) return ''; const m = String(f).match(/(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : f; };

/* ---------------- servidor ---------------- */
function credenciales(a) { a = a || S.auth || {}; return a.rol === 'admin' ? { pin: a.pin } : { codigo: a.codigo }; }
async function api(accion, datos, auth, espera) {
  if (!S.api) { const e = new Error('Falta configurar la URL del servidor.'); e.codigo = 'config'; throw e; }
  if (!navigator.onLine) { const e = new Error('Sin conexión a internet.'); e.codigo = 'offline'; throw e; }
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), espera || 60000);
  let r;
  try {
    r = await fetch(S.api, { method: 'POST', body: JSON.stringify(Object.assign({ accion, auth: credenciales(auth) }, datos || {})), signal: ctl.signal, redirect: 'follow' });
  } catch (e) {
    const err = new Error('No se pudo conectar con el servidor.'); err.codigo = 'offline'; throw err;
  } finally { clearTimeout(t); }
  let j;
  try { j = await r.json(); } catch (e) { const err = new Error('Respuesta inválida del servidor.'); err.codigo = 'offline'; throw err; }
  if (!j.ok) { const e = new Error(j.error || 'Error del servidor'); e.codigo = j.codigo; throw e; }
  return j;
}

/* ---------------- ingreso ---------------- */
let rolIngreso = 'tecnico';
function mostrarIngreso() {
  $$('.vista').forEach(v => v.classList.remove('activa')); $('#v-ingreso').classList.add('activa');
  $('#ing-api').value = S.api || '';
  $('#ing-msg').textContent = '';
}
$$('.tab-i').forEach(b => b.onclick = () => {
  rolIngreso = b.dataset.rol;
  $$('.tab-i').forEach(x => x.classList.toggle('activo', x === b));
  const adm = rolIngreso === 'admin';
  $('#ing-lbl').textContent = adm ? 'PIN de administrador' : 'Código de técnico';
  const i = $('#ing-valor'); i.value = ''; i.type = adm ? 'password' : 'text';
  i.inputMode = adm ? 'numeric' : 'text'; i.placeholder = adm ? '••••' : 'Ej.: SM-2847';
  $('#ing-msg').textContent = '';
});
$('#ing-entrar').onclick = async () => {
  const v = $('#ing-valor').value.trim();
  const url = $('#ing-api').value.trim();
  if (url) { S.api = url; LS.set('api', url); }
  if (!v) { $('#ing-msg').textContent = rolIngreso === 'admin' ? 'Escriba su PIN.' : 'Escriba su código.'; return; }
  const auth = rolIngreso === 'admin' ? { rol: 'admin', pin: v } : { rol: 'tecnico', codigo: v.toUpperCase() };
  cargando('Verificando…');
  try {
    const r = await api('login', {}, auth);
    auth.nombre = r.usuario.nombre;
    S.auth = auth; LS.set('auth', auth);
    cargando(false);
    iniciarApp();
    toast('Bienvenido, ' + auth.nombre);
  } catch (e) {
    cargando(false);
    $('#ing-msg').textContent = e.codigo === 'offline' ? 'Necesita internet para entrar la primera vez.' : e.message;
  }
};
$('#ing-valor').addEventListener('keydown', e => { if (e.key === 'Enter') $('#ing-entrar').click(); });

/* ---------------- app ---------------- */
function iniciarApp() {
  $$('.vista').forEach(v => v.classList.remove('activa')); $('#v-app').classList.add('activa');
  $('#app-usuario').textContent = S.auth.nombre;
  $('#aj-nombre').textContent = S.auth.nombre;
  $('#aj-rol').textContent = esAdmin() ? 'Administrador' : 'Técnico · código ' + S.auth.codigo;
  $('#aj-version').textContent = 'Versión ' + VERSION_APP;
  const tabs = esAdmin()
    ? [['p-recibidas', '📋', 'Recibidas'], ['nueva', '＋', 'Nueva OT'], ['p-mis', '📝', 'Borradores'], ['p-ajustes', '⚙️', 'Ajustes']]
    : [['p-mis', '📝', 'Mis OT'], ['nueva', '＋', 'Nueva OT'], ['p-ajustes', '⚙️', 'Ajustes']];
  $('#tabs').innerHTML = tabs.map(t => `<button data-p="${t[0]}"><b>${t[1]}</b><span>${t[2]}</span></button>`).join('');
  $$('#tabs button').forEach(b => b.onclick = () => b.dataset.p === 'nueva' ? nuevaOT() : panel(b.dataset.p));
  $('#p-mis h2').textContent = esAdmin() ? 'Mis borradores' : 'Mis órdenes';
  panel(esAdmin() ? 'p-recibidas' : 'p-mis');
  llenarClientes();
  sincronizar();
}
function panel(id) {
  S.panel = id;
  document.body.classList.remove('en-ot', 'lectura');
  $$('.panel').forEach(p => p.classList.toggle('activo', p.id === id));
  $$('#tabs button').forEach(b => b.classList.toggle('activo', b.dataset.p === id));
  window.scrollTo(0, 0);
  if (id === 'p-mis') pintarMis();
  if (id === 'p-recibidas') pintarRecibidas();
}
async function estadoBarra() {
  const regs = await DB.todos();
  const pend = regs.filter(r => r.estado === 'pendiente' || r.estado === 'error').length;
  const red = navigator.onLine ? 'En línea' : 'Sin señal';
  $('#app-estado').textContent = red + (pend ? ` · ${pend} por enviar` : '') + (S.enviando ? ' · enviando…' : '');
  const b = $('#tabs button[data-p="p-mis"] span');
  if (b) b.innerHTML = (esAdmin() ? 'Borradores' : 'Mis OT') + (pend ? ` <span class="burbuja">${pend}</span>` : '');
}
async function sincronizar(manual) {
  estadoBarra();
  if (!navigator.onLine) { if (manual) toast('Sin señal. Se enviará al volver el internet.'); return; }
  await enviarPendientes();
  try {
    const [c, l] = await Promise.all([api('clientes'), api('listarOT')]);
    S.clientes = c.clientes; LS.set('clientes', S.clientes); llenarClientes();
    S.lista = l.ots; LS.set('lista', S.lista);
    if (S.panel === 'p-mis') pintarMis();
    if (S.panel === 'p-recibidas') pintarRecibidas();
    if (manual) toast('Actualizado');
  } catch (e) {
    if (e.codigo === 'inactivo' || e.codigo === 'auth' || e.codigo === 'pin') {
      await modal(esc(e.message) + '<br><br>Debe volver a ingresar.', [{ texto: 'Aceptar', clase: 'prim' }]);
      salir(true); return;
    }
    if (manual) toast(e.message);
  }
  estadoBarra();
}
$('#btn-sync').onclick = () => sincronizar(true);
window.addEventListener('online', () => sincronizar());
window.addEventListener('offline', estadoBarra);
setInterval(() => { if (navigator.onLine && S.auth) enviarPendientes(); }, 90000);

async function enviarPendientes() {
  if (S.enviando || !navigator.onLine) return;
  const regs = (await DB.todos()).filter(r => r.estado === 'pendiente' || r.estado === 'error').sort((a, b) => a.creada - b.creada);
  if (!regs.length) return;
  S.enviando = true; estadoBarra();
  let enviadas = 0;
  for (const reg of regs) {
    try {
      const r = await api('enviarOT', { ot: reg.ot }, null, 180000);
      await DB.borrar(reg.idLocal);
      enviadas++;
      toast(`✔ ${r.numero} enviada`);
    } catch (e) {
      if (e.codigo === 'offline') break;
      reg.estado = 'error'; reg.error = e.message; await DB.guardar(reg);
    }
  }
  S.enviando = false;
  if (enviadas) {
    try { const l = await api('listarOT'); S.lista = l.ots; LS.set('lista', S.lista); } catch (e) { }
  }
  estadoBarra();
  if (S.panel === 'p-mis') pintarMis();
  if (S.panel === 'p-recibidas') pintarRecibidas();
}

/* ---------------- listas ---------------- */
function chipEstado(e) {
  const c = { 'Completado': 'ok', 'Pendiente': 'pend', 'En proceso': 'pend', 'Garantía': 'rev' }[e] || '';
  return e ? `<span class="chip ${c}">${esc(e)}</span>` : '';
}
async function pintarMis() {
  const regs = (await DB.todos()).sort((a, b) => b.actualizada - a.actualizada);
  let h = '';
  if (regs.length) {
    h += '<div class="lista-titulo">En este celular</div>';
    h += regs.map(r => {
      const c = r.ot.cliente || {};
      const chip = r.estado === 'borrador' ? '<span class="chip borr">Borrador</span>'
        : r.estado === 'error' ? '<span class="chip err">Error al enviar</span>' : '<span class="chip pend">Pendiente de envío</span>';
      return `<div class="item" data-local="${r.idLocal}"><div><span class="tipo-ic">${TIPOS[tipoDe(r.ot)].icono}</span><b>${esc(c.comercial || c.nombre || 'Sin cliente')}</b>
        <small>${esc(r.ot.servicio || TIPOS[tipoDe(r.ot)].nombre)} · ${fechaCorta(r.ot.fecha)} · ${(r.ot.fotos || []).length} fotos${r.error ? ' · ' + esc(r.error) : ''}</small></div><div class="der">${chip}</div></div>`;
    }).join('');
  }
  if (!esAdmin()) {
    h += '<div class="lista-titulo">Enviadas</div>';
    h += S.lista.length ? S.lista.map(itemEnviada).join('') : '<div class="vacio">Todavía no ha enviado órdenes de trabajo.</div>';
  } else if (!regs.length) h = '<div class="vacio">No hay borradores en este celular.</div>';
  $('#mis-lista').innerHTML = h;
  $$('#mis-lista [data-local]').forEach(el => el.onclick = () => abrirLocal(el.dataset.local));
  $$('#mis-lista [data-num]').forEach(el => el.onclick = () => abrirEnviada(el.dataset.num));
}
function itemEnviada(o) {
  const nueva = esAdmin() && !o.revision && o.recibida && (Date.now() - new Date(o.recibida.replace(' ', 'T')).getTime() < 86400000);
  return `<div class="item ${o.correccion ? 'corr' : nueva ? 'nueva' : ''}" data-num="${esc(o.numero)}"><div><span class="tipo-ic">${TIPOS[tipoDe(o)].icono}</span><b>${esc(o.numero)}</b> · ${esc(o.cliente)}
    <small>${esc(o.servicio || TIPOS[tipoDe(o)].nombre)} · ${esAdmin() ? esc(o.tecnico) + ' · ' : ''}${fechaCorta(o.fecha)}${o.tipoVisita ? ' · ' + esc(o.tipoVisita) : ''}</small></div>
    <div class="der">${nueva ? '<span class="chip ok">Nueva</span>' : ''}${chipEstado(o.estado)}${o.revision ? `<span class="chip rev">Rev ${o.revision}</span>` : ''}${o.correccion ? '<span class="chip pend">Corrección solicitada</span>' : ''}</div></div>`;
}
function pintarRecibidas() {
  const q = $('#rec-filtro').value.trim().toLowerCase();
  let l = S.lista.filter(o => !q || [o.numero, o.cliente, o.tecnico].join(' ').toLowerCase().includes(q));
  if (S.filtro === 'correccion') l = l.filter(o => o.correccion);
  if (S.filtro === 'pendientes') l = l.filter(o => o.estado === 'Pendiente' || o.estado === 'En proceso');
  $('#rec-lista').innerHTML = l.length ? l.map(itemEnviada).join('') : '<div class="vacio">No hay órdenes que mostrar.</div>';
  $$('#rec-lista [data-num]').forEach(el => el.onclick = () => abrirEnviada(el.dataset.num));
}
$('#rec-filtro').addEventListener('input', pintarRecibidas);
$$('#rec-chips .chipf').forEach(b => b.onclick = () => { S.filtro = b.dataset.f; $$('#rec-chips .chipf').forEach(x => x.classList.toggle('activo', x === b)); pintarRecibidas(); });

/* ---------------- clientes ---------------- */
const etiqueta = c => c.comercial ? `${c.comercial} — ${c.nombre}` : c.nombre;
function llenarClientes() {
  $('#cli-lista').innerHTML = S.clientes.map(c => `<option value="${esc(etiqueta(c))}">`).join('');
}
function cargarCliente(v) {
  const c = S.clientes.find(x => etiqueta(x) === v);
  if (!c) return;
  CLI.forEach(k => campo('c.' + k).value = c[k] || '');
  let tec = 0; const tipo = S.ot.tipo;
  const guardado = tipo === 'campana' ? c.tec : (c.equipos || {})[tipo];
  TIPOS[tipo].campos.forEach(f => { if (guardado && guardado[f.k]) { campo('t.' + f.k).value = guardado[f.k]; tec++; } });
  S.ot.correo = c.correo || '';
  $('#cli-msg').textContent = '✔ Datos de ' + (c.comercial || c.nombre) + ' cargados' + (tec ? ' (incluye datos del equipo)' : '');
  autoguardar();
}
$('#cli-buscar').addEventListener('change', e => cargarCliente(e.target.value));
$('#cli-buscar').addEventListener('input', e => cargarCliente(e.target.value));
$('#cli-guardar').onclick = async () => {
  const ot = leerForm();
  if (!ot.cliente.nombre) { toast('Escriba al menos el nombre del cliente.'); return; }
  cargando('Guardando cliente…');
  try {
    const r = await api('guardarCliente', { cliente: Object.assign({}, ot.cliente, { tec: ot.tec, tipo: ot.tipo }) });
    S.clientes = r.clientes; LS.set('clientes', S.clientes); llenarClientes();
    toast('💾 Cliente guardado. Ya lo ven todos los técnicos.');
  } catch (e) { toast(e.codigo === 'offline' ? 'Necesita señal para guardar el cliente.' : e.message); }
  cargando(false);
};

/* ---------------- formulario ---------------- */
function campo(n) { return $(`#ot-form [name="${n}"]`); }
function plantilla(tipo) {
  const h = hoy();
  return { tipo, titulo: '', fecha: h.fecha, hora: h.hora, tipoVisita: '', estado: '', servicios: [], cliente: {}, tec: {}, checklist: [],
    descripcion: '', proxima: {}, observaciones: '', fotos: [],
    firmas: { tecnico: { nombre: esAdmin() ? '' : S.auth.nombre, img: '' }, supervisor: { nombre: '', img: '' }, cliente: { nombre: '', img: '' } },
    servicio: TIPOS[tipo].libre ? '' : TIPOS[tipo].nombre, app: VERSION_APP };
}
function pintarServicios(sel, tipo) {
  const lista = TIPOS[tipo].servicios;
  $('#lbl-servicios').style.display = lista.length ? '' : 'none';
  $('#servicios').innerHTML = lista.map(s => `<label><input type="checkbox" name="servicio" value="${esc(s)}" ${sel.includes(s) ? 'checked' : ''}><span>${esc(s)}</span></label>`).join('');
}
function pintarChecklist(lista, tipo) {
  lista = lista || [];
  const m = {}; lista.forEach(it => m[it.cat + '|' + it.tarea] = it);
  const grupos = TIPOS[tipo].tareas.map(g => ({ cat: g.cat, items: g.items.map(t => ({ tarea: t, extra: false })) }));
  const fijas = new Set(); grupos.forEach(g => g.items.forEach(t => fijas.add(g.cat + '|' + t.tarea)));
  lista.filter(it => !fijas.has(it.cat + '|' + it.tarea)).forEach(it => {
    let g = grupos.find(x => x.cat === it.cat);
    if (!g) { g = { cat: it.cat, items: [] }; grupos.push(g); }
    g.items.push({ tarea: it.tarea, extra: true });
  });
  let h = '', i = 0;
  grupos.forEach(g => {
    h += `<div class="chk-cat">${esc(g.cat)}</div>`;
    g.items.forEach(t => {
      const v = m[g.cat + '|' + t.tarea] || {};
      h += `<div class="chk-fila" data-cat="${esc(g.cat)}" data-tarea="${esc(t.tarea)}"><input type="checkbox" ${v.hecho ? 'checked' : ''} aria-label="Hecho">
        <div class="tarea">${esc(t.tarea)}</div><div class="est">
        <label><input type="radio" name="e${i}" value="b" ${v.estado === 'b' ? 'checked' : ''}><span>OK</span></label>
        <label><input type="radio" name="e${i}" value="r" ${v.estado === 'r' ? 'checked' : ''}><span>Rev</span></label>
        <label><input type="radio" name="e${i}" value="n" ${v.estado === 'n' ? 'checked' : ''}><span>N/A</span></label></div>
        ${t.extra ? '<button type="button" class="quitar-t" title="Quitar tarea">✕</button>' : ''}</div>`;
      i++;
    });
  });
  $('#checklist').innerHTML = h || '<div class="suave" style="padding:8px 2px">Agregue las tareas del trabajo con el botón de abajo.</div>';
  $$('#checklist .quitar-t').forEach(b => b.onclick = () => { b.closest('.chk-fila').remove(); pintarChecklist(leerChecklist(), S.ot.tipo); autoguardar(); });
  contarChecklist();
}
function leerChecklist() {
  return $$('.chk-fila').map(f => ({ cat: f.dataset.cat, tarea: f.dataset.tarea, hecho: $('input[type=checkbox]', f).checked, estado: ($('.est input:checked', f) || {}).value || '' }));
}
function agregarTarea() {
  const t = $('#nueva-tarea').value.trim();
  if (!t) { $('#nueva-tarea').focus(); return; }
  const l = leerChecklist();
  const cat = TIPOS[S.ot.tipo].libre ? 'Tareas' : 'Tareas adicionales';
  if (l.some(x => x.cat === cat && x.tarea === t)) { toast('Esa tarea ya está en la lista.'); return; }
  l.push({ cat, tarea: t, hecho: true, estado: 'b' });
  pintarChecklist(l, S.ot.tipo);
  $('#nueva-tarea').value = ''; autoguardar();
}
$('#btn-tarea').onclick = agregarTarea;
$('#nueva-tarea').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); agregarTarea(); } });
function pintarTec(tipo) {
  const T = TIPOS[tipo];
  $('#tec-titulo').textContent = T.tecTitulo;
  $('#tec-campos').innerHTML = T.campos.map(f => `<label class="campo"><span>${esc(f.l)}</span><input name="t.${f.k}" placeholder="${esc(f.ph || '')}"${f.lista ? ` list="tl-${f.k}"` : ''}>
    ${f.lista ? `<datalist id="tl-${f.k}">${f.lista.map(x => `<option value="${esc(x)}">`).join('')}</datalist>` : ''}</label>`).join('');
}
function contarChecklist() {
  const f = $$('.chk-fila'); $('#chk-cont').textContent = f.filter(x => $('input[type=checkbox]', x).checked).length + ' de ' + f.length;
}
$('#chk-todo').onclick = () => { $$('.chk-fila').forEach(f => { $('input[type=checkbox]', f).checked = true; $('input[value=b]', f).checked = true; }); contarChecklist(); autoguardar(); };

function pintarFotos() {
  const f = S.ot.fotos, lect = S.ot.modo === 'lectura';
  $('#fotos').innerHTML = f.map((p, i) => `<div class="foto"><img src="${p.src}" alt="Foto ${i + 1}">
    <input value="${esc(p.caption)}" placeholder="${lect ? '' : 'Descripción…'}" data-i="${i}">
    ${lect ? '' : `<button type="button" class="quitar" data-i="${i}" title="Quitar">✕</button>`}</div>`).join('')
    || (lect ? '<div class="suave">Sin fotografías.</div>' : '');
  $('#foto-cont').textContent = f.length + ' / ' + MAX_FOTOS;
  $$('#fotos input').forEach(el => el.oninput = () => { S.ot.fotos[el.dataset.i].caption = el.value; autoguardar(); });
  $$('#fotos .quitar').forEach(el => el.onclick = async () => {
    if (await confirmar('¿Quitar esta foto?', 'Quitar')) { S.ot.fotos.splice(Number(el.dataset.i), 1); pintarFotos(); autoguardar(); }
  });
  const lleno = f.length >= MAX_FOTOS;
  $('#btn-camara').disabled = lleno; $('#btn-galeria').disabled = lleno;
}
function comprimir(file) {
  return new Promise(ok => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const max = 1280, k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const cv = document.createElement('canvas');
      cv.width = Math.round(img.naturalWidth * k); cv.height = Math.round(img.naturalHeight * k);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url); ok(cv.toDataURL('image/jpeg', 0.78));
    };
    img.onerror = () => { URL.revokeObjectURL(url); ok(null); };
    img.src = url;
  });
}
async function agregarFotos(e) {
  const files = [...(e.target.files || [])]; e.target.value = '';
  const libres = MAX_FOTOS - S.ot.fotos.length;
  if (files.length > libres) toast(`Máximo ${MAX_FOTOS} fotos por OT.`);
  for (const f of files.slice(0, libres)) {
    const src = await comprimir(f);
    if (src) { S.ot.fotos.push({ src, caption: '' }); pintarFotos(); }
  }
  autoguardar();
}
$('#btn-camara').onclick = () => $('#in-camara').click();
$('#btn-galeria').onclick = () => $('#in-galeria').click();
$('#in-camara').onchange = agregarFotos;
$('#in-galeria').onchange = agregarFotos;

/* firmas */
function prepararFirmas() {
  $$('.firma').forEach(box => {
    const k = box.dataset.firma, cv = $('canvas', box), ctx = cv.getContext('2d');
    let dib = false, ux = 0, uy = 0;
    const pos = e => { const r = cv.getBoundingClientRect(), s = e.touches ? e.touches[0] : e; return [(s.clientX - r.left) * cv.width / r.width, (s.clientY - r.top) * cv.height / r.height]; };
    const ini = e => { if (S.ot.modo === 'lectura') return; e.preventDefault(); dib = true; [ux, uy] = pos(e); ctx.beginPath(); ctx.arc(ux, uy, 1.6, 0, 7); ctx.fillStyle = '#1A4A5C'; ctx.fill(); };
    const mov = e => { if (!dib) return; e.preventDefault(); const [x, y] = pos(e); ctx.strokeStyle = '#1A4A5C'; ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(ux, uy); ctx.lineTo(x, y); ctx.stroke(); ux = x; uy = y; };
    const fin = () => { if (!dib) return; dib = false; S.ot.firmas[k].img = cv.toDataURL('image/png'); autoguardar(); };
    cv.addEventListener('mousedown', ini); cv.addEventListener('mousemove', mov); window.addEventListener('mouseup', fin);
    cv.addEventListener('touchstart', ini, { passive: false }); cv.addEventListener('touchmove', mov, { passive: false }); cv.addEventListener('touchend', fin);
    $('.firma-x', box).onclick = () => { ctx.clearRect(0, 0, cv.width, cv.height); S.ot.firmas[k].img = ''; autoguardar(); };
    $('[data-nombre]', box).oninput = ev => { S.ot.firmas[k].nombre = ev.target.value; autoguardar(); };
  });
}
function pintarFirmas() {
  $$('.firma').forEach(box => {
    const k = box.dataset.firma, cv = $('canvas', box), ctx = cv.getContext('2d'), f = S.ot.firmas[k] || (S.ot.firmas[k] = { nombre: '', img: '' });
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (f.img) { const im = new Image(); im.onload = () => ctx.drawImage(im, 0, 0, cv.width, cv.height); im.src = f.img; }
    $('[data-nombre]', box).value = f.nombre || '';
  });
}

function llenarForm(ot) {
  const f = $('#ot-form');
  f.reset();
  $$('input[name=tipoVisita]').forEach(r => r.checked = r.value === ot.tipoVisita);
  $$('input[name=estado]').forEach(r => r.checked = r.value === ot.estado);
  const tipo = tipoDe(ot);
  pintarServicios(ot.servicios || [], tipo); pintarTec(tipo);
  campo('titulo').value = ot.titulo || '';
  $('#campo-titulo').style.display = TIPOS[tipo].libre ? '' : 'none';
  campo('fecha').value = ot.fecha || ''; campo('hora').value = ot.hora || '';
  CLI.forEach(k => campo('c.' + k).value = (ot.cliente || {})[k] || '');
  TIPOS[tipo].campos.forEach(f => campo('t.' + f.k).value = (ot.tec || {})[f.k] || '');
  campo('descripcion').value = ot.descripcion || ''; campo('observaciones').value = ot.observaciones || '';
  const p = ot.proxima || {};
  campo('p.fecha').value = p.fecha || ''; campo('p.tipo').value = p.tipo || ''; campo('p.recomendacion').value = p.recomendacion || '';
  pintarChecklist(ot.checklist, tipo);
  $('#cli-buscar').value = ''; $('#cli-msg').textContent = '';
}
function leerForm() {
  const o = S.ot.base ? JSON.parse(JSON.stringify(S.ot.base)) : {};
  o.fecha = campo('fecha').value; o.hora = campo('hora').value;
  o.tipoVisita = ($('input[name=tipoVisita]:checked') || {}).value || '';
  o.estado = ($('input[name=estado]:checked') || {}).value || '';
  o.servicios = $$('input[name=servicio]:checked').map(x => x.value);
  o.cliente = Object.assign({ correo: S.ot.correo || (o.cliente && o.cliente.correo) || '' }, ...CLI.map(k => ({ [k]: campo('c.' + k).value.trim() })));
  const tipo = S.ot.tipo, T = TIPOS[tipo];
  o.tipo = tipo; o.titulo = campo('titulo').value.trim();
  o.tec = Object.assign({}, ...T.campos.map(f => ({ [f.k]: campo('t.' + f.k).value.trim() })));
  o.tecCampos = T.campos.map(f => ({ k: f.k, l: f.l })); o.tecTitulo = T.tecTitulo;
  o.checklist = leerChecklist();
  o.descripcion = campo('descripcion').value.trim(); o.observaciones = campo('observaciones').value.trim();
  o.proxima = { fecha: campo('p.fecha').value, tipo: campo('p.tipo').value, recomendacion: campo('p.recomendacion').value.trim() };
  o.fotos = S.ot.fotos.map(p => ({ src: p.src, caption: p.caption || '' }));
  o.firmas = JSON.parse(JSON.stringify(S.ot.firmas));
  o.servicio = T.libre ? (o.titulo || 'Otro trabajo') : T.nombre;
  return o;
}
$('#ot-form').addEventListener('input', e => { if (e.target.closest('.chk-fila')) contarChecklist(); autoguardar(); });
$('#ot-form').addEventListener('change', e => { if (e.target.closest('.chk-fila')) contarChecklist(); autoguardar(); });

let _tGuardar;
function autoguardar() {
  if (!S.ot || S.ot.modo !== 'nuevo') return;
  clearTimeout(_tGuardar);
  _tGuardar = setTimeout(guardarBorrador, 700);
}
async function guardarBorrador() {
  if (!S.ot || S.ot.modo !== 'nuevo' || !S.ot.reg) return;
  clearTimeout(_tGuardar);
  S.ot.reg.ot = leerForm();
  try { await DB.guardar(S.ot.reg); } catch (e) { toast('No hay espacio en el celular para guardar el borrador.'); }
}

function abrirForm(ot, modo, extra) {
  S.ot = Object.assign({ modo, tipo: tipoDe(ot), base: ot, fotos: (ot.fotos || []).map(f => Object.assign({}, f)), firmas: JSON.parse(JSON.stringify(ot.firmas || {})), correo: (ot.cliente || {}).correo || '' }, extra || {});
  ['tecnico', 'supervisor', 'cliente'].forEach(k => S.ot.firmas[k] = S.ot.firmas[k] || { nombre: '', img: '' });
  $$('.panel').forEach(p => p.classList.toggle('activo', p.id === 'p-ot'));
  document.body.classList.add('en-ot');
  document.body.classList.toggle('lectura', modo === 'lectura');
  llenarForm(ot); pintarFotos(); pintarFirmas();
  $('#ot-num').textContent = ot.numero || 'Nueva OT · borrador';
  $('#ot-sub').textContent = TIPOS[S.ot.tipo].icono + ' ' + (ot.servicio || TIPOS[S.ot.tipo].nombre);
  const chip = $('#ot-chip');
  chip.className = 'chip ' + (modo === 'edicion' ? 'pend' : modo === 'nuevo' ? 'borr' : 'ok');
  chip.textContent = modo === 'edicion' ? 'Editando' : modo === 'nuevo' ? 'Borrador' : (ot.revision ? 'Rev ' + ot.revision : 'Enviada');
  avisosOT(ot, modo, extra);
  accionesOT(modo);
  window.scrollTo(0, 0);
  if (!history.state || !history.state.ot) history.pushState({ ot: 1 }, '');
}
function avisosOT(ot, modo, extra) {
  let h = '';
  if (ot.revision) h += `<div class="aviso azul">Revisión ${ot.revision} · editada por ${esc(ot.editadaPor || '')} el ${esc(ot.editada || '')}${ot.cambios ? '<br>Cambios: ' + esc(ot.cambios.join(', ')) : ''}</div>`;
  if (ot.modificadaTrasFirma) h += '<div class="aviso amb">⚠ Modificada después de la firma del cliente.</div>';
  const corr = extra && extra.correccion;
  if (corr) h += `<div class="aviso amb">✉ Corrección solicitada: ${esc(corr)}</div>`;
  if (modo === 'lectura' && !esAdmin()) h += '<div class="aviso azul">Esta OT ya fue enviada y es de solo lectura. Si hay que corregir algo, use «Solicitar corrección».</div>';
  if (modo === 'nuevo' && extra && extra.reg && extra.reg.estado !== 'borrador') h += `<div class="aviso amb">Esta OT está ${extra.reg.estado === 'error' ? 'con error de envío: ' + esc(extra.reg.error || '') : 'pendiente de envío'}. Puede corregirla y volver a enviarla.</div>`;
  if (modo === 'edicion') h += '<div class="aviso amb">Está editando una OT enviada. Al guardar se crea una revisión nueva y el PDF original se conserva.</div>';
  $('#ot-avisos').innerHTML = h;
}
function accionesOT(modo) {
  const b = [];
  if (modo === 'nuevo') b.push(['🗑 Borrar', 'peligro', borrarBorrador], ['✔ Terminar y enviar', 'verde', terminarYEnviar]);
  if (modo === 'lectura') {
    b.push(['📄 Ver PDF', '', verPDF]);
    b.push(esAdmin() ? ['✏️ Editar', 'prim', empezarEdicion] : ['✉ Solicitar corrección', 'prim', solicitarCorreccion]);
  }
  if (modo === 'edicion') b.push(['Cancelar', '', cancelarEdicion], ['💾 Guardar cambios', 'verde', () => guardarEdicion()]);
  const c = $('#ot-acciones'); c.innerHTML = '';
  b.forEach(([t, cl, fn]) => { const el = document.createElement('button'); el.className = 'btn ' + cl; el.textContent = t; el.onclick = fn; c.appendChild(el); });
}
async function volver() {
  if (S.ot && S.ot.modo === 'nuevo') await guardarBorrador();
  if (S.ot && S.ot.modo === 'edicion' && !(await confirmar('¿Salir sin guardar los cambios?', 'Salir'))) { history.pushState({ ot: 1 }, ''); return; }
  S.ot = null;
  panel(S.panel && S.panel !== 'p-ot' ? S.panel : (esAdmin() ? 'p-recibidas' : 'p-mis'));
}
$('[data-accion=volver]').onclick = () => history.state && history.state.ot ? history.back() : volver();
$('[data-accion=nueva]').onclick = () => nuevaOT();
window.addEventListener('popstate', () => { if (S.ot) volver(); });

function elegirTipo() {
  return new Promise(ok => {
    $('#modal-txt').innerHTML = '<b style="font-size:17px">¿Qué tipo de trabajo?</b><div class="tipos">' +
      ORDEN_TIPOS.map(t => `<button type="button" class="tipo-btn${TIPOS[t].libre ? ' libre' : ''}" data-t="${t}"><b>${TIPOS[t].icono}</b>${esc(TIPOS[t].libre ? 'Otro trabajo (llenar libre)' : TIPOS[t].corto)}</button>`).join('') + '</div>';
    const cont = $('#modal-botones'); cont.innerHTML = '';
    const c = document.createElement('button'); c.className = 'btn'; c.textContent = 'Cancelar';
    c.onclick = () => { $('#modal').hidden = true; ok(null); }; cont.appendChild(c);
    $$('#modal-txt .tipo-btn').forEach(b => b.onclick = () => { $('#modal').hidden = true; ok(b.dataset.t); });
    $('#modal').hidden = false;
  });
}
async function nuevaOT() {
  const tipo = await elegirTipo();
  if (!tipo) return;
  const reg = { idLocal: uid(), estado: 'borrador', creada: Date.now(), ot: plantilla(tipo) };
  reg.ot.idLocal = reg.idLocal;
  await DB.guardar(reg);
  abrirForm(reg.ot, 'nuevo', { reg });
}
async function abrirLocal(id) {
  const reg = await DB.uno(id);
  if (!reg) return;
  abrirForm(reg.ot, 'nuevo', { reg });
}
async function borrarBorrador() {
  if (!(await confirmar('¿Borrar este borrador? Se perderán los datos y las fotos.', 'Borrar'))) return;
  await DB.borrar(S.ot.reg.idLocal); S.ot = null;
  if (history.state && history.state.ot) history.back();
  panel('p-mis');
  toast('Borrador eliminado'); estadoBarra();
}
async function terminarYEnviar() {
  const ot = leerForm();
  if (TIPOS[S.ot.tipo].libre && !ot.titulo) { toast('Escriba el nombre del trabajo.'); campo('titulo').focus(); return; }
  if (!ot.cliente.nombre) { toast('Falta el nombre del cliente.'); campo('c.nombre').focus(); return; }
  if (!ot.estado) { toast('Seleccione el estado de la OT.'); return; }
  const faltan = [];
  if (!ot.firmas.cliente.img) faltan.push('la firma del cliente');
  if (!ot.firmas.tecnico.img) faltan.push('la firma del técnico');
  if (!ot.fotos.length) faltan.push('fotografías');
  if (faltan.length && !(await confirmar('Falta ' + faltan.join(', ') + '.<br>¿Enviar de todos modos?', 'Enviar'))) return;
  S.ot.reg.ot = ot; S.ot.reg.estado = 'pendiente'; S.ot.reg.error = '';
  await DB.guardar(S.ot.reg);
  S.ot = null;
  history.state && history.state.ot ? history.back() : null;
  panel('p-mis');
  toast(navigator.onLine ? 'Enviando OT…' : 'Sin señal: la OT queda guardada y se enviará sola.');
  enviarPendientes();
}

async function abrirEnviada(numero) {
  cargando('Abriendo ' + numero + '…');
  try {
    const r = await api('obtenerOT', { numero });
    const item = S.lista.find(o => o.numero === numero) || {};
    cargando(false);
    abrirForm(r.ot, 'lectura', { numero, revisionBase: r.ot.revision || 0, correccion: item.correccion });
  } catch (e) {
    cargando(false);
    toast(e.codigo === 'offline' ? 'Necesita señal para abrir una OT enviada.' : e.message);
  }
}
async function verPDF() {
  cargando('Descargando PDF…');
  try {
    const r = await api('pdf', { numero: S.ot.numero });
    const bin = atob(r.base64), arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([arr], { type: 'application/pdf' }));
    const a = document.createElement('a'); a.href = url; a.download = r.nombre; a.target = '_blank';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) { toast(e.codigo === 'offline' ? 'Necesita señal para ver el PDF.' : e.message); }
  cargando(false);
}
async function solicitarCorreccion() {
  const m = await pedirTexto(`<b>Solicitar corrección de ${esc(S.ot.numero)}</b><br><span class="suave">Explique qué hay que corregir. Le llegará un aviso al administrador.</span>`, 'Ej.: el teléfono del contacto está mal, es 7777-0000');
  if (!m) return;
  cargando('Enviando solicitud…');
  try { await api('solicitarCorreccion', { numero: S.ot.numero, motivo: m }); toast('Solicitud enviada al administrador'); }
  catch (e) { toast(e.codigo === 'offline' ? 'Necesita señal para enviar la solicitud.' : e.message); }
  cargando(false);
}
async function empezarEdicion() {
  const pin = await pedirPIN('Ingrese su PIN para editar');
  if (!pin) return;
  if (pin !== String(S.auth.pin)) { toast('PIN incorrecto'); return; }
  const actual = S.ot;
  abrirForm(actual.base, 'edicion', { numero: actual.numero, revisionBase: actual.revisionBase, correccion: actual.correccion });
}
function cancelarEdicion() { const a = S.ot; abrirForm(a.base, 'lectura', { numero: a.numero, revisionBase: a.revisionBase, correccion: a.correccion }); }
async function guardarEdicion(forzar, avisoPDF) {
  const ot = leerForm();
  if (!ot.cliente.nombre) { toast('Falta el nombre del cliente.'); return; }
  if (forzar !== true) {
    const v = await modal(`<b>Guardar cambios de ${esc(S.ot.numero)}</b><br><span class="suave">Se guardará como revisión nueva y el PDF anterior se conserva en el Drive.</span>
      <label style="display:flex;gap:10px;align-items:flex-start;margin-top:14px;font-size:15px"><input type="checkbox" id="m-aviso" style="width:22px;height:22px;flex:none"${S.ot.base && S.ot.base.avisoPDF ? ' checked' : ''}>
      <span>Mostrar en el PDF el aviso de modificación<br><small class="suave">Déjelo sin marcar para correcciones menores (un teléfono, un error de escritura).</small></span></label>`,
      [{ texto: 'Cancelar', valor: null }, { texto: '💾 Guardar', clase: 'prim', valor: () => ({ aviso: $('#m-aviso').checked }) }]);
    if (!v) return;
    avisoPDF = v.aviso;
  }
  cargando('Guardando revisión…');
  try {
    const r = await api('editarOT', { numero: S.ot.numero, ot, revisionBase: S.ot.revisionBase, forzar: forzar === true, avisoPDF: !!avisoPDF }, null, 180000);
    cargando(false);
    if (r.sinCambios) { toast('No hubo cambios.'); cancelarEdicion(); return; }
    toast(`✔ Guardada como revisión ${r.revision}`);
    try { const l = await api('listarOT'); S.lista = l.ots; LS.set('lista', S.lista); } catch (e) { }
    await abrirEnviada(S.ot.numero);
  } catch (e) {
    cargando(false);
    if (e.codigo === 'conflicto') {
      const v = await modal(esc(e.message), [{ texto: 'Volver a abrirla', valor: 'recargar' }, { texto: 'Guardar de todos modos', clase: 'prim', valor: 'forzar' }]);
      if (v === 'forzar') return guardarEdicion(true, avisoPDF);
      return abrirEnviada(S.ot.numero);
    }
    toast(e.codigo === 'offline' ? 'Necesita señal para guardar la edición.' : e.message);
  }
}

/* ---------------- ajustes ---------------- */
$('#aj-clientes').onclick = () => sincronizar(true);
async function salir(sinPreguntar) {
  const pend = (await DB.todos()).filter(r => r.estado !== 'borrador').length;
  if (!sinPreguntar && !(await confirmar((pend ? `<b>Hay ${pend} OT sin enviar en este celular.</b> Se conservarán, pero no se enviarán hasta que vuelva a ingresar.<br><br>` : '') + '¿Cerrar sesión?', 'Cerrar sesión'))) return;
  S.auth = null; LS.del('auth'); LS.del('lista'); S.lista = [];
  document.body.classList.remove('en-ot', 'lectura');
  mostrarIngreso();
}
$('#aj-salir').onclick = () => salir();
let eventoInstalar = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); eventoInstalar = e; $('#aj-instalar').hidden = false; });
$('#aj-instalar').onclick = async () => { if (!eventoInstalar) return; eventoInstalar.prompt(); await eventoInstalar.userChoice; eventoInstalar = null; $('#aj-instalar').hidden = true; };

/* ---------------- arranque ---------------- */
prepararFirmas();
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { });
if (S.auth) iniciarApp(); else mostrarIngreso();
