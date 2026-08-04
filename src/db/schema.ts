import { pgTable, serial, text, numeric, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  date: text('date').notNull(),
  bank: text('bank').notNull(),
  category: text('category').notNull(),
  subcategory: text('subcategory').notNull(),
  description: text('description').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  comment: text('comment'),
  userId: text('user_id'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const familyMembers = pgTable('family_members', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  role: text('role').notNull(),
  avatar: text('avatar'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const budgetLimits = pgTable('budget_limits', {
  id: serial('id').primaryKey(),
  category: text('category').notNull(),
  month: text('month').notNull(),
  limitAmount: numeric('limit_amount', { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const investments = pgTable('investments', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  value: numeric('value', { precision: 12, scale: 2 }).notNull(),
  monthlyContribution: numeric('monthly_contribution', { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const mortgagesLiabilities = pgTable('mortgages_liabilities', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
  remainingAmount: numeric('remaining_amount', { precision: 12, scale: 2 }).notNull(),
  monthlyPayment: numeric('monthly_payment', { precision: 12, scale: 2 }).notNull(),
  interestRate: numeric('interest_rate', { precision: 5, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const insurances = pgTable('insurances', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  provider: text('provider').notNull(),
  annualPremium: numeric('annual_premium', { precision: 12, scale: 2 }).notNull(),
  type: text('type').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const settleUpItems = pgTable('settle_up_items', {
  id: serial('id').primaryKey(),
  payer: text('payer').notNull(),
  description: text('description').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  participants: jsonb('participants').notNull(),
  settled: boolean('settled').default(false).notNull(),
  date: text('date').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
