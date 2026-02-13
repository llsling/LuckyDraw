const SUPABASE_URL = "https://drwrotcwebyvxxgcudka.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyd3JvdGN3ZWJ5dnh4Z2N1ZGthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NzA5MDgsImV4cCI6MjA4NTI0NjkwOH0.dm22NtQLSBMEMe9ZesWKPXkGhwjt4clWeAyH1wWPUWI";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
);
console.log("Supabase initialized", supabaseClient);

//頁面載入員工名單
document.addEventListener("DOMContentLoaded", () => {
  loadPrizes();
  //QR(URL帶 ?emp=28)
  // const empId = new URL(location.href).searchParams.get("emp");
  // if (empId !== null && empId !== "") {
  //   openEmployeeById(empId);
  // }
});
document.getElementById("prize").addEventListener("click", () => {
  loadPrizes();
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
    alert("讀取員工失敗：" + dbError.message);
    return;
  }
  _employeesCache = employee || [];
  // renderEmployees(_employeesCache);
}
//渲染
// function renderEmployees(data) {
//   const employee_list = document.getElementById("employee_list");
//   employee_list.innerHTML = ""; // 清空舊的
//   if (!data || data.length === 0) {
//     employee_list.innerHTML = `<span>目前沒有員工資料</span><br />`;
//     return;
//   } else {
//     employee_list.innerHTML = `<span>已有${data.length}名員工資料</span>`;
//   }
//   //每筆員工資料
//   data.forEach((emp) => {
//     const card = document.createElement("div");
//     card.className = "emp-card";
//     //QRcode id
//     const qrId = `qr_${emp.id}`;
//     card.innerHTML = `
//       <div class="row">
//         <span><b>序號:</b> ${emp.id ?? ""}</span>
//         <span><b>姓名:</b> ${escapeHtml(emp.emp_name ?? "")}</span>
//         <span><b>電話:</b> ${escapeHtml(emp.emp_phone ?? "")}</span>
//       </div>
//       <div class="qrcode" id="${qrId}"></div>
//     `;
//     employee_list.appendChild(card);
//     try {
//       const base = new URL(location.href);
//       base.search = ""; // 清掉 query
//       base.hash = ""; // 清掉 hash
//       if (base.pathname.endsWith("/")) {
//         base.pathname += "index.html";
//       }
//       base.searchParams.set("emp", emp.id);
//       const qrUrl = base.toString();
//       new QRCode(document.getElementById(qrId), {
//         text: qrUrl,
//         width: 96,
//         height: 96,
//         correctLevel: QRCode.CorrectLevel.L,
//       });
//     } catch (e) {
//       console.error("QRCode error for emp:", emp, e);
//     }
//   });
// }

////抽獎!🎲按鈕
document.getElementById("draw_btn").addEventListener("click", doLuckyDraw);
//再抽一次
document.getElementById("draw_again").addEventListener("click", doLuckyDraw);
let _winnerIds = new Set(); // 記錄已中獎人員
//抽獎
async function doLuckyDraw() {
  //確定有資料
  if (!_employeesCache || _employeesCache.length === 0) {
    await loadEmployees();
  }
  //排除已中獎
  let candidates = (_employeesCache || []).filter(
    (e) => e?.id != null && !_winnerIds.has(e.id),
  );
  //抽完一輪重置
  if (candidates.length === 0) {
    _winnerIds.clear();
    candidates = (_employeesCache || []).filter((e) => e?.id != null);
  }
  //沒人
  if (candidates.length === 0) {
    openDrawModal(`<b>目前沒有可抽的員工</b>`);
    return;
  }
  //顯示「抽獎中…」🎲
  openDrawModal(
    `<div style="font-size:18px;"><b>抽獎中…</b> 🎲</div><div style="opacity:.7;">請稍候</div>`,
  );
  //延遲效果
  await new Promise((r) => setTimeout(r, 900));
  //抽獎
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  _winnerIds.add(pick.id);
  //顯示結果
  openDrawModal(`
    <div style="font-size:20px;"><b>🎉 恭喜中獎！</b></div>
    <div><b>序號：</b>${pick.id}</div>
    <div><b>姓名：</b>${escapeHtml(pick.emp_name ?? "")}</div>
    <div><b>手機：</b>${escapeHtml(pick.emp_phone ?? "")}</div>
    <div id="draw_qr" style="margin-top:12px; display:flex; justify-content:center;"></div>
    <div style="margin-top:10px; opacity:.7; font-size:13px;">
      剩餘可抽人數：${candidates.length - 1}
    </div>
  `);
  //再產生 QR
  const base = new URL(location.href);
  base.search = "";
  base.hash = "";
  if (base.pathname.endsWith("/")) base.pathname += "index.html";
  base.searchParams.set("emp", pick.id);

  const qrUrl = base.toString();

  // 清空容器避免重複產生疊在一起
  const qrEl = document.getElementById("draw_qr");
  qrEl.innerHTML = "";
  new QRCode(qrEl, {
    text: qrUrl,
    width: 128,
    height: 128,
    correctLevel: QRCode.CorrectLevel.L,
  });
}
//抽獎modal開
function openDrawModal(html) {
  document.getElementById("draw_body").innerHTML = html;
  document.getElementById("draw_backdrop").classList.add("show");
}
//抽獎modal關
function closeDrawModal() {
  document.getElementById("draw_backdrop").classList.remove("show");
  document.getElementById("draw_body").innerHTML = "";
}
// 關閉事件
document.getElementById("draw_close").addEventListener("click", closeDrawModal);
document.getElementById("draw_ok").addEventListener("click", closeDrawModal);
document.getElementById("draw_backdrop").addEventListener("click", (e) => {
  if (e.target.id === "draw_backdrop") closeDrawModal();
});

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
document.getElementById("btn_admin").addEventListener("click", () => {
  location.href = "./admin.html";
});

////獎項清單
let _prizesCache = [];
async function loadPrizes() {
  const { data, error } = await supabaseClient
    .from("prize")
    .select("*")
    .order("draw_order", { ascending: true });

  if (error) {
    console.error(error);
    alert("讀取獎項失敗：" + error.message);
    return;
  }

  _prizesCache = data || [];
  renderPrizes(_prizesCache);
}
function renderPrizes(data) {
  const el = document.getElementById("employee_list");
  if (!el) return;

  el.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.className = "list-wrap";

  const title = document.createElement("div");
  title.className = "list-title";
  title.textContent = `獎項清單（${data?.length ?? 0}）`;
  wrap.appendChild(title);

  if (!data || data.length === 0) {
    const empty = document.createElement("div");
    empty.textContent = "目前沒有獎項資料";
    wrap.appendChild(empty);
    el.appendChild(wrap);
    return;
  }

  const head = document.createElement("div");
  head.className = "list-head";
  head.style.gridTemplateColumns = "90px 1.6fr 90px 120px";
  head.innerHTML = `
    <div class="cell">順序</div>
    <div class="cell">獎項</div>
    <div class="cell">名額</div>
    <div class="cell">抽獎!🎲</div>
  `;
  wrap.appendChild(head);

  data.forEach((p) => {
    const row = document.createElement("div");
    row.className = "list-row";
    row.style.gridTemplateColumns = "90px 1.6fr 90px 120px";
    row.innerHTML = `
      <div class="cell">${p.draw_order ?? ""}</div>
      <div class="cell">${escapeHtml(p.prize_name ?? "")}</div>
      <div class="cell">${p.quantity ?? ""}</div>
      <div class="cell">順序</div>
    `;
    wrap.appendChild(row);
  });

  el.appendChild(wrap);
}
