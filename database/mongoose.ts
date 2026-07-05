import mongoose from "mongoose";

const MONGODB_URL = process.env.MONGODB_URL;

if (!MONGODB_URL) throw new Error("Please define the MONGODB_URL environment variable");

declare global {
    var mongooseCache: {
        conn: typeof mongoose | null
        promise: Promise<typeof mongoose> | null


    }
}

let cached = global.mongooseCache || (global.mongooseCache = { conn: null, promise: null });
export const connectToDatabase = async () => {
    if (cached.conn) return cached.conn;

    if (!cached.promise) {
        cached.promise = mongoose.connect(MONGODB_URL, { bufferCommands: false }).then((mongoose) => {
            return mongoose;
        });
    }

    try {
        cached.conn = await cached.promise;
        return cached.conn;
    }
    catch (e) {
        cached.promise = null;
        console.error("MongoDB connection error. Please make sure MOngoDB is running, " + e);
        throw e;
    }
}
