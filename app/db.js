const { MongoClient } = require("mongodb");

// MongoDB credentials come from docker-compose environment variables
const DB_USER = process.env.MONGO_DB_USERNAME;
const DB_PASS = process.env.MONGO_DB_PWD;

// Docker Compose service name is "mongodb"
const mongoUrl = `mongodb://${DB_USER}:${DB_PASS}@mongodb`;

// Create MongoDB client
const client = new MongoClient(mongoUrl);

let db;

// Connect to MongoDB
async function connectDB() {
    try {
        await client.connect();

        db = client.db("my-db");

        console.log("Connected to MongoDB");

        return db;
    } catch (error) {
        console.error("MongoDB connection failed:", error);
        throw error;
    }
}

// Get the database connection
function getDB() {
    if (!db) {
        throw new Error("Database is not connected");
    }

    return db;
}

// Export functions so server.js can use them
module.exports = {
    connectDB,
    getDB
};
