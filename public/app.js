const form = document.getElementById("form");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const btn = document.getElementById("submit");
const opsNote = document.getElementById("ops-note");
const provListEl = document.getElementById("provider-list");

// default rentang 30 hari terakhir
const today = new Date();
document.getElementById("to").value = iso(today);
document.getElementById("from").value = iso(new Date(today.getTime() - 30 * 864e5));

function iso(d) { return d.toISOString().slice(0, 10); }
function rupiah(v) {
  const n = Number(String(v ?? "").replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n > 0 ? "Rp" + n.toLocaleString("id-ID") : "-";
}
function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
function fmtTime(t) {
  const s = t.timestampISO || t.timestamp || "";
  return s.replace("T", " ");
}

// ---- load daftar provider -> render checkbox (disabled kalau belum ada data)
loadProviders();
async function loadProviders() {
  try {
    const r = await fetch("/api/struk?list=providers");
    const { providers } = await r.json();
    provListEl.innerHTML = providers.map((p) => `
      <label class="prov ${p.enabled ? "" : "disabled"}">
        <input type="checkbox" value="${p.id}" ${p.enabled ? "checked" : "disabled"} />
        <span>${esc(p.name)}</span>
        ${p.enabled ? "" : '<em>segera</em>'}
      </label>
    `).join("");
  } catch {
    provListEl.innerHTML = '<span class="loading-prov">Gagal memuat operator.</span>';
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const card = document.getElementById("card").value.trim();
  const from = document.getElementById("from").value;
  const to = document.getElementById("to").value;
  const chosen = [...provListEl.querySelectorAll("input:checked")].map((c) => c.value);

  if (!/^\d{15,16}$/.test(card)) return showStatus("Nomor kartu harus 15-16 digit.", true);
  if (!chosen.length) return showStatus("Pilih minimal satu operator.", true);

  btn.disabled = true;
  resultsEl.innerHTML = "";
  showStatus("Mencari struk...");

  try {
    const url = `/api/struk?card=${encodeURIComponent(card)}&from=${from}&to=${to}&providers=${chosen.join(",")}`;
    const r = await fetch(url);
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Gagal mengambil data.");
    render(data, card);
  } catch (err) {
    showStatus(err.message, true);
  } finally {
    btn.disabled = false;
  }
});

function showStatus(msg, isError) {
  statusEl.hidden = false;
  statusEl.textContent = msg;
  statusEl.classList.toggle("err", !!isError);
}

function render({ transactions, perOperator }, card) {
  const okCount = perOperator.filter((o) => !o.error).length;
  showStatus(`${transactions.length} transaksi dari ${okCount} operator.`);
  opsNote.textContent = "Operator: " + perOperator
    .map((o) => (o.error ? `${o.operator} (gagal)` : `${o.operator} (${o.count})`)).join(" · ");

  if (!transactions.length) {
    resultsEl.innerHTML = `<p class="empty">Tidak ada transaksi pada rentang ini.<br />Pastikan kartu pernah dipakai di operator terpilih.</p>`;
    return;
  }

  // grup per operator -> blok bergaya masing-masing
  const byOp = {};
  for (const t of transactions) (byOp[t.operatorId] ??= []).push(t);

  resultsEl.innerHTML = `
    <div class="toolbar">
      <span>${transactions.length} struk</span>
      <button type="button" class="btn-dl" onclick="window.print()">⭳ Download / Print PDF</button>
    </div>
    ${Object.entries(byOp).map(([id, rows]) => blockFor(id, rows, card)).join("")}
  `;
}

// render blok per operator dengan gaya mirip website asli
function blockFor(opId, rows, card) {
  const title = rows[0].operator;
  const total = rows.reduce((s, r) => s + (Number(String(r.amount).replace(/[^\d]/g, "")) || 0), 0);

  if (opId === "serbaraja") return serbarajaTable(title, rows, total, card);
  return astraCards(title, rows, total, card);
}

// --- Astra style: kartu grid, oranye
function astraCards(title, rows, total, card) {
  return `
  <section class="op-block astra">
    <div class="op-head">
      <h2>${esc(title)}</h2>
      <div class="op-sum">${rows.length} transaksi · Total ${rupiah(total)}</div>
    </div>
    <div class="astra-grid">
      ${rows.map((t) => `
        <article class="astra-struk">
          <div class="no">${esc(card)}</div>
          <div class="when">${esc(fmtTime(t))}</div>
          <div class="gate">${esc(t.gate || "-")}</div>
          <div class="line">${t.bank ? esc(t.bank) + " · " : ""}Gol ${esc(t.vehicleClass || "-")}</div>
          <div class="line">Tarif <strong>${rupiah(t.amount)}</strong></div>
          <div class="line">Sisa Saldo ${rupiah(t.endingBalance)}</div>
          ${t.receiptNo ? `<div class="resi">No. Resi ${esc(t.receiptNo)}</div>` : ""}
        </article>`).join("")}
    </div>
  </section>`;
}

// --- Serbaraja style: tabel biru dengan header
function serbarajaTable(title, rows, total, card) {
  const saldo = rows[0]?.endingBalance;
  return `
  <section class="op-block serbaraja">
    <div class="op-head">
      <h2>${esc(title)}</h2>
      <div class="op-sum">${rows.length} transaksi · Total ${rupiah(total)} · Saldo ${rupiah(saldo)}</div>
    </div>
    <div class="sb-wrap">
      <table class="sb-table">
        <thead><tr>
          <th>#</th><th>Tanggal & Waktu</th><th>Gerbang Masuk</th><th>Gerbang Keluar</th>
          <th>Gol</th><th>Bank</th><th>Tarif</th><th>Saldo</th><th>No. Resi</th>
        </tr></thead>
        <tbody>
          ${rows.map((t, i) => `<tr>
            <td>${i + 1}</td>
            <td>${esc(fmtTime(t))}</td>
            <td>${esc(t.entryGate || t.gate || "-")}</td>
            <td>${esc(t.exitGate || "—")}</td>
            <td><span class="gol">Golongan ${esc(t.vehicleClass || "-")}</span></td>
            <td>${esc(t.bank || "-")}</td>
            <td>${rupiah(t.amount)}</td>
            <td class="bal">${rupiah(t.endingBalance)}</td>
            <td>${esc(t.receiptNo || "-")}</td>
          </tr>`).join("")}
        </tbody>
      </table>
    </div>
    <div class="sb-card-note">Card: ${esc(card)} · ${esc(rows[0]?.raw?.Company || "Serbaraja")}</div>
  </section>`;
}
