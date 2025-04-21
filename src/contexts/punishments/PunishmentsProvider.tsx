import React, { createContext, useContext, useEffect, useState } from 'react';
import { PunishmentsContextType } from './types';
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
        setGlobalCarouselTimer
    };

    return (
        <PunishmentsContext.Provider value={contextValue}>
            {children}
        </PunishmentsContext.Provider>
    );
};

export const usePunishments = (): PunishmentsContextType => {
    const context = useContext(PunishmentsContext);
    if (context === undefined) {
        throw new Error('usePunishments must be used within a PunishmentsProvider');
    }
    return context;
};
