/// <reference types="node" />
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vite-plus/test';
import { solveRange } from './sha256';

/**
 * Unabhängig nachgerechnet mit SHA-256 von Node: Präfix, dann die Zahl als acht Bytes, höchstwertiges zuerst —
 * dieselbe Rechnung wie im Dienst (`ProofOfWork`).
 */
function leadingZeroBits(prefixHex: string, nonce: number): number {
    const number = Buffer.alloc(8);

    number.writeUInt32BE(nonce, 4);

    const hash = createHash('sha256')
        .update(Buffer.concat([Buffer.from(prefixHex, 'hex'), number]))
        .digest();
    const head = hash.readUInt32BE(0);

    return head === 0 ? 32 : Math.clz32(head);
}

describe('Arbeitsnachweis', () => {
    it.each([
        ['00112233445566778899aabbccddeeff', 12],
        ['ffeeddccbbaa99887766554433221100', 16],
        ['ab12', 10],
    ])('findet für %s die erste Zahl mit %i Nullbits', (prefix, bits) => {
        const nonce = solveRange(prefix, bits, 0, 2 ** 24);

        expect(nonce).toBeGreaterThanOrEqual(0);
        expect(leadingZeroBits(prefix, nonce)).toBeGreaterThanOrEqual(bits);

        for (
            let earlier = Math.max(0, nonce - 200);
            earlier < nonce;
            earlier++
        ) {
            expect(leadingZeroBits(prefix, earlier)).toBeLessThan(bits);
        }
    });

    it('sucht in Stücken weiter und meldet -1, solange nichts gefunden ist', () => {
        const prefix = '00112233445566778899aabbccddeeff';
        const nonce = solveRange(prefix, 12, 0, 2 ** 24);

        expect(solveRange(prefix, 12, 0, nonce)).toBe(-1);
        expect(solveRange(prefix, 12, nonce, 1)).toBe(nonce);
    });

    it('weist ab, was keine Aufgabe ist', () => {
        expect(() => solveRange('xyz', 8, 0, 10)).toThrow();
        expect(() => solveRange('abc', 8, 0, 10)).toThrow();
        expect(() => solveRange('ab12', 0, 0, 10)).toThrow();
        expect(() => solveRange('ab12', 33, 0, 10)).toThrow();
        expect(() => solveRange('ab'.repeat(48), 8, 0, 10)).toThrow();
    });
});
