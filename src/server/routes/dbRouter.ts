import { Router, Request, Response } from "express";
import { db } from "../../db/index";
import { transactions, users } from "../../db/schema";
import { eq, desc, and } from "drizzle-orm";
import { getRequestUser } from "../middleware/firebaseAuth";

export const dbRouter = Router();

dbRouter.get("/me", async (req: Request, res: Response) => {
  try {
    const user = getRequestUser(req);
    const existing = await db.insert(users).values({
      uid: user.uid,
      email: user.email || "",
      name: user.name || null,
      profile: {},
    }).onConflictDoUpdate({
      target: users.uid,
      set: { email: user.email || "", name: user.name || null },
    }).returning();
    res.json({ success: true, data: existing[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

dbRouter.put("/me/profile", async (req: Request, res: Response) => {
  try {
    const user = getRequestUser(req);
    const profile = req.body?.profile;
    if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
      res.status(400).json({ success: false, error: "A profile object is required." });
      return;
    }
    const updated = await db.update(users).set({ profile }).where(eq(users.uid, user.uid)).returning({ profile: users.profile });
    res.json({ success: true, data: updated[0]?.profile || {} });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

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
    const user = getRequestUser(req);
    const list = await db.select().from(transactions).where(eq(transactions.userId, user.uid)).orderBy(desc(transactions.id));
    res.json({ success: true, data: list });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

dbRouter.post("/transactions", async (req: Request, res: Response) => {
  try {
    const user = getRequestUser(req);
    const newTx = req.body;
    const inserted = await db.insert(transactions).values({
      date: newTx.date,
      bank: newTx.bank,
      category: newTx.category,
      subcategory: newTx.subcategory,
      description: newTx.description,
      amount: String(newTx.amount),
      comment: newTx.comment || null,
      userId: user.uid,
    }).returning();
    res.json({ success: true, data: inserted[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

dbRouter.delete("/transactions/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const user = getRequestUser(req);
    await db.delete(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, user.uid)));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Family Members endpoints
dbRouter.get("/family-members", async (req: Request, res: Response) => {
  try {
    const user = getRequestUser(req);
    const result = await db.select({ profile: users.profile }).from(users).where(eq(users.uid, user.uid)).limit(1);
    res.json({ success: true, data: result[0]?.profile?.familyMembers || [] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

dbRouter.post("/family-members", async (req: Request, res: Response) => {
  try {
    res.status(410).json({ success: false, error: "Family members are stored in the authenticated profile. Use PUT /api/db/me/profile." });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

dbRouter.delete("/family-members/:id", async (req: Request, res: Response) => {
  try {
    res.status(410).json({ success: false, error: "Family members are stored in the authenticated profile." });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
