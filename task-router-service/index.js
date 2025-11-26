const express = require("express");
const amqp = require("amqplib");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(express.json());

let channel;
const RABBITMQ_URL = "amqp://guest:guest@localhost:5672";

// simple in-memory dedupe store
const sentMessages = new Set();

async function connectRabbitMQ() {
    const conn = await amqp.connect(RABBITMQ_URL);
    channel = await conn.createChannel();

    // Declare queues
    await channel.assertQueue("delivery.email");
    await channel.assertQueue("delivery.sms");
    await channel.assertQueue("delivery.whatsapp");
    await channel.assertQueue("logs");

    console.log("Task Router connected to RabbitMQ");
}

function logEvent(event) {
    const payload = Buffer.from(JSON.stringify(event));
    channel.sendToQueue("logs", payload);
}

app.post("/messages", async (req, res) => {
    try {
        const { channel: ch, to, body } = req.body;

        // Basic validation
        if (!ch || !to || !body) {
            return res.status(400).json({ error: "channel, to, body are required" });
        }

        if (!["email", "sms", "whatsapp"].includes(ch)) {
            return res.status(400).json({ error: "Invalid channel" });
        }

        const traceId = uuidv4();
        const dedupeKey = `${ch}:${to}:${body}`;

        if (sentMessages.has(dedupeKey)) {
            logEvent({
                traceId,
                span: "router.dedupe",
                level: "info",
                message: "Duplicate message blocked",
                meta: { channel: ch, to },
                timestamp: new Date().toISOString()
            });
            return res.status(409).json({ error: "Duplicate message" });
        }

        sentMessages.add(dedupeKey);

        const msg = {
            traceId,
            channel: ch,
            to,
            body,
            attempt: 1,
            createdAt: new Date().toISOString()
        };

        const queueName = `delivery.${ch}`;

        channel.sendToQueue(queueName, Buffer.from(JSON.stringify(msg)));

        logEvent({
            traceId,
            span: "router.route",
            level: "info",
            message: `Message routed to ${queueName}`,
            meta: { channel: ch, to },
            timestamp: new Date().toISOString()
        });

        return res.status(202).json({ traceId, status: "queued" });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Internal error" });
    }
});

const PORT = 4000;
app.listen(PORT, async () => {
    await connectRabbitMQ();
    console.log(`Task Router listening on port ${PORT}`);
});
