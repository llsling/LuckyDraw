const SUPABASE_URL = "https://drwrotcwebyvxxgcudka.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyd3JvdGN3ZWJ5dnh4Z2N1ZGthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NzA5MDgsImV4cCI6MjA4NTI0NjkwOH0.dm22NtQLSBMEMe9ZesWKPXkGhwjt4clWeAyH1wWPUWI";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
);
console.log("Supabase initialized", supabaseClient);

//頁面載入中獎清單
document.addEventListener("DOMContentLoaded", async () => {
  await Promise.all([loadPrizes(), loadWinners()]);
});
//讀取
let _employeesCache = [];
async function loadEmployees() {
  const { data: employee, error: dbError } = await supabaseClient
    .from("employee")
    .select("*")
    .order("id", { ascending: true });
  if (dbError) {
    console.error("DB select error:", dbError);
    alert("讀取失敗：" + dbError.message);
    return;
  }
  _employeesCache = employee || [];
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

////獎項按鈕
let _prizesCache = [];
async function loadPrizes() {
  // 1️⃣ 讀取所有獎項
  const { data: prizes, error: prizeError } = await supabaseClient
    .from("prize")
    .select("no, item_name, image_url, qty")
    .order("no", { ascending: true });

  if (prizeError) {
    console.error(prizeError);
    alert("讀取獎項失敗：" + prizeError.message);
    return;
  }

  // 2️⃣ 讀取中獎紀錄（只要 prize_no）
  const { data: winners, error: winnerError } = await supabaseClient
    .from("winner")
    .select("prize_no");

  if (winnerError) {
    console.error(winnerError);
    alert("讀取中獎資料失敗：" + winnerError.message);
    return;
  }

  // 3️⃣ 統計每個獎項已抽數
  const drawnMap = new Map();
  for (const w of winners || []) {
    drawnMap.set(w.prize_no, (drawnMap.get(w.prize_no) || 0) + 1);
  }

  // 4️⃣ 合併資料
  _prizesCache = (prizes || []).map((p) => {
    const drawn = drawnMap.get(p.no) || 0;
    return {
      ...p,
      drawn,
      remain: Math.max(0, (p.qty || 0) - drawn),
    };
  });

  renderPrizeButtons(_prizesCache);
}

function renderPrizeButtons(prizes = []) {
  const host = document.getElementById("prize_buttons");
  if (!host) return;
  host.innerHTML = "";

  for (const p of prizes) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = `${p.no}獎`;
    btn.title = p.item_name || "";

    // ⭐ 如果抽完
    if (p.remain <= 0) {
      btn.disabled = true;
      btn.classList.add("btn-disabled");
    } else {
      btn.addEventListener("click", () => {
        host
          .querySelectorAll("button")
          .forEach((b) => b.classList.remove("btn-active"));

        btn.classList.add("btn-active");
        openPrizeModal(p);
      });
    }

    host.appendChild(btn);
  }
}

//獎項資訊 modal
function openPrizeModal(prize) {
  const no = prize?.no ?? "";
  const name = prize?.item_name ?? "";
  const img = prize?.image_url
    ? `<img src="${escapeHtml(prize.image_url)}" alt="${escapeHtml(name || "prize")}" loading="lazy">`
    : `<div style="opacity:.7;">（無圖片）</div>`;

  document.getElementById("prize_body").innerHTML = `
      <div class="prize-title">
        ${escapeHtml(no)}獎 - ${escapeHtml(name)}
      </div>
      <div class="prize-image">
        ${img}
      </div>
    `;

  document.getElementById("prize_backdrop").classList.add("show");
}
function closePrizeModal() {
  document.getElementById("prize_backdrop").classList.remove("show");
  document.getElementById("prize_body").innerHTML = "";

  const host = document.getElementById("prize_buttons");
  if (host) {
    host
      .querySelectorAll("button")
      .forEach((b) => b.classList.remove("btn-active"));
  }
}
document
  .getElementById("prize_close")
  .addEventListener("click", closePrizeModal);
document.getElementById("prize_ok").addEventListener("click", closePrizeModal);
document.getElementById("prize_backdrop").addEventListener("click", (e) => {
  if (e.target.id === "prize_backdrop") closePrizeModal();
});

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

  _winnersCache = data || [];
  renderWinners(_winnersCache);
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

    const winnerName = [
      w.employee?.dep_name ?? "",
      w.employee?.emp_id ?? "",
      w.employee?.emp_name ?? "",
    ]
      .filter(Boolean)
      .join("-");

    if (winnerName) groupMap.get(key).winners.push(winnerName);
  }

  //轉陣列（維持 Map 插入順序＝依 DB 回傳順序）
  const grouped = Array.from(groupMap.values());

  //表頭
  const head = document.createElement("div");
  head.className = "list-head";
  head.style.gridTemplateColumns = "80px 2fr 100px 70px 70px 70px 6fr";
  head.innerHTML = `
    <div class="cell">no</div>
    <div class="cell">品項</div>
    <div class="cell">圖片</div>
    <div class="cell">名額</div>
    <div class="cell">已抽額</div>
    <div class="cell">餘額</div>
    <div class="cell">得獎人姓名</div>
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
    row.style.gridTemplateColumns = "80px 2fr 100px 70px 70px 70px 6fr";
    row.innerHTML = `
      <div class="cell">${g.prize?.no ?? g.prize_no ?? ""}獎</div>
      <div class="cell">${escapeHtml(g.prize?.item_name ?? "")}</div>
      <div class="cell">${imgHtml}</div>
      <div class="cell">${qty}</div>
      <div class="cell">${drawn}</div>
      <div class="cell">${remain}</div>
      <div class="cell">${winnerNamesText}</div>
    `;
    wrap.appendChild(row);
  }
}
