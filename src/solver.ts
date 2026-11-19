import { MAX_NONCE, solveRange } from './sha256';
import InlineWorker from './worker?worker&inline';

const CHUNK = 20_000;

/**
 * Löst die Rechenaufgabe im Hintergrundprozess. Lässt die Seite keinen zu (strenge Content Security Policy, alter
 * Browser), rechnet das Widget in Stücken und gibt dazwischen die Seite frei.
 */
export function solve(prefix: string, bits: number): Promise<number> {
    return solveInWorker(prefix, bits).catch(() => solveInChunks(prefix, bits));
}

function solveInWorker(prefix: string, bits: number): Promise<number> {
    return new Promise((resolve, reject) => {
        const worker = new InlineWorker();

        worker.onmessage = (event: MessageEvent<{ nonce: number }>) => {
            worker.terminate();
            resolve(event.data.nonce);
        };
        worker.onerror = (event) => {
            worker.terminate();
            reject(new Error(event.message));
        };
        worker.postMessage({ prefix, bits });
    });
}

async function solveInChunks(prefix: string, bits: number): Promise<number> {
    for (let from = 0; from <= MAX_NONCE; from += CHUNK) {
        const nonce = solveRange(prefix, bits, from, CHUNK);

        if (nonce !== -1) {
            return nonce;
        }

        await new Promise((resolve) => setTimeout(resolve, 0));
    }

    return -1;
}
