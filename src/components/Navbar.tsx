'use client';

import React from 'react';
import styles from './Navbar.module.css';
import StepProgressBar from './StepProgressBar';

interface NavbarProps {
    currentStep?: number;
}

const Navbar = ({ currentStep = 1 }: NavbarProps) => {
    return (
        <nav className={styles.navbar}>
            <div className={styles.container}>
                <div className={styles.logoSection}>
                    <span className={styles.logoText}>📦 SmartSlip<span className={styles.ai}>AI</span></span>
                    <div className={styles.divider}></div>
                    <span className={styles.flowLabel}>Project Flow</span>
                </div>
                <div className={styles.stepsSection}>
                    <StepProgressBar currentStep={currentStep} />
                </div>
                <div className={styles.statusSection}>
                    <span className={styles.statusBadge}>System Online</span>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
