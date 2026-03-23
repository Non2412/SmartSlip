'use client';

import React, { useState } from 'react';
import styles from './NotificationBanner.module.css';

const NotificationBanner = () => {
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) return null;

    return (
        <div className={styles.notificationBanner}>
            <div className={styles.bannerContent}>
                <span className={styles.bannerText}>
                    ขอบคุณผู้ใช้งานที่น่ารักทุกคนที่เข้ามาใช้งาน SmartSlip AI ครับ เราเป็น Product น้องใหม่ที่ตั้งใจอย่างมากที่จะพัฒนาฟีเจอร์ให้ไวและตรงจุด หากตรวจพบปัญหาอะไรหรืออยากให้เราพัฒนาอะไรเพิ่ม สามารถ feedback มาได้ตลอดนะ โดยทีมงาน 🦀
                </span>
                <span className={styles.bannerText}>
                    ขอบคุณผู้ใช้งานที่น่ารักทุกคนที่เข้ามาใช้งาน SmartSlip AI ครับ เราเป็น Product น้องใหม่ที่ตั้งใจอย่างมากที่จะพัฒนาฟีเจอร์ให้ไวและตรงจุด หากตรวจพบปัญหาอะไรหรืออยากให้เราพัฒนาอะไรเพิ่ม สามารถ feedback มาได้ตลอดนะ โดยทีมงาน 🦀
                </span>
            </div>
            <button
                className={styles.bannerClose}
                onClick={() => setIsVisible(false)}
                aria-label="Close notification"
            >
                ×
            </button>
        </div>
    );
};

export default NotificationBanner;
