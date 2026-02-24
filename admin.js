const SUPABASE_URL = "https://drwrotcwebyvxxgcudka.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyd3JvdGN3ZWJ5dnh4Z2N1ZGthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NzA5MDgsImV4cCI6MjA4NTI0NjkwOH0.dm22NtQLSBMEMe9ZesWKPXkGhwjt4clWeAyH1wWPUWI";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
);
console.log("Supabase initialized", supabaseClient);

let _currentView = "winner"; // 預設顯示中獎者
let _employeesCache = [];
let _prizesCache = [];
let _winnersCache = [];
document.addEventListener("DOMContentLoaded", () => {
  //顯示員工
  document.getElementById("show_employee").addEventListener("click", () => {
    switchView("employee");
  });
  //獎項清單
  document.getElementById("prize").addEventListener("click", () => {
    switchView("prize");
  });
  //恭喜中獎者
  document
    .getElementById("prize_get_employee")
    .addEventListener("click", () => {
      switchView("winner");
    });
  // 預設顯示中獎者
  switchView("winner");
  //QR(URL帶 ?emp=28)
  // const empId = new URL(location.href).searchParams.get("emp");
  // if (empId !== null && empId !== "") {
  //   openEmployeeById(empId);
  // }
});
async function switchView(view) {
  _currentView = view;
  setActiveButton(view);
  const container = document.getElementById("employee_list");
  container.innerHTML = "";
  if (view === "employee") {
    await loadEmployees();
  } else if (view === "prize") {
    await loadPrizes();
  } else if (view === "winner") {
    await loadWinners();
  }
}
function setActiveButton(view) {
  const btnEmp = document.getElementById("show_employee");
  const btnPrize = document.getElementById("prize");
  const btnWinner = document.getElementById("prize_get_employee");

  btnEmp.classList.toggle("btn-active", view === "employee");
  btnPrize.classList.toggle("btn-active", view === "prize");
  btnWinner.classList.toggle("btn-active", view === "winner");
}

//讀取
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
  console.log("employee:" + employee); //
  renderEmployees(_employeesCache);
}
//渲染
function renderEmployees(data) {
  const el = document.getElementById("employee_list");
  el.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.className = "list-wrap";

  const title = document.createElement("div");
  title.className = "list-title";
  title.textContent = `員工清單（${data?.length ?? 0}）`;
  wrap.appendChild(title);

  if (!data || data.length === 0) {
    const empty = document.createElement("div");
    empty.textContent = "目前沒有員工資料";
    wrap.appendChild(empty);
    el.appendChild(wrap);
    return;
  }

  const head = document.createElement("div");
  head.className = "list-head";
  head.style.gridTemplateColumns = "80px 2fr 3fr 6fr";
  head.innerHTML = `
    <div class="cell">序號</div>
    <div class="cell">姓名</div>
    <div class="cell">部門名稱</div>
    <div class="cell">QRCode</div>
  `;
  wrap.appendChild(head);
  el.appendChild(wrap);

  data.forEach((emp) => {
    const qrId = `qr_${emp.no}`; //QRcode id
    const row = document.createElement("div");
    row.className = "list-row";
    row.style.gridTemplateColumns = "80px 2fr 3fr 6fr";
    row.innerHTML = `
      <div class="cell">${emp.no ?? ""}</div>
      <div class="cell">${escapeHtml(emp.emp_name ?? "")}</div>
      <div class="cell">${escapeHtml(emp.dep_name ?? "")}</div>
    <div class="qrcode" id="${qrId}"></div>
    `;
    // <div class="cell-actions">
    //   <button class="btn-del" data-action="delete" data-id="${emp.id}">刪除</button>
    // </div>
    wrap.appendChild(row);

    try {
      const base = new URL(location.href);
      base.search = "";
      base.hash = "";

      // ✅ 不管你現在在哪個頁面，都強制導到 index.html
      const dir = base.pathname.substring(
        0,
        base.pathname.lastIndexOf("/") + 1,
      );
      base.pathname = dir + "index.html";

      // ✅ emp 放券號（employee.no）
      base.searchParams.set("emp", emp.no);

      const qrEl = document.getElementById(qrId);
      if (!qrEl) throw new Error("qrEl not found: " + qrId);

      new QRCode(qrEl, { text: base.toString(), width: 96, height: 96 });
    } catch (e) {
      console.error("QRCode error for emp:", emp, e);
    }
  });
}
// document
//   .getElementById("employee_list")
//   .addEventListener("click", async (e) => {
//     if (_currentView !== "employee") return; // 只在員工頁啟用
//     const btn = e.target.closest('button[data-action="delete"]');
//     if (!btn) return;

//     const id = Number(btn.dataset.id);
//     if (!Number.isInteger(id)) return;

//     // 避免連點
//     btn.disabled = true;

//     const emp = (_employeesCache || []).find((x) => x.id === id);
//     const name = emp?.emp_name ? `「${emp.emp_name}」` : `ID=${id}`;

//     const ok = confirm(`確定要刪除員工 ${name} 嗎？`);
//     if (!ok) {
//       btn.disabled = false;
//       return;
//     }

//     const success = await deleteEmployeeById(id);
//     if (!success) {
//       btn.disabled = false;
//       return;
//     }

//     //更新 cache
//     _employeesCache = (_employeesCache || []).filter((x) => x.id !== id);
//     //只移除那張卡片
//     const card = btn.closest(".emp-card");
//     if (card) card.remove();
//     //更新上方計數
//     updateEmployeeCountText();
//   });
// function updateEmployeeCountText() {
//   const employee_list = document.getElementById("employee_list");
//   const count = (_employeesCache || []).length;

//   renderEmployees(_employeesCache);
// }
// async function deleteEmployeeById(id) {
//   const { error } = await supabaseClient.from("employee").delete().eq("id", id);
//   if (error) {
//     console.error("DB delete error:", error);
//     alert("刪除失敗：" + error.message);
//     return false;
//   }
//   return true;
// }

////新增員工按鈕
//開啟
// document
//   .getElementById("add_employee")
//   .addEventListener("click", openAddEmployeeModal);
// //1.右上角 X 關閉
// document
//   .getElementById("remove_show")
//   .addEventListener("click", closeAddEmployeeModal);
// //2.點遮罩關閉
// document.getElementById("modal_backdrop").addEventListener("click", (e) => {
//   if (e.target.id === "modal_backdrop") closeAddEmployeeModal();
// });
// //3.Esc關閉
// document.addEventListener("keydown", (e) => {
//   if (e.key === "Escape") closeAddEmployeeModal();
// });
// //新增員工modal打開
// function openAddEmployeeModal() {
//   document.getElementById("modal_backdrop").classList.add("show");
//   document.getElementById("emp_name").focus();
// }
// //新增員工modal關閉
// function closeAddEmployeeModal() {
//   document.getElementById("modal_backdrop").classList.remove("show");
//   document.getElementById("emp_name").value = "";
//   document.getElementById("emp_phone").value = "";
// }
// //確定後塞入資料庫
// document
//   .getElementById("add_employee_ok")
//   .addEventListener("click", async function () {
//     const no = document.getElementById("no").value.trim();
//     const emp_id = document.getElementById("emp_id").value.trim();
//     const emp_name = document.getElementById("emp_name").value.trim();
//     const dep_name = document.getElementById("dep_name").value.trim();
//     //檢查是否為空
//     if (no == "" || emp_id == "" || emp_name == "" || dep_name == "") {
//       alert("獎卷序號與員編與姓名與部門名稱不得為空");
//       return;
//     }
//     //檢查手機格式
//     // const phoneRegex = /^09\d{8}$/;
//     // if (!phoneRegex.test(emp_phone)) {
//     //   alert("手機號碼格式錯誤");
//     //   return;
//     // }
//     //輸入資料
//     const { data, error } = await supabaseClient
//       .from("employee")
//       .insert([
//         { no: no, emp_id: emp_id, emp_name: emp_name, dep_name: dep_name },
//       ])
//       .select()
//       .single();
//     //錯誤
//     if (error) {
//       console.error("DB insert error:", error);
//       alert("新增失敗：" + error.message);
//       return;
//     }
//     console.log("新增成功:", data);
//     //清空+關閉
//     document.getElementById("no").value = "";
//     document.getElementById("emp_id").value = "";
//     document.getElementById("emp_name").value = "";
//     document.getElementById("dep_name").value = "";
//     alert("新增成功！");
//     loadEmployees();
//   });
// //清除輸入資料
// document
//   .getElementById("reset_add_employee_div")
//   .addEventListener("click", function () {
//     document.getElementById("no").value = "";
//     document.getElementById("emp_id").value = "";
//     document.getElementById("emp_name").value = "";
//     document.getElementById("dep_name").value = "";
//   });

// 簡單防 XSS（避免名字含 <script> 之類）
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

////獎項清單
async function loadPrizes() {
  const { data, error } = await supabaseClient
    .from("prize")
    .select("*")
    .order("no", { ascending: true });

  if (error) {
    alert("讀取獎項失敗：" + error.message);
    return;
  }

  _prizesCache = data || [];
  renderPrizes(_prizesCache);
}

function renderPrizes(data) {
  const el = document.getElementById("employee_list");
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
  head.style.gridTemplateColumns = "80px 1.4fr 1.1fr 80px";
  head.innerHTML = `
    <div class="cell">no</div>
    <div class="cell">品項</div>
    <div class="cell"></div>
    <div class="cell">名額</div>
  `;
  wrap.appendChild(head);

  data.forEach((p) => {
    const row = document.createElement("div");
    row.className = "list-row";
    row.style.gridTemplateColumns = "80px 1.4fr 1.1fr 80px";
    row.innerHTML = `
      <div class="cell">${p.no ?? ""}獎</div>
      <div class="cell">${escapeHtml(p.item_name ?? "")}</div>
      <div class="cell">
        ${p.image_url ? `<img class="thumb" src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.item_name ?? "prize")}" loading="lazy">` : ""}
      </div>
      <div class="cell">${p.qty ?? ""}</div>
    `;
    wrap.appendChild(row);
  });

  el.appendChild(wrap);
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

////員工資料modal開
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
