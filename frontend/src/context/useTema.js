import { useContext } from 'react';
import { TemaContext } from './TemaContextValue';

export function useTema() {
    return useContext(TemaContext);
}
