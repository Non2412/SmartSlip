'use client';

import { useState } from 'react';

export default function DriveTestPage() {
  const [fileId, setFileId] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const handleTest = () => {
    if (fileId) {
      setImageUrl(`/api/drive/image/${fileId}`);
    }
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '20px', color: '#333' }}>Google Drive Image Tester</h1>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        ใส่ File ID จาก Google Drive เพื่อทดลองดึงรูปภาพแสดงผลผ่าน API Proxy ของเรา
      </p>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
        <input
          type="text"
          placeholder="Enter Drive File ID"
          value={fileId}
          onChange={(e) => setFileId(e.target.value)}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid #ddd',
            fontSize: '16px'
          }}
        />
        <button
          onClick={handleTest}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: 'none',
            background: '#4285F4',
            color: 'white',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          View Image
        </button>
      </div>

      {imageUrl && (
        <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #eee', background: '#f9f9f9', padding: '20px', textAlign: 'center' }}>
          <h3 style={{ marginBottom: '15px' }}>Result:</h3>
          <img
            src={imageUrl}
            alt="Drive Content"
            style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px' }}
            onError={(e) => {
              console.error("❌ ข้อผิดพลาดในการโหลดรูปภาพ");
              alert("ไม่สามารถแสดงรูปได้! ตรวจสอบว่า File ID ถูกต้อง หรือ Share Folder ให้ Service Account หรือยัง?");
            }}
          />
          <p style={{ marginTop: '10px', fontSize: '12px', color: '#999' }}>
            URL: {imageUrl}
          </p>
        </div>
      )}

      <div style={{ marginTop: '40px', padding: '20px', background: '#e8f0fe', borderRadius: '12px' }}>
        <h4 style={{ color: '#1967d2', marginBottom: '10px' }}>⚠️ สำคัญมากก่อนเริ่มใช้งาน:</h4>
        <ol style={{ paddingLeft: '20px', color: '#333', lineHeight: '1.6' }}>
          <li>ใน Google Drive ให้เข้าไปที่ Folder ที่เก็บรูป</li>
          <li>กด <strong>Share</strong> (แชร์)</li>
          <li>เพิ่มอีเมลของ Service Account ลงไป (สิทธิ์ Viewer): <code style={{ background: '#fff', padding: '2px 5px', borderRadius: '4px' }}>smartslip-drive-saver@project-82163c9b-679a-433d-bf3.iam.gserviceaccount.com</code></li>
          <li>เอา <strong>ID ของไฟล์รูป</strong> มาลองกรอกด้านบน</li>
        </ol>
      </div>
    </div>
  );
}
