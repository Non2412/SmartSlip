'use client';

import { useState } from 'react';
import styles from './test-drive.module.css';

export default function DriveTestPage() {
  const [fileId, setFileId] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const handleTest = () => {
    if (fileId) {
      setImageUrl(`/api/drive/image/${fileId}`);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Google Drive Image Tester</h1>
      <p className={styles.description}>
        ใส่ File ID จาก Google Drive เพื่อทดลองดึงรูปภาพแสดงผลผ่าน API Proxy ของเรา
      </p>

      <div className={styles.inputGroup}>
        <input
          type="text"
          placeholder="Enter Drive File ID"
          value={fileId}
          onChange={(e) => setFileId(e.target.value)}
          className={styles.input}
        />
        <button
          onClick={handleTest}
          className={styles.button}
        >
          View Image
        </button>
      </div>

      {imageUrl && (
        <div className={styles.resultBox}>
          <h3 className={styles.resultTitle}>Result:</h3>
          <img
            src={imageUrl}
            alt="Drive Content"
            className={styles.resultImage}
            onError={(e) => {
              console.error("❌ ข้อผิดพลาดในการโหลดรูปภาพ");
              alert("ไม่สามารถแสดงรูปได้! ตรวจสอบว่า File ID ถูกต้อง หรือ Share Folder ให้ Service Account หรือยัง?");
            }}
          />
          <p className={styles.resultUrl}>
            URL: {imageUrl}
          </p>
        </div>
      )}

      <div className={styles.infoBox}>
        <h4 className={styles.infoTitle}>⚠️ สำคัญมากก่อนเริ่มใช้งาน:</h4>
        <ol className={styles.infoList}>
          <li>ใน Google Drive ให้เข้าไปที่ Folder ที่เก็บรูป</li>
          <li>กด <strong>Share</strong> (แชร์)</li>
          <li>เพิ่มอีเมลของ Service Account ลงไป (สิทธิ์ Viewer): <code className={styles.code}>smartslip-drive-saver@project-82163c9b-679a-433d-bf3.iam.gserviceaccount.com</code></li>
          <li>เอา <strong>ID ของไฟล์รูป</strong> มาลองกรอกด้านบน</li>
        </ol>
      </div>
    </div>
  );
}
