import { docClient, BALANCE_TABLE_NAME, IDEMPOTENCY_TABLE_NAME } from "../config/dynamodb"
import { PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb"

export class TestDataManager {
  private createdUsers: string[] = []
  private createdIdempotentKeys: string[] = []

  async createUserWithBalance(userId: string, balance: number) {
    await docClient.send(
      new PutCommand({
        TableName: BALANCE_TABLE_NAME,
        Item: {
          userId,
          balance,
          updatedAt: new Date().toISOString(),
        },
      }),
    )
    this.createdUsers.push(userId)
  }

  async createIdempotentRecord(idempotentKey: string, result: any) {
    await docClient.send(
      new PutCommand({
        TableName: IDEMPOTENCY_TABLE_NAME,
        Item: {
          idempotentKey,
          result,
          createdAt: new Date().toISOString(),
          ttl: Math.floor(Date.now() / 1000) + 3600, // 1 hour
        },
      }),
    )
    this.createdIdempotentKeys.push(idempotentKey)
  }

  async cleanup() {
    // Clean up users
    for (const userId of this.createdUsers) {
      try {
        await docClient.send(
          new DeleteCommand({
            TableName: BALANCE_TABLE_NAME,
            Key: { userId },
          }),
        )
      } catch (error) {
        console.warn(`Failed to cleanup user ${userId}:`, error)
      }
    }

    // Clean up idempotent records
    for (const key of this.createdIdempotentKeys) {
      try {
        await docClient.send(
          new DeleteCommand({
            TableName: IDEMPOTENCY_TABLE_NAME,
            Key: { idempotentKey: key },
          }),
        )
      } catch (error) {
        console.warn(`Failed to cleanup idempotent key ${key}:`, error)
      }
    }

    this.createdUsers = []
    this.createdIdempotentKeys = []
  }

  generateUniqueUserId(prefix = "test-user") {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  generateUniqueKey(prefix = "test-key") {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}
