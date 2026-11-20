import { languageOf, sentence } from './messages';
import type { Sentence } from './messages';
import { solve } from './solver';
import { CHECK, MARK, STYLES } from './styles';

/** Name des versteckten Feldes, in dem das Token mit dem Formular reist. */
export const TOKEN_FIELD = 'echto-token';

/** Name des Köderfeldes (F-03). */
export const HONEYPOT_FIELD = 'website_url';

/** So lange wartet das Widget höchstens auf Echto, bevor es das Formular ohne Token weiterschickt. */
const PATIENCE_MS = 10_000;

/** Nach einem Fehler fragt das Widget erst nach dieser Pause oder beim Absenden wieder an. */
const RETRY_PAUSE_MS = 30_000;

/** So lange vor dem Ablauf holt das Widget eine frische Aufgabe, wenn jemand lange am Formular sitzt. */
const REFRESH_BEFORE_EXPIRY_MS = 60_000;

type Solved = {
    challenge: string;
    nonce: number;
    /** Ab wann der Dienst die Lösung annimmt, ohne sie als «zu schnell» zurückzuhalten. */
    readyAt: number;
};

type ChallengeResponse = {
    challenge: string;
    prefix: string;
    bits: number;
    min_seconds: number;
    expires_at: string;
};

let scriptOrigin: string | null = null;

/**
 * Merkt sich, von welcher Adresse das Skript geladen wurde — dort liegt auch die Prüf-Schnittstelle.
 */
export function rememberScriptOrigin(): void {
    const script = document.currentScript;

    if (script instanceof HTMLScriptElement && script.src !== '') {
        scriptOrigin = new URL(script.src).origin;
    }
}

/**
 * `<echto-widget site="…" form="…">` in einem Formular (F-01). Im Ruhezustand ist nichts zu sehen. Sobald das
 * Formular benutzt wird, holt das Widget eine Aufgabe und rechnet im Hintergrund; beim Absenden holt es das Token,
 * legt es ins Formular und lässt das Absenden weiterlaufen.
 *
 * Das Widget hält nie eine Einsendung auf: Antwortet Echto nicht oder scheitert etwas, geht das Formular ohne
 * Token hinaus, und der Server der Kundin hält es zurück (F-14, F-15).
 *
 * Es setzt kein Cookie und legt nichts im Browser ab (D-01). Gezählt wird, **wie oft** getippt, eingefügt, das Feld
 * gewechselt und der Zeiger bewegt wurde — nie, **was** (F-04).
 */
export class EchtoWidget extends HTMLElement {
    // Innere Namen heissen bewusst nie wie ein Attribut (`form`, `endpoint`, `site` …): Frameworks wie Vue setzen
    // Attribute als Eigenschaft, sobald das Element eine gleichnamige hat, und überschrieben sie sonst.
    private hostForm: HTMLFormElement | null = null;
    private solution: Promise<Solved> | null = null;
    private refreshTimer: ReturnType<typeof setTimeout> | undefined;
    private hideTimer: ReturnType<typeof setTimeout> | undefined;
    private counts = { keys: 0, pastes: 0, focus: 0, pointer: 0 };
    private busy = false;
    private pausedUntil = 0;
    private passing = false;

    private box!: HTMLElement;
    private icon!: HTMLElement;
    private text!: HTMLElement;
    private live!: HTMLElement;
    private honeypot: HTMLInputElement | null = null;

    private readonly onFocus = (): void => {
        this.counts.focus++;
        this.warmUp();
    };
    private readonly onKey = (): void => {
        this.counts.keys++;
        this.warmUp();
    };
    private readonly onPaste = (): void => {
        this.counts.pastes++;
    };
    private readonly onPointer = (): void => {
        this.counts.pointer++;
    };
    private readonly onPointerDown = (): void => {
        this.counts.pointer++;
        this.warmUp();
    };
    private readonly onSubmit = (event: Event): void => this.intercept(event);
    private readonly onSchemeChange = (): void => this.followPage();
    private readonly darkDevice =
        typeof matchMedia === 'function'
            ? matchMedia('(prefers-color-scheme: dark)')
            : null;

    connectedCallback(): void {
        if (!this.shadowRoot) {
            this.render();
        }

        this.followPage();
        this.darkDevice?.addEventListener('change', this.onSchemeChange);
        this.hostForm = this.closest('form');

        if (!this.hostForm) {
            console.warn('[echto] <echto-widget> steht in keinem Formular.');

            return;
        }

        this.addHoneypot();
        this.hostForm.addEventListener('focusin', this.onFocus);
        this.hostForm.addEventListener('keydown', this.onKey);
        this.hostForm.addEventListener('paste', this.onPaste);
        this.hostForm.addEventListener('pointermove', this.onPointer, {
            passive: true,
        });
        this.hostForm.addEventListener('pointerdown', this.onPointerDown, {
            passive: true,
        });
        // In der Einfangphase am Dokument: vor allen anderen Behandlern des Formulars, auch denen eines Frameworks.
        document.addEventListener('submit', this.onSubmit, true);
    }

    disconnectedCallback(): void {
        clearTimeout(this.refreshTimer);
        clearTimeout(this.hideTimer);
        document.removeEventListener('submit', this.onSubmit, true);
        this.darkDevice?.removeEventListener('change', this.onSchemeChange);

        if (this.hostForm) {
            this.hostForm.removeEventListener('focusin', this.onFocus);
            this.hostForm.removeEventListener('keydown', this.onKey);
            this.hostForm.removeEventListener('paste', this.onPaste);
            this.hostForm.removeEventListener('pointermove', this.onPointer);
            this.hostForm.removeEventListener(
                'pointerdown',
                this.onPointerDown,
            );
        }

        this.hostForm = null;
    }

    /**
     * Prüft jetzt und gibt das Token zurück — oder `null`, wenn Echto nicht erreichbar war. Für Formulare, die
     * nicht über ein gewöhnliches Absenden laufen; sonst ruft das Widget diese Methode selbst auf.
     */
    async verify(): Promise<string | null> {
        this.busy = true;
        this.show('checking');

        try {
            const token = await within(PATIENCE_MS, this.fetchToken());

            this.tokenField().value = token;
            this.show('checked');

            return token;
        } catch (error) {
            console.warn(
                '[echto] Nicht geprüft; das Formular geht ohne Token hinaus.',
                error,
            );
            this.clearToken();
            this.hide();

            return null;
        } finally {
            this.busy = false;
            this.solution = null;
            clearTimeout(this.refreshTimer);
        }
    }

    private intercept(event: Event): void {
        if (event.target !== this.hostForm || !this.hostForm) {
            return;
        }

        if (this.passing) {
            // Zweiter Durchgang: Das Token liegt im Formular, alle anderen Behandler kommen jetzt zum Zug. Danach
            // ist das Token verbraucht — ein weiteres Absenden ohne Neuladen bekommt ein neues.
            this.passing = false;
            setTimeout(() => this.reset(), 0);

            return;
        }

        event.preventDefault();
        event.stopImmediatePropagation();

        if (this.busy) {
            return;
        }

        const form = this.hostForm;
        const submitter = (event as SubmitEvent).submitter;

        void this.verify().then(() => {
            // Erst nach dem laufenden Absenden fortsetzen: Kommt das Ergebnis sofort (etwa ein Fehler, der schon
            // feststand), bearbeitet der Browser noch das erste Absenden und überginge ein zweites stillschweigend —
            // das Formular bliebe stehen.
            setTimeout(() => {
                this.passing = true;
                form.requestSubmit(
                    submitter instanceof HTMLElement && submitter.isConnected
                        ? submitter
                        : undefined,
                );
            }, 0);
        });
    }

    /**
     * Beginnt im Hintergrund zu rechnen. Scheitert das, zeigt es sich beim Absenden — hier bleibt es still.
     */
    private warmUp(): void {
        this.prepare().catch(() => undefined);
    }

    /**
     * Holt beim ersten Zeichen von Benutzung die Aufgabe und beginnt zu rechnen (F-01: erst bei Benutzung).
     */
    private prepare(now = false): Promise<Solved> {
        if (!this.solution && !now && Date.now() < this.pausedUntil) {
            return Promise.reject(
                new Error('Echto war eben nicht erreichbar.'),
            );
        }

        if (!this.solution) {
            const solution = this.fetchSolution();

            this.solution = solution;
            // Ein Fehler hier darf nichts kaputt machen. Die gescheiterte Aufgabe wird vergessen, damit das
            // Absenden es noch einmal versuchen kann.
            solution.catch(() => {
                if (this.solution === solution) {
                    this.solution = null;
                    // Nicht bei jedem Tastendruck neu anklopfen: Bis zum Absenden ruht das Widget eine Weile.
                    this.pausedUntil = Date.now() + RETRY_PAUSE_MS;
                }
            });
        }

        return this.solution;
    }

    private async fetchSolution(): Promise<Solved> {
        const response = await this.post('/v1/challenge', {
            site: this.getAttribute('site'),
            form: this.getAttribute('form'),
            action: this.getAttribute('action') ?? undefined,
        });
        const data = (await response.json()) as ChallengeResponse;
        const received = Date.now();
        const nonce = await solve(data.prefix, data.bits);

        // Sitzt jemand lange am Formular, läuft die Aufgabe ab. Eine frische, rechtzeitig geholt, ist beim Absenden
        // alt genug, um nicht als «zu schnell» zu gelten.
        const lifetime =
            Date.parse(data.expires_at) - received - REFRESH_BEFORE_EXPIRY_MS;

        clearTimeout(this.refreshTimer);
        this.refreshTimer = setTimeout(
            () => {
                if (!this.busy) {
                    this.solution = null;
                    this.warmUp();
                }
            },
            Math.max(lifetime, REFRESH_BEFORE_EXPIRY_MS),
        );

        return {
            challenge: data.challenge,
            nonce,
            readyAt: received + data.min_seconds * 1000 + 250,
        };
    }

    private async fetchToken(): Promise<string> {
        const solved = await this.prepare(true);

        // Wer schneller ist als die Mindestzeit des Dienstes, wartet hier die Differenz ab, statt zurückgehalten
        // zu werden — höchstens wenige Sekunden.
        await pause(solved.readyAt - Date.now());

        const response = await this.post('/v1/token', {
            challenge: solved.challenge,
            nonce: solved.nonce,
            signals: {
                ...this.counts,
                webdriver: navigator.webdriver === true,
                honeypot: this.honeypot !== null && this.honeypot.value !== '',
            },
        });
        const data = (await response.json()) as { token: string };

        return data.token;
    }

    private async post(
        path: string,
        body: Record<string, unknown>,
    ): Promise<Response> {
        const response = await fetch(this.apiBase() + path, {
            method: 'POST',
            mode: 'cors',
            // Ohne Cookies und ohne Anmeldedaten (D-01).
            credentials: 'omit',
            referrerPolicy: 'origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const error = (await response.json().catch(() => null)) as {
                error?: { code?: string; message?: string };
            } | null;

            throw new Error(
                `${path}: ${error?.error?.code ?? response.status} — ${error?.error?.message ?? ''}`,
            );
        }

        return response;
    }

    private apiBase(): string {
        const endpoint = this.getAttribute('endpoint') ?? scriptOrigin;

        if (!endpoint) {
            throw new Error(
                'Adresse von Echto unbekannt: Attribut «endpoint» setzen.',
            );
        }

        return endpoint.replace(/\/+$/, '');
    }

    /**
     * Dunkel nur, wenn die Seite selbst den Dunkelmodus kennt (`color-scheme` enthält `dark`) und das Gerät ihn
     * verlangt. Ein festes `theme` geht vor.
     */
    private followPage(): void {
        const pageSupportsDark = getComputedStyle(this)
            .colorScheme.split(/\s+/)
            .includes('dark');

        this.toggleAttribute(
            'data-echto-dark',
            !this.hasAttribute('theme') &&
                pageSupportsDark &&
                this.darkDevice?.matches === true,
        );
    }

    private render(): void {
        const root = this.attachShadow({ mode: 'open' });

        root.innerHTML = `<style>${STYLES}</style>
            <div class="box" part="box" hidden>
                <span class="icon"></span>
                <span class="text" aria-hidden="true"></span>
                <span class="name" aria-hidden="true">echto</span>
            </div>
            <span class="live" role="status" aria-live="polite"></span>`;

        this.box = root.querySelector('.box') as HTMLElement;
        this.icon = root.querySelector('.icon') as HTMLElement;
        this.text = root.querySelector('.text') as HTMLElement;
        this.live = root.querySelector('.live') as HTMLElement;
    }

    private show(state: Sentence): void {
        const text = sentence(
            languageOf(this.closest('[lang]')?.getAttribute('lang')),
            state,
        );

        clearTimeout(this.hideTimer);
        this.box.hidden = false;
        this.box.className = `box ${state}`;
        this.icon.innerHTML = state === 'checking' ? MARK : CHECK;
        this.text.textContent = text;
        this.live.textContent = text;
        this.hostForm?.setAttribute('aria-busy', String(state === 'checking'));

        if (state === 'checked') {
            // Bleibt die Seite stehen (Formular ohne Neuladen), verschwindet der Satz wieder.
            this.hideTimer = setTimeout(() => this.hide(), 4000);
        }
    }

    private hide(): void {
        this.box.hidden = true;
        this.live.textContent = '';
        this.hostForm?.removeAttribute('aria-busy');
    }

    private reset(): void {
        this.clearToken();
        this.counts = { keys: 0, pastes: 0, focus: 0, pointer: 0 };
    }

    /**
     * Name des Feldes für das Token: `echto-token`, oder beim Umstieg der Name des bisherigen Dienstes
     * (`field="g-recaptcha-response"`), damit der Server der Kundin weiter dasselbe Feld liest (K-05).
     */
    private tokenName(): string {
        return this.getAttribute('field') ?? TOKEN_FIELD;
    }

    private tokenField(): HTMLInputElement {
        let field = this.querySelector<HTMLInputElement>(
            `input[name="${CSS.escape(this.tokenName())}"]`,
        );

        if (!field) {
            field = document.createElement('input');
            field.type = 'hidden';
            field.name = this.tokenName();
            this.append(field);
        }

        return field;
    }

    private clearToken(): void {
        this.querySelector(
            `input[name="${CSS.escape(this.tokenName())}"]`,
        )?.remove();
    }

    /**
     * Köderfeld (F-03): für Menschen unsichtbar, mit der Tastatur nicht erreichbar, für Bildschirmleser
     * ausgeblendet. Es steht im Formular selbst, damit es auch ohne Token mitgesendet wird.
     */
    private addHoneypot(): void {
        if (this.honeypot?.isConnected) {
            return;
        }

        const wrapper = document.createElement('span');

        wrapper.setAttribute('aria-hidden', 'true');
        wrapper.inert = true;
        wrapper.style.cssText =
            'position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden';

        this.honeypot = document.createElement('input');
        this.honeypot.type = 'text';
        this.honeypot.name = this.getAttribute('honeypot') ?? HONEYPOT_FIELD;
        this.honeypot.tabIndex = -1;
        this.honeypot.autocomplete = 'off';

        wrapper.append(this.honeypot);
        this.append(wrapper);
    }
}

function pause(ms: number): Promise<void> {
    return ms > 0
        ? new Promise((resolve) => setTimeout(resolve, ms))
        : Promise.resolve();
}

function within<T>(ms: number, promise: Promise<T>): Promise<T> {
    return Promise.race([
        promise,
        new Promise<never>((_, reject) =>
            setTimeout(
                () =>
                    reject(
                        new Error(`keine Antwort innert ${ms / 1000} Sekunden`),
                    ),
                ms,
            ),
        ),
    ]);
}
