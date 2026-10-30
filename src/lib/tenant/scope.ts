import type { Types, Model, QueryFilter, UpdateQuery } from "mongoose";

/**
 * The single door to tenant-owned collections. Every filter is forced to
 * include the tenant id, so a route handler cannot forget it, and a caller that
 * tries to name a different tenant in the filter or payload gets an error
 * instead of someone else's data.
 *
 *   const posts = scoped(StoreBlogPost, tenant.id);
 *   await posts.find({ status: "published" });
 */
type Id = string | Types.ObjectId;

export class TenantScopeError extends Error {}

function assertNoForeignTenant(value: unknown, tenantId: string, where: string) {
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  if ("tenant" in record && String(record.tenant) !== tenantId) {
    throw new TenantScopeError(`Cross-tenant access blocked in ${where}`);
  }
  // Operators such as $or could smuggle in another tenant's rows.
  for (const key of ["$or", "$and", "$nor"]) {
    const clauses = record[key];
    if (Array.isArray(clauses)) clauses.forEach((clause) => assertNoForeignTenant(clause, tenantId, where));
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function scoped<T = any>(model: Model<T>, tenantId: Id) {
  const tenant = String(tenantId);
  if (!tenant) throw new TenantScopeError("A tenant id is required");

  const guard = (filter: QueryFilter<T> = {}, where: string): QueryFilter<T> => {
    assertNoForeignTenant(filter, tenant, where);
    return { $and: [{ tenant }, filter] } as QueryFilter<T>;
  };

  return {
    find: (filter: QueryFilter<T> = {}) => model.find(guard(filter, "find")),
    findOne: (filter: QueryFilter<T> = {}) => model.findOne(guard(filter, "findOne")),
    countDocuments: (filter: QueryFilter<T> = {}) => model.countDocuments(guard(filter, "countDocuments")),
    updateOne: (filter: QueryFilter<T>, update: UpdateQuery<T>) => {
      assertNoForeignTenant((update as Record<string, unknown>).$set, tenant, "updateOne");
      return model.updateOne(guard(filter, "updateOne"), update);
    },
    updateMany: (filter: QueryFilter<T>, update: UpdateQuery<T>) => {
      assertNoForeignTenant((update as Record<string, unknown>).$set, tenant, "updateMany");
      return model.updateMany(guard(filter, "updateMany"), update);
    },
    deleteOne: (filter: QueryFilter<T>) => model.deleteOne(guard(filter, "deleteOne")),
    deleteMany: (filter: QueryFilter<T>) => model.deleteMany(guard(filter, "deleteMany")),
    create: (data: Record<string, unknown>) => {
      assertNoForeignTenant(data, tenant, "create");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return model.create({ ...data, tenant } as any);
    },
    aggregate: (pipeline: Record<string, unknown>[]) =>
      model.aggregate([{ $match: { tenant: new (model.base.Types.ObjectId)(tenant) } }, ...pipeline] as never),
  };
}
