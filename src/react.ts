import { createElement } from 'react';
import './index';

/**
 * Eigenschaften des React-Bausteins — dieselben wie die Attribute von `<echto-widget>`.
 */
export type EchtoWidgetProps = {
    site: string;
    form: string;
    action?: string;
    endpoint?: string;
    theme?: 'light' | 'dark';
    /** React 19: Verweis auf das Element, etwa um `verify()` selbst aufzurufen. */
    ref?: unknown;
};

/**
 * React-Baustein (I-06): dünne Hülle um `<echto-widget>` für React 18 und 19. Er gehört in das `<form>`; das Token
 * reist im Feld `echto-token` mit den Formulardaten. Das Widget hat keine Eigenschaften, die wie seine Attribute
 * heissen — React setzt die Werte deshalb als Attribute, wie das Widget sie erwartet.
 */
export function EchtoWidget(props: EchtoWidgetProps): unknown {
    const attributes: Record<string, unknown> = {};

    for (const name of [
        'site',
        'form',
        'action',
        'endpoint',
        'theme',
    ] as const) {
        if (props[name] !== undefined) {
            attributes[name] = props[name];
        }
    }

    if (props.ref !== undefined) {
        attributes.ref = props.ref;
    }

    return createElement('echto-widget', attributes);
}

export default EchtoWidget;
