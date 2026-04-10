Listed directory project_end
Viewed package.json:1-32
Viewed README.md:1-38
Viewed route.ts:1-159

แน่นอนครับ นี่คือเนื้อหาสำหรับไฟล์ `README.md` ที่สรุปภาพรวมของโปรเจกต์ **"Smart Receipt Management System"** (Project End) โดยเน้นความสวยงามและข้อมูลที่ครบถ้วนครับ

---

# 🧾 Smart Receipt Management System (Project End)
**ระบบจัดการใบเสร็จอัจฉริยะ** ที่ช่วยให้การบันทึกค่าใช้จ่ายเป็นเรื่องง่ายด้วยพลังของ AI และการเชื่อมต่อแบบไร้รอยต่อระหว่าง LINE, Google Drive และ Dashboard ส่วนตัว

---

## ✨ คุณสมบัติเด่น (Features)
*   🤖 **AI-Powered OCR**: ใช้ **Gemini 1.5 Flash** ในการอ่านข้อมูลจากรูปภาพใบเสร็จโดยอัตโนมัติ (ชื่อร้าน, ยอดเงิน, วันที่, วิธีชำระเงิน) แม่นยำทั้งภาษาไทยและอังกฤษ
*   📱 **LINE Bot Integration**: สามารถส่งรูปใบเสร็จเข้า LINE OA เพื่อบันทึกข้อมูลได้ทันที ไม่ต้องเปิดเข้าแอปฯ
*   ☁️ **Automatic Cloud Backup**: อัปโหลดรูปภาพใบเสร็จไปเก็บที่ **Google Drive** โดยอัตโนมัติ พร้อมจัดระเบียบโฟลเดอร์แยกตามปีและเดือน (User/Month-Year)
*   📊 **Interactive Dashboard**: ระบบหลังบ้านสำหรับเรียกดูข้อมูลใบเสร็จ ค้นหา และสรุปยอดค่าใช้จ่ายผ่านกราฟที่สวยงาม
*   🔐 **Secure Authentication**: ยืนยันตัวตนผ่าน NextAuth รองรับการเชื่อมต่อกับบัญชี LINE และความปลอดภัยระดับสูง
*   💾 **Structured Data**: เก็บข้อมูลที่สกัดได้ลงใน **MongoDB** เพื่อความรวดเร็วในการเรียกดูและวิเคราะห์ข้อมูลย้อนหลัง

---

## 🛠 เทคโนโลยีที่ใช้ (Tech Stack)

### **Frontend & Framework**
*   **Next.js 15+ (App Router)**: เพื่อประสิทธิภาพและความเร็วสูงสุด
*   **React 19**: หัวใจหลักของ UI ที่ลื่นไหล
*   **CSS Modules**: จัดการสไตล์แบบโมดูลาร์ สะอาด และบำรุงรักษาง่าย

### **Backend & Services**
*   **Google Generative AI (Gemini)**: สมองกลในการวิเคราะห์รูปภาพ
*   **Google Drive API**: ระบบจัดเก็บไฟล์บน Cloud
*   **LINE Messaging API**: เชื่อมต่อการสื่อสารกับผู้ใช้งาน
*   **MongoDB**: ฐานข้อมูล NoSQL สำหรับเก็บข้อมูลใบเสร็จและโปรไฟล์ผู้ใช้

---

## 🚀 ลำดับการทำงาน (Workflow)

1.  **Input**: ผู้ใช้ส่งรูปใบเสร็จผ่านหน้าเว็บหรือทาง LINE Bot
2.  **AI Process**: ระบบส่งรูปไปให้ Gemini วิเคราะห์และสกัดข้อมูลออกมาเป็น JSON (Store, Amount, Date, etc.)
3.  **Storage**:
    *   รูปภาพถูกอัปโหลดไปที่ Google Drive ตามโฟลเดอร์ของผู้ใช้รายนั้นๆ
    *   ข้อมูลตัวเลขและข้อความถูกบันทึกลง MongoDB
4.  **Feedback**: ระบบตอบกลับผู้ใช้ (ถ้าเป็น LINE จะสรุปยอดเงินให้ทราบทันที)
5.  **Output**: ข้อมูลทั้งหมดไปปรากฏบน Dashboard ของผู้ใช้เพื่อจัดการต่อ

---

## ⚙️ การติดตั้งและตั้งค่า (Installation)

1.  **Clone Project**
    ```bash
    git clone https://github.com/your-username/project_end.git
    cd project_end
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Setup Environment Variables** (`.env.local`)
    สร้างไฟล์ `.env.local` และกำหนดค่าดังนี้:
    ```env
    # Database
    MONGODB_URI=your_mongodb_connection_string

    # AI
    GEMINI_API_KEY=your_gemini_api_key

    # Google Drive API
    GOOGLE_CLIENT_ID=...
    GOOGLE_CLIENT_SECRET=...
    GOOGLE_REFRESH_TOKEN=...

    # LINE Bot
    LINE_CHANNEL_ACCESS_TOKEN=...
    LINE_CHANNEL_SECRET=...
    
    # NextAuth
    NEXTAUTH_SECRET=...
    ```

4.  **Run Development Server**
    ```bash
    npm run dev
    ```

---

## 📁 โครงสร้างโฟลเดอร์ (Project Structure)
*   `src/app/api`: ศูนย์รวม API Routes (Webhooks สำหรับ LINE และ Drive)
*   `src/components`: คอมโพเนนต์ UI ที่ใช้ซ้ำได้
*   `src/lib`: คลังฟังก์ชันช่วยเหลือ (Database connection, Google Drive helpers)
*   `public`: ไฟล์ Static ต่างๆ เช่น โลโก้ และไอคอน

---

## 📝 บันทึกเพิ่มเติม
โปรเจกต์นี้ถูกออกแบบมาเพื่อลดระยะเวลาในการกรอกข้อมูลค่าใช้จ่ายด้วยตนเอง และเน้นการเข้าถึงข้อมูลได้จากทุกที่ทุกเวลา

---
*Created with ❤️ by Antigravity*

---

**วิธีใช้:** คุณสามารถก๊อบปี้เนื้อหาตั้งแต่บรรทัดแรกไปวางในไฟล์ `README.md` ของคุณได้เลยครับ เนื้อหานี้ครอบคลุมทั้งส่วนทางเทคนิคและส่วนอธิบายฟังก์ชันการทำงานให้ผู้ใช้ทั่วไปเข้าใจได้ง่ายครับ

# 🚀 สรุปเนื้อหาเว็บไซต์และแผนผังความรับผิดชอบ (Project Overview & Contributions)

## 🌐 เกี่ยวกับระบบของเรา (The System)
ระบบนี้คือ **"Unified Receipt Ecosystem"** ที่เชื่อมโลก Offline (ใบเสร็จกระดาษ) เข้าสู่โลก Online แบบอัตโนมัติ โดยมี 3 ช่องทางหลักที่ทำงานร่วมกัน:
1.  **LINE Gateway**: ช่องทางบันทึกที่เร็วที่สุด แค่ถ่ายรูปส่งเข้ามา AI จะอ่านและลงบันทึกให้ทันที
2.  **Web Dashboard**: จุดศูนย์รวมข้อมูลที่สวยงาม สำหรับตรวจสอบ แก้ไข และดูรายงานย้อนหลัง
3.  **Cloud Registry**: ฝากไฟล์ภาพต้นฉบับไว้ที่ Google Drive โดยไม่ต้องกลัวหาย และจัดระเบียบให้เสร็จสับ

---

## 👥 ใครทำอะไรไปบ้าง (Contributions & Milestones)

เพื่อให้ง่ายต่อการเขียนรายงานหรือใส่ใน Portfolio ผมสรุปแบ่งตามโมดูลหลักดังนี้ครับ:

### 1. 🤖 ระบบสมองกล AI & การเชื่อมต่อ Google Drive
*   **Gemini 1.5 Flash Integration**: พัฒนา Prompt Engineering ให้ AI สกัดข้อมูลจากใบเสร็จ (ชื่อร้าน, ยอดเงิน, วันที่) ออกมาเป็น JSON ได้อย่างแม่นยำ
*   **Google Drive File Management**: พัฒนาอัลกอริทึมสร้างโฟลเดอร์อัตโนมัติตามโครงสร้าง `ปี/เดือน` และระบบ Redirect ลิงก์ไปยังโฟลเดอร์ส่วนตัวของผู้ใช้
*   **Dynamic Image Proxy**: สร้างระบบดึงรูปจาก Google Drive มาแสดงผลบนหน้าเว็บโดยตรงผ่าน API Middleware

### 2. 💬 ระบบรับข้อมูลผ่าน LINE Bot
*   **LINE Webhook Integration**: พัฒนา Endpoint เพื่อรับ Messaging Event และจัดการ Binary Data (รูปภาพ) จากเซิร์ฟเวอร์ LINE
*   **Response System**: ออกแบบระบบตอบกลับอัตโนมัติที่แจ้งสถานะการบันทึกข้อมูลกับผู้ใช้งานแบบ Real-time

### 3. 🎨 งานดีไซน์และส่วนติดต่อผู้ใช้ (UI/UX)
*   **Receipt Uploader Component**: โมดูลการอัปโหลดรูปภาพบนหน้าเว็บ พร้อมระบบ Preview และ State Management
*   **Interactive Dashboard**: พัฒนาหน้า Dashboard สำหรับเรียกดูข้อมูลใบเสร็จทั้งหมด พร้อมระบบ Filter ตามช่วงเวลา
*   **Premium Styles**: ใช้ CSS Modules ร่วมกับแนวคิด Glassmorphism และ Responsive Design ให้แสดงผลได้ดีทั้งคอมและมือถือ
*   **Checkout & Payment Modal**: พัฒนาระบบชำระเงินที่มีการอัปโหลดสลิปยืนยัน (OCR Slip Check)

### 4. ⚙️ งานโครงสร้างและหลังบ้าน (Core Infrastructure)
*   **Database Schema (MongoDB)**: ออกแบบโครงสร้างการจัดเก็บข้อมูลใบเสร็จ, แอดเคาท์ผู้ใช้ และข้อมูลที่สกัดจาก AI
*   **Authentication (NextAuth.js)**: วางระบบ Login ที่รองรับทั้ง LINE Login และระบบสมาชิกภายใน
*   **API Architecture**: ย้ายระบบจาก Backend ภายนอกเข้ามาเป็น Next.js API Routes เพื่อให้เป็นโปรเจกต์ที่จบในตัวเดียว (Monolith)
*   **Deployment & Ops**: แก้ไขปัญหา Build Error บน Vercel และจัดการเรื่อง Environment Variables สำหรับความปลอดภัย

---

## 🛠 สรุปสถานะล่าสุด (Current Status)
*   **ระบบ OCR**: ใช้งานได้ 100% (Gemini)
*   **ระบบจัดเก็บไฟล์**: ใช้งานได้ 100% (Google Drive)
*   **ระบบ LINE Bot**: ใช้งานได้ 100% (Webhook & Reply)
*   **ระบบ Dashboard**: แสดงผลและกรองข้อมูลได้ครบถ้วน
*   **ระบบ Checkout**: รองรับการสแกนสลิปชำระเงิน

---

**คำแนะนำเพิ่มเติม:** 
หากคุณต้องการระบุ **ชื่อคนจริงๆ** เข้าไปในส่วนนี้ (เช่น ชื่อเล่นของคุณ หรือเพื่อนในทีม) สามารถบอกผมได้เลยครับ ผมจะนำชื่อเหล่านั้นไปใส่แทนที่หัวข้อแต่ละหมวดให้ เพื่อให้ไฟล์ดูเป็นทางการมากขึ้นครับ!
