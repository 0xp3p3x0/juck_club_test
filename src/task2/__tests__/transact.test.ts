import { transact } from "../transact"

describe("transact - Input Validation Tests", () => {
  it("should throw error for empty idempotentKey", async () => {
    await expect(
      transact({
        idempotentKey: "",
        userId: "user1",
        amount: "10",
        type: "credit",
      }),
    ).rejects.toThrow("Invalid idempotentKey: must be a non-empty string")
  })

  it("should throw error for empty userId", async () => {
    await expect(
      transact({
        idempotentKey: "key1",
        userId: "",
        amount: "10",
        type: "credit",
      }),
    ).rejects.toThrow("Invalid userId: must be a non-empty string")
  })

  it("should throw error for invalid amount - not a number", async () => {
    await expect(
      transact({
        idempotentKey: "key1",
        userId: "user1",
        amount: "invalid",
        type: "credit",
      }),
    ).rejects.toThrow("Invalid amount: must be a positive number")
  })

  it("should throw error for negative amount", async () => {
    await expect(
      transact({
        idempotentKey: "key1",
        userId: "user1",
        amount: "-10",
        type: "credit",
      }),
    ).rejects.toThrow("Invalid amount: must be a positive number")
  })

  it("should throw error for zero amount", async () => {
    await expect(
      transact({
        idempotentKey: "key1",
        userId: "user1",
        amount: "0",
        type: "credit",
      }),
    ).rejects.toThrow("Invalid amount: must be a positive number")
  })

  it("should throw error for invalid transaction type", async () => {
    await expect(
      transact({
        idempotentKey: "key1",
        userId: "user1",
        amount: "10",
        type: "invalid" as any,
      }),
    ).rejects.toThrow('Invalid type: must be either "credit" or "debit"')
  })

  it("should accept valid input format", () => {
    const input = {
      idempotentKey: "valid-key-123",
      userId: "valid-user-123",
      amount: "10.50",
      type: "credit" as const,
    }

    expect(input.idempotentKey).toBe("valid-key-123")
    expect(input.userId).toBe("valid-user-123")
    expect(Number.parseFloat(input.amount)).toBe(10.5)
    expect(input.type).toBe("credit")
  })
})
