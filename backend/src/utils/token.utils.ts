import jwt from "jsonwebtoken";
import { Role } from "../config/constants";
export const generateToken = (userId: string, role: Role): string => {
  return jwt.sign({ sub: userId, role }, process.env.JWT_SECRET || "secret", { expiresIn: "7d" } as jwt.SignOptions);
};