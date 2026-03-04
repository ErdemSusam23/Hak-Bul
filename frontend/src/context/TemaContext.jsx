import { createContext, useContext, useState, useEffect } from 'react';

const TemaContext = createContext();

export function TemaProvider({ children }) {
    const [tema, setTema] = useState(() => localStorage.getItem('tema') || 'acik');

    useEffect(() => {
        localStorage.setItem('tema', tema);
    }, [tema]);

    const toggleTema = () => setTema(t => t === 'koyu' ? 'acik' : 'koyu');

    return (
        <TemaContext.Provider value={{ tema, toggleTema }}>
            {children}
        </TemaContext.Provider>
    );
}

export const useTema = () => useContext(TemaContext);
