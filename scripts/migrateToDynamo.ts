import { Pool } from 'pg';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';

const REGION = "us-east-1";
const STACK_NAME = "OmnibazaarBackendStack";

const pgPool = new Pool({
    connectionString: "postgresql://postgres:NagaSai%402025@localhost:5432/omniDB",
});

async function getTableName(): Promise<string> {
    const cf = new CloudFormationClient({ region: REGION });

    const result = await cf.send(
        new DescribeStacksCommand({
            StackName: STACK_NAME,
        })
    );

    const output = result.Stacks?.[0].Outputs?.find(
        o => o.OutputKey === "ProductsTableName"
    );

    if (!output?.OutputValue) {
        throw new Error("Table name not found in stack outputs");
    }

    return output.OutputValue;
}


async function migrate() {
    try {
        const TABLE_NAME = await getTableName();
        const dynamoClient = new DynamoDBClient({ region: REGION });
        const docClient = DynamoDBDocumentClient.from(dynamoClient);
        console.log("Fetching data...");

        const { rows } = await pgPool.query(`
            SELECT *
            FROM products
            `);

        console.log(`Found ${rows.length} products`);

        for (const product of rows) {

            const cleanedProduct: any = {};

            for (const [key, value] of Object.entries(product)) {
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
    } catch (error) {
        console.log("Migration Failed");
        console.error(error);
        process.exit(1);
    } finally {
        await pgPool.end();
    }
}

migrate();