import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is not defined. Add it to your .env.local file.");
}

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

/**
 * The Next.js dev server reloads modules on every change, so the connection is
 * cached on `globalThis` to avoid exhausting the Atlas connection pool.
 */
const globalWithMongoose = globalThis as typeof globalThis & {
  __manadealsMongoose?: MongooseCache;
};

const cached: MongooseCache = globalWithMongoose.__manadealsMongoose ?? {
  conn: null,
  promise: null,
};
globalWithMongoose.__manadealsMongoose = cached;

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    mongoose.set("strictQuery", true);
    cached.promise = mongoose.connect(MONGODB_URI!, {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10_000,
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}

export default connectToDatabase;
