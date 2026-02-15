import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNode from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';


export class OmnibazaarBackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new dynamodb.Table(this, 'ProductsTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
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
    });

    const websiteBucket = new s3.Bucket(this, 'AngularFrontendBucket', {
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      publicReadAccess: true,
      blockPublicAccess: {
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

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

    const api = new apigateway.LambdaRestApi(this, 'ApiGateway', {
      handler: apiLamdda,
      proxy: true,
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS,
      },
    });

    new s3deploy.BucketDeployment(this, 'DeployAngular', {
      sources: [s3deploy.Source.asset('../omnibazaar-frontend/dist/omnibazaar-frontend/browser'),
      s3deploy.Source.data('assets/config.json',JSON.stringify({
          apiUrl: api.url
        })
      )
      ],

      destinationBucket: websiteBucket,
    });

    new cdk.CfnOutput(this, 'ProductsTableName', {
      value: table.tableName,
      exportName: 'ProductsTableName',
    });

    new cdk.CfnOutput(this, 'FrontendURL', {
      value: websiteBucket.bucketWebsiteUrl,
    });
  }
}
