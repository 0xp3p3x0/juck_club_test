import { TransactWriteCommand, GetCommand, type TransactWriteCommandInput } from "@aws-sdk/lib-dynamodb"
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb"
import { docClient, BALANCE_TABLE_NAME, IDEMPOTENCY_TABLE_NAME } from "../config/dynamodb"
import type { TransactInput, TransactOutput } from "../types"
import { v4 as uuidv4 } from "uuid"

export async function transact(input: TransactInput): Promise<TransactOutput> {
  const { idempotentKey, userId, amount, type } = input

  // Input validation
  if (!idempotentKey || typeof idempotentKey !== "string") {
    throw new Error("Invalid idempotentKey: must be a non-empty string")
  }

  if (!userId || typeof userId !== "string") {
    throw new Error("Invalid userId: must be a non-empty string")
  }

  const numericAmount = Number.parseFloat(amount)
  if (isNaN(numericAmount) || numericAmount <= 0) {
    throw new Error("Invalid amount: must be a positive number")
  }

  if (!["credit", "debit"].includes(type)) {
    throw new Error('Invalid type: must be either "credit" or "debit"')
  }

  // Check for existing idempotent transaction
  try {
    const existingTransaction = await checkIdempotency(idempotentKey)
    if (existingTransaction) {
      return existingTransaction
    }
  } catch (error) {
    throw new Error(`Failed to check idempotency: ${error}`)
  }

  // Process the transaction atomically
  const transactionId = uuidv4()
  const timestamp = new Date().toISOString()
  const ttl = Math.floor(Date.now() / 1000) + 24 * 60 * 60 // 24 hours TTL

  try {
    // Prepare transaction items
    const transactItems: TransactWriteCommandInput["TransactItems"] = []

    // 1. Update balance with atomic increment/decrement
    let updateExpression =
      type === "credit"
        ? "ADD balance :amount SET updatedAt = :timestamp"
        : "ADD balance :negAmount SET updatedAt = :timestamp"

    const expressionAttributeValues: Record<string, any> = {
      ":timestamp": timestamp,
    }

    let conditionExpression = ""

    if (type === "credit") {
      // For credit: just add the amount (no balance check needed)
      expressionAttributeValues[":amount"] = numericAmount
      // Use SET if_not_exists for initial balance
      updateExpression = "SET balance = if_not_exists(balance, :defaultBalance) + :amount, updatedAt = :timestamp"
      expressionAttributeValues[":defaultBalance"] = 100
    } else {
      // For debit: subtract amount and ensure balance doesn't go below 0
      expressionAttributeValues[":negAmount"] = -numericAmount
      expressionAttributeValues[":minAmount"] = numericAmount
      expressionAttributeValues[":defaultBalance"] = 100
      updateExpression = "SET balance = if_not_exists(balance, :defaultBalance) - :minAmount, updatedAt = :timestamp"
      conditionExpression = "if_not_exists(balance, :defaultBalance) >= :minAmount"  // Ensure balance doesn't go below 0
    }

    // Only push conditionExpression if it's not empty or null
    const updateCommand: any = {
      TableName: BALANCE_TABLE_NAME,
      Key: { userId },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
    }
    if (conditionExpression) {
      updateCommand.ConditionExpression = conditionExpression
    }
    transactItems.push({
      Update: updateCommand,
    })

    // 2. Store idempotency record
    const result: TransactOutput = {
      userId,
      newBalance: 0, // Will be calculated after transaction
      transactionId,
      type,
      amount: numericAmount,
    }

    transactItems.push({
      Put: {
        TableName: IDEMPOTENCY_TABLE_NAME,
        Item: {
          idempotentKey,
          userId,
          amount: numericAmount,
          type,
          result,
          createdAt: timestamp,
          ttl,
        },
        ConditionExpression: "attribute_not_exists(idempotentKey)",
      },
    })

    // Execute atomic transaction
    const transactCommand = new TransactWriteCommand({
      TransactItems: transactItems,
    })

    await docClient.send(transactCommand)

    // Get the updated balance
    const updatedBalance = await getCurrentBalanceAfterTransaction(userId)
    result.newBalance = updatedBalance

    return result
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      // Handle specific error cases
      if (error.message.includes("balance")) {
        throw new Error("Insufficient balance for debit transaction")
      }
      if (error.message.includes("idempotentKey")) {
        // Race condition: another transaction with same idempotent key succeeded
        const existingTransaction = await checkIdempotency(idempotentKey)
        if (existingTransaction) {
          return existingTransaction
        }
      }
    }
    throw new Error(`Transaction failed: ${error}`)
  }
}

async function checkIdempotency(idempotentKey: string): Promise<TransactOutput | null> {
  const command = new GetCommand({
    TableName: IDEMPOTENCY_TABLE_NAME,
    Key: { idempotentKey },
  })

  const result = await docClient.send(command)

  if (result.Item) {
    return result.Item.result as TransactOutput
  }

  return null
}

async function getCurrentBalanceAfterTransaction(userId: string): Promise<number> {
  const command = new GetCommand({
    TableName: BALANCE_TABLE_NAME,
    Key: { userId },
  })

  const result = await docClient.send(command)
  return result.Item?.balance || 100
}
