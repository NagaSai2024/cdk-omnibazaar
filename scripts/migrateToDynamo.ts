import { Pool } from 'pg';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const pgPool = new Pool({
    connectionString: "postgresql://postgres:NagaSai%402025@localhost:5432/omniDB",
});

const dynamoClient = new DynamoDBClient({region: "us-east-1"});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TABLE_NAME = "OmnibazaarBackendStack-ProductsTable241ADBFF-6YOR9NFQ18N8";

async function migrate() {
    try {
        console.log("Fetching data...");

        const { rows } = await pgPool.query(`
            SELECT *
            FROM products
            `);

        console.log(`Found ${rows.length} products`);

        for(const product of rows) {

            const cleanedProduct: any ={};

            for(const [key,value] of Object.entries(product)) {
                cleanedProduct[key] = value instanceof Date ? value.toISOString() : value;
            }

            cleanedProduct.fixedKey = "ALL";

            await docClient.send(
                new PutCommand({
                    TableName: TABLE_NAME,
                    Item: cleanedProduct,
                })
            );
        }

        console.log("Migration done");
    }  catch (error) {
        console.log("Migration Failed");
        console.error(error);
        process.exit(1);
    } finally {
        await pgPool.end();
    }
}

migrate();