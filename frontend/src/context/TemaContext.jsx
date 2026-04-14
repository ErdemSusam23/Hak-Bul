import { useState, useEffect } from 'react';
import { TemaContext } from './TemaContextValue';

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
