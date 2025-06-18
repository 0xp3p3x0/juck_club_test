import { GetCommand } from "@aws-sdk/lib-dynamodb"
import { docClient, BALANCE_TABLE_NAME } from "../config/dynamodb"
import type { GetCurrentBalanceInput, GetCurrentBalanceOutput } from "../types"

const DEFAULT_BALANCE = 100

export async function getCurrentBalance(input: GetCurrentBalanceInput): Promise<GetCurrentBalanceOutput> {
  const { userId } = input

  if (!userId || typeof userId !== "string") {
    throw new Error("Invalid userId: must be a non-empty string")
  }

  try {
    const command = new GetCommand({
      TableName: BALANCE_TABLE_NAME,
      Key: {
        userId,
      },
    })

    const result = await docClient.send(command)

    // If no record exists, return default balance
    if (!result.Item) {
      return {
        userId,
        balance: DEFAULT_BALANCE,
      }
    }

    const balance = result.Item.balance

    // Validate balance is a number
    if (typeof balance !== "number" || isNaN(balance)) {
      throw new Error(`Invalid balance data for user ${userId}`)
    }

    return {
      userId,
      balance,
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("Invalid balance data")) {
      throw error
    }
    throw new Error(`Failed to retrieve balance for user ${userId}: ${error}`)
  }
}
