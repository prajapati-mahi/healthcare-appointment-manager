const fs = require('fs');

if (fs.existsSync('src/workers/notification.worker.ts')) fs.unlinkSync('src/workers/notification.worker.ts');
if (fs.existsSync('src/workers/slotHold.worker.ts')) fs.unlinkSync('src/workers/slotHold.worker.ts');
if (fs.existsSync('src/workers/medication.worker.ts')) fs.unlinkSync('src/workers/medication.worker.ts');
if (fs.existsSync('src/workers/calendarSync.worker.ts')) fs.unlinkSync('src/workers/calendarSync.worker.ts');

fs.writeFileSync('src/workers/index.ts', 'export const startWorkers = () => {};');

fs.writeFileSync('src/utils/token.utils.ts', `import jwt from "jsonwebtoken";
import { Role } from "../config/constants";
export const generateToken = (userId: string, role: Role): string => {
  return jwt.sign({ sub: userId, role }, process.env.JWT_SECRET || "secret", { expiresIn: "7d" } as jwt.SignOptions);
};`);

fs.writeFileSync('src/middleware/validate.ts', `import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
export const validate = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({ body: req.body, query: req.query, params: req.params });
      next();
    } catch (error: any) {
      res.status(400).json({ error: error.errors });
    }
  };
};`);

let a = fs.readFileSync('src/controllers/appointment.controller.ts', 'utf8');
fs.writeFileSync('src/controllers/appointment.controller.ts', a.replace('req.params.id', 'req.params.id as string'));

let u = fs.readFileSync('src/controllers/user.controller.ts', 'utf8');
fs.writeFileSync('src/controllers/user.controller.ts', u.replace('req.params.id', 'req.params.id as string'));
