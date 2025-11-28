import express from "express";
import { createClient } from "redis";

const app = express();
app.use(express.json());

// Redis connect
const redis = createClient({ url: "redis://localhost:6379" });
redis.on("error", (err) => console.log("Redis Error:", err));
await redis.connect();

app.post("/notify", async (req, res) => {
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

    // Push task to Redis stream
    await redis.xAdd(stream, "*", data);

    return res.json({
        status: "queued",
        stream,
        data
    });
});

app.listen(3001, () => console.log("Task Router running on port 3001"));
