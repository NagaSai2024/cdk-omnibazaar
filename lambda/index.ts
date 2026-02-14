import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler: APIGatewayProxyHandler = async (event) => {
    try {

        const path = event.path;
        console.log("Incoming path:", path);


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
                })
            );

            return {
                statusCode: 200,
                body: JSON.stringify(data.Items),
            };
        }

        return {
            statusCode: 404,
            body: JSON.stringify({ message: "Not FOund" }),
        };

    } catch (error) {
        console.error("ERROR:", JSON.stringify(error))
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Can't fetch datra" }),
        };
    }
};