import { describe, expect, it, vi } from "vitest";
import type { Model } from "mongoose";

import { scoped, TenantScopeError } from "@/lib/tenant/scope";

function fakeModel() {
  const calls: Record<string, unknown[]> = {};
  const record = (name: string) =>
    vi.fn((...args: unknown[]) => {
      calls[name] = args;
      return name;
    });
  const model = {
    find: record("find"),
    findOne: record("findOne"),
    countDocuments: record("countDocuments"),
    updateOne: record("updateOne"),
    updateMany: record("updateMany"),
    deleteOne: record("deleteOne"),
    deleteMany: record("deleteMany"),
    create: record("create"),
  } as unknown as Model<unknown>;
  return { model, calls };
}

describe("scoped()", () => {
  it("adds the tenant to every read, update and delete filter", () => {
    const { model, calls } = fakeModel();
    const posts = scoped(model, "tenantA");

    posts.find({ status: "published" });
    posts.updateOne({ _id: "x" }, { $set: { title: "t" } });
    posts.deleteOne({ _id: "x" });

    for (const name of ["find", "updateOne", "deleteOne"]) {
      expect(calls[name][0]).toEqual({ $and: [{ tenant: "tenantA" }, expect.any(Object)] });
    }
  });

  it("stamps the tenant on create", () => {
    const { model, calls } = fakeModel();
    scoped(model, "tenantA").create({ title: "hello" });
    expect(calls.create[0]).toEqual({ title: "hello", tenant: "tenantA" });
  });

  it("refuses to read another tenant's data, even via $or", () => {
    const { model } = fakeModel();
    const posts = scoped(model, "tenantA");
    expect(() => posts.find({ tenant: "tenantB" })).toThrow(TenantScopeError);
    expect(() => posts.findOne({ $or: [{ slug: "a" }, { tenant: "tenantB" }] })).toThrow(TenantScopeError);
  });

  it("refuses to modify or reassign another tenant's data", () => {
    const { model } = fakeModel();
    const posts = scoped(model, "tenantA");
    expect(() => posts.updateOne({ _id: "x", tenant: "tenantB" }, { $set: { title: "t" } })).toThrow(
      TenantScopeError,
    );
    expect(() => posts.updateOne({ _id: "x" }, { $set: { tenant: "tenantB" } })).toThrow(TenantScopeError);
    expect(() => posts.deleteMany({ tenant: "tenantB" })).toThrow(TenantScopeError);
    expect(() => posts.create({ tenant: "tenantB" })).toThrow(TenantScopeError);
  });
});
