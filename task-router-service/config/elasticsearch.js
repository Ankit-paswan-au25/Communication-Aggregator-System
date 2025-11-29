import { Client } from '@elastic/elasticsearch';
import dotenv from 'dotenv';

dotenv.config();

// Elasticsearch client configuration
const esNode = process.env.ELASTICSEARCH_NODE || 'http://localhost:9200';
const esUser = process.env.ELASTICSEARCH_USER || 'kibana_admin';// 'elastic';
const esPassword = process.env.ELASTICSEARCH_PASSWORD || 'MyStrongPass123';

const esConfig = {
    node: esNode
};

// Add authentication only if password is provided
if (esPassword) {
    esConfig.auth = {
        username: esUser,
        password: esPassword
    };
}

// Only add TLS config if using HTTPS
if (esNode.startsWith('https://')) {
    esConfig.tls = {
        rejectUnauthorized: false // For local development with self-signed certificates
    };
}

const esClient = new Client(esConfig);

// Initialize Elasticsearch indices
export const initializeIndices = async () => {
    try {
        // Test Elasticsearch connection
        await esClient.ping();
        console.log('✅ Connected to Elasticsearch');

        // Create communications index (ignore error if it already exists)
        try {
            await esClient.indices.create({
                index: 'communications',
                mappings: {
                    properties: {
                        from: { type: 'keyword' },
                        to: { type: 'keyword' },
                        msg: { type: 'text' },
                        status: { type: 'keyword' },
                        type: { type: 'keyword' },
                        stream: { type: 'keyword' },
                        communicationId: { type: 'keyword' },
                        timestamp: { type: 'date' },
                        createdAt: { type: 'date' }
                    }
                }
            });
            console.log('✅ Communications index created');
        } catch (err) {
            if (err.meta?.body?.error?.type === 'resource_already_exists_exception') {
                console.log('✅ Communications index already exists');
            } else {
                throw err;
            }
        }

        // Create logs index (ignore error if it already exists)
        try {
            await esClient.indices.create({
                index: 'communication-logs',
                mappings: {
                    properties: {
                        service: { type: 'keyword' },
                        status: { type: 'keyword' },
                        from: { type: 'keyword' },
                        to: { type: 'keyword' },
                        msg: { type: 'text' },
                        error: { type: 'text' },
                        timestamp: { type: 'date' },
                        communicationId: { type: 'keyword' }
                    }
                }
            });
            console.log('✅ Communication logs index created');
        } catch (err) {
            if (err.meta?.body?.error?.type === 'resource_already_exists_exception') {
                console.log('✅ Communication logs index already exists');
            } else {
                throw err;
            }
        }
    } catch (error) {
        console.error('❌ Error initializing Elasticsearch indices:', error.message);
        if (error.meta) {
            console.error('Error details:', JSON.stringify(error.meta.body, null, 2));
        }
        throw error;
    }
};

// Index a communication document
export const indexCommunication = async (doc) => {
    try {
        await esClient.index({
            index: 'communications',
            body: {
                ...doc,
                timestamp: new Date(),
                createdAt: new Date()
            }
        });
    } catch (error) {
        console.error('❌ Error indexing communication:', error.message);
    }
};

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

