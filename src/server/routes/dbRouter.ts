import { Router, Request, Response } from "express";
import { db } from "../../db/index";
import { transactions, familyMembers, users } from "../../db/schema";
import { eq, desc } from "drizzle-orm";

export const dbRouter = Router();

// DB Health Check
dbRouter.get("/health", async (req: Request, res: Response) => {
  try {
    await db.select().from(users).limit(1);
    res.json({ status: "ok", dbConnected: true });
  } catch (err: any) {
    res.json({ status: "ok", dbConnected: false, error: err.message });
  }
});

// Transactions endpoints
dbRouter.get("/transactions", async (req: Request, res: Response) => {
  try {
    const list = await db.select().from(transactions).orderBy(desc(transactions.id));
    res.json({ success: true, data: list });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

dbRouter.post("/transactions", async (req: Request, res: Response) => {
  try {
    const newTx = req.body;
    const inserted = await db.insert(transactions).values({
      date: newTx.date,
      bank: newTx.bank,
      category: newTx.category,
      subcategory: newTx.subcategory,
      description: newTx.description,
      amount: String(newTx.amount),
      comment: newTx.comment || null,
      userId: newTx.userId || null,
    }).returning();
    res.json({ success: true, data: inserted[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

dbRouter.delete("/transactions/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    await db.delete(transactions).where(eq(transactions.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Family Members endpoints
dbRouter.get("/family-members", async (req: Request, res: Response) => {
  try {
    const list = await db.select().from(familyMembers).orderBy(familyMembers.id);
    res.json({ success: true, data: list });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

dbRouter.post("/family-members", async (req: Request, res: Response) => {
  try {
    const member = req.body;
    const inserted = await db.insert(familyMembers).values({
      name: member.name,
      role: member.role,
      avatar: member.avatar || null,
    }).returning();
    res.json({ success: true, data: inserted[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

dbRouter.delete("/family-members/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    await db.delete(familyMembers).where(eq(familyMembers.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
