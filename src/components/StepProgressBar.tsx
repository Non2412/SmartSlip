'use client';

import React from 'react';
import styles from './StepProgressBar.module.css';

interface Step {
    id: number;
    label: string;
}

const steps: Step[] = [
    { id: 1, label: 'Login' },
    { id: 2, label: 'Upload' },
    { id: 3, label: 'Processing' },
    { id: 4, label: 'Review' },
    { id: 5, label: 'Confirm' },
    { id: 6, label: 'Done' },
];

const StepProgressBar = ({ currentStep = 1 }: { currentStep?: number }) => {
    return (
        <div className={styles.container}>
            <div className={styles.stepsWrapper}>
                {steps.map((step) => {
                    const isActive = step.id === currentStep;
                    const isCompleted = step.id < currentStep;

                    return (
                        <div
                            key={step.id}
                            className={`${styles.stepItem} ${isActive ? styles.active : ''} ${isCompleted ? styles.completed : ''}`}
                        >
                            <div className={styles.circle}>
                                {isCompleted ? (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                ) : (
                                    step.id
                                )}
                            </div>
                            <span className={styles.label}>{step.label}</span>
                            {step.id < steps.length && (
                                <div className={styles.connector}>
                                    <div
                                        className={styles.connectorProgress}
                                        style={{ width: isCompleted ? '100%' : '0%' }}
                                    ></div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default StepProgressBar;
