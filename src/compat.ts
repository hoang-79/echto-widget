/**
 * Umstieg ohne neues Markup (K-05): Echto versteht die Markierungen von reCAPTCHA, hCaptcha und Turnstile. Wo
 * `<div class="g-recaptcha" data-sitekey="…">` steht, setzt das Skript ein `<echto-widget>` hinein, das sein Token
 * ins gewohnte Feld legt. Der Server der Kundin liest weiter dasselbe Feld und fragt bei `/v1/siteverify` nach.
 *
 * Nicht übernommen wird die Programmier-Schnittstelle der bisherigen Dienste (`grecaptcha.execute()`,
 * `hcaptcha.render()`, `turnstile.render()`, `data-callback`): Wer sie nutzt, baut `<echto-widget>` direkt ein.
 */
export const FOREIGN_MARKUP = [
    { selector: '.g-recaptcha', field: 'g-recaptcha-response' },
    { selector: '.h-captcha', field: 'h-captcha-response' },
    { selector: '.cf-turnstile', field: 'cf-turnstile-response' },
] as const;

/** Formular, wenn weder `data-echto-form` noch `data-action` noch `id` oder `name` des Formulars etwas sagen. */
export const FALLBACK_FORM = 'default';

const KEY = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/;

/**
 * Kennung des Formulars, wie sie die Prüf-Schnittstelle annimmt: Buchstaben, Ziffern, Punkt, Bindestrich,
 * Unterstrich, höchstens 64 Zeichen.
 */
export function formKeyOf(
    ...candidates: (string | null | undefined)[]
): string {
    for (const candidate of candidates) {
        const key = (candidate ?? '')
            .trim()
            .replace(/[^A-Za-z0-9_.-]+/g, '-')
            .replace(/^[^A-Za-z0-9]+/, '')
            .slice(0, 64);

        if (KEY.test(key)) {
            return key;
        }
    }

    return FALLBACK_FORM;
}

/**
 * Setzt in jede fremde Markierung mit `data-sitekey` ein `<echto-widget>`. Eine Markierung wird nur einmal
 * übernommen.
 */
export function adoptForeignMarkup(root: ParentNode = document): number {
    let adopted = 0;

    for (const { selector, field } of FOREIGN_MARKUP) {
        root.querySelectorAll<HTMLElement>(`${selector}[data-sitekey]`).forEach(
            (element) => {
                if (element.hasAttribute('data-echto')) {
                    return;
                }

                const form = element.closest('form');
                const widget = document.createElement('echto-widget');

                widget.setAttribute('site', element.dataset.sitekey ?? '');
                widget.setAttribute(
                    'form',
                    formKeyOf(
                        element.dataset.echtoForm,
                        element.dataset.action,
                        form?.id,
                        form?.getAttribute('name'),
                    ),
                );
                widget.setAttribute('field', field);

                if (
                    element.dataset.theme === 'light' ||
                    element.dataset.theme === 'dark'
                ) {
                    widget.setAttribute('theme', element.dataset.theme);
                }

                element.setAttribute('data-echto', '');
                element.append(widget);
                adopted++;
            },
        );
    }

    return adopted;
}

/**
 * Übernimmt die Markierungen, sobald das Dokument steht, und später hinzugefügte (etwa von einem Framework
 * gezeichnete Formulare).
 */
export function watchForeignMarkup(): void {
    const start = (): void => {
        adoptForeignMarkup();

        if (typeof MutationObserver !== 'undefined') {
            new MutationObserver(() => adoptForeignMarkup()).observe(
                document.documentElement,
                { childList: true, subtree: true },
            );
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
        start();
    }
}
