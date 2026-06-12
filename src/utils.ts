export async function generateHash(text?: string): Promise<string> {
  const normalised = (text ?? "").trim().toLowerCase();

  const encoder = new TextEncoder();
  const data = encoder.encode(normalised);

  const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", data);

  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return hashHex;
}

// ---
export type Ok<T> = { readonly status: "ok"; readonly value: T };
export type Err<E> = { readonly status: "err"; readonly error: E };
export type Result<T, E> = Ok<T> | Err<E>;

export function ok<T>(value: T): Ok<T> {
  return { status: "ok", value };
}

export function err<E>(error: E): Err<E> {
  return { status: "err", error };
}

export function isOk<T, E>(r: Result<T, E>): r is Ok<T> {
  return r.status === "ok";
}

export function isErr<T, E>(r: Result<T, E>): r is Err<E> {
  return r.status === "err";
}

// ---
export interface IAsyncLocalStorage<T> {
  run<R>(store: T, callback: () => R): R;
  getStore(): T | undefined;
}

declare global {
  var AsyncLocalStorage:
    | {
        new <T>(): IAsyncLocalStorage<T>;
      }
    | undefined;
}

export class BrowserAsyncLocalStorage<T> implements IAsyncLocalStorage<T> {
  run<R>(store: T, callback: () => R): R {
    return callback();
  }

  getStore(): T | undefined {
    return undefined;
  }
}
