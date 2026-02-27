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

  const emp_excel = document.createElement("button");
  emp_excel.textContent = `員工清單下載(Excel)`;
  emp_excel.style.marginBottom = "15px";
  emp_excel.className = "excel-btn";
  emp_excel.onclick = () => exportToDetailedExcel(_employeesCache);
  wrap.appendChild(emp_excel);

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

//excel下載
async function exportToDetailedExcel(data) {
  if (!data || data.length === 0) return alert("目前沒有員工資料可供下載");

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("抽獎券", {
    pageSetup: {
      paperSize: 9, // A4 紙張
      orientation: "portrait",
      fitToPage: false, // 保持實際尺寸 (14.5x7cm)
      margins: {
        left: 0.5,
        right: 0.5,
        top: 0.5,
        bottom: 0.5,
        header: 0,
        footer: 0,
      },
    },
  });

  // 1. 基本佈局設定
  worksheet.getColumn("A").width = 15; // no 欄
  worksheet.getColumn("B").width = 25; // dep_name 欄
  worksheet.getColumn("C").width = 2.5; // 間距欄 (對應圖中細欄)
  worksheet.getColumn("D").width = 30; // QRCode 欄

  let startRow = 1;
  let count = 0; // 用來計數，每 4 筆換一頁

  for (const emp of data) {
    // 取得畫面上產生的 QRCode (Canvas)
    const qrContainer = document.getElementById(`qr_${emp.no}`);
    const qrCanvas = qrContainer ? qrContainer.querySelector("canvas") : null;

    if (!qrCanvas) continue;
    const base64Image = qrCanvas.toDataURL("image/png");

    // 設定行高
    worksheet.getRow(startRow).height = 55; // 第一行 (no, dep)
    worksheet.getRow(startRow + 1).height = 70; // 姓名高度
    worksheet.getRow(startRow + 2).height = 70; // 姓名高度

    // --- A. 填入文字資料 ---

    // 序號 (no) - 置中
    const noCell = worksheet.getCell(`A${startRow}`);
    noCell.value = emp.no;
    noCell.alignment = { vertical: "middle", horizontal: "center" };
    noCell.font = { size: 18 };

    // 部門 (dep_name) - 靠左
    const depCell = worksheet.getCell(`B${startRow}`);
    depCell.value = emp.dep_name;
    depCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    depCell.font = { size: 18 };

    // 第二、三行：合併顯示 emp_name (對應圖片中較大的姓名區域)
    const nameRowStart = startRow + 1;
    const nameRowEnd = startRow + 2;
    worksheet.mergeCells(`A${nameRowStart}:B${nameRowEnd}`);
    const nameCell = worksheet.getCell(`A${nameRowStart}`);
    nameCell.value = emp.emp_name;
    nameCell.alignment = { vertical: "middle", horizontal: "center" };
    nameCell.font = { size: 24, bold: true };

    // --- B. 插入 QRCode 圖片 ---

    // 合併右側 D 欄區域放置 QRCode
    worksheet.mergeCells(`D${startRow}:D${nameRowEnd}`);
    const imageId = workbook.addImage({
      base64: base64Image,
      extension: "png",
    });

    worksheet.addImage(imageId, {
      tl: { col: 3.2, row: startRow - 0.1 },
      ext: { width: 130, height: 130 },
      editAs: "oneCell",
    });

    // --- C. 分隔線 ---
    // 在每個員工區塊下方加一條粗黑線
    const dividerRow = startRow + 3;
    worksheet.getRow(dividerRow).height = 1;
    worksheet.mergeCells(`A${dividerRow}:D${dividerRow}`);
    worksheet.getCell(`A${dividerRow}`).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF000000" }, // 黑色分隔
    };
    //右側加細線
    for (let i = 0; i <= 4; i++) {
      worksheet.getCell(`D${startRow + i}`).border = {
        right: { style: "thin", color: { argb: "FF000000" } },
      };
    }
    count++;
    // 重點：每 4 筆資料加入分頁符號
    if (count % 4 === 0 && count !== data.length) {
      // 在 dividerRow 這一行之後強制分頁
      worksheet.getRow(dividerRow).addPageBreak();
    }
    // 移動到下一個區塊的起始行 (間隔 5 行)
    startRow += 5;
  }

  // 匯出檔案
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `2026馬年抽獎券_${new Date().getTime()}.xlsx`;
  link.click();
}
