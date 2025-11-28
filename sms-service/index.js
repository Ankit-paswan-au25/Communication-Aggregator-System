import { createClient } from "redis";
import twilio from "twilio";

// Twilio credentials
const accountSid = process.env.ACCOUNTSID;
const authToken = process.env.AUTHTOKEN;
const messagingServiceSid = process.env.MSG_ID;

const client = twilio(accountSid, authToken);

// Redis connect
const redis = createClient({ url: "redis://localhost:6379" });
await redis.connect();

console.log("📨 SMS Service Running...");

let lastId = "0";

while (true) {
    const response = await redis.xRead(
        { key: "sms_stream", id: lastId },
        { block: 0 }
    );
    // await redis.xReadGroup(
    //     "sms_group",
    //     "sms_consumer_1",
    //     { key: "sms_stream", id: ">" },
    //     { block: 0 }
    // );

    const messages = response?.[0]?.messages || [];

    for (const msg of messages) {
        console.log("📩 SMS Task Received:", msg.message);

        const { to, msg: body } = msg.message;

        // 🔥 REAL SMS SEND
        try {
            const result = await client.messages.create({
                to,
                body,
                messagingServiceSid,
            });

            console.log("📤 SMS Sent Successfully:", result.sid);
        } catch (err) {
            console.error("❌ SMS Send Failed:", err.message);
        }

        lastId = msg.id;
    }
}

