# TypeScript Assessment - Balance and Transaction Functions

This project implements two main functions for handling user balances and transactions with DynamoDB.

## Features

- **Task 1**: `getCurrentBalance` - Retrieves current balance with default 100 USD
- **Task 2**: `transact` - Processes credit/debit transactions with idempotency and race condition handling

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your AWS credentials and DynamoDB settings
```

3. Create DynamoDB tables:
```bash
npm run setup-tables
```

## Running Tests

```bash
# Run all tests
npm test

# Project Structure

```
src/

├── task1/

│   ├── getCurrentBalance.ts

│   └── __tests__/

├── task2/

│   ├── transact.ts

│   └── __tests__/

├── types/

├── config/

└── __tests__/

    └── functional.test.ts
    
```

## Usage Examples

```typescript
// Get current balance
const balance = await getCurrentBalance({ userId: 'user123' });

// Process credit transaction
const creditResult = await transact({
  idempotentKey: 'unique-key-1',
  userId: 'user123',
  amount: '50.00',
  type: 'credit'
});

// Process debit transaction
const debitResult = await transact({
  idempotentKey: 'unique-key-2',
  userId: 'user123',
  amount: '25.00',
  type: 'debit'
});
