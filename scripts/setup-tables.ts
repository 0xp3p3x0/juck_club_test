import {
  CreateTableCommand,
  DescribeTableCommand,
  DynamoDBClient,
  UpdateTimeToLiveCommand,
} from "@aws-sdk/client-dynamodb"

import * as dotenv from 'dotenv';
dotenv.config();

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  endpoint: process.env.DYNAMODB_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

async function createBalanceTable() {
  const tableName = process.env.BALANCE_TABLE_NAME || "user_balances"

  try {
    await client.send(new DescribeTableCommand({ TableName: tableName }))
    console.log(`Table ${tableName} already exists`)
    return
  } catch (error) {
    // Table doesn't exist
  }

  const command = new CreateTableCommand({
    TableName: tableName,
    KeySchema: [{ AttributeName: "userId", KeyType: "HASH" }],
    AttributeDefinitions: [{ AttributeName: "userId", AttributeType: "S" }],
    BillingMode: "PAY_PER_REQUEST",
  })

  await client.send(command)
  console.log(`Created table: ${tableName}`)
}

async function createIdempotencyTable() {
  const tableName = process.env.IDEMPOTENCY_TABLE_NAME || "transaction_idempotency"

  try {
    await client.send(new DescribeTableCommand({ TableName: tableName }))
    console.log(`Table ${tableName} already exists`)
    return
  } catch (error) {
    // Table doesn't exist
  }

  const command = new CreateTableCommand({
    TableName: tableName,
    KeySchema: [{ AttributeName: "idempotentKey", KeyType: "HASH" }],
    AttributeDefinitions: [{ AttributeName: "idempotentKey", AttributeType: "S" }],
    BillingMode: "PAY_PER_REQUEST",
  })

  await client.send(command)
  console.log(`Created table: ${tableName}`)


  await enableTTL(tableName, "ttl")

}

async function enableTTL(tableName: string, ttlAttribute: string) {
  const command = new UpdateTimeToLiveCommand({
    TableName: tableName,
    TimeToLiveSpecification: {
      AttributeName: ttlAttribute,
      Enabled: true,
    },
  });

  await client.send(command);
  console.log(`TTL enabled for table: ${tableName} using attribute: ${ttlAttribute}`);
}

async function setupTables() {
  try {
    await createBalanceTable()
    await createIdempotencyTable()
    console.log("All tables created successfully")
  } catch (error) {
    console.error("Error creating tables:", error)
    process.exit(1)
  }
}

setupTables()
