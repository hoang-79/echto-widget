import { EchtoWidget, rememberScriptOrigin } from './widget';

if (typeof document !== 'undefined') {
    rememberScriptOrigin();
}

if (
    typeof customElements !== 'undefined' &&
    !customElements.get('echto-widget')
) {
    customElements.define('echto-widget', EchtoWidget);
}

export { EchtoWidget };
export { HONEYPOT_FIELD, TOKEN_FIELD } from './widget';
