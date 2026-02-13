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
  head.style.gridTemplateColumns = "90px 1.2fr 1.2fr 110px";
  head.innerHTML = `
    <div class="cell">序號</div>
    <div class="cell">姓名</div>
    <div class="cell">電話</div>
  `;
  wrap.appendChild(head);

  data.forEach((emp) => {
    const row = document.createElement("div");
    row.className = "list-row";
    row.style.gridTemplateColumns = "90px 1.2fr 1.2fr 110px";
    row.innerHTML = `
      <div class="cell">${emp.id ?? ""}</div>
      <div class="cell">${escapeHtml(emp.emp_name ?? "")}</div>
      <div class="cell">${escapeHtml(emp.emp_phone ?? "")}</div>
      <div class="cell-actions">
        <button class="btn-del" data-action="delete" data-id="${emp.id}">刪除</button>
      </div>
    `;
    wrap.appendChild(row);
  });

  el.appendChild(wrap);
}
document
  .getElementById("employee_list")
  .addEventListener("click", async (e) => {
    if (_currentView !== "employee") return; // 只在員工頁啟用
    const btn = e.target.closest('button[data-action="delete"]');
    if (!btn) return;

    const id = Number(btn.dataset.id);
    if (!Number.isInteger(id)) return;

    // 避免連點
    btn.disabled = true;

    const emp = (_employeesCache || []).find((x) => x.id === id);
    const name = emp?.emp_name ? `「${emp.emp_name}」` : `ID=${id}`;

    const ok = confirm(`確定要刪除員工 ${name} 嗎？`);
    if (!ok) {
      btn.disabled = false;
      return;
    }

    const success = await deleteEmployeeById(id);
    if (!success) {
      btn.disabled = false;
      return;
    }

    //更新 cache
    _employeesCache = (_employeesCache || []).filter((x) => x.id !== id);
    //只移除那張卡片
    const card = btn.closest(".emp-card");
    if (card) card.remove();
    //更新上方計數
    updateEmployeeCountText();
  });
function updateEmployeeCountText() {
  const employee_list = document.getElementById("employee_list");
  const count = (_employeesCache || []).length;

  renderEmployees(_employeesCache);
}
async function deleteEmployeeById(id) {
  const { error } = await supabaseClient.from("employee").delete().eq("id", id);
  if (error) {
    console.error("DB delete error:", error);
    alert("刪除失敗：" + error.message);
    return false;
  }
  return true;
}

////新增員工按鈕
//開啟
document
  .getElementById("add_employee")
  .addEventListener("click", openAddEmployeeModal);
//1.右上角 X 關閉
document
  .getElementById("remove_show")
  .addEventListener("click", closeAddEmployeeModal);
//2.點遮罩關閉
document.getElementById("modal_backdrop").addEventListener("click", (e) => {
  if (e.target.id === "modal_backdrop") closeAddEmployeeModal();
});
//3.Esc關閉
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeAddEmployeeModal();
});
//新增員工modal打開
function openAddEmployeeModal() {
  document.getElementById("modal_backdrop").classList.add("show");
  document.getElementById("emp_name").focus();
}
//新增員工modal關閉
function closeAddEmployeeModal() {
  document.getElementById("modal_backdrop").classList.remove("show");
  document.getElementById("emp_name").value = "";
  document.getElementById("emp_phone").value = "";
}
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
    const { data, error } = await supabaseClient
      .from("employee")
      .insert([{ emp_name: emp_name, emp_phone: emp_phone }])
      .select()
      .single();
    //錯誤
    if (error) {
      console.error("DB insert error:", error);
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

////清除目前所有資料
// document
//   .getElementById("clear_all_employee")
//   .addEventListener("click", async function () {
//     const ok = confirm("確定要清除所有員工資料嗎？此操作無法復原。");
//     if (!ok) return;
//     const { error } = await supabaseClient
//       .from("employee")
//       .delete()
//       .gt("id", 0);
//     if (error) {
//       console.error("DB delete error:", error);
//       alert("清除失敗：" + error.message);
//       return;
//     }
//     alert("已清除所有員工資料！");
//     loadEmployees();
//   });

////塞入預設5筆員工資料
// document
//   .getElementById("insert_employee")
//   .addEventListener("click", async () => {
//     const ok = confirm("要塞入 5 筆預設員工資料嗎？");
//     if (!ok) return;
//     const defaultEmployees = [
//       { emp_name: "王小明", emp_phone: "0912345678" },
//       { emp_name: "李小華", emp_phone: "0922333444" },
//       { emp_name: "陳大同", emp_phone: "0933555666" },
//       { emp_name: "林美麗", emp_phone: "0944777888" },
//       { emp_name: "張志強", emp_phone: "0955999000" },
//     ];
//     const { data, error } = await supabaseClient
//       .from("employee")
//       .insert(defaultEmployees)
//       .select();
//     if (error) {
//       console.error("DB insert error:", error);
//       alert("塞入失敗：" + error.message);
//       return;
//     }
//     alert("已成功塞入 5 筆員工資料！");
//     loadEmployees();
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
    .order("draw_order", { ascending: true });

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
  head.style.gridTemplateColumns = "90px 1.6fr 90px 90px";
  head.innerHTML = `
    <div class="cell">順序</div>
    <div class="cell">獎項</div>
    <div class="cell">名額</div>
  `;
  wrap.appendChild(head);

  data.forEach((p) => {
    const row = document.createElement("div");
    row.className = "list-row";
    row.style.gridTemplateColumns = "90px 1.6fr 90px 90px";
    row.innerHTML = `
      <div class="cell">${p.draw_order ?? ""}</div>
      <div class="cell">${escapeHtml(p.prize_name ?? "")}</div>
      <div class="cell">${p.quantity ?? ""}</div>
    `;
    wrap.appendChild(row);
  });

  el.appendChild(wrap);
}

async function loadWinners() {
  const { data, error } = await supabaseClient
    .from("winner")
    .select(
      `
      id,
      drawn_at,
      employee:employee_id ( id, emp_name ),
      prize:prize_id ( id, prize_name )
    `,
    )
    .order("drawn_at", { ascending: false });

  if (error) {
    console.error(error);
    alert("讀取中獎者失敗：" + error.message);
    return;
  }

  _winnersCache = data || [];
  renderWinners(_winnersCache);
}
////中獎人員
function renderWinners(data) {
  const el = document.getElementById("employee_list");
  el.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.className = "list-wrap";

  const title = document.createElement("div");
  title.className = "list-title";
  title.textContent = `恭喜中獎者（${data?.length ?? 0}）`;
  wrap.appendChild(title);

  if (!data || data.length === 0) {
    const empty = document.createElement("div");
    empty.textContent = "目前尚未有中獎紀錄";
    wrap.appendChild(empty);
    el.appendChild(wrap);
    return;
  }

  const head = document.createElement("div");
  head.className = "list-head";
  head.style.gridTemplateColumns = "1.2fr 1.2fr 1.6fr";
  head.innerHTML = `
    <div class="cell">員工</div>
    <div class="cell">獎項</div>
    <div class="cell">時間</div>
  `;
  wrap.appendChild(head);

  data.forEach((w) => {
    const row = document.createElement("div");
    row.className = "list-row";
    row.style.gridTemplateColumns = "1.2fr 1.2fr 1.6fr";
    row.innerHTML = `
      <div class="cell">${escapeHtml(w.employee?.emp_name ?? "")}</div>
      <div class="cell">${escapeHtml(w.prize?.prize_name ?? "")}</div>
      <div class="cell">${new Date(w.drawn_at).toLocaleString()}</div>
    `;
    wrap.appendChild(row);
  });

  el.appendChild(wrap);
}
