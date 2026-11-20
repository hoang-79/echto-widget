import { describe, expect, it } from 'vite-plus/test';
import { FALLBACK_FORM, formKeyOf } from './compat';

describe('Kennung des Formulars beim Umstieg', () => {
    it.each([
        [['kontakt'], 'kontakt'],
        [[undefined, 'newsletter_anmelden'], 'newsletter_anmelden'],
        [[null, '', 'Kontakt Formular'], 'Kontakt-Formular'],
        [['--offerte'], 'offerte'],
        [['ä'], FALLBACK_FORM],
        [[], FALLBACK_FORM],
    ])('macht aus %j die Kennung «%s»', (candidates, key) => {
        expect(formKeyOf(...candidates)).toBe(key);
    });

    it('kürzt auf 64 Zeichen', () => {
        expect(formKeyOf('a'.repeat(80))).toHaveLength(64);
    });
});
