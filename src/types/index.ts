export interface GetCurrentBalanceInput {
  userId: string
}

export interface GetCurrentBalanceOutput {
  userId: string
  balance: number
}

export interface TransactInput {
  idempotentKey: string
  userId: string
  amount: string
  type: "credit" | "debit"
}

export interface TransactOutput {
  userId: string
  newBalance: number
  transactionId: string
  type: "credit" | "debit"
  amount: number
}

export interface BalanceRecord {
  userId: string
  balance: number
  updatedAt: string
}

export interface IdempotencyRecord {
  idempotentKey: string
  userId: string
  amount: number
  type: "credit" | "debit"
  result: TransactOutput
  createdAt: string
  ttl: number
}
