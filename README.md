Viewed README.md:1-229

นี่คือเนื้อหาทั้งหมดของไฟล์ `README.md` ที่ได้รับการอัปเดตอย่างสมบูรณ์ รวมถึงฟีเจอร์การล็อกหน้าจอ ระบบปุ่มบันทึกไดนามิก และตัวกรองแจ้งเตือนสิทธิ์รายบุคคล เรียงลำดับเนื้อหาครบถ้วนครับ:

```markdown
# 🧾 SmartSlip: ระบบจัดการใบเสร็จอิเล็กทรอนิกส์ (Electronic Receipt Management System)

![Next.js Version](https://img.shields.io/badge/Next.js-16.1.6-black?style=for-the-badge&logo=nextdotjs)
![React Version](https://img.shields.io/badge/React-19.2.3-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?style=for-the-badge&logo=mongodb)
![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?style=for-the-badge&logo=vercel)
![LINE Login](https://img.shields.io/badge/LINE_Login-Integrated-00c300?style=for-the-badge&logo=line)
![Gemini OCR](https://img.shields.io/badge/Gemini_AI-OCR_Engine-8e75e5?style=for-the-badge&logo=google-gemini)

SmartSlip เป็นเว็บแอปพลิเคชันระดับ **Production-grade** ที่ถูกพัฒนาขึ้นเพื่อช่วยรวบรวม จัดเก็บ วิเคราะห์ และบริหารจัดการข้อมูลใบเสร็จในรูปแบบดิจิทัลแบบครบวงจร ช่วยลดปัญหาการสูญหายของเอกสาร เพิ่มความสะดวกรวดเร็วในการค้นหาย้อนหลัง และใช้ระบบ AI ในการดึงข้อมูลอัตโนมัติ พร้อมรองรับการเชื่อมต่อกับ LINE App เพื่อความสะดวกสบายสูงสุดของผู้ใช้งาน

---

## 📌 1. Overview

*   **ระบบคืออะไร**: แพลตฟอร์มจัดการและจัดเก็บใบเสร็จอัจฉริยะที่เชื่อมต่อระบบเว็บแอปพลิเคชันเข้ากับ LINE OA เพื่อช่วยให้ผู้ใช้สามารถส่งรูปภาพใบเสร็จผ่าน LINE แล้วบันทึกลงฐานข้อมูลและคลาวด์สตอเรจได้โดยอัตโนมัติ
*   **ใครเป็นผู้ใช้งาน**: บุคคลทั่วไป, ฟรีแลนซ์, พนักงานฝ่ายบัญชี หรือเจ้าของธุรกิจขนาดเล็กที่ต้องการจัดการรายจ่ายและหลักฐานทางภาษีอย่างเป็นระบบ
*   **แก้ปัญหาอะไร**: ลดขั้นตอนการพิมพ์หรือกรอกข้อมูลใบเสร็จด้วยตนเอง, ป้องกันการสูญหายหรือจางหายของหมึกบนใบเสร็จกระดาษ, และเพิ่มความสามารถในการวิเคราะห์แนวโน้มค่าใช้จ่ายรายสัปดาห์/เดือน/ปี ผ่านแดชบอร์ด

---

## 🔍 2. Problem Statement

> [!NOTE]
> ### 🛑 ปัญหา (Problems)
> *   **ใบเสร็จกระดาษสูญหายได้ง่าย**: ใบเสร็จที่เป็นกระดาษความร้อนมักจางหายไปตามเวลา หรือชำรุดเสียหายได้ง่าย
> *   **การค้นหาเอกสารย้อนหลังใช้เวลานาน**: การเก็บเอกสารในแฟ้มทำให้การค้นหาประวัติการซื้อในอดีตหรือยอดค่าใช้จ่ายย้อนหลังทำได้ช้าและยากลำบาก
> *   **ข้อมูลกระจัดกระจายหลายแหล่ง**: ข้อมูลค่าใช้จ่ายถูกกระจายอยู่ในอีเมล, LINE Chat, หรือแอปพลิเคชันต่าง ๆ ไม่ได้รวมศูนย์
> *   **การป้อนข้อมูลด้วยตนเอง (Manual Data Entry)**: การบันทึกรายจ่ายด้วยตัวเองใช้เวลามากและมีโอกาสเกิดความผิดพลาดสูง
>
> ### 💡 แนวทางแก้ไข (Solutions)
> *   **พัฒนาระบบจัดการใบเสร็จผ่านเว็บไซต์แบบรวมศูนย์ (Centralized Platform)**: เพื่อจัดเก็บ ค้นหา และติดตามข้อมูลการใช้จ่ายได้จากทุกที่ทุกเวลา
> *   **LINE Integration & Auto-upload**: ผู้ใช้งานสามารถถ่ายภาพใบเสร็จแล้วส่งผ่าน LINE Chatbot ได้ทันที
> *   **AI OCR Parsing**: ใช้ปัญญาประดิษฐ์สแกนดึงข้อมูลยอดรวม (Total Amount), ชื่อร้านค้า (Store Name), วันที่ และแบ่งหมวดหมู่อัตโนมัติในหลักวินาที
> *   **Interactive Analytics**: สรุปข้อมูลรายจ่ายออกมาเป็นแผนภูมิเส้นและแผนภูมิวงกลมที่โต้ตอบได้เรียลไทม์

---

## ✨ 3. Features

*   **🔐 Auth Integration**: เข้าสู่ระบบผ่าน LINE OAuth, Google OAuth และ Credentials (ความปลอดภัยรหัสผ่านด้วย bcrypt)
*   **🤖 AI OCR Engine**: สแกนประมวลผลใบเสร็จด้วย Google Gemini API ดึง ยอดเงินรวม, ชื่อร้าน, วันที่ และรายการสินค้า แบบเรียลไทม์
*   **📁 Cloud Storage**: อัปโหลดข้อมูลและภาพใบเสร็จสำรองขึ้นระบบคลาวด์ Google Drive / Google Cloud Storage ปลอดภัยสูงสุด
*   **📊 Interactive Dashboard**: วิเคราะห์แนวโน้มยอดรายจ่าย (Line Chart) และสัดส่วนค่าใช้จ่ายตามหมวดหมู่ (Donut Pie Chart) ที่โต้ตอบได้อย่างแม่นยำ
*   **🔎 Smart Filter & Search**: ค้นหาตามคำสำคัญและสลับเปิด-ปิด (Toggle) ตัวกรองช่วงเวลา (7 วัน, รายเดือน, รายปี) โดยเริ่มต้นไม่กรองข้อมูลใด ๆ
*   **🚫 Duplicate Detection**: ระบบคัดกรองอัจฉริยะ ตรวจหาและแจ้งเตือนใบเสร็จที่ซ้ำซ้อน (Duplicate) ป้องกันการลงบัญชีเบิ้ล
*   **📃 Pagination System**: ตารางรายงานแบบแบ่งหน้า (5, 10, หรือ 25 รายการ) ลดภาระการโหลดข้อมูลหน้าเว็บ
*   **📱 Responsive Web Design**: ปรับแต่งมาเป็นอย่างดีสำหรับทุกขนาดหน้าจอ ทั้ง Desktop, Tablet และ Mobile
*   **📑 Queue & Bulk Edit Mode (ฟีเจอร์ใหม่)**: โหมดแก้ไขสลิปทั้งหมดแบบต่อเนื่อง มีระบบพรีวิวรูปภาพฝั่งซ้าย (Zoom In/Out/Rotate) พร้อมแถบรูปภาพย่อ (Thumbnail Strip) แบบโปร่งใส (Transparent) รองรับทั้ง Light/Dark Mode
*   **📋 Pre-Save Summary Modal (ฟีเจอร์ใหม่)**: หน้าต่างป๊อปอัปสรุปรายการใบเสร็จรอดำเนินการทั้งหมดและสรุปยอดเงินรวมสุทธิ (Grand Total Sum) ก่อนกดบันทึกจริง เพื่อให้ผู้ใช้ตรวจสอบความถูกต้องของยอดเงินอีกครั้ง
*   **⚡ Live Dynamic Recalculation (ฟีเจอร์ใหม่)**: ระบบคำนวณยอดเงินรวมแบบเรียลไทม์ทันทีที่มีการลบ/แก้ไขรายการสินค้า ส่วนลด หรือ VAT เพื่อให้ยอดการใช้จ่ายอัปเดตตรงตามจริงเสมอ
*   **🔒 Navigation Lock & Focused Setup (ฟีเจอร์ใหม่)**: ระบบล็อกหน้าจอความปลอดภัยสำหรับบัญชีใหม่ที่ข้อมูลโปรไฟล์ยังไม่ครบถ้วน โดยจะซ่อนเมนูนำทาง (Sidebar, TopBar) และป้องกันการนำทางไปหน้าอื่น เพื่อบังคับให้ลงทะเบียนข้อมูลให้สมบูรณ์ก่อนเริ่มใช้งานระบบ
*   **📨 Dynamic Profile Save / Role Request (ฟีเจอร์ใหม่)**: ปุ่มบันทึกข้อมูลย้ายมาอยู่ใต้การเลือกบทบาทความต้องการสิทธิ์ โดยแสดงผลคำว่า `"ขอสิทธิ์การใช้งาน"` สำหรับผู้สมัครบัญชีใหม่ที่รอการอนุมัติ และแสดงคำว่า `"บันทึกข้อมูลโปรไฟล์"` เมื่อได้รับการอนุมัติใช้งานจากผู้ดูแลระบบเรียบร้อยแล้ว
*   **🔔 User-Specific & Dismissible Notification (ฟีเจอร์ใหม่)**: การแจ้งเตือนผลอนุมัติหรือปฏิเสธคำขอสิทธิ์การใช้งานจากผู้ดูแลระบบ แสดงผลแยกเฉพาะรายบุคคล (User-specific) โดยไม่ปะปนกับผู้ใช้อื่น และมาพร้อมปุ่มปิด `✕` เพื่อบันทึกสถานะการอ่านลงใน `localStorage` ไม่ให้การแจ้งเตือนแสดงค้างหน้าจออย่างถาวร

---

## 🏗️ 4. System Architecture

### 📱 Web & Integration Flow
```text
User (LINE OA / Web Browser)
   │
   ▼
[Next.js App Router] (Frontend) ◄──► [Auth.js] (OAuth2: LINE / Google)
   │
   ▼
[Next.js API Routes] (Backend)
   ├──► [Google Gemini API] (AI OCR Extraction Engine)
   ├──► [Google Drive / Cloud Storage API] (Image Cloud Backup)
   └──► [MongoDB Atlas] (Database)
```

---

## 💾 5. Database Design (MongoDB Schema)

ฐานข้อมูลของระบบออกแบบตามโครงสร้าง OIDC ของ Auth.js เพื่อความเข้ากันได้ของการทำงานร่วมกับ OAuth Providers ต่าง ๆ:

*   **Users**: บันทึกข้อมูลโปรไฟล์ของผู้ใช้งาน, LINE User ID, Google Account และระดับสิทธิ์
*   **Receipts**: บันทึกข้อมูลใบเสร็จที่แกะรหัสด้วย AI แล้ว
    *   `storeName` (ชื่อร้านค้า)
    *   `totalAmount` / `amount` (ยอดเงินรวม)
    *   `extractedData` (ข้อมูลดิบที่วิเคราะห์ผ่าน OCR)
    *   `imageURL` / `imageUrl` (ลิงก์ภาพบน Google Drive / Cloud Storage)
    *   `source` (`line` หรือ `web` เพื่อระบุช่องทางการนำเข้า)
    *   `isDuplicate` (แฟล็กตรวจสอบความซ้ำซ้อน)
    *   `createdAt` & `updatedAt`
*   **Accounts / Sessions**: จัดเก็บความสัมพันธ์โทเค็นและเซสชันการเข้าสู่ระบบ

---

## 🛠️ 6. Technology Stack

*   **Frontend**: Next.js 16 (Turbopack, App Router), React 19, HTML5, CSS3 (Vanilla CSS Custom Properties), Responsive Flexbox & Grid Layout
*   **Backend**: Next.js API Routes (Serverless / Server-side execution)
*   **Database**: MongoDB (MongoDB Atlas & Mongoose) + `@auth/mongodb-adapter`
*   **Authentication**: Auth.js v5 (NextAuth.js) - LINE Login Provider, Google OAuth, Credentials Provider (bcryptjs)
*   **AI Integration**: Google Gemini Developer API (Gemini Flash Model)
*   **File Storage**: Google Drive API & Google Cloud Storage Integration
*   **Deployment**: Vercel (Production) & Local Environment

---

## ⚡ 7. Key Challenges

### 🚀 Challenge 1: LINE OAuth State and Cookie Mismatch
*   **ปัญหา**: ในระหว่างทดสอบบน URL Preview/Branch ของ Vercel (เช่น `*.vercel.app`) การเข้าสู่ระบบผ่าน LINE มักจะล้มเหลวด้วยข้อผิดพลาด `InvalidCheck: state value could not be parsed` เนื่องจากคุกกี้ความปลอดภัย (State/PKCE Cookie) ถูกสร้างบน Preview Domain แต่หน้า LINE Login ส่งผู้ใช้กลับมาที่ Production Domain เสมอ
*   **แนวทางแก้ไข**: กำหนดกฎระเบียบและเอกสารคู่มือห้ามสลับโดเมนทดสอบ พร้อมตั้งค่า Callback URL ใน LINE Developers Console ให้ครอบคลุมทุกโดเมนทดสอบแยกกันอย่างเด่นชัด ป้องกันปัญหาคุกกี้ข้ามโดเมน

### 🚀 Challenge 2: Structured AI Output & Categorization Fallback
*   **ปัญหา**: ข้อมูลใบเสร็จบางประเภทมีความบิดเบี้ยว ตัวหนังสือจาง หรือมุมภาพเบี้ยว ส่งผลให้ AI วิเคราะห์ข้อมูลและคืนค่าโครงสร้าง JSON ที่ไม่สม่ำเสมอ หรือจำแนกหมวดหมู่นอกเหนือจากระบบที่กำหนดไว้
*   **แนวทางแก้ไข**: ใช้เทคนิค Structured Prompt Engineering ร่วมกับ System Instruction ของ Google Gemini API เพื่อบังคับผลลัพธ์ให้ออกมาเป็น JSON โครงสร้างตรงกับที่ระบุ พร้อมพัฒนาระบบตรวจสอบที่ฝั่งเซิร์ฟเวอร์ (Validation Fallback) เพื่อจัดให้อยู่ในหมวดหมู่อย่างถูกต้อง (`อาหาร`, `เดินทาง`, `ช้อปปิ้ง`, `อื่นๆ`)

### 🚀 Challenge 3: Real-time Synchronized Dual-Chart Dashboard
*   **ปัญหา**: การแสดงกราฟ 2 ตัว (Line Chart และ Donut Pie Chart) ที่ต้องการประสิทธิภาพสูงและโต้ตอบได้เรียลไทม์ตามช่วงเวลาตัวกรองที่สลับไปมา โดยไม่ต้องการพึ่งพา Lib กราฟขนาดใหญ่ที่ส่งผลกระทบต่อประสิทธิภาพการโหลดเว็บ
*   **แนวทางแก้ไข**: ออกแบบและพัฒนา Component กราฟแบบ Pure SVG ดึงข้อมูลและคำนวณสัดส่วนมุมและระยะความยาววงกลม (Circumference) ด้วยวงกลมสูตรทางคณิตศาสตร์ในโค้ด React โดยตรง ทำให้ได้แผนภูมิที่โหลดเร็ว คมชัด และรองรับ Responsive

### 🚀 Challenge 4: Real-time Queue State & Pre-Save Confirmation Summary (ฟีเจอร์ใหม่)
*   **ปัญหา**: ในการแก้ไขใบเสร็จหลายรายการในโหมดคิว (Queue Mode) หากผู้ใช้แก้ไขราคาสินค้า ปรับส่วนลด/VAT หรือลบรายการสินค้าในแต่ละสลิป ยอดเงินรวมทั้งหมดที่แสดงอาจไม่อัปเดตทันทีหากยังไม่ได้ถูกบันทึกลงฐานข้อมูล
*   **แนวทางแก้ไข**: พัฒนาระบบจัดการสถานะแบบ Live Queue State Tracking พร้อมสร้างหน้าต่าง `SummaryConfirmModal` เพื่อรวบรวมรายการสลิปและคำนวณยอดเงินรวมสุทธิ (Grand Total) ใหม่แบบ Real-time ให้ผู้ใช้ตรวจสอบยอดเงินถูกต้องตรงตามจริงก่อนกดยืนยันบันทึกทั้งหมดลงฐานข้อมูล

### 🚀 Challenge 5: Secure Screen Locking and Dynamic Application Access
*   **ปัญหา**: ความต้องการล็อกการเข้าถึงส่วนอื่นของระบบสำหรับผู้สมัครสมาชิกใหม่ที่ยังกรอกข้อมูลโปรไฟล์ไม่ครบถ้วน เพื่อป้องกันไม่ให้กดลิงก์นำทางหรือเข้าชมหน้าแดชบอร์ด/ประวัติการใช้จ่ายได้ก่อนลงทะเบียนเสร็จสมบูรณ์
*   **แนวทางแก้ไข**: ใช้เทคนิค client-side layout filtering โดยตรวจสอบความสมบูรณ์ของโปรไฟล์ร่วมกับ NextAuth session เพื่อซ่อนคอมโพเนนต์ Sidebar และ TopBar บนหน้าโปรไฟล์ พร้อมทั้งใช้การเรียก API ที่เจาะจง `/api/role-requests?myOwn=true` ร่วมกับการบันทึกประวัติการปิดแจ้งเตือน (Dismiss state) ใน `localStorage` เพื่อแยกแยะการแสดงผลการแจ้งเตือนสิทธิ์การใช้งานรายบุคคลได้อย่างถูกต้องและไม่แสดงค้างหน้าจอ

---

## 📥 8. Installation

1.  **Clone Repository**
    ```bash
    git clone https://github.com/Non2412/SmartSlip.git
    cd SmartSlip
    ```

2.  **Install Dependencies**
    ```bash
    pnpm install
    # หรือ
    npm install
    ```

3.  **Run Development Server**
    ```bash
    pnpm dev
    # หรือ
    npm run dev
    ```

4.  เปิดเว็บบราวเซอร์ไปที่ [http://localhost:3000](http://localhost:3000)

---

## ⚙️ 9. Environment Variables

สร้างไฟล์ `.env.local` ไว้ที่โฟลเดอร์ราก (Root) ของโปรเจกต์ และระบุคีย์ดังนี้:

```env
# NextAuth / Auth.js
AUTH_SECRET=your-super-secret-auth-key-32chars
NEXTAUTH_URL=http://localhost:3000

# MongoDB Connection
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/smartslip

# LINE Login & Channel Configurations
LINE_CLIENT_ID=your-line-channel-id
LINE_CLIENT_SECRET=your-line-channel-secret
LINE_CHANNEL_ACCESS_TOKEN=your-line-messaging-access-token
LINE_CHANNEL_SECRET=your-line-channel-secret

# Google OAuth (Optional login method)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Gemini API
GEMINI_API_KEY=your-gemini-api-key

# Google Drive Storage Integration
GOOGLE_PROJECT_ID=your-google-project-id
GOOGLE_PRIVATE_KEY_ID=your-google-private-key-id
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account-email
GOOGLE_DRIVE_FOLDER_ID=your-google-drive-folder-id
GCS_BUCKET_NAME=your-gcs-bucket-name
```

---

## 🔮 11. Future Improvements

*   **📱 Mobile Application**: พัฒนาแอปพลิเคชันเวอร์ชันเนทีฟบนมือถือ (iOS / Android) เพื่อความสะดวกรวดเร็วในการกดถ่ายภาพใบเสร็จ
*   **🧾 Tax Auto-Filing API**: เพิ่มการส่งออกข้อมูลค่าใช้จ่ายและใบภาษีหัก ณ ที่จ่าย เพื่อนำไปกรอกแบบฟอร์มภาษีของสรรพากรอัตโนมัติ
*   **📊 Monthly Financial Report PDF**: ระบบประมวลผลสรุปยอดและส่งออกไฟล์ PDF สรุปวิเคราะห์รายเดือนส่งตรงเข้าอีเมลของผู้ใช้
*   **💱 Multi-currency Support**: รองรับการแสกนใบเสร็จต่างประเทศและการแปลงสกุลเงินอัจฉริยะ

---

## 👥 12. Author

*   **Sittirat Prommakun**
    *   *Computer Science Student*
    *   **GitHub**: [github.com/Non2412](https://github.com/Non2412)

*   **Suppachai Wicheer**
    *   *Computer Science Student*
    *   **GitHub**: [github.com/suppachai0](https://github.com/suppachai0)

*   **Nobphanan**
    *   *Computer Science Student*
    *   **GitHub**: [github.com/Nobphanan47](https://github.com/Nobphanan47)

---

## 📊 Project Statistics

```text
Project Duration : 6 Months
Team Size        : 3 People
Frontend         : Next.js + TypeScript
Backend          : Next.js API
Database         : MongoDB
Authentication   : LINE OAuth + Google OAuth
Deployment       : Vercel
AI OCR Engine    : Gemini API
```
```
