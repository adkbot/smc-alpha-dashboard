import { useRef, useEffect, useState } from 'react';

/**
 * Hook para polling controlado - evita re-renders excessivos e flickering
 * @param callback Função a ser executada
 * @param interval Intervalo em milissegundos (padrão: 30000 = 30 segundos)
 */
export function useControlledPolling(
    callback: () => void | Promise<void>,
    interval: number | null = 30000
) {
    const savedCallback = useRef(callback);

    // Atualiza a referência do callback se ele mudar
    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    // Configura o intervalo
    useEffect(() => {
        if (interval === null) return;

        const tick = () => {
            savedCallback.current();
        };

        //Executa imediatamente
        tick();

        // Depois executa no intervalo
        const id = setInterval(tick, interval);

        return () => clearInterval(id);
    }, [interval]);
}

/**
 * Hook para debounce - evita execuções muito frequentes
 * @param value Valor a ser debounced
 * @param delay Delay em milissegundos (padrão: 500ms)
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}
