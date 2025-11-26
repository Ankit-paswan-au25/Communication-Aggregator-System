const amqp = require("amqplib");
const Database = require("better-sqlite3");

const RABBITMQ_URL = "amqp://guest:guest@localhost:5672";

let channel;
const db = new Database("messages.db");

// Create table
db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    traceId TEXT,
    channel TEXT,
    recipient TEXT,
    body TEXT,
    status TEXT,
    attempts INTEGER,
    createdAt TEXT
  )
`);

async function connectRabbitMQ() {
    const conn = await amqp.connect(RABBITMQ_URL);
    channel = await conn.createChannel();

    await channel.assertQueue("delivery.email");
    await channel.assertQueue("delivery.sms");
    await channel.assertQueue("delivery.whatsapp");
    await channel.assertQueue("logs");

    console.log("Delivery Service connected to RabbitMQ");

    consumeQueue("delivery.email");
    consumeQueue("delivery.sms");
    consumeQueue("delivery.whatsapp");
}

function logEvent(event) {
    const payload = Buffer.from(JSON.stringify(event));
    channel.sendToQueue("logs", payload);
}

// simulate sending (random failure)
function simulateSend(channelName, to, body) {
    console.log(`Sending ${channelName} to ${to}: ${body}`);
    const r = Math.random();
    if (r < 0.7) {
        // 70% success
        return true;
    }
    return false;
}

function consumeQueue(queueName) {
    channel.consume(queueName, async (msg) => {
        if (!msg) return;

        const payload = JSON.parse(msg.content.toString());
        const { traceId, channel: ch, to, body } = payload;
        let { attempt } = payload;

        logEvent({
            traceId,
            span: `delivery.${ch}.receive`,
            level: "info",
            message: "Delivery message received",
            meta: { queue: queueName, attempt },
            timestamp: new Date().toISOString()
        });

        const success = simulateSend(ch, to, body);

        if (success) {
            // store success in DB
            db.prepare(`
        INSERT INTO messages (traceId, channel, recipient, body, status, attempts, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(traceId, ch, to, body, "delivered", attempt, new Date().toISOString());

            logEvent({
                traceId,
                span: `delivery.${ch}.send`,
                level: "info",
                message: "Message delivered successfully",
                meta: { attempt },
                timestamp: new Date().toISOString()
            });

            channel.ack(msg);
        } else {
            attempt += 1;
            if (attempt <= 3) {
                // retry
                logEvent({
                    traceId,
                    span: `delivery.${ch}.retry`,
                    level: "warn",
                    message: "Delivery failed, retrying",
                    meta: { attempt },
                    timestamp: new Date().toISOString()
                });

                // republish with incremented attempt
                channel.sendToQueue(queueName, Buffer.from(JSON.stringify({
                    ...payload,
                    attempt
                })));

                channel.ack(msg);
            } else {
                // final failure
                db.prepare(`
          INSERT INTO messages (traceId, channel, recipient, body, status, attempts, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(traceId, ch, to, body, "failed", attempt, new Date().toISOString());

                logEvent({
                    traceId,
                    span: `delivery.${ch}.fail`,
                    level: "error",
                    message: "Delivery permanently failed after retries",
                    meta: { attempts: attempt },
                    timestamp: new Date().toISOString()
                });

                channel.ack(msg);
            }
        }
    });
}

async function start() {
    await connectRabbitMQ();
}

start();
