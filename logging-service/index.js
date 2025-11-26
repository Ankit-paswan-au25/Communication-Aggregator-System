const amqp = require("amqplib");
const { Client } = require("@elastic/elasticsearch");

const RABBITMQ_URL = "amqp://guest:guest@localhost:5672";
const ES_URL = "http://localhost:9200";

let channel;
const esClient = new Client({ node: ES_URL });

async function connectRabbitMQ() {
    const conn = await amqp.connect(RABBITMQ_URL);
    channel = await conn.createChannel();
    await channel.assertQueue("logs");
    console.log("Logging Service connected to RabbitMQ");
    consumeLogs();
}

function consumeLogs() {
    channel.consume("logs", async (msg) => {
        if (!msg) return;
        const log = JSON.parse(msg.content.toString());

        try {
            await esClient.index({
                index: "communication-logs",
                document: log
            });
            console.log("Log indexed:", log.span, log.message);
            channel.ack(msg);
        } catch (err) {
            console.error("Error indexing log:", err.message);
            // small delay & requeue (or DLQ in real system)
            channel.nack(msg, false, true);
        }
    });
}

async function start() {
    await connectRabbitMQ();
}

start();
