import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNode from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

export class OmnibazaarBackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new dynamodb.Table(this, 'ProductsTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING},
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    table.addGlobalSecondaryIndex({
      indexName: 'rank-index',
      partitionKey: {
        name: 'fixedKey',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'root_bs_rank',
        type: dynamodb.AttributeType.NUMBER,
      },
    })

    const apiLamdda = new lambdaNode.NodejsFunction(this, 'ApiLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../lambda/index.ts'),
      handler: 'handler',
      timeout: cdk.Duration.seconds(10),
      bundling: {
        forceDockerBundling: false,
      },
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    table.grantReadWriteData(apiLamdda);

    new apigateway.LambdaRestApi(this, 'ApiGateway', {
      handler: apiLamdda,
    })
  }
}
