import type { Types } from "mongoose";

/**
 * Mongoose `.lean()` results are typed with `ObjectId` and `Date`, but anything
 * we hand to a client component has been through `JSON.stringify`. This maps a
 * document type to what it actually looks like after serialisation, so pages
 * are typed against the real shape instead of casting at every call site.
 */
export type Json<T> = T extends Types.ObjectId
  ? string
  : T extends Date
    ? string
    : T extends (infer U)[]
      ? Json<U>[]
      : T extends object
        ? { [K in keyof T]: Json<T[K]> }
        : T;
