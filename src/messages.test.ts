import { describe, expect, it } from 'vite-plus/test';
import { languageOf, sentence } from './messages';

describe('Sätze des Widgets', () => {
    it.each([
        ['de', 'de'],
        ['de-CH', 'de'],
        ['FR_ch', 'fr'],
        ['it', 'it'],
        ['en-GB', 'en'],
        ['rm', 'de'],
        ['ja', 'de'],
        ['', 'de'],
        [null, 'de'],
    ])('liest aus «%s» die Sprache %s', (tag, language) => {
        expect(languageOf(tag)).toBe(language);
    });

    it('hat jeden Satz in jeder Sprache, und keinen doppelt', () => {
        const all = (['de', 'en', 'fr', 'it'] as const).flatMap((language) =>
            (['checking', 'checked'] as const).map((key) =>
                sentence(language, key),
            ),
        );

        expect(all.every((text) => text.length > 5)).toBe(true);
        expect(new Set(all).size).toBe(all.length);
    });
});
