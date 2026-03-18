const { Client } = require('pg');

async function setup() {
    const client = new Client({
        user: 'postgres',
        host: 'localhost',
        password: 'postgres', // Trying common default password
        port: 5432,
    });

    try {
        await client.connect();

        console.log('Connected as postgres. Creating user and db...');

        // Check if user exists
        const userRes = await client.query("SELECT 1 FROM pg_roles WHERE rolname='queueuser'");
        if (userRes.rowCount === 0) {
            await client.query("CREATE USER queueuser WITH PASSWORD 'queuepass'");
            console.log('Created user queueuser');
        }

        // Check if db exists
        const dbRes = await client.query("SELECT 1 FROM pg_database WHERE datname='queuedb'");
        if (dbRes.rowCount === 0) {
            await client.query("CREATE DATABASE queuedb OWNER queueuser");
            console.log('Created database queuedb');
        }

        // Grant privileges
        await client.query("GRANT ALL PRIVILEGES ON DATABASE queuedb TO queueuser");
        console.log('Granted privileges');

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

setup();
