const express = require("express");
const path = require("path");

const {
    connectDB,
    getDB,
    encryptData,
    decryptData
} = require("./db");


const app = express();

const PORT = 3000;


// ============================================================
// Middleware
// ============================================================

app.use(
    express.urlencoded({
        extended: true
    })
);

app.use(express.json());


// ============================================================
// Serve Frontend
// ============================================================

app.get("/", (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            "index.html"
        )
    );

});


// ============================================================
// Add Data
// ============================================================

app.post("/add-data", async (req, res) => {

    try {

        const {
            userId,
            data
        } = req.body;


        // ----------------------------------------------------
        // Validate input
        // ----------------------------------------------------

        if (!userId || !data) {

            return res.status(400).json({

                message:
                    "userId and data are required"

            });

        }


        // ----------------------------------------------------
        // Get database
        // ----------------------------------------------------

        const db = getDB();


        // ----------------------------------------------------
        // Get collection
        // ----------------------------------------------------

        const collection =
            db.collection("my-collection");


        // ----------------------------------------------------
        // Encrypt data
        // ----------------------------------------------------
        //
        // Browser:
        //
        // "I am 10"
        //
        // becomes something like:
        //
        // "9f23...:8a72...:b91c..."
        //
        // before being stored in MongoDB.
        //
        // ----------------------------------------------------

        const encryptedData =
            encryptData(data);


        // ----------------------------------------------------
        // Create document
        // ----------------------------------------------------

        const document = {

            userId: userId,

            data: encryptedData,

            createdAt: new Date()

        };


        // ----------------------------------------------------
        // Insert document
        // ----------------------------------------------------

        const result =
            await collection.insertOne(
                document
            );


        // ----------------------------------------------------
        // Send response
        // ----------------------------------------------------
        //
        // Do NOT send encrypted data back unnecessarily.
        //
        // ----------------------------------------------------

        res.status(201).json({

            message:
                "Data saved successfully",

            id:
                result.insertedId

        });

    } catch (error) {

        console.error(
            "Error saving data:",
            error
        );


        res.status(500).json({

            message:
                "Failed to save data"

        });

    }

});


// ============================================================
// Fetch Data By User ID
// ============================================================

app.get(
    "/fetch-data/:userId",
    async (req, res) => {

        try {

            const userId =
                req.params.userId;


            // ------------------------------------------------
            // Get database
            // ------------------------------------------------

            const db = getDB();


            // ------------------------------------------------
            // Get collection
            // ------------------------------------------------

            const collection =
                db.collection(
                    "my-collection"
                );


            // ------------------------------------------------
            // Find documents
            // ------------------------------------------------

            const results =
                await collection
                    .find({
                        userId: userId
                    })
                    .sort({
                        createdAt: -1
                    })
                    .toArray();


            // ------------------------------------------------
            // Decrypt data
            // ------------------------------------------------

            const decryptedResults =
                results.map((item) => {

                    return {

                        _id:
                            item._id,

                        userId:
                            item.userId,

                        data:
                            decryptData(
                                item.data
                            ),

                        createdAt:
                            item.createdAt

                    };

                });


            // ------------------------------------------------
            // Send decrypted data to frontend
            // ------------------------------------------------

            res.json({

                userId: userId,

                count:
                    decryptedResults.length,

                data:
                    decryptedResults

            });

        } catch (error) {

            console.error(
                "Error fetching data:",
                error
            );


            res.status(500).json({

                message:
                    "Failed to fetch data"

            });

        }

    }
);


// ============================================================
// Connect MongoDB
// Then Start Server
// ============================================================

connectDB()
    .then(() => {

        app.listen(
            PORT,
            () => {

                console.log(
                    `App listening on port ${PORT}`
                );

            }
        );

    })
    .catch((error) => {

        console.error(
            "Application startup failed:",
            error
        );

        process.exit(1);

    });
