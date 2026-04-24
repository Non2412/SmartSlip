'use client';

import React from 'react';
import styles from './Skeleton.module.css';

interface SkeletonProps {
    className?: string;
    height?: string | number;
    width?: string | number;
    borderRadius?: string | number;
}

export const Skeleton = ({ className, height, width, borderRadius }: SkeletonProps) => {
    return (
        <div 
            className={`${styles.skeleton} ${className || ''}`} 
            style={{ 
                height: height, 
                width: width,
                borderRadius: borderRadius
            }}
        />
    );
};

export const StatCardSkeleton = () => (
    <Skeleton className={styles.statCardSkeleton} />
);

export const ChartSkeleton = () => (
    <Skeleton className={styles.chartSkeleton} />
);

export const RecentUploadsSkeleton = () => (
    <Skeleton className={styles.recentSkeleton} />
);

export const TableRowSkeleton = () => (
    <Skeleton className={styles.rowSkeleton} />
);
