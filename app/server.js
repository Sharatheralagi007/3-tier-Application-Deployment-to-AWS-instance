const express = require("express");
const path = require("path");

const { connectDB, getDB } = require("./db");

const app = express();
const PORT = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve frontend
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// Add data
app.post("/add-data", async (req, res) => {
    try {
        const { userId, data } = req.body;

        if (!userId || !data) {
            return res.status(400).json({
                message: "userId and data are required"
            });
        }

        const db = getDB();

        const collection = db.collection("my-collection");

        const document = {
            userId: userId,
            data: data,
            createdAt: new Date()
        };

        const result = await collection.insertOne(document);

        res.status(201).json({
            message: "Data saved successfully",
            id: result.insertedId,
            data: document
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to save data"
        });
    }
});

// Fetch data by user ID
app.get("/fetch-data/:userId", async (req, res) => {
    try {
        const userId = req.params.userId;

        const db = getDB();

        const collection = db.collection("my-collection");

        const results = await collection
            .find({ userId: userId })
            .sort({ createdAt: -1 })
            .toArray();

        res.json({
            userId: userId,
            count: results.length,
            data: results
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch data"
        });
    }
});

connectDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`App listening on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error("MongoDB connection failed:", error);
        process.exit(1);
    });
