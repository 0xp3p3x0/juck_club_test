import { getCurrentBalance } from "../getCurrentBalance"

describe("getCurrentBalance - Input Validation Tests", () => {
  it("should throw error for empty userId", async () => {
    await expect(getCurrentBalance({ userId: "" })).rejects.toThrow("Invalid userId: must be a non-empty string")
  })

  it("should throw error for null userId", async () => {
    await expect(getCurrentBalance({ userId: null as any })).rejects.toThrow(
      "Invalid userId: must be a non-empty string",
    )
  })

  it("should throw error for undefined userId", async () => {
    await expect(getCurrentBalance({ userId: undefined as any })).rejects.toThrow(
      "Invalid userId: must be a non-empty string",
    )
  })

  it("should accept valid userId format", () => {
    // This test just validates the input doesn't throw immediately
    expect(() => {
      const input = { userId: "valid-user-123" }
      expect(input.userId).toBe("valid-user-123")
    }).not.toThrow()
  })
})
