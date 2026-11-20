/**
 * Das Nötigste aus React für den Baustein in `react.ts`. React ist eine freiwillige Abhängigkeit der Kundin; die
 * Typen von React gehören nicht in dieses Paket.
 */
declare module 'react' {
    export function createElement(
        type: string,
        props: Record<string, unknown> | null,
        ...children: unknown[]
    ): unknown;
}
