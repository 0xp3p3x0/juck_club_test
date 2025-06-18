import { getCurrentBalance } from "../task1/getCurrentBalance"
import { transact } from "../task2/transact"
import { TestDataManager } from "./test-utils"

describe("Functional Tests", () => {
  const testManager = new TestDataManager()

  afterEach(async () => {
    await testManager.cleanup()
  })

  describe("getCurrentBalance functionality", () => {
    it("should return existing balance when user has a record", async () => {
      const userId = testManager.generateUniqueUserId()
      const expectedBalance = 250.75

      await testManager.createUserWithBalance(userId, expectedBalance)

      const result = await getCurrentBalance({ userId })
      expect(result.balance).toBe(expectedBalance)
      expect(result.userId).toBe(userId)
    })

    it("should return default balance for non-existent user", async () => {
      const userId = testManager.generateUniqueUserId()

      const result = await getCurrentBalance({ userId })
      expect(result.balance).toBe(100)
      expect(result.userId).toBe(userId)
    })
  })

  describe("transact functionality", () => {
    it("should create balance record on first credit transaction", async () => {
      const userId = testManager.generateUniqueUserId()
      const idempotentKey = testManager.generateUniqueKey()

      await testManager.createUserWithBalance(userId, 100)

      const result = await transact({
        idempotentKey,
        userId,
        amount: "50",
        type: "credit",
      })

      expect(result.newBalance).toBe(150) // 100 (default) + 50

      // Verify the balance record was created
      const balance = await getCurrentBalance({ userId })
      expect(balance.balance).toBe(150)
    })

    it("should handle decimal amounts correctly", async () => {
      const userId = testManager.generateUniqueUserId()
      const idempotentKey = testManager.generateUniqueKey()

      const result = await transact({
        idempotentKey,
        userId,
        amount: "25.99",
        type: "credit",
      })

      expect(result.newBalance).toBe(125.99)
      expect(result.amount).toBe(25.99)
    })

    it("should prevent duplicate processing with same idempotent key", async () => {
      const userId = testManager.generateUniqueUserId()
      const idempotentKey = testManager.generateUniqueKey()

      // First transaction
      const result1 = await transact({
        idempotentKey,
        userId,
        amount: "30",
        type: "credit",
      })

      // Second transaction with same key
      const result2 = await transact({
        idempotentKey,
        userId,
        amount: "30",
        type: "credit",
      })

      // Results should be identical
      expect(result1.transactionId).toBe(result2.transactionId)
      // Balance should only reflect one transaction
      const finalBalance = await getCurrentBalance({ userId })
       expect(result1.newBalance).toBe(finalBalance.balance)
      expect(finalBalance.balance).toBe(130) // 100 + 30 (only once)
    })
  })

})
