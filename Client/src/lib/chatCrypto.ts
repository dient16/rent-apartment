/**
 * Message-body encryption for the chat (WebCrypto, no dependencies).
 *
 * Each room has one AES-256-GCM key, created and handed out by the server to its members.
 * The browser encrypts text / sticker ids / photo bytes with it before calling the API, so a
 * request body (and anything logged along the way) only ever carries ciphertext. The server
 * can still read a room when it needs to - this is transport hardening, not end-to-end.
 */

export interface CipherPayload {
   keyId: string;
   iv: string;
   data: string;
}

export const toBase64 = (bytes: ArrayBuffer | Uint8Array): string => {
   const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
   let bin = '';
   for (let i = 0; i < view.length; i += 0x8000) bin += String.fromCharCode(...view.subarray(i, i + 0x8000));
   return btoa(bin);
};

export const fromBase64 = (b64: string): Uint8Array<ArrayBuffer> => {
   const bin = atob(b64);
   const out = new Uint8Array(new ArrayBuffer(bin.length));
   for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
   return out;
};

const subtle = () => globalThis.crypto.subtle;
const AES = { name: 'AES-GCM', length: 256 } as const;

export const cryptoSupported = () => !!globalThis.crypto?.subtle;

/** raw base64 key from the server -> CryptoKey */
export const importRoomKey = (base64: string): Promise<CryptoKey> =>
   subtle().importKey('raw', fromBase64(base64), AES, false, ['encrypt', 'decrypt']);

export const encryptString = async (key: CryptoKey, keyId: string, plain: string): Promise<CipherPayload> => {
   const iv = globalThis.crypto.getRandomValues(new Uint8Array(new ArrayBuffer(12)));
   const data = await subtle().encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plain));
   return { keyId, iv: toBase64(iv), data: toBase64(data) };
};

/** null when the key does not match or the payload was tampered with */
export const decryptString = async (key: CryptoKey, payload: { iv: string; data: string }): Promise<string | null> => {
   try {
      const plain = await subtle().decrypt({ name: 'AES-GCM', iv: fromBase64(payload.iv) }, key, fromBase64(payload.data));
      return new TextDecoder().decode(plain);
   } catch {
      return null;
   }
};

export const encryptBytes = async (key: CryptoKey, bytes: ArrayBuffer): Promise<{ iv: string; data: ArrayBuffer }> => {
   const iv = globalThis.crypto.getRandomValues(new Uint8Array(new ArrayBuffer(12)));
   return { iv: toBase64(iv), data: await subtle().encrypt({ name: 'AES-GCM', iv }, key, bytes) };
};

export const decryptBytes = async (key: CryptoKey, iv: string, data: ArrayBuffer): Promise<ArrayBuffer | null> => {
   try {
      return await subtle().decrypt({ name: 'AES-GCM', iv: fromBase64(iv) }, key, data);
   } catch {
      return null;
   }
};
