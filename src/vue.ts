import { defineComponent, h } from 'vue';
import './index';

/**
 * Vue-Baustein (I-02): dünne Hülle um `<echto-widget>`, damit Vue das Element nicht für einen eigenen Baustein
 * hält. Er gehört in das `<form>`; das Token reist im Feld `echto-token` mit den Formulardaten.
 */
export const EchtoWidget = defineComponent({
    name: 'EchtoWidget',
    props: {
        site: { type: String, required: true },
        form: { type: String, required: true },
        action: { type: String, default: undefined },
        endpoint: { type: String, default: undefined },
        theme: { type: String, default: undefined },
    },
    setup(props) {
        // Das Zeichen «^» zwingt Vue, den Wert als Attribut zu setzen statt als Eigenschaft des Elements.
        return () =>
            h('echto-widget', {
                '^site': props.site,
                '^form': props.form,
                '^action': props.action,
                '^endpoint': props.endpoint,
                '^theme': props.theme,
            });
    },
});

export default EchtoWidget;
