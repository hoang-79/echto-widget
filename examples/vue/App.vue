<script setup lang="ts">
import { ref } from 'vue';
import { EchtoWidget } from '../../src/vue';

const props = defineProps<{
    site: string;
    endpoint: string;
    target: string;
    csrf: string;
}>();

const sent = ref(0);
const sending = ref(false);

/**
 * Läuft erst, wenn das Widget geprüft hat: Das Token liegt dann als Feld `echto-token` im Formular.
 */
async function send(event: Event): Promise<void> {
    const form = event.target as HTMLFormElement;

    sending.value = true;

    await fetch(props.target, {
        method: 'POST',
        headers: { Accept: 'application/json', 'X-CSRF-TOKEN': props.csrf },
        body: new FormData(form),
    });

    sending.value = false;
    sent.value++;
    form.reset();
}
</script>

<template>
    <form class="card" @submit.prevent="send">
        <small>Formular <code>kontakt-vue</code></small>
        <label for="vue-name">Name</label>
        <input id="vue-name" name="name" required />
        <label for="vue-email">E-Mail</label>
        <input id="vue-email" name="email" type="email" required />
        <label for="vue-nachricht">Nachricht</label>
        <textarea id="vue-nachricht" name="nachricht" rows="4" required />
        <EchtoWidget :site="site" :endpoint="endpoint" form="kontakt-vue" />
        <button type="submit" :disabled="sending">Senden</button>
        <p v-if="sent > 0" role="status">
            Danke, Ihre Nachricht ist da. ({{ sent }} gesendet, ohne Neuladen)
        </p>
    </form>
</template>
