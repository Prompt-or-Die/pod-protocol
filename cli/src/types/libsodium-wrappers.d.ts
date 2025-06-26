declare module 'libsodium-wrappers' {
  export function ready: Promise<void>;
  export function sodium_malloc(size: number): Uint8Array;
  export function sodium_free(buffer: Uint8Array): void;
  export function sodium_mlock(buffer: Uint8Array): void;
  export function sodium_munlock(buffer: Uint8Array): void;
  export function sodium_memzero(buffer: Uint8Array): void;
  export function sodium_memcmp(a: Uint8Array, b: Uint8Array): number;
  export function crypto_hash_sha256(input: Uint8Array): Uint8Array;
  export function randombytes_buf(size: number): Uint8Array;
} 