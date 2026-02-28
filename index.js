const SUPABASE_URL = "https://drwrotcwebyvxxgcudka.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyd3JvdGN3ZWJ5dnh4Z2N1ZGthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NzA5MDgsImV4cCI6MjA4NTI0NjkwOH0.dm22NtQLSBMEMe9ZesWKPXkGhwjt4clWeAyH1wWPUWI";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
);
console.log("Supabase initialized", supabaseClient);

//頁面載入中獎清單
document.addEventListener("DOMContentLoaded", () => {
  const empParam = new URL(location.href).searchParams.get("emp");
  //先處理掃碼寫入
  if (empParam) {
    handleScan(empParam).catch((e) => {
      console.error("handleScan fatal:", e);
      setScanStatus(false);
      cleanEmpQueryString();
    });
  }
  loadWinners().catch((e) => console.error("loadWinners fatal:", e));
});

////
let _scanInFlight = false;
function setScanStatus(ok, msg = "") {
  const el = document.getElementById("scan_status");
  if (!el) return;
  el.textContent = ok ? `✅ 寫入成功 ${msg}` : `❌ 寫入失敗 ${msg}`;
}

function cleanEmpQueryString() {
  const cleanUrl = location.origin + location.pathname;
  history.replaceState({}, "", cleanUrl);
}

////掃碼寫入
async function handleScan(empParam) {
  if (_scanInFlight) return;
  _scanInFlight = true;
  try {
    const empNo = parseInt(empParam, 10);
    if (!Number.isInteger(empNo)) {
      setScanStatus(false, "(emp 參數不合法)");
      return;
    }

    const { data: result, error: rpcErr } = await supabaseClient.rpc(
      "draw_winner_active",
      { p_employee_no: empNo },
    );

    console.log("RPC raw result:", result);

    if (rpcErr) {
      console.error(rpcErr);
      setScanStatus(false, "(RPC error)");
      alert("寫入失敗(RPC): " + (rpcErr.message || ""));
      return;
    }

    const r = Array.isArray(result) ? result[0] : result;

    if (!r || !r.ok) {
      setScanStatus(false, r?.message ? `(${r.message})` : "");
      await loadWinners();
      return;
    }

    let winnerText = "";
    const { data: emp, error: empErr } = await supabaseClient
      .from("employee")
      .select("dep_name, emp_id, emp_name")
      .eq("no", empNo)
      .single();

    if (!empErr && emp) {
      winnerText = [emp.dep_name, emp.emp_name].filter(Boolean).join("-");
    }

    const msg =
      r?.prize_no != null && winnerText
        ? `(${r.prize_no}獎-${winnerText})`
        : r?.prize_no != null
          ? `(${r.prize_no}獎)`
          : r?.message
            ? `(${r.message})`
            : "";

    setScanStatus(true, msg);
    await loadWinners();
  } finally {
    cleanEmpQueryString();
    _scanInFlight = false;
  }
}

////中獎清單
async function loadWinners() {
  const { data, error } = await supabaseClient
    .from("winner")
    .select(
      `
      id,
      created_at,
      prize_no,
      employee:employee_no ( no, emp_id,emp_name,dep_name,job_position ),
      prize:prize_no ( no, item_name,qty,image_url )
    `,
    )
    .order("prize_no", { ascending: true });

  if (error) {
    console.error(error);
    alert("讀取中獎清單失敗：" + error.message);
    return;
  }

  renderWinners(data || []);
}
function renderWinners(data = []) {
  const el = document.getElementById("employee_list");
  el.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.className = "list-wrap";
  el.appendChild(wrap);

  const title = document.createElement("div");
  title.className = "list-title";
  title.textContent = `中獎清單`;
  wrap.appendChild(title);

  if (!data || data.length === 0) {
    const empty = document.createElement("div");
    empty.textContent = "目前尚未有中獎紀錄";
    wrap.appendChild(empty);
    return;
  }

  //依獎項分組：key = prize_no
  const groupMap = new Map();
  for (const w of data) {
    const key = String(w.prize_no ?? w.prize?.no ?? "");
    if (!key) continue;

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        prize_no: w.prize_no ?? w.prize?.no,
        prize: w.prize ?? null,
        winners: [],
      });
    }

    const winnerName = [w.employee?.dep_name ?? "", w.employee?.emp_name ?? ""]
      .filter(Boolean)
      .join("-");

    if (winnerName) groupMap.get(key).winners.push(winnerName);
  }

  //轉陣列（維持 Map 插入順序＝依 DB 回傳順序）
  const grouped = Array.from(groupMap.values());

  //表頭
  const head = document.createElement("div");
  head.className = "list-head";
  head.style.gridTemplateColumns = "80px 2fr 100px 70px 6fr";
  head.innerHTML = `
    <div class="cell">no</div>
    <div class="cell">品項</div>
    <div class="cell">圖片</div>
    <div class="cell">名額</div>
    <div class="cell">得獎人</div>
  `;
  wrap.appendChild(head);

  //每個獎只畫一列，得獎人姓名用逗號累加
  for (const g of grouped) {
    const qty = Number(g.prize?.qty ?? 0) || 0;

    // 已抽額 = 該獎 winners 數
    const drawn = g.winners.length;

    // 餘額
    const remain = Math.max(0, qty - drawn);

    // 圖片
    const imgHtml = g.prize?.image_url
      ? `<img class="thumb" src="${escapeHtml(g.prize.image_url)}" alt="${escapeHtml(g.prize?.item_name ?? "prize")}" loading="lazy">`
      : "";

    // 得獎人姓名：用 ", " 串起來（並 escape）
    const winnerNamesText = g.winners
      .map((name) => escapeHtml(name))
      .join(", ");

    const row = document.createElement("div");
    row.className = "list-row";
    row.style.gridTemplateColumns = "80px 2fr 100px 70px 6fr";
    row.innerHTML = `
      <div class="cell">${g.prize?.no ?? g.prize_no ?? ""}獎</div>
      <div class="cell">${escapeHtml(g.prize?.item_name ?? "")}</div>
      <div class="cell">${imgHtml}</div>
      <div class="cell">${qty}</div>
      <div class="cell">${winnerNamesText}</div>
    `;
    wrap.appendChild(row);
  }
}

// 簡單防 XSS（避免名字含 <script> 之類）
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

//前往管理者頁面
// document.getElementById("btn_admin").addEventListener("click", () => {
//   location.href = "./admin.html";
// });
