const mongoose = require("mongoose");

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  const rawUri = process.env.MONGODB_URI;

  if (!rawUri) {
    throw new Error(
      "MONGODB_URI is missing in environment variables. Please configure MONGODB_URI in your Vercel Project Settings > Environment Variables or .env file."
    );
  }

  // Auto-clean <password> angle brackets if user included them from Atlas copy-paste
  let uri = rawUri.trim().replace(/<([^>]+)>/g, "$1");

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(uri, opts).then(m => {
      console.log("MongoDB connected");
      return m;
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

module.exports = connectDB;
