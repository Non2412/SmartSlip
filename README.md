# SmartSlip: ระบบจัดการใบเสร็จอิเล็กทรอนิกส์ (Electronic Receipt Management System)

SmartSlip เป็นเว็บแอปพลิเคชันระดับ Production-grade ที่ถูกพัฒนาขึ้นเพื่อช่วยรวบรวม จัดเก็บ วิเคราะห์ และบริหารจัดการข้อมูลใบเสร็จในรูปแบบดิจิทัลแบบครบวงจร ช่วยลดปัญหาการสูญหายของเอกสาร เพิ่มความสะดวกรวดเร็วในการค้นหาย้อนหลัง และใช้ระบบ AI ในการดึงข้อมูลอัตโนมัติ พร้อมรองรับการเชื่อมต่อกับ LINE App เพื่อความสะดวกสบายสูงสุดของผู้ใช้งาน

---

## 1. Overview

*   **ระบบคืออะไร**: แพลตฟอร์มจัดการและจัดเก็บใบเสร็จอัจฉริยะที่เชื่อมต่อระบบเว็บแอปพลิเคชันเข้ากับ LINE OA เพื่อช่วยให้ผู้ใช้สามารถส่งรูปภาพใบเสร็จผ่าน LINE แล้วบันทึกลงฐานข้อมูลและคลาวด์สตอเรจได้โดยอัตโนมัติ
*   **ใครเป็นผู้ใช้งาน**: บุคคลทั่วไป, ฟรีแลนซ์, พนักงานฝ่ายบัญชี หรือเจ้าของธุรกิจขนาดเล็กที่ต้องการจัดการรายจ่ายและหลักฐานทางภาษีอย่างเป็นระบบ
*   **แก้ปัญหาอะไร**: ลดขั้นตอนการพิมพ์หรือกรอกข้อมูลใบเสร็จด้วยตนเอง, ป้องกันการสูญหายหรือจางหายของหมึกบนใบเสร็จกระดาษ, และเพิ่มความสามารถในการวิเคราะห์แนวโน้มค่าใช้จ่ายรายสัปดาห์/เดือน/ปี ผ่านแดชบอร์ด

---

## 2. Problem Statement

### ปัญหา (Problems)
*   **ใบเสร็จกระดาษสูญหายได้ง่าย**: ใบเสร็จที่เป็นกระดาษความร้อนมักจางหายไปตามเวลา หรือชำรุดเสียหายได้ง่าย
*   **การค้นหาเอกสารย้อนหลังใช้เวลานาน**: การเก็บเอกสารในแฟ้มทำให้การค้นหาประวัติการซื้อในอดีตหรือยอดค่าใช้จ่ายย้อนหลังทำได้ช้าและยากลำบาก
*   **ข้อมูลกระจัดกระจายหลายแหล่ง**: ข้อมูลค่าใช้จ่ายถูกกระจายอยู่ในอีเมล, LINE Chat, หรือแอปพลิเคชันต่าง ๆ ไม่ได้รวมศูนย์
*   **การป้อนข้อมูลด้วยตนเอง (Manual Data Entry)**: การบันทึกรายจ่ายด้วยตัวเองใช้เวลามากและมีโอกาสเกิดความผิดพลาดสูง

### แนวทางแก้ไข (Solutions)
*   **พัฒนาระบบจัดการใบเสร็จผ่านเว็บไซต์แบบรวมศูนย์ (Centralized Platform)**: เพื่อจัดเก็บ ค้นหา และติดตามข้อมูลการใช้จ่ายได้จากทุกที่ทุกเวลา
*   **LINE Integration & Auto-upload**: ผู้ใช้งานสามารถถ่ายภาพใบเสร็จแล้วส่งผ่าน LINE Chatbot ได้ทันที
*   **AI OCR Parsing**: ใช้ปัญญาประดิษฐ์สแกนดึงข้อมูลยอดรวม (Total Amount), ชื่อร้านค้า (Store Name), วันที่ และแบ่งหมวดหมู่อัตโนมัติในหลักวินาที
*   **Interactive Analytics**: สรุปข้อมูลรายจ่ายออกมาเป็นแผนภูมิเส้นและแผนภูมิวงกลมที่โต้ตอบได้เรียลไทม์

---

## 3. Features

*   **✓ Login with LINE & Google**: เข้าสู่ระบบผ่าน LINE OAuth และ Google OAuth ได้อย่างสะดวกรวดเร็วและปลอดภัย
*   **✓ Credentials Authentication**: ระบบสมัครสมาชิกและเข้าสู่ระบบด้วยอีเมลและรหัสผ่านมาตรฐาน (พร้อมการเข้ารหัสผ่าน bcrypt)
*   **✓ AI-powered OCR Receipt Scanning**: เชื่อมต่อ Google Gemini API สแกนวิเคราะห์ภาพใบเสร็จเพื่อดึงยอดเงิน, ร้านค้า, วันที่ และจัดประเภทอัตโนมัติ
*   **✓ Cloud Backup & Storage**: อัปโหลดและสำรองข้อมูลไฟล์ภาพใบเสร็จขึ้นระบบ Google Drive ปลอดภัยสูงสุด
*   **✓ Interactive Analytics Dashboard**: แแดชบอร์ดวิเคราะห์ยอดการใช้จ่าย แสดงแนวโน้มรายจ่าย (Line Chart) และสัดส่วนแยกตามหมวดหมู่ (Donut Pie Chart) ที่สลับดูรายสัปดาห์/เดือน/ปี ได้อย่างรวดเร็ว
*   **✓ Advanced Filter & Search**: ค้นหาประวัติใบเสร็จด้วยคำสำคัญ (คีย์เวิร์ดชื่อร้านค้า ยอดเงิน หรือวันที่) และตัวกรองช่วงเวลา (7 วัน, รายเดือน, รายปี) ที่รองรับการสลับเปิด-ปิด (Toggle) ตัวกรอง
*   **✓ Duplicate Receipt Detection**: ระบบคัดกรองอัจฉริยะ ตรวจหาและแจ้งเตือนใบเสร็จที่ซ้ำกัน (Duplicate) ป้องกันการบันทึกรายจ่ายเบิ้ล
*   **✓ Pagination System**: ตารางแสดงรายการใบเสร็จพร้อมระบบแบ่งหน้า (Pagination) แสดงผลหน้าละ 5, 10, หรือ 25 รายการเพื่อความรวดเร็วในการโหลดข้อมูล
*   **✓ Responsive Design**: รองรับการใช้งานได้สมบูรณ์แบบบนทุกอุปกรณ์ ทั้งคอมพิวเตอร์ แท็บเล็ต และสมาร์ทโฟน

---

## 4. System Architecture

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
   ├──► [Google Drive API] (Image Cloud Storage Backup)
   └──► [MongoDB Atlas] (Database)
```

### 🐳 Containerization Architecture
```text
+──────────────────────────────────────────────────+
│                 Docker Compose                   │
│                                                  │
│  +─────────────────────+   +──────────────────+  │
│  │   Next.js Web App   │   │     MongoDB      │  │
│  │      Container      │──►│    Container     │  │
│  │ (Turbopack Runtime) │   │ (Local database) │  │
│  +─────────────────────+   +──────────────────+  │
+──────────────────────────────────────────────────+
```

---

## 5. Database Design (MongoDB Schema)

ฐานข้อมูลของระบบออกแบบตามโครงสร้าง OIDC ของ Auth.js เพื่อความเข้ากันได้ของการทำงานร่วมกับ OAuth Providers ต่าง ๆ:

*   **Users**: บันทึกข้อมูลโปรไฟล์ของผู้ใช้งาน, LINE User ID, Google Account และระดับสิทธิ์
*   **Receipts**: บันทึกข้อมูลใบเสร็จที่แกะรหัสด้วย AI แล้ว
    *   `storeName` (ชื่อร้านค้า)
    *   `totalAmount` / `amount` (ยอดเงินรวม)
    *   `extractedData` (ข้อมูลดิบที่วิเคราะห์ผ่าน OCR)
    *   `imageURL` / `imageUrl` (ลิงก์ภาพบน Google Drive)
    *   `source` (`line` หรือ `web` เพื่อระบุช่องทางการนำเข้า)
    *   `isDuplicate` (แฟล็กตรวจสอบความซ้ำซ้อน)
    *   `createdAt` & `updatedAt`
*   **Accounts / Sessions**: จัดเก็บความสัมพันธ์โทเค็นและเซสชันการเข้าสู่ระบบ

---

## 6. Technology Stack

*   **Frontend**: Next.js 16 (Turbopack, App Router), React 19, HTML5, CSS3 (Vanilla CSS Custom Properties), Responsive Flexbox & Grid Layout
*   **Backend**: Next.js API Routes (Serverless / Server-side execution)
*   **Database**: MongoDB (MongoDB Atlas & Mongoose) + `@auth/mongodb-adapter`
*   **Authentication**: Auth.js v5 (NextAuth.js) - LINE Login Provider, Google OAuth, Credentials Provider (bcryptjs)
*   **AI Integration**: Google Gemini Developer API (Gemini Flash Model)
*   **File Storage**: Google Drive API (Service Account & OAuth 2.0 Integration)
*   **DevOps / Container**: Docker, Docker Compose
*   **Deployment**: Vercel (Production) & Local Environment

---

## 7. Key Challenges

### Challenge 1: LINE OAuth State and Cookie Mismatch
*   **ปัญหา**: ในระหว่างทดสอบบน URL Preview/Branch ของ Vercel (เช่น `*.vercel.app`) การเข้าสู่ระบบผ่าน LINE มักจะล้มเหลวด้วยข้อผิดพลาด `InvalidCheck: state value could not be parsed` เนื่องจากคุกกี้ความปลอดภัย (State/PKCE Cookie) ถูกสร้างบน Preview Domain แต่หน้า LINE Login ส่งผู้ใช้กลับมาที่ Production Domain เสมอ
*   **แนวทางแก้ไข**: กำหนดกฎระเบียบและเอกสารคู่มือห้ามสลับโดเมนทดสอบ พร้อมตั้งค่า Callback URL ใน LINE Developers Console ให้ครอบคลุมทุกโดเมนทดสอบแยกกันอย่างเด่นชัด ป้องกันปัญหาคุกกี้ข้ามโดเมน

### Challenge 2: Structured AI Output & Categorization Fallback
*   **ปัญหา**: ข้อมูลใบเสร็จบางประเภทมีความบิดเบี้ยว ตัวหนังสือจาง หรือมุมภาพเบี้ยว ส่งผลให้ AI วิเคราะห์ข้อมูลและคืนค่าโครงสร้าง JSON ที่ไม่สม่ำเสมอ หรือจำแนกหมวดหมู่นอกเหนือจากระบบที่กำหนดไว้
*   **แนวทางแก้ไข**: ใช้เทคนิค Structured Prompt Engineering ร่วมกับ System Instruction ของ Google Gemini API เพื่อบังคับผลลัพธ์ให้ออกมาเป็น JSON โครงสร้างตรงกับที่ระบุ พร้อมพัฒนาระบบตรวจสอบที่ฝั่งเซิร์ฟเวอร์ (Validation Fallback) เพื่อจัดให้อยู่ในหมวดหมู่อย่างถูกต้อง (`อาหาร`, `เดินทาง`, `ช้อปปิ้ง`, `อื่นๆ`)

### Challenge 3: Real-time Synchronized Dual-Chart Dashboard
*   **ปัญหา**: การแสดงกราฟ 2 ตัว (Line Chart และ Donut Pie Chart) ที่ต้องการประสิทธิภาพสูงและโต้ตอบได้เรียลไทม์ตามช่วงเวลาตัวกรองที่สลับไปมา โดยไม่ต้องการพึ่งพา Lib กราฟขนาดใหญ่ที่ส่งผลกระทบต่อประสิทธิภาพการโหลดเว็บ
*   **แนวทางแก้ไข**: ออกแบบและพัฒนา Component กราฟแบบ Pure SVG ดึงข้อมูลและคำนวณสัดส่วนมุมและระยะความยาววงกลม (Circumference) ด้วยวงกลมสูตรทางคณิตศาสตร์ในโค้ด React โดยตรง ทำให้ได้แผนภูมิที่โหลดเร็ว คมชัด และรองรับ Responsive

---

## 8. Installation

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

## 9. Environment Variables

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
```

---

## 10. Docker Support

โปรเจกต์นี้รองรับการรันผ่าน Docker เพื่อความสะดวกในการตั้งค่า Environment สำหรับการทำงานร่วมกัน:

*   **สั่งเปิดใช้งาน Container ทั้งหมด (Next.js App + Local MongoDB)**
    ```bash
    docker compose up -d --build
    ```

*   **สั่งปิดใช้งาน Container**
    ```bash
    docker compose down
    ```

---

## 11. Future Improvements

*   **Mobile Application**: พัฒนาแอปพลิเคชันเวอร์ชันเนทีฟบนมือถือ (iOS / Android) เพื่อความสะดวกรวดเร็วในการกดถ่ายภาพใบเสร็จ
*   **Tax Auto-Filing API**: เพิ่มการส่งออกข้อมูลค่าใช้จ่ายและใบภาษีหัก ณ ที่จ่าย เพื่อนำไปกรอกแบบฟอร์มภาษีของสรรพากรอัตโนมัติ
*   **Monthly Financial Report PDF**: ระบบประมวลผลสรุปยอดและส่งออกไฟล์ PDF สรุปวิเคราะห์รายเดือนส่งตรงเข้าอีเมลของผู้ใช้
*   **Multi-currency Support**: รองรับการแสกนใบเสร็จต่างประเทศและการแปลงสกุลเงินอัจฉริยะ

---

## 12. Author

*   **Sittirat Prommakun**
    *   *Computer Science Student*
    *   **GitHub**: [github.com/Non2412](https://github.com/Non2412)

---

## Project Statistics

```text
Project Duration : 6 Months
Team Size        : 2 People
Frontend         : Next.js + TypeScript
Backend          : Next.js API
Database         : MongoDB
Authentication   : LINE OAuth + Google OAuth
Deployment       : Vercel
Containerization : Docker
AI OCR Engine    : Gemini API
```