// ── Init ──────────────────────────────────────────────────────────────────────
let photos   = { packing:[], cargo:[], damage:[] };
let lineItems = [];
let sigPad    = { drawing: false, hasData: false };

document.addEventListener("DOMContentLoaded", init);
window.addEventListener("load", init);
let _inited = false;
function init() {
  if (_inited) return; _inited = true;
  document.getElementById("fDate").value = new Date().toISOString().split("T")[0];
  genRef();
  addItem(); addItem(); // start with 2 blank rows
  initSignature();
}

function p2(n) { return String(n).padStart(2,"0"); }

function genRef() {
  const d = new Date();
  const s = `${d.getFullYear()}${p2(d.getMonth()+1)}${p2(d.getDate())}`;
  const r = String(Math.floor(Math.random()*9000)+1000);
  document.getElementById("podRef").textContent = `POD-${s}-${r}`;
  return `POD-${s}-${r}`;
}

// ── Line items ────────────────────────────────────────────────────────────────
let itemIdx = 0;
function addItem() {
  const body = document.getElementById("itemsBody");
  const i = itemIdx++;
  const row = document.createElement("div");
  row.className = "item-row";
  row.id = `irow${i}`;
  row.innerHTML = `
    <div class="ic" style="padding:4px 8px">
      <input type="text" placeholder="Description of goods" id="idesc${i}" style="font-size:15px"/>
    </div>
    <div class="ic" style="padding:4px 8px">
      <input type="number" min="0" step="1" placeholder="0" id="iqty${i}" style="text-align:center;font-family:var(--mono);font-weight:700"/>
    </div>
    <div class="ic" style="padding:4px 8px">
      <select id="icond${i}">
        <option value="Good">✓ Good</option>
        <option value="Damaged">⚠ Damaged</option>
        <option value="Short">↓ Short</option>
        <option value="Refused">✕ Refused</option>
      </select>
    </div>
    <div class="ic">
      <button class="rmv-btn" onclick="removeItem(${i})" title="Remove row">×</button>
    </div>`;
  body.appendChild(row);
}

function removeItem(i) {
  const row = document.getElementById(`irow${i}`);
  if (row) row.remove();
  // Keep at least 1 row
  if (document.getElementById("itemsBody").children.length === 0) addItem();
}

function getLineItems() {
  const rows = document.getElementById("itemsBody").querySelectorAll(".item-row");
  const items = [];
  rows.forEach(row => {
    const id = row.id.replace("irow","");
    const desc = document.getElementById(`idesc${id}`)?.value.trim();
    const qty  = document.getElementById(`iqty${id}`)?.value;
    const cond = document.getElementById(`icond${id}`)?.value;
    if (desc) items.push({ desc, qty: qty || "—", cond: cond || "Good" });
  });
  return items;
}

// ── Damage toggle ─────────────────────────────────────────────────────────────
function dmgChange() {
  const on = document.getElementById("dmgToggle").checked;
  document.getElementById("dmgBox").style.display         = on ? "block" : "none";
  document.getElementById("dmgPhotoSection").style.display = on ? "block" : "none";
}

// ── Photos ────────────────────────────────────────────────────────────────────
function handleCapture(event, cat) {
  const files = Array.from(event.target.files);
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX = 1200; let w = img.width, h = img.height;
        if (w > h && w > MAX) { h = Math.round(h*MAX/w); w = MAX; }
        else if (h > MAX)     { w = Math.round(w*MAX/h); h = MAX; }
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        photos[cat].push({ dataURL: canvas.toDataURL("image/jpeg", 0.75) });
        renderGrid(cat);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
  event.target.value = "";
}

function renderGrid(cat) {
  const grid  = document.getElementById(`grid_${cat}`);
  const count = document.getElementById(`cnt_${cat}`);
  if (!grid) return;
  grid.innerHTML = "";
  photos[cat].forEach((p, i) => {
    const t = document.createElement("div"); t.className = "p-thumb";
    t.innerHTML = `<img src="${p.dataURL}"/><button class="p-del" onclick="removePhoto('${cat}',${i})">×</button>`;
    grid.appendChild(t);
  });
  if (count) {
    const n = photos[cat].length;
    count.textContent = n === 0 ? "0 photos" : `${n} photo${n!==1?"s":""}`;
    count.className = "photo-cat-count" + (n > 0 ? " has" : "");
  }
}

function removePhoto(cat, i) { photos[cat].splice(i,1); renderGrid(cat); }

// ── Signature ─────────────────────────────────────────────────────────────────
function initSignature() {
  const canvas = document.getElementById("sigCanvas");
  const ctx    = canvas.getContext("2d");
  ctx.strokeStyle = "#1A2B3C";
  ctx.lineWidth   = 2.5;
  ctx.lineCap     = "round";
  ctx.lineJoin    = "round";

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const src = e.touches ? e.touches[0] : e;
    return { x: (src.clientX - rect.left) * scaleX, y: (src.clientY - rect.top) * scaleY };
  }

  function start(e) {
    e.preventDefault();
    sigPad.drawing = true;
    const pos = getPos(e);
    ctx.beginPath(); ctx.moveTo(pos.x, pos.y);
  }
  function move(e) {
    e.preventDefault();
    if (!sigPad.drawing) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y); ctx.stroke();
    sigPad.hasData = true;
  }
  function end(e) { e.preventDefault(); sigPad.drawing = false; }

  canvas.addEventListener("mousedown",  start);
  canvas.addEventListener("mousemove",  move);
  canvas.addEventListener("mouseup",    end);
  canvas.addEventListener("mouseleave", end);
  canvas.addEventListener("touchstart", start, { passive: false });
  canvas.addEventListener("touchmove",  move,  { passive: false });
  canvas.addEventListener("touchend",   end,   { passive: false });
}

function clearSig() {
  const canvas = document.getElementById("sigCanvas");
  canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  sigPad.hasData = false;
}

function getSigDataURL() {
  return sigPad.hasData ? document.getElementById("sigCanvas").toDataURL("image/png") : null;
}

// ── Validate ──────────────────────────────────────────────────────────────────
function validate() {
  const errs = [];
  if (!document.getElementById("fVendor").value.trim())   errs.push("Vendor name is required");
  if (!document.getElementById("fDate").value)            errs.push("Delivery date is required");
  if (!document.getElementById("fPO").value.trim())       errs.push("PO Number is required");
  if (!document.getElementById("fSite").value.trim())     errs.push("Site / Location is required");
  if (!document.getElementById("fReceiver").value.trim()) errs.push("Received by is required");
  if (getLineItems().length === 0)                        errs.push("Enter at least one line item");
  if (document.getElementById("dmgToggle").checked &&
      !document.getElementById("fDmgNotes").value.trim()) errs.push("Please describe the damage or discrepancy");
  if (!sigPad.hasData)                                    errs.push("Signature is required");
  return errs;
}

// ── Submit ────────────────────────────────────────────────────────────────────
async function submitPOD() {
  const errs = validate();
  if (errs.length) { toast(errs[0], "error"); return; }

  const btn = document.getElementById("subBtn");
  btn.disabled = true; btn.textContent = "Generating...";
  const prog  = document.getElementById("prog"); prog.classList.add("vis");
  const pfill = document.getElementById("pfill");
  const progLbl = document.getElementById("progLbl");

  const ref      = document.getElementById("podRef").textContent;
  const vendor   = document.getElementById("fVendor").value.trim();
  const date     = document.getElementById("fDate").value;
  const po       = document.getElementById("fPO").value.trim();
  const bol      = document.getElementById("fBOL").value.trim();
  const site     = document.getElementById("fSite").value.trim();
  const receiver = document.getElementById("fReceiver").value.trim();
  const notes    = document.getElementById("fNotes").value.trim();
  const hasDmg   = document.getElementById("dmgToggle").checked;
  const dmgNotes = document.getElementById("fDmgNotes").value.trim();
  const items    = getLineItems();
  const sigData  = getSigDataURL();

  pfill.style.width = "30%";
  progLbl.textContent = "Building PDF...";

  try {
    const fileName = `${ref}${hasDmg?"-DAMAGE":""}.pdf`;
    await generatePDF({ ref, vendor, date, po, bol, site, receiver, notes, hasDmg, dmgNotes },
                       items, photos, sigData, fileName);
    pfill.style.width = "100%";
    await new Promise(r => setTimeout(r, 300));
    showSuccess(ref);
  } catch(e) {
    toast("PDF generation failed: " + e.message, "error");
    console.error(e);
    btn.disabled = false; btn.textContent = "Generate & Download PDF";
    prog.classList.remove("vis");
  }
}

// ── Generate PDF ──────────────────────────────────────────────────────────────
async function generatePDF(fd, items, photoMap, sigData, fileName) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });
  const W = 210, M = 14;
  let y = M;

  // White bg
  doc.setFillColor(255,255,255); doc.rect(0,0,W,297,"F");

  // ── Header ──
  const HDR = 34;
  doc.setFillColor(26,43,60); doc.rect(0,0,W,HDR,"F");

  // Orange accent stripe
  doc.setFillColor(245,98,15); doc.rect(0,0,W,5,"F");

  // Erthos wordmark
  doc.setFontSize(16); doc.setFont("helvetica","bold"); doc.setTextColor(255,255,255);
  doc.text("ERTHOS", M, 20);
  doc.setFontSize(8); doc.setFont("helvetica","normal"); doc.setTextColor(180,200,215);
  doc.text("PROOF OF DELIVERY", M, 27);

  // POD ref right
  doc.setFontSize(13); doc.setFont("helvetica","bold"); doc.setTextColor(245,98,15);
  doc.text(fd.ref, W-M, 20, { align:"right" });
  if (fd.hasDmg) {
    doc.setFillColor(198,40,40); doc.roundedRect(W-M-30, 23, 30, 7, 1, 1, "F");
    doc.setFontSize(7); doc.setFont("helvetica","bold"); doc.setTextColor(255,255,255);
    doc.text("⚠ DAMAGE", W-M-15, 27.5, { align:"center" });
  }
  y = HDR + 8;

  // ── Details box ──
  const lc=[80,100,120], vc=[20,30,40];
  doc.setDrawColor(210,218,226); doc.setFillColor(247,249,251);
  doc.roundedRect(M, y, W-M*2, 54, 2, 2, "FD");

  const col1 = M+5, val1 = M+48, col2 = M+(W-M*2)/2+5, val2 = M+(W-M*2)/2+48;
  const rows = [
    [["Vendor",    fd.vendor],["Site / Location", fd.site]],
    [["PO Number", fd.po],    ["Received By",     fd.receiver]],
    [["Date",      fd.date],  ["BOL / Packing Slip", fd.bol||"—"]],
  ];
  doc.setFontSize(8.5);
  rows.forEach((pair, ri) => {
    const yy = y + 12 + ri * 14;
    pair.forEach((cell, ci) => {
      const lx = ci===0 ? col1 : col2, vx = ci===0 ? val1 : val2;
      doc.setFont("helvetica","bold"); doc.setTextColor(...lc);
      doc.text(cell[0], lx, yy);
      doc.setFont("helvetica","normal"); doc.setTextColor(...vc);
      doc.text((cell[1]||"—").substring(0,36), vx, yy);
    });
  });
  y += 60;

  // ── Items table ──
  const tCols = [M, M+90, M+110, M+140];
  doc.setFillColor(26,43,60); doc.rect(M, y, W-M*2, 9, "F");
  doc.setFontSize(7.5); doc.setFont("helvetica","bold"); doc.setTextColor(255,255,255);
  ["DESCRIPTION","QTY","CONDITION","LINE"].forEach((h,i) => doc.text(h, tCols[i]+2, y+6));
  y += 10;

  items.forEach((item, idx) => {
    if (y > 245) { doc.addPage(); y = M; }
    const rowH = 9;
    if (idx%2===0) { doc.setFillColor(247,249,251); doc.rect(M,y-1,W-M*2,rowH,"F"); }
    doc.setDrawColor(220,225,230); doc.line(M,y+rowH-1,W-M,y+rowH-1);
    doc.setFontSize(8.5);
    doc.setFont("helvetica","normal"); doc.setTextColor(...vc);
    doc.text(item.desc.substring(0,55), tCols[0]+2, y+6);
    doc.setFont("helvetica","bold"); doc.setTextColor(30,90,160);
    doc.text(String(item.qty), tCols[1]+2, y+6);
    const condColor = item.cond==="Good" ? [30,140,60] : item.cond==="Damaged" ? [198,40,40] : [180,80,0];
    doc.setTextColor(...condColor);
    doc.text(item.cond, tCols[2]+2, y+6);
    doc.setFont("helvetica","normal"); doc.setTextColor(130,145,160);
    doc.text(String(idx+1).padStart(2,"0"), tCols[3]+2, y+6);
    y += rowH;
  });
  y += 6;

  // ── Damage notes ──
  if (fd.hasDmg && fd.dmgNotes) {
    if (y > 255) { doc.addPage(); y = M; }
    doc.setFillColor(255,240,240); doc.setDrawColor(220,100,100);
    doc.roundedRect(M, y, W-M*2, 18, 2, 2, "FD");
    doc.setFontSize(8); doc.setFont("helvetica","bold"); doc.setTextColor(160,30,30);
    doc.text("DAMAGE / DISCREPANCY NOTES:", M+5, y+7);
    doc.setFont("helvetica","normal"); doc.setTextColor(80,20,20);
    doc.text(fd.dmgNotes.substring(0,120), M+5, y+14);
    y += 24;
  }

  // ── General notes ──
  if (fd.notes) {
    if (y > 260) { doc.addPage(); y = M; }
    doc.setFontSize(8); doc.setFont("helvetica","bold"); doc.setTextColor(...lc);
    doc.text("Notes:", M, y+5);
    doc.setFont("helvetica","normal"); doc.setTextColor(...vc);
    doc.text(fd.notes.substring(0,120), M+18, y+5);
    y += 12;
  }

  // ── Signature block ──
  if (y > 240) { doc.addPage(); y = M; }
  y += 4;
  doc.setDrawColor(210,218,226); doc.setFillColor(250,250,252);
  doc.roundedRect(M, y, W-M*2, 36, 2, 2, "FD");
  doc.setFontSize(8); doc.setFont("helvetica","bold"); doc.setTextColor(...lc);
  doc.text("Received by:", M+5, y+8);
  doc.setFont("helvetica","normal"); doc.setTextColor(...vc);
  doc.text(fd.receiver, M+38, y+8);
  doc.setFontSize(7.5); doc.setTextColor(150,160,170);
  doc.text("Signature:", M+5, y+16);

  if (sigData) {
    try { doc.addImage(sigData, "PNG", M+5, y+18, 80, 14); } catch(e) {}
  }

  // Signature line
  doc.setDrawColor(180,190,200); doc.line(M+5, y+33, M+95, y+33);
  doc.setFontSize(7); doc.setTextColor(160,170,180);
  doc.text("Authorized receiver signature", M+5, y+36.5);
  y += 42;

  // ── Photo pages ──
  const catConfig = [
    { key:"packing", label:"PACKING SLIP PHOTOS", color:[26,101,192] },
    { key:"cargo",   label:"CARGO PHOTOS",         color:[27,122,62] },
    { key:"damage",  label:"DAMAGE PHOTOS",         color:[198,40,40], show:fd.hasDmg },
  ];
  const COLS=2, thumbW=(W-M*2-8)/2, thumbH=thumbW*0.75, gapX=8, gapY=10;

  for (const cfg of catConfig) {
    if (cfg.show===false) continue;
    const catPhotos = photoMap[cfg.key];
    if (!catPhotos || catPhotos.length===0) continue;
    doc.addPage(); y = M;
    doc.setFillColor(...cfg.color); doc.rect(M,y,W-M*2,10,"F");
    doc.setFontSize(10); doc.setFont("helvetica","bold"); doc.setTextColor(255,255,255);
    doc.text(cfg.label, M+5, y+7);
    doc.setFontSize(8); doc.setFont("helvetica","normal"); doc.setTextColor(220,230,240);
    doc.text(`${catPhotos.length} image${catPhotos.length!==1?"s":""}  —  ${fd.ref}`, W-M, y+7, { align:"right" });
    y += 14;
    catPhotos.forEach((photo, idx) => {
      if (idx > 0 && idx%(COLS*3)===0) { doc.addPage(); y = M; }
      const col = idx%COLS, row = Math.floor((idx%(COLS*3))/COLS);
      const x = M + col*(thumbW+gapX), ty = y + row*(thumbH+gapY+6);
      doc.setFillColor(255,255,255); doc.setDrawColor(210,218,226);
      doc.roundedRect(x,ty,thumbW,thumbH,1,1,"FD");
      try { doc.addImage(photo.dataURL,"JPEG",x+1,ty+1,thumbW-2,thumbH-2); } catch(e){}
    });
  }

  // ── Footer ──
  doc.setFontSize(7); doc.setFont("helvetica","normal"); doc.setTextColor(140,150,160);
  doc.line(M, 287, W-M, 287);
  doc.text(`${fd.ref}  |  Proof of Delivery  |  ${fd.vendor}  |  PO: ${fd.po}`, M, 291);
  doc.text(`Generated ${new Date().toLocaleString()}`, W-M, 291, { align:"right" });

  doc.save(fileName);
}

// ── Success ───────────────────────────────────────────────────────────────────
function showSuccess(ref) {
  document.getElementById("fw").classList.add("hidden");
  document.getElementById("ss").classList.add("vis");
  document.getElementById("ssRef").textContent = ref;
  toast("PDF downloaded — ready to email to procurement", "success");
}

// ── Reset / Clear ─────────────────────────────────────────────────────────────
function reset() {
  document.getElementById("fw").classList.remove("hidden");
  document.getElementById("ss").classList.remove("vis");
  clearForm();
}

function clearForm() {
  document.getElementById("fDate").value = new Date().toISOString().split("T")[0];
  ["fVendor","fPO","fBOL","fSite","fReceiver","fNotes","fDmgNotes"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  document.getElementById("dmgToggle").checked = false;
  document.getElementById("dmgBox").style.display = "none";
  document.getElementById("dmgPhotoSection").style.display = "none";
  document.getElementById("itemsBody").innerHTML = "";
  itemIdx = 0;
  addItem(); addItem();
  photos = { packing:[], cargo:[], damage:[] };
  ["packing","cargo","damage"].forEach(c => renderGrid(c));
  clearSig();
  genRef();
  document.getElementById("subBtn").disabled = false;
  document.getElementById("subBtn").textContent = "Generate & Download PDF";
  document.getElementById("prog").classList.remove("vis");
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function toast(msg, type="info") {
  const c = document.getElementById("toasts");
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${type==="success"?"✓":type==="error"?"✕":"ℹ"}</span> ${msg}`;
  c.appendChild(t);
  setTimeout(() => {
    t.style.cssText = "opacity:0;transform:translateY(10px);transition:all .3s";
    setTimeout(() => t.remove(), 300);
  }, type==="error" ? 7000 : 4000);
}
