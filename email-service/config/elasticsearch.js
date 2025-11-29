import { Client } from '@elastic/elasticsearch';
import dotenv from 'dotenv';

dotenv.config();

// Elasticsearch client configuration
const esNode = process.env.ELASTICSEARCH_NODE || 'http://localhost:9200';
const esConfig = {
    node: esNode,
    auth: {
        username: process.env.ELASTICSEARCH_USER || 'elastic',
        password: process.env.ELASTICSEARCH_PASSWORD || '',
    }
};

// Only add TLS config if using HTTPS
if (esNode.startsWith('https://')) {
    esConfig.tls = {
        rejectUnauthorized: false // For local development with self-signed certificates
    };
}

const esClient = new Client(esConfig);

// Index a log entry
export const indexLog = async (logEntry) => {
    try {
        await esClient.index({
            index: 'communication-logs',
            body: {
                ...logEntry,
                timestamp: new Date()
            }
        });
    } catch (error) {
        console.error('❌ Error indexing log:', error.message);
    }
};

export { esClient };

