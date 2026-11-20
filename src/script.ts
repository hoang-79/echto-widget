import { watchForeignMarkup } from './compat';
import './index';

/**
 * Einstieg für `<script src="…/widget/v1/echto.js">`: das Widget und dazu der Umstieg aus fremdem Markup (K-05).
 * Das npm-Paket übernimmt fremdes Markup nicht von selbst; dort steht `<echto-widget>` im Code der Anwendung.
 */
if (typeof document !== 'undefined') {
    watchForeignMarkup();
}

export { EchtoWidget, HONEYPOT_FIELD, TOKEN_FIELD } from './index';
