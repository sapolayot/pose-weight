const API_URL = "http://localhost:3000/api";

// ===== LOGOUT =====
async function logout() {
  try {
    const proceed = confirm("ยืนยันออกจากระบบ?");
    if (proceed) {
      await fetch(`${API_URL}/logout`, {
        method: "POST",
        credentials: "include",
      });

      window.location.href = "/";
    }
  } catch (err) {
    console.error(err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // อ้างอิง Element ต่างๆ ของ Modal
  const modal = document.getElementById("detailModal");
  const closeModalBtn = document.getElementById("closeModal");

  const modalTitle = document.getElementById("modalTitle");
  const modalLot = document.getElementById("modalLot");
  const modalDoc = document.getElementById("modalDoc");
  const modalDate = document.getElementById("modalDate");
  const modalAmount = document.getElementById("modalAmount");
  const modalUnit = document.getElementById("modalUnit");

  // อ้างอิงรายการผลิตทั้งหมด
  const listItems = document.querySelectorAll(".list-item");

  // คลิกที่การ์ดเพื่อเปิดใช้งาน Active ทับลอย (Modal)
  listItems.forEach((item) => {
    item.addEventListener("click", () => {
      // ดึงข้อมูลจาก Data Attributes ของการ์ดชิ้นนั้นๆ
      const name = item.getAttribute("data-name");
      const lot = item.getAttribute("data-lot");
      const doc = item.getAttribute("data-doc");
      const date = item.getAttribute("data-date");
      const amount = item.getAttribute("data-amount");
      const unit = item.getAttribute("data-unit");

      // นำข้อมูลไปใส่ในหน้าต่าง Modal
      modalTitle.textContent = name;
      modalLot.textContent = lot;
      modalDoc.textContent = doc;
      modalDate.textContent = date;
      modalAmount.textContent = amount;
      modalUnit.textContent = unit;

      // แสดง Modal ขึ้นมา
      modal.classList.add("active");
    });
  });

  // ฟังฟังก์ชันคลิกปุ่มกากบาทมุมขวาเพื่อปิดหน้าต่างลอย
  closeModalBtn.addEventListener("click", () => {
    modal.classList.remove("active");
  });

  // เพิ่มเติม: คลิกพื้นที่ว่างสลัวรอบนอกเพื่อปิดหน้าต่างลอยได้เช่นกัน
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.classList.remove("active");
    }
  });

  // พัฒนาระบบสลับ Tab (ทั้งหมด / ค้างเบิก / เสร็จแล้ว) เบื้องต้น
  const tabButtons = document.querySelectorAll(".tab-btn");
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      tabButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      // สามารถเขียนเงื่อนไขคัดกรองข้อมูล (Filter Logic) เพิ่มเติมได้ตรงนี้
    });
  });

  const daysGreeting = [
    "สวัสดีวันอาทิตย์",
    "สวัสดีวันจันทร์",
    "สวัสดีวันอังคาร",
    "สวัสดีวันพุธ",
    "สวัสดีวันพฤหัสบดี",
    "สวัสดีวันศุกร์",
    "สวัสดีวันเสาร์",
  ];

  // 2. ดึงเลขวันปัจจุบัน (0 - 6)
  const currentDayIndex = new Date().getDay();

  // 3. นำข้อความไปแสดงผลใน HTML ผ่าน id ที่เราตั้งไว้
  document.getElementById("welcome-text").innerText =
    daysGreeting[currentDayIndex];
});
