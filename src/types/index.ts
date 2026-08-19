export type AdminSession = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  roleId: string;
  roleName: string;
  roleSlug: string;
  isSuperAdmin: boolean;
  permissions: string[];
};

export type ApiError = {
  success: false;
  error: string;
  /** Field-level messages produced by Zod, keyed by field path. */
  details?: Record<string, string[]>;
};

export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export type Paginated<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type DateRangePreset =
  | "today"
  | "yesterday"
  | "last-7-days"
  | "last-30-days"
  | "this-month"
  | "custom";

export type StatusOption = "active" | "inactive";
