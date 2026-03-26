import { createContext, useContext, useState, useCallback } from 'react';
import tr from '../i18n/tr';
import en from '../i18n/en';

const DILLER = { tr, en };
const DEPO_ANAHTARI = 'hakbul_dil';

const DilContext = createContext(null);

export function DilProvider({ children }) {
    const [dil, setDil] = useState(() => localStorage.getItem(DEPO_ANAHTARI) || 'tr');

    const dilDegistir = useCallback((yeniDil) => {
        if (DILLER[yeniDil]) {
            setDil(yeniDil);
            localStorage.setItem(DEPO_ANAHTARI, yeniDil);
        }
    }, []);

    const t = useCallback((anahtar) => {
        return DILLER[dil]?.[anahtar] ?? DILLER['tr'][anahtar] ?? anahtar;
    }, [dil]);

    return (
        <DilContext.Provider value={{ dil, dilDegistir, t }}>
            {children}
        </DilContext.Provider>
    );
}

export const useDil = () => useContext(DilContext);
