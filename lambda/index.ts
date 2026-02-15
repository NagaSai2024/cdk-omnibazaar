import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        const path = event.path;

        if (path === '/home/top-deals') {
            const data = await docClient.send(
                new QueryCommand({
                    TableName: process.env.TABLE_NAME,
                    IndexName: 'rank-index',
                    KeyConditionExpression: 'fixedKey = :fk',
                    ExpressionAttributeValues: {
                        ':fk': 'ALL',
                    },
                    Limit: 10,
                    ScanIndexForward: true,
                    ProjectionExpression:
                        "id, root_bs_rank, title, image_url, final_price",
                })
            );

            return {
                statusCode: 200,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "*",
                },
                body: JSON.stringify(data.Items),
            };
        }

        return {
            statusCode: 404,
            body: JSON.stringify({ message: "Not Found" }),
        };
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Server Error" }),
        };
    }
};
