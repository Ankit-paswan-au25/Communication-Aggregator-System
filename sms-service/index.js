import { createClient } from "redis";
import twilio from "twilio";
import dotenv from "dotenv";

dotenv.config();

// Twilio credentials
const accountSid = process.env.ACCOUNTSID;
const authToken = process.env.AUTHTOKEN;
const messagingServiceSid = process.env.MSG_ID;

const client = twilio(accountSid, authToken);

// Redis connect
const redis = createClient({ url: "redis://localhost:6379" });
await redis.connect();

console.log("📨 SMS Service Running...");

let lastId = "$"; // Start from the latest message

while (true) {
    const response = await redis.xRead(
        { key: "sms_stream", id: lastId },
        { block: 0 }
    );


    const messages = response?.[0]?.messages || [];

    for (const msg of messages) {
        console.log("📩 SMS Task Received:", msg.message);

        const { to, msg: body } = msg.message;

        //  REAL SMS SEND
        try {
            const result = await client.messages.create({
                to,
                body,
                messagingServiceSid,
            });

            console.log("SMS Sent Successfully:", result.sid);
        } catch (err) {
            console.error("SMS Send Failed:", err.message);
        }

        lastId = msg.id;
    }
}

