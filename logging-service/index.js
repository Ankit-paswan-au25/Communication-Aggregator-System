import { createClient } from "redis";
import { initializeLogsIndex, indexLog } from "./config/elasticsearch.js";

const redis = createClient({ url: "redis://localhost:6379" });

redis.on("error", (err) => console.log("Redis Error:", err));
await redis.connect();

// Initialize Elasticsearch logs index
try {
    await initializeLogsIndex();
} catch (error) {
    console.error('⚠️ Warning: Elasticsearch initialization failed. Service will continue but indexing may not work.');
    console.error('Error details:', error.message);
}

console.log("📝 Logging Service Running...");

let lastId = "$";

while (true) {
    const response = await redis.xRead(
        { key: "log_stream", id: lastId },
        { block: 0 }
    );

    const messages = response?.[0]?.messages || [];

    for (const msg of messages) {
        console.log("📄 Log Entry:", msg.message);

        // Index log to Elasticsearch
        await indexLog({
            service: msg.message.service || 'unknown',
            status: msg.message.status || 'unknown',
            from: msg.message.from || '',
            to: msg.message.to || '',
            msg: msg.message.msg || '',
            error: msg.message.error || '',
            communicationId: msg.message._id || msg.message.communicationId || ''
        });

        lastId = msg.id;
    }
}
