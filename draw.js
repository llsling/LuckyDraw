const SUPABASE_URL = "https://drwrotcwebyvxxgcudka.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyd3JvdGN3ZWJ5dnh4Z2N1ZGthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NzA5MDgsImV4cCI6MjA4NTI0NjkwOH0.dm22NtQLSBMEMe9ZesWKPXkGhwjt4clWeAyH1wWPUWI";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
);
console.log("Supabase initialized", supabaseClient);

let _winnersCache = [];
////驗證
(function requirePin() {
  if (sessionStorage.getItem("draw_auth")) return;
  const pin = prompt("請輸入抽獎PIN");
  if (pin !== "2026HORSE") {
    alert("無權限");
    location.href = "index.html";
    return;
  }
  sessionStorage.setItem("draw_auth", "1");
})();

//防 XSS
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function setScanStatus(ok) {
  const el = document.getElementById("scan_status");
  if (!el) return;

  el.textContent = ok ? "✅ 寫入成功" : "❌ 寫入失敗";
  // 2 秒後清空（可選）
  // setTimeout(() => {
  //   if (el.textContent === (ok ? "✅ 寫入成功" : "❌ 寫入失敗"))
  //     el.textContent = "";
  // }, 2000);
}
function cleanEmpQueryString() {
  const cleanUrl = location.origin + location.pathname;
  history.replaceState({}, "", cleanUrl);
}

// function openEmpModal(html) {
//   document.getElementById("emp_detail").innerHTML = html;
//   document.getElementById("emp_backdrop").classList.add("show");
// }
// function closeEmpModal() {
//   document.getElementById("emp_backdrop").classList.remove("show");
//   document.getElementById("emp_detail").innerHTML = "";
// }
// document.getElementById("emp_close").addEventListener("click", closeEmpModal);
// document.getElementById("emp_ok").addEventListener("click", closeEmpModal);
// document.getElementById("emp_backdrop").addEventListener("click", (e) => {
//   if (e.target.id === "emp_backdrop") closeEmpModal();
// });

//頁面載入中獎清單
document.addEventListener("DOMContentLoaded", async () => {
  // const empParam = new URL(location.href).searchParams.get("emp");

  // // ✅ 先處理掃碼寫入（不被 loadPrizes/loadWinners 卡住）
  // if (empParam) {
  //   handleScan(empParam).catch((e) => {
  //     console.error("handleScan fatal:", e);
  //     setScanStatus(false);
  //     cleanEmpQueryString();
  //   });
  // }

  // ✅ UI 後載入（即使失敗也不影響寫入流程）
  loadPrizes().catch((e) => console.error("loadPrizes fatal:", e));
  loadWinners().catch((e) => console.error("loadWinners fatal:", e));
});

////獎項按鈕
let _prizesCache = [];
let _selectedPrize = null; // 只用來顯示 modal，不用於掃描寫入
let _scanInFlight = false; // 防止同一次載入重複寫入
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
      btn.addEventListener("click", async () => {
        // 1) UI：標示選中
        host
          .querySelectorAll("button")
          .forEach((b) => b.classList.remove("btn-active"));
        btn.classList.add("btn-active");

        // 2) 記住本機選擇（用來顯示用，不是安全用）
        _selectedPrize = p;

        // 3) ✅ 立刻寫入 DB：設定目前獎項
        const { error } = await supabaseClient.rpc("set_active_prize", {
          p_prize_no: p.no,
        });

        if (error) {
          console.error(error);
          alert("設定目前獎項失敗：" + error.message);

          // 回滾 UI/狀態（避免主持人以為已設定成功）
          btn.classList.remove("btn-active");
          _selectedPrize = null;
          return;
        }

        // 4) (可選) 繼續顯示獎品資訊
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
async function closePrizeModal() {
  // 1) 先關畫面
  document.getElementById("prize_backdrop").classList.remove("show");
  document.getElementById("prize_body").innerHTML = "";

  // 2) 清空 DB active prize
  const { error } = await supabaseClient.rpc("set_active_prize", {
    p_prize_no: null,
  });

  if (error) {
    console.error("清空目前獎項失敗：", error);
  }

  // 3) 清掉 UI
  const host = document.getElementById("prize_buttons");
  if (host) {
    host
      .querySelectorAll("button")
      .forEach((b) => b.classList.remove("btn-active"));
  }

  _selectedPrize = null;
}
document
  .getElementById("prize_close")
  .addEventListener("click", closePrizeModal);
document.getElementById("prize_ok").addEventListener("click", closePrizeModal);
document.getElementById("prize_backdrop").addEventListener("click", (e) => {
  if (e.target.id === "prize_backdrop") closePrizeModal();
});

/* =========================
   2) 抽獎：掃到 emp 後呼叫 RPC
   - 規則：一人只能中一次（由 DB unique + draw_winner_once 保證）
========================= */
// async function handleScan(empParam) {
//   // 防止某些掃碼 App 重複開頁造成重送
//   if (_scanInFlight) return;
//   _scanInFlight = true;

//   const empNo = parseInt(empParam, 10);
//   if (!Number.isInteger(empNo)) {
//     setScanStatus(false);
//     cleanEmpQueryString();
//     _scanInFlight = false;
//     return;
//   }

//   const { data: result, error: rpcErr } = await supabaseClient.rpc(
//     "draw_winner_active",
//     {
//       p_employee_no: empNo,
//     },
//   );

//   if (rpcErr) {
//     console.error(rpcErr);
//     setScanStatus(false);
//     alert("寫入失敗(RPC): " + (rpcErr.message || ""));
//     cleanEmpQueryString();
//     _scanInFlight = false;
//     return;
//   }

//   const r = Array.isArray(result) ? result[0] : null;

//   if (!r || !r.ok) {
//     setScanStatus(false);
//     await refreshUIAfterDraw();
//     cleanEmpQueryString();
//     _scanInFlight = false;
//     return;
//   }

//   setScanStatus(true);
//   await refreshUIAfterDraw();
//   cleanEmpQueryString();
//   _scanInFlight = false;
// }

// async function refreshUIAfterDraw() {
//   // 抽完後刷新：按鈕剩餘名額 & 中獎清單
//   await Promise.all([loadPrizes(), loadWinners()]);
// }

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
