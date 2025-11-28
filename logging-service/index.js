import { createClient } from "redis";

const redis = createClient({ url: "redis://localhost:6379" });

redis.on("error", (err) => console.log("Redis Error:", err));
await redis.connect();

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
        lastId = msg.id;
    }
}
