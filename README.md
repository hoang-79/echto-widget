# @echto/widget

Das Widget von [Echto](https://echto.ch): prüft, ob ein Mensch ein Formular absendet — ohne Rätsel, ohne Cookies, ohne Speicher im Browser. Im Ruhezustand ist nichts zu sehen; beim Absenden steht höchstens ein Satz da.

## Als Skript

```html
<form method="post" action="/kontakt">
    …
    <echto-widget site="site_…" form="kontakt"></echto-widget>
    <button>Senden</button>
</form>
<script src="https://app.echto.ch/widget/v1/echto.js" defer></script>
```

Das Token reist im Feld `echto-token` mit dem Formular. Dein Server fragt damit `POST /v1/verify` nach dem Urteil (`pass`, `review`, `block`) — Beispiele für PHP, Node.js und Python liegen bei den Beispielen.

**Umstieg:** Das Skript versteht auch `<div class="g-recaptcha" data-sitekey="site_…">` (ebenso `h-captcha` und `cf-turnstile`) und legt das Token ins gewohnte Feld. Dein Server fragt dann `POST /v1/siteverify` im Format des bisherigen Dienstes.

## Als Paket

```bash
npm install @echto/widget
```

```js
import '@echto/widget'; // meldet <echto-widget> an
```

**Vue**

```vue
<script setup>
import { EchtoWidget } from '@echto/widget/vue';
</script>

<template>
    <form @submit.prevent="senden">
        …
        <EchtoWidget
            site="site_…"
            form="kontakt"
            endpoint="https://app.echto.ch"
        />
    </form>
</template>
```

**React** (18 und 19)

```jsx
import { EchtoWidget } from '@echto/widget/react';

<form method="post" action="/kontakt">
    …
    <EchtoWidget site="site_…" form="kontakt" endpoint="https://app.echto.ch" />
</form>;
```

Für Markup des bisherigen Dienstes im Paket: `import { adoptForeignMarkup } from '@echto/widget'; adoptForeignMarkup();`.

## Attribute

| Attribut   | Bedeutung                                                           |
| ---------- | ------------------------------------------------------------------- |
| `site`     | Kennung der Website, beginnt mit `site_`                            |
| `form`     | Kennung des Formulars, frei wählbar                                 |
| `action`   | Aktion innerhalb des Formulars, Vorgabe `submit`                    |
| `endpoint` | Adresse von Echto; als Skript geladen, gilt die Adresse des Skripts |
| `theme`    | `light` oder `dark` fest; ohne Angabe folgt das Widget der Seite    |
| `field`    | Name des Feldes für das Token, Vorgabe `echto-token`                |

Antwortet Echto nicht innert zehn Sekunden, geht das Formular ohne Token hinaus — der Server hält es dann zurück, statt es zu verwerfen.
