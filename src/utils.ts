import { createHash } from "node:crypto";

export function generateHash(text?: string): string {
  const normalised = (text ?? "").trim().toLowerCase();
  return createHash("sha256").update(normalised, "utf8").digest("hex");
}

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
