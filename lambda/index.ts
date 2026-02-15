import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

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

        if (path.startsWith("/home/category/")) {

            const category = path.split("/home/category/")[1].toLowerCase();

            const data = await docClient.send(
                new ScanCommand({
                    TableName: process.env.TABLE_NAME,
                    FilterExpression: "attribute_exists(categories)",
                })
            );

            const filtered = data.Items?.filter((item: any) => {
                if (!item.categories) return false;

                return item.categories.some((cat: string) =>
                    cat.toLowerCase().includes(category)
                );
            }).slice(0, 4);

            const formatted = filtered?.map((item: any) => {
                let subtitle = "Special Offer";

                if (item.discount_percent && Number(item.discount_percent) >= 30) {
                    subtitle = "Min. 30% Off";
                } else if (item.root_bs_rank && item.root_bs_rank <= 300) {
                    subtitle = "Top Picks";
                }

                return {
                    id: Number(item.id),
                    title: item.title,
                    image_url: item.image_url,
                    subtitle,
                };
            });

            return {
                statusCode: 200,
                body: JSON.stringify(formatted),
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
