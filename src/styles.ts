/**
 * Erscheinungsbild des Widgets (gestaltung.md § 3 und § 4): 340 × 68 px, Symbol 28 px, Satz 15 px. Es lädt keine
 * Schrift nach und nutzt Plex Sans nur, wenn die Seite sie hat. Die Farben lassen sich von aussen über
 * CSS-Variablen setzen (B-05).
 *
 * Hell oder dunkel folgt der Seite, nicht blind dem Gerät: Ein dunkles Widget auf einer hellen Seite wäre falsch,
 * nur weil das Gerät im Dunkelmodus läuft. `theme="light"` und `theme="dark"` legen die Fassung fest; ohne Angabe
 * setzt das Widget `dark` selbst, wenn die Seite den Dunkelmodus unterstützt (`color-scheme`) und das Gerät ihn will.
 */
const DARK = `
    --_background: var(--echto-background, #26342d);
    --_text: var(--echto-text, #f5f4ef);
    --_muted: var(--echto-muted, #a7b2ab);
    --_border: var(--echto-border, #26342d);
    --_accent: var(--echto-accent, #5fd39a);
    --_mark: var(--echto-text, #f5f4ef);
`;

export const STYLES = `
    :host {
        display: block;
        --_background: var(--echto-background, #ffffff);
        --_text: var(--echto-text, #16211c);
        --_muted: var(--echto-muted, #5b665f);
        --_border: var(--echto-border, #d7ddd8);
        --_accent: var(--echto-accent, #14734a);
        --_mark: var(--echto-text, #16211c);
    }
    :host([theme='dark']), :host([data-echto-dark]) { ${DARK} }
    .box {
        display: flex;
        align-items: center;
        gap: 12px;
        box-sizing: border-box;
        width: 340px;
        max-width: 100%;
        min-height: 68px;
        margin: 12px 0;
        padding: 12px 16px;
        border: 1px solid var(--_border);
        border-radius: var(--echto-radius, 10px);
        background: var(--_background);
        color: var(--_text);
        font: 500 15px/1.4 'IBM Plex Sans', system-ui, sans-serif;
    }
    .box[hidden] { display: none; }
    svg { flex: 0 0 28px; width: 28px; height: 28px; }
    .text { flex: 1; min-width: 0; }
    .name { font-size: 12.5px; font-weight: 600; color: var(--_muted); }
    .checking svg { animation: pulse 1.2s ease-in-out infinite; }
    @keyframes pulse { 50% { opacity: 0.45; } }
    @media (prefers-reduced-motion: reduce) {
        .checking svg { animation: none; }
    }
    .live {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip-path: inset(50%);
        white-space: nowrap;
    }
`;

/** Das Zeichen der Marke: der geteilte Ring. */
export const MARK = `<svg viewBox="130 130 561 561" aria-hidden="true"><path d="M405.52 136.05 A274.50 274.50 0 0 0 322.01 670.35 L355.14 537.46 A138.50 138.50 0 0 1 421.22 272.42 L439.36 199.68 Z" fill="var(--_mark)"/><path d="M543.75 170.51 A274.50 274.50 0 0 1 366.64 681.47 L399.78 548.58 A138.50 138.50 0 0 0 465.86 283.54 L483.99 210.81 Z" fill="var(--_accent)"/></svg>`;

/** Häkchen im Kreis: geprüft. */
export const CHECK = `<svg viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="12.5" fill="none" stroke="var(--_accent)" stroke-width="2.5"/><path d="M8.5 14.5l3.7 3.7 7.3-8" fill="none" stroke="var(--_accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
