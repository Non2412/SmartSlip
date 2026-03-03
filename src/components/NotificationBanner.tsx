'use client';

import React, { useState } from 'react';

const NotificationBanner = () => {
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) return null;

    return (
        <div className="notification-banner">
            <div className="banner-content">
                <span className="banner-text">
                    ขอบคุณผู้ใช้งานที่น่ารักทุกคนที่เข้ามาใช้งาน Paypers ครับ เราเป็น Product น้องใหม่ที่ตั้งใจอย่างมากที่จะพัฒนาฟีเจอร์ให้ไวและตรงจุด หากตรวจพบปัญหาอะไรหรืออยากให้เราพัฒนาอะไรเพิ่ม สามารถ feedback มาได้ตลอดนะ โดยทีมงาน 🦀
                </span>
                <span className="banner-text">
                    ขอบคุณผู้ใช้งานที่น่ารักทุกคนที่เข้ามาใช้งาน Paypers ครับ เราเป็น Product น้องใหม่ที่ตั้งใจอย่างมากที่จะพัฒนาฟีเจอร์ให้ไวและตรงจุด หากตรวจพบปัญหาอะไรหรืออยากให้เราพัฒนาอะไรเพิ่ม สามารถ feedback มาได้ตลอดนะ โดยทีมงาน 🦀
                </span>
            </div>
            <button
                className="banner-close"
                onClick={() => setIsVisible(false)}
                aria-label="Close notification"
            >
                ×
            </button>
        </div>
    );
};

export default NotificationBanner;
