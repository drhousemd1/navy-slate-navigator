import React, { createContext, useContext, useEffect, useState } from 'react';
import { PunishmentData, PunishmentsContextType } from './types';
import { usePunishmentOperations } from './usePunishmentOperations';

const PunishmentsContext = createContext<PunishmentsContextType | undefined>(undefined);

// Default carousel timer in seconds
const DEFAULT_CAROUSEL_TIMER = 5;

export const PunishmentsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [globalCarouselTimer, setGlobalCarouselTimer] = useState(DEFAULT_CAROUSEL_TIMER);
    const operations = usePunishmentOperations();

    // Update the globalCarouselTimer when punishments change. The new code will check if any punishments have the timer set.
    useEffect(() => {
        if (operations.punishments.length > 0) {
            // Find the first punishment with a custom timer or use default
            const firstWithTimer = operations.punishments.find(p => p.carousel_timer !== undefined);
            if (firstWithTimer && firstWithTimer.carousel_timer) {
                setGlobalCarouselTimer(firstWithTimer.carousel_timer);
            } else {
                setGlobalCarouselTimer(DEFAULT_CAROUSEL_TIMER);
            }
        } else {
            setGlobalCarouselTimer(DEFAULT_CAROUSEL_TIMER);
        }
    }, [operations.punishments]);

    const contextValue: PunishmentsContextType = {
        ...operations,
        globalCarouselTimer,
        setGlobalCarouselTimer,
        fetchPunishments: operations.refetchPunishments,
        createPunishment: async (punishmentData: PunishmentData) => {
            await operations.createPunishment(punishmentData);
            return ""; // Return a default value, since the original function returns a string
        },
        updatePunishment: async (id: string, punishmentData: PunishmentData) => {
            await operations.updatePunishment(id, punishmentData);
        },
        deletePunishment: async (id: string) => {
            await operations.deletePunishment(id);
        },
        applyPunishment: async (punishmentId: string, points: number) => {
            console.log("applyPunishment is not implemented yet");
        },
        getPunishmentHistory: (punishmentId: string) => {
            console.log("getPunishmentHistory is not implemented yet");
            return [];
        },
        punishmentHistory: [],
        error: null,
        totalPointsDeducted: 0
    };

    return (
        <PunishmentsContext.Provider value={contextValue}>
            {children}
        </PunishmentsContext.Provider>
    );
};

export const usePunishments = () => {
    const context = useContext(PunishmentsContext);
    if (!context) {
        throw new Error('usePunishments must be used within a PunishmentsProvider');
    }
    return context;
};
