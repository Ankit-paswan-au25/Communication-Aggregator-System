import { createClient } from "redis";
import { indexLog } from "./config/elasticsearch.js";

const redis = createClient({ url: "redis://localhost:6379" });

redis.on("error", (err) => console.log("Redis Error:", err));
await redis.connect();

console.log("Email Service Running...");

let lastId = "$";   // Start from the latest message

while (true) {
    const response = await redis.xRead(
        { key: "email_stream", id: lastId },
        { block: 0 }
    );

    const messages = response?.[0]?.messages || [];

    for (const msg of messages) {
        console.log("Email Task Received:", msg.message);

        // Index to Elasticsearch
        await indexLog({
            service: "email",
            status: "received",
            from: msg.message.from || '',
            to: msg.message.to || '',
            msg: msg.message.msg || '',
            communicationId: msg.message._id || ''
        });

        await redis.xAdd("log_stream", "*", {
            service: "email",  // <-- service ka naam change hoga
            status: "received",
            ...msg.message
        });
        lastId = msg.id; // <-- move cursor forward
    }
}
