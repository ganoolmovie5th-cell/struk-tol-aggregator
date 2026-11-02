const form = document.getElementById("form");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const btn = document.getElementById("submit");
const opsNote = document.getElementById("ops-note");

// default rentang: 30 hari terakhir
const today = new Date();
const monthAgo = new Date(today.getTime() - 30 * 864e5);
document.getElementById("to").value = iso(today);
document.getElementById("from").value = iso(monthAgo);

function iso(d) { return d.toISOString().slice(0, 10); }
function rupiah(v) {
  const n = Number(String(v).replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n > 0 ? "Rp" + n.toLocaleString("id-ID") : (v ?? "-");
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const card = document.getElementById("card").value.trim();
  const from = document.getElementById("from").value;
  const to = document.getElementById("to").value;

  if (!/^\d{15,16}$/.test(card)) {
    showStatus("Nomor kartu harus 15-16 digit.", true);
    return;
  }

  btn.disabled = true;
  resultsEl.innerHTML = "";
  showStatus("Mencari struk ke operator tol...");

  try {
    const r = await fetch(`/api/struk?card=${encodeURIComponent(card)}&from=${from}&to=${to}`);
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Gagal mengambil data.");
    render(data);
  } catch (err) {
    showStatus(err.message, true);
  } finally {
    btn.disabled = false;
  }
});

function showStatus(msg, isError) {
  statusEl.hidden = false;
  statusEl.textContent = msg;
  statusEl.style.background = isError ? "#fdecea" : "";
  statusEl.style.color = isError ? "#b3261e" : "";
}

function render({ transactions, perOperator }) {
  const okCount = perOperator.filter((o) => !o.error).length;
  showStatus(`${transactions.length} transaksi ditemukan dari ${okCount} operator.`);

  // catatan status per operator di footer
  opsNote.textContent = "Operator: " + perOperator
    .map((o) => o.error ? `${o.operator} (gagal)` : `${o.operator} (${o.count})`)
    .join(" · ");

  if (!transactions.length) {
    resultsEl.innerHTML = `<p class="empty">Tidak ada transaksi pada rentang ini.<br />Pastikan kartu pernah dipakai di tol yang didukung.</p>`;
    return;
  }

  resultsEl.innerHTML = transactions.map((t) => `
    <article class="trx">
      <div class="top">
        <span class="op">${esc(t.operator)}</span>
        <span class="time">${esc(t.timestampISO || t.timestamp || "")}</span>
      </div>
      <div class="amount">${esc(rupiah(t.amount))}</div>
      <div class="meta">
        ${t.gate ? "Gardu " + esc(t.gate) : ""}
        ${t.vehicleClass ? " · Gol " + esc(t.vehicleClass) : ""}
        ${t.endingBalance ? " · Sisa " + esc(rupiah(t.endingBalance)) : ""}
      </div>
    </article>
  `).join("");
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
