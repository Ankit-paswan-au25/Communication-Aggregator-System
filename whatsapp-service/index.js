import { createClient } from "redis";

const redis = createClient({ url: "redis://localhost:6379" });

redis.on("error", (err) => console.log("Redis Error:", err));
await redis.connect();

console.log(" WhatsApp Service Running...");

let lastId = "0";

while (true) {
    const response = await redis.xRead(
        { key: "whatsapp_stream", id: lastId },
        { block: 0 }
    );

    const messages = response?.[0]?.messages || [];

    for (const msg of messages) {
        console.log("WhatsApp Task Received:", msg.message);

        // TODO: Meta WhatsApp Cloud API integration
        await redis.xAdd("log_stream", "*", {
            service: "whatsapp",  // <-- service ka naam change hoga
            status: "received",
            ...msg.message
        });

        lastId = msg.id;
    }
}
