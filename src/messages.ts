/**
 * Sätze des Widgets (B-03). Ohne Anrede, weil sie sich an Besucherinnen fremder Websites richten.
 *
 * Rätoromanisch fehlt noch: Die Sätze brauchen eine Person, die Rumantsch Grischun schreibt — eine geratene
 * Übersetzung wäre schlechter als die Rückfallsprache.
 */
export type Language = 'de' | 'en' | 'fr' | 'it';

export type Sentence = 'checking' | 'checked';

const MESSAGES: Record<Language, Record<Sentence, string>> = {
    de: {
        checking: 'Prüft, ob die Anfrage echt ist.',
        checked: 'Geprüft.',
    },
    en: {
        checking: 'Checking that this request is genuine.',
        checked: 'Checked.',
    },
    fr: {
        checking: 'Vérification de l’authenticité de la demande.',
        checked: 'Vérifié.',
    },
    it: {
        checking: 'Verifica dell’autenticità della richiesta.',
        checked: 'Verificato.',
    },
};

export const FALLBACK: Language = 'de';

/**
 * Die Sprache aus einer Angabe wie «fr-CH»; unbekannte Sprachen fallen auf Deutsch zurück.
 */
export function languageOf(tag: string | null | undefined): Language {
    const base = (tag ?? '').trim().toLowerCase().split(/[-_]/)[0];

    return base in MESSAGES ? (base as Language) : FALLBACK;
}

export function sentence(language: Language, key: Sentence): string {
    return MESSAGES[language][key];
}
