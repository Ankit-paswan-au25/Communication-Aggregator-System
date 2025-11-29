import { createClient } from "redis";
import twilio from "twilio";
import dotenv from "dotenv";
import { indexLog } from "./config/elasticsearch.js";

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

            // Index success log to Elasticsearch
            await indexLog({
                service: "sms",
                status: "sent",
                from: msg.message.from || '',
                to: msg.message.to || to,
                msg: msg.message.msg || body,
                communicationId: msg.message._id || ''
            });
        } catch (err) {
            console.error("SMS Send Failed:", err.message);

            // Index error log to Elasticsearch
            await indexLog({
                service: "sms",
                status: "failed",
                from: msg.message.from || '',
                to: msg.message.to || to,
                msg: msg.message.msg || body,
                error: err.message,
                communicationId: msg.message._id || ''
            });
        }

        lastId = msg.id;
    }
}

