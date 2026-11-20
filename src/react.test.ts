import { describe, expect, it } from 'vite-plus/test';

// Die Tests laufen ohne Browser: Für das Laden des Widgets genügt eine leere Elementklasse.
globalThis.HTMLElement ??= class {} as typeof HTMLElement;

const { EchtoWidget } = await import('./react');

describe('React-Baustein', () => {
    it('zeichnet <echto-widget> nur mit den gesetzten Attributen', () => {
        const element = EchtoWidget({
            site: 'site_abc',
            form: 'kontakt',
            theme: 'dark',
        }) as { type: string; props: Record<string, unknown> };

        expect(element.type).toBe('echto-widget');
        expect(element.props).toEqual({
            site: 'site_abc',
            form: 'kontakt',
            theme: 'dark',
        });
    });
});
