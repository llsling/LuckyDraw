const SUPABASE_URL = "https://drwrotcwebyvxxgcudka.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyd3JvdGN3ZWJ5dnh4Z2N1ZGthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NzA5MDgsImV4cCI6MjA4NTI0NjkwOH0.dm22NtQLSBMEMe9ZesWKPXkGhwjt4clWeAyH1wWPUWI";

window._supabaseClient =
  window._supabaseClient ||
  window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log("Supabase initialized", window._supabaseClient);

//頁面載入員工名單
document.addEventListener("DOMContentLoaded", () => {
  loadEmployees();

  //QR(URL帶 ?emp=28)
  const empId = new URLSearchParams(location.search).get("emp");
  if (empId) openEmployeeById(empId);
});

(async () => {
  const { data, error } = await window._supabaseClient
    .from("employee")
    .select("*")
    .limit(1);
  console.log("test select:", data, error);
})();
//新增員工按鈕
//確定後塞入資料庫
document
  .getElementById("add_employee_ok")
  .addEventListener("click", async function () {
    const emp_name = document.getElementById("emp_name").value.trim();
    const emp_phone = document.getElementById("emp_phone").value.trim();
    //檢查是否為空
    if (emp_name == "" || emp_phone == "") {
      alert("請輸入姓名與手機號碼");
      return;
    }
    //檢查手機格式
    const phoneRegex = /^09\d{8}$/;
    if (!phoneRegex.test(emp_phone)) {
      alert("手機號碼格式錯誤");
      return;
    }
    //輸入資料
    const { data, error } = await window._supabaseClient
      .from("employee")
      .insert([{ emp_name: emp_name, emp_phone: emp_phone }])
      .select()
      .single();
    //錯誤
    if (error) {
      console.error("Supabase insert error:", error);
      alert("新增失敗：" + error.message);
      return;
    }
    console.log("新增成功:", data);
    //清空+關閉
    document.getElementById("emp_name").value = "";
    document.getElementById("emp_phone").value = "";
    alert("新增成功！");
    loadEmployees();
  });
//清除輸入資料
document
  .getElementById("reset_add_employee_div")
  .addEventListener("click", function () {
    document.getElementById("emp_name").value = "";
    document.getElementById("emp_phone").value = "";
  });

function openAddEmployeeModal() {
  document.getElementById("modal_backdrop").classList.add("show");
  document.getElementById("emp_name").focus();
}
function closeAddEmployeeModal() {
  document.getElementById("modal_backdrop").classList.remove("show");
  document.getElementById("emp_name").value = "";
  document.getElementById("emp_phone").value = "";
}
// 開啟
document
  .getElementById("add_employee")
  .addEventListener("click", openAddEmployeeModal);
// 右上角 X 關閉
document
  .getElementById("remove_show")
  .addEventListener("click", closeAddEmployeeModal);
// 點遮罩關閉
document.getElementById("modal_backdrop").addEventListener("click", (e) => {
  if (e.target.id === "modal_backdrop") closeAddEmployeeModal();
});
// Esc 關閉
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeAddEmployeeModal();
});

function openEmpModal(html) {
  document.getElementById("emp_detail").innerHTML = html;
  document.getElementById("emp_backdrop").classList.add("show");
}
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
async function openEmployeeById(empId) {
  const id = parseInt(empId, 10);
  if (!Number.isInteger(id)) return;
  const { data, error } = await window._supabaseClient
    .from("employee")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) {
    console.error("openEmployeeById error:", error);
    alert("員工資料讀取失敗");
    return;
  }
  openEmpModal(`
    <div>恭喜!<b>序號：</b>${data.id}</div>
    <div><b>姓名：</b>${escapeHtml(data.emp_name ?? "")}</div>
    <div><b>手機：</b>${escapeHtml(data.emp_phone ?? "")}</div>
  `);
}

//清除目前所有資料
document
  .getElementById("clear_all_employee")
  .addEventListener("click", async function () {
    const ok = confirm("確定要清除所有員工資料嗎？此操作無法復原。");
    if (!ok) return;
    const { error } = await window._supabaseClient
      .from("employee")
      .delete()
      .gt("id", 0);
    if (error) {
      console.error("Supabase delete error:", error);
      alert("清除失敗：" + error.message);
      return;
    }
    alert("已清除所有員工資料！");
    loadEmployees();
  });

//塞入預設5筆員工資料
document
  .getElementById("insert_employee")
  .addEventListener("click", async () => {
    const ok = confirm("要塞入 5 筆預設員工資料嗎？");
    if (!ok) return;
    const defaultEmployees = [
      { emp_name: "王小明", emp_phone: "0912345678" },
      { emp_name: "李小華", emp_phone: "0922333444" },
      { emp_name: "陳大同", emp_phone: "0933555666" },
      { emp_name: "林美麗", emp_phone: "0944777888" },
      { emp_name: "張志強", emp_phone: "0955999000" },
    ];
    const { data, error } = await window._supabaseClient
      .from("employee")
      .insert(defaultEmployees)
      .select();
    if (error) {
      console.error("Supabase insert error:", error);
      alert("塞入失敗：" + error.message);
      return;
    }
    alert("已成功塞入 5 筆員工資料！");
    loadEmployees(); // 重新載入名單
  });

let _employeesCache = [];
let _winnerIds = new Set(); // 記錄已中獎人員
//讀取+渲染
async function loadEmployees() {
  const { data, error } = await window._supabaseClient
    .from("employee")
    .select("*")
    .order("id", { ascending: true });
  if (error) {
    console.error("Supabase select error:", error);
    alert("讀取員工失敗：" + error.message);
    return;
  }
  _employeesCache = data || [];
  renderEmployees(_employeesCache);
}

// 抽獎modal開
function openDrawModal(html) {
  document.getElementById("draw_body").innerHTML = html;
  document.getElementById("draw_backdrop").classList.add("show");
}
// 抽獎modal關
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
// 抽獎按鈕
document.getElementById("draw_btn").addEventListener("click", doLuckyDraw);
// 再抽一次
document.getElementById("draw_again").addEventListener("click", doLuckyDraw);
// 抽獎
async function doLuckyDraw() {
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

//渲染
function renderEmployees(data) {
  const employee_list = document.getElementById("employee_list");
  employee_list.innerHTML = ""; // 清空舊的
  if (!data || data.length === 0) {
    employee_list.innerHTML = `<span>目前沒有員工資料</span><br /><span>請新增員工資料</span>`;
    return;
  } else {
    employee_list.innerHTML = `<span>已有${data.length}名員工資料</span>`;
  }
  data.forEach((emp) => {
    //每筆員工資料
    const card = document.createElement("div");
    card.className = "emp-card";
    //QRcode id
    const qrId = `qr_${emp.id}`;
    card.innerHTML = `
      <div class="row">
        <span><b>序號:</b> ${emp.id ?? ""}</span>
        <span><b>姓名:</b> ${escapeHtml(emp.emp_name ?? "")}</span>
        <span><b>電話:</b> ${escapeHtml(emp.emp_phone ?? "")}</span>
      </div>
      <div class="qrcode" id="${qrId}"></div>
    `;
    employee_list.appendChild(card);
    try {
      const base = new URL(location.href);
      base.search = ""; // 清掉 query
      base.hash = ""; // 清掉 hash
      if (base.pathname.endsWith("/")) {
        base.pathname += "index.html";
      }
      base.searchParams.set("emp", emp.id);
      const qrUrl = base.toString();
      new QRCode(document.getElementById(qrId), {
        text: qrUrl,
        width: 96,
        height: 96,
        correctLevel: QRCode.CorrectLevel.L,
      });
    } catch (e) {
      console.error("QRCode error for emp:", emp, e);
    }
  });
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
