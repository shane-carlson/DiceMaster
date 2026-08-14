import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { rollNotation } from "./dice.js";

export interface HistoryEntry {
  id: string;
  notation: string;
  total: number;
  terms: ReturnType<typeof rollNotation>["terms"];
  rolledAt: string;
}

/**
 * Build the Express app. History is kept in memory and capped so the demo
 * environment stays lightweight; swap this for a datastore in production.
 */
export function createApp(): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const history: HistoryEntry[] = [];
  const MAX_HISTORY = 50;

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", uptime: process.uptime() });
  });

  app.post("/api/roll", (req: Request, res: Response) => {
    const notation = typeof req.body?.notation === "string" ? req.body.notation : "";
    try {
      const result = rollNotation(notation);
      const entry: HistoryEntry = {
        id: randomUUID(),
        notation: result.notation,
        total: result.total,
        terms: result.terms,
        rolledAt: new Date().toISOString(),
      };
      history.unshift(entry);
      if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
      res.json(entry);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : "Invalid notation." });
    }
  });

  app.get("/api/history", (_req: Request, res: Response) => {
    res.json(history);
  });

  app.delete("/api/history", (_req: Request, res: Response) => {
    history.length = 0;
    res.json({ cleared: true });
  });

  return app;
}
