import { configDotenv } from "dotenv";
configDotenv();
import express from "express";
import { createClient } from "redis";
import { dbConnection } from "./config/dbConfig.js";
import { communication } from "./model/communication.js";
import { initializeIndices, indexCommunication } from "./config/elasticsearch.js";

// Connect to DB
await dbConnection();

// Initialize Elasticsearch indices
try {
    await initializeIndices();
} catch (error) {
    console.error('⚠️ Warning: Elasticsearch initialization failed. Service will continue but indexing may not work.');
    console.error('Error details:', error.message);
}

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Redis connect
const redis = createClient({ url: "redis://localhost:6379" });
redis.on("error", (err) => console.log("Redis Error:", err));
await redis.connect();

app.post("/api/v1/communication", async (req, res) => {
    try {
        const { type, data } = req.body;

        const streams = {
            email: "email_stream",
            sms: "sms_stream",
            whatsapp: "whatsapp_stream",
        };

        const stream = streams[type];

        if (!stream) {
            return res.status(400).json({ error: "Invalid type. Use email/sms/whatsapp" });
        }

        dataValidator(data);

        const validationResult = dataValidator(data);

        if (validationResult !== 'valid') {
            return res.status(400).json({ error: validationResult });
        }



        // Save communication to MongoDB
        const newCommunication = await communication.create({
            from: data.from,
            to: data.to,
            msg: data.msg,
            status: 'pending'
        });

        // Index communication to Elasticsearch
        await indexCommunication({
            communicationId: newCommunication._id.toString(),
            from: newCommunication.from,
            to: newCommunication.to,
            msg: newCommunication.msg,
            status: newCommunication.status,
            type: type,
            stream: stream
        });

        // Push task to Redis stream
        await redis.xAdd(stream, "*", newCommunication);

        return res.status(200).json({
            status: "queued",
            stream,
            data
        });
    } catch (error) {
        console.log("Error in /api/v1/communication:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

function dataValidator(data) {

    if (!data) {
        return "no data found";
    }

    if (!data.to) {
        return "please provide recipient info";
    }
    if (!data.from) {
        return "please provide sender info";
    }
    if (!data.msg) {
        return "please provide message info";
    }
    return 'valid';


}

app.listen(PORT, () => console.log("Task Router running on port 3001"));
