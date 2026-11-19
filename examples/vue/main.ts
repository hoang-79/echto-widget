import { createApp } from 'vue';
import App from './App.vue';

/**
 * Beispiel der lokalen Beispiel-Kundin: ein Kontaktformular in Vue, ohne Neuladen der Seite abgesendet.
 */
const target = document.getElementById('beispiel-vue');

if (target) {
    const {
        site = '',
        endpoint = '',
        target: action = '',
        csrf = '',
    } = target.dataset;

    createApp(App, { site, endpoint, target: action, csrf }).mount(target);
}
