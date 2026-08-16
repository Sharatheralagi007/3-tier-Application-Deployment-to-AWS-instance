const { MongoClient } = require("mongodb");
const crypto = require("crypto");


// ============================================================
// Environment Variables
// ============================================================

const DB_USER = process.env.MONGO_DB_USERNAME;
const DB_PASS = process.env.MONGO_DB_PWD;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;


// ============================================================
// Validate Environment Variables
// ============================================================

if (!DB_USER) {
    throw new Error(
        "MONGO_DB_USERNAME environment variable is required"
    );
}

if (!DB_PASS) {
    throw new Error(
        "MONGO_DB_PWD environment variable is required"
    );
}

if (!ENCRYPTION_KEY) {
    throw new Error(
        "ENCRYPTION_KEY environment variable is required"
    );
}


// ============================================================
// Validate AES-256 Encryption Key
// ============================================================
//
// openssl rand -hex 32
//
// produces:
// 32 bytes
// 64 hexadecimal characters
//
// AES-256 requires a 32-byte key.
// ============================================================

if (!/^[0-9a-fA-F]{64}$/.test(ENCRYPTION_KEY)) {
    throw new Error(
        "ENCRYPTION_KEY must be exactly 64 hexadecimal characters"
    );
}


// Convert hexadecimal key into 32-byte Buffer

const encryptionKey = Buffer.from(
    ENCRYPTION_KEY,
    "hex"
);


// ============================================================
// MongoDB Connection
// ============================================================

// Encode username/password so special characters
// don't break the MongoDB connection URL.

const encodedUser = encodeURIComponent(DB_USER);

const encodedPassword = encodeURIComponent(DB_PASS);


// "mongodb" is the service name in mongo-services.yaml

const mongoUrl =
    `mongodb://${encodedUser}:${encodedPassword}@mongodb:27017`;


// Create MongoDB client

const client = new MongoClient(mongoUrl);

let db;


// ============================================================
// Connect to MongoDB
// ============================================================

async function connectDB() {

    try {

        await client.connect();

        db = client.db("my-db");

        console.log("Connected to MongoDB");

        return db;

    } catch (error) {

        console.error(
            "MongoDB connection failed:",
            error
        );

        throw error;
    }
}


// ============================================================
// Get Database
// ============================================================

function getDB() {

    if (!db) {

        throw new Error(
            "Database is not connected"
        );

    }

    return db;
}


// ============================================================
// Encrypt Data
// ============================================================
//
// AES-256-GCM
//
// Every encryption gets a new random IV.
//
// Stored format:
//
// IV:AUTH_TAG:ENCRYPTED_DATA
//
// Example:
//
// 8a31...:f92c...:7d21...
//
// ============================================================

function encryptData(plainText) {

    // AES-GCM recommended IV size is 12 bytes

    const iv = crypto.randomBytes(12);


    // Create AES-256-GCM cipher

    const cipher = crypto.createCipheriv(
        "aes-256-gcm",
        encryptionKey,
        iv
    );


    // Encrypt text

    let encrypted = cipher.update(
        plainText,
        "utf8",
        "hex"
    );


    encrypted += cipher.final("hex");


    // Authentication tag protects against tampering

    const authTag = cipher.getAuthTag();


    // Store everything required for decryption

    return [
        iv.toString("hex"),
        authTag.toString("hex"),
        encrypted
    ].join(":");
}


// ============================================================
// Decrypt Data
// ============================================================

function decryptData(encryptedData) {

    try {

        // Split stored value

        const parts = encryptedData.split(":");


        if (parts.length !== 3) {

            throw new Error(
                "Invalid encrypted data format"
            );

        }


        const [
            ivHex,
            authTagHex,
            encryptedHex
        ] = parts;


        // Convert values back to Buffers

        const iv = Buffer.from(
            ivHex,
            "hex"
        );

        const authTag = Buffer.from(
            authTagHex,
            "hex"
        );


        // Create decipher

        const decipher = crypto.createDecipheriv(
            "aes-256-gcm",
            encryptionKey,
            iv
        );


        // Set authentication tag

        decipher.setAuthTag(authTag);


        // Decrypt

        let decrypted = decipher.update(
            encryptedHex,
            "hex",
            "utf8"
        );


        decrypted += decipher.final("utf8");


        return decrypted;

    } catch (error) {

        console.error(
            "Data decryption failed:",
            error.message
        );

        throw new Error(
            "Unable to decrypt data"
        );
    }
}


// ============================================================
// Export
// ============================================================

module.exports = {
    connectDB,
    getDB,
    encryptData,
    decryptData
};
