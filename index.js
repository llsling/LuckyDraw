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
  await loadPrizes(); // 產生獎項按鈕
  await loadWinners(); // 撈中獎清單（並 render）
  //QR(URL帶 ?emp=28)
  // const empId = new URL(location.href).searchParams.get("emp");
  // if (empId !== null && empId !== "") {
  //   openEmployeeById(empId);
  // }
});
document.getElementById("prize").addEventListener("click", () => {
  loadWinners();
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

////抽獎!🎲按鈕
// document.getElementById("draw_btn").addEventListener("click", doLuckyDraw);
// //再抽一次
// document.getElementById("draw_again").addEventListener("click", doLuckyDraw);
// let _winnerIds = new Set(); // 記錄已中獎人員
// //抽獎
// async function doLuckyDraw() {
//   //確定有資料
//   if (!_employeesCache || _employeesCache.length === 0) {
//     await loadEmployees();
//   }
//   //排除已中獎
//   let candidates = (_employeesCache || []).filter(
//     (e) => e?.id != null && !_winnerIds.has(e.id),
//   );
//   //抽完一輪重置
//   if (candidates.length === 0) {
//     _winnerIds.clear();
//     candidates = (_employeesCache || []).filter((e) => e?.id != null);
//   }
//   //沒人
//   if (candidates.length === 0) {
//     openDrawModal(`<b>目前沒有可抽的員工</b>`);
//     return;
//   }
//   //顯示「抽獎中…」🎲
//   openDrawModal(
//     `<div style="font-size:18px;"><b>抽獎中…</b> 🎲</div><div style="opacity:.7;">請稍候</div>`,
//   );
//   //延遲效果
//   await new Promise((r) => setTimeout(r, 900));
//   //抽獎
//   const pick = candidates[Math.floor(Math.random() * candidates.length)];
//   _winnerIds.add(pick.no);
//   //顯示結果
//   openDrawModal(`
//     <div style="font-size:20px;"><b>🎉 恭喜中獎！</b></div>
//     <div><b>序號：</b>${pick.no}</div>
//     <div><b>姓名：</b>${escapeHtml(pick.emp_name ?? "")}</div>
//     <div><b>手機：</b>${escapeHtml(pick.emp_phone ?? "")}</div>
//     <div id="draw_qr" style="margin-top:12px; display:flex; justify-content:center;"></div>
//     <div style="margin-top:10px; opacity:.7; font-size:13px;">
//       剩餘可抽人數：${candidates.length - 1}
//     </div>
//   `);
//   //再產生 QR
//   const base = new URL(location.href);
//   base.search = "";
//   base.hash = "";
//   if (base.pathname.endsWith("/")) base.pathname += "index.html";
//   base.searchParams.set("emp", pick.no);

//   const qrUrl = base.toString();

//   // 清空容器避免重複產生疊在一起
//   const qrEl = document.getElementById("draw_qr");
//   qrEl.innerHTML = "";
//   new QRCode(qrEl, {
//     text: qrUrl,
//     width: 128,
//     height: 128,
//     correctLevel: QRCode.CorrectLevel.L,
//   });
// }
// //抽獎modal開
// function openDrawModal(html) {
//   document.getElementById("draw_body").innerHTML = html;
//   document.getElementById("draw_backdrop").classList.add("show");
// }
// //抽獎modal關
// function closeDrawModal() {
//   document.getElementById("draw_backdrop").classList.remove("show");
//   document.getElementById("draw_body").innerHTML = "";
// }
// // 關閉事件
// document.getElementById("draw_close").addEventListener("click", closeDrawModal);
// document.getElementById("draw_ok").addEventListener("click", closeDrawModal);
// document.getElementById("draw_backdrop").addEventListener("click", (e) => {
//   if (e.target.id === "draw_backdrop") closeDrawModal();
// });

////員工資料modal(掃QRCode後顯示的中獎人員)
async function openEmployeeById(empId) {
  const id = parseInt(empId, 10);
  if (!Number.isInteger(id)) return;
  const { data, error } = await supabaseClient
    .from("employee")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) {
    console.error("DB select error:", error);
    alert("員工資料讀取失敗");
    return;
  }
  openEmpModal(`
    <div>🎉 恭喜中獎！ <b>序號：</b>${data.id}</div>
    <div><b>姓名：</b>${escapeHtml(data.emp_name ?? "")}</div>
    <div><b>手機：</b>${escapeHtml(data.emp_phone ?? "")}</div>
  `);
}
//員工資料modal開
function openEmpModal(html) {
  document.getElementById("emp_detail").innerHTML = html;
  document.getElementById("emp_backdrop").classList.add("show");
}
//員工資料modal關
function closeEmpModal() {
  document.getElementById("emp_backdrop").classList.remove("show");
  document.getElementById("emp_detail").innerHTML = "";
  const cleanUrl = location.origin + location.pathname;
  history.replaceState({}, "", cleanUrl);
}
// 關閉事件
document.getElementById("emp_close").addEventListener("click", closeEmpModal);
document.getElementById("emp_ok").addEventListener("click", closeEmpModal);
document.getElementById("emp_backdrop").addEventListener("click", (e) => {
  if (e.target.id === "emp_backdrop") closeEmpModal();
});

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
