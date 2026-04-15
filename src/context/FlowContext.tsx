'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export type FlowStep = 1 | 2 | 3 | 4 | 5 | 6;

interface FlowContextType {
    currentStep: FlowStep;
    setStep: (step: FlowStep) => void;
}

const FlowContext = createContext<FlowContextType | undefined>(undefined);

export const FlowProvider = ({ children }: { children: ReactNode }) => {
    const [currentStep, setCurrentStep] = useState<FlowStep>(1); // Default to Login step

    const setStep = (step: FlowStep) => {
        setCurrentStep(step);
    };

    return (
        <FlowContext.Provider value={{ currentStep, setStep }}>
            {children}
        </FlowContext.Provider>
    );
};

export const useFlow = () => {
    const context = useContext(FlowContext);
    if (!context) {
        throw new Error('useFlow must be used within a FlowProvider');
    }
    return context;
};
