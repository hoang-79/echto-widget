/**
 * Arbeitsnachweis im Browser (F-02): SHA-256 für genau einen Block, weil Präfix und Zahl zusammen immer kürzer als
 * 56 Bytes sind. Gesucht ist die Zahl, mit der der Hash über Präfix und Zahl (acht Bytes, höchstwertiges zuerst)
 * mit `bits` Nullbits beginnt — dieselbe Rechnung wie `App\Services\Verification\ProofOfWork` im Dienst.
 *
 * Eigene Umsetzung statt `crypto.subtle`: Die Schnittstelle des Browsers antwortet je Aufruf verzögert und wäre
 * bei zehntausenden Versuchen um ein Vielfaches langsamer.
 */

const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
    0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
    0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

const MAX_PREFIX_BYTES = 47;

export const MAX_NONCE = 0xffffffff;

/**
 * Die ersten 32 Bit des SHA-256 über einen vorbereiteten Block.
 */
function firstWord(block: Uint8Array, w: Uint32Array): number {
    for (let i = 0; i < 16; i++) {
        w[i] =
            (block[i * 4] << 24) |
            (block[i * 4 + 1] << 16) |
            (block[i * 4 + 2] << 8) |
            block[i * 4 + 3];
    }

    for (let i = 16; i < 64; i++) {
        const a = w[i - 15];
        const b = w[i - 2];

        w[i] =
            (w[i - 16] +
                (((a >>> 7) | (a << 25)) ^
                    ((a >>> 18) | (a << 14)) ^
                    (a >>> 3)) +
                w[i - 7] +
                (((b >>> 17) | (b << 15)) ^
                    ((b >>> 19) | (b << 13)) ^
                    (b >>> 10))) |
            0;
    }

    let a = 0x6a09e667;
    let b = 0xbb67ae85;
    let c = 0x3c6ef372;
    let d = 0xa54ff53a;
    let e = 0x510e527f;
    let f = 0x9b05688c;
    let g = 0x1f83d9ab;
    let h = 0x5be0cd19;

    for (let i = 0; i < 64; i++) {
        const t1 =
            (h +
                (((e >>> 6) | (e << 26)) ^
                    ((e >>> 11) | (e << 21)) ^
                    ((e >>> 25) | (e << 7))) +
                ((e & f) ^ (~e & g)) +
                K[i] +
                w[i]) |
            0;
        const t2 =
            ((((a >>> 2) | (a << 30)) ^
                ((a >>> 13) | (a << 19)) ^
                ((a >>> 22) | (a << 10))) +
                ((a & b) ^ (a & c) ^ (b & c))) |
            0;

        h = g;
        g = f;
        f = e;
        e = (d + t1) | 0;
        d = c;
        c = b;
        b = a;
        a = (t1 + t2) | 0;
    }

    return (0x6a09e667 + a) >>> 0;
}

/**
 * Sucht ab `from` höchstens `tries` Zahlen ab. Gibt die erste zurück, die die Aufgabe löst, sonst -1 — so lässt
 * sich die Suche auch ohne Hintergrundprozess in Stücken rechnen, ohne die Seite zu blockieren.
 */
export function solveRange(
    prefixHex: string,
    bits: number,
    from: number,
    tries: number,
): number {
    const length = prefixHex.length / 2;

    if (
        !/^([0-9a-f]{2})+$/i.test(prefixHex) ||
        length > MAX_PREFIX_BYTES ||
        bits < 1 ||
        bits > 32
    ) {
        throw new Error('Echto: Diese Aufgabe lässt sich nicht rechnen.');
    }

    const block = new Uint8Array(64);
    const w = new Uint32Array(64);
    const messageBits = (length + 8) * 8;

    for (let i = 0; i < length; i++) {
        block[i] = parseInt(prefixHex.slice(i * 2, i * 2 + 2), 16);
    }

    // Abschluss nach SHA-256: ein Bit 1, dann Nullen, am Ende die Länge der Nachricht in Bit.
    block[length + 8] = 0x80;
    block[62] = messageBits >>> 8;
    block[63] = messageBits & 0xff;

    const mask = bits === 32 ? 0xffffffff : ~(0xffffffff >>> bits) >>> 0;
    const end = Math.min(from + tries, MAX_NONCE + 1);

    for (let nonce = from; nonce < end; nonce++) {
        block[length + 4] = nonce >>> 24;
        block[length + 5] = (nonce >>> 16) & 0xff;
        block[length + 6] = (nonce >>> 8) & 0xff;
        block[length + 7] = nonce & 0xff;

        if ((firstWord(block, w) & mask) === 0) {
            return nonce;
        }
    }

    return -1;
}
