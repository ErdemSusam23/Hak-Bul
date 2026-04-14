import { useContext } from 'react';
import { DilContext } from './DilContextValue';

export function useDil() {
    return useContext(DilContext);
}
