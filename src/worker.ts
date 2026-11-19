/**
 * Hintergrundprozess des Widgets: löst die Rechenaufgabe, ohne die Seite zu bremsen.
 */
import { MAX_NONCE, solveRange } from './sha256';

self.onmessage = (event: MessageEvent<{ prefix: string; bits: number }>) => {
    const { prefix, bits } = event.data;

    self.postMessage({ nonce: solveRange(prefix, bits, 0, MAX_NONCE + 1) });
};
