import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { getDB } from "./db";
import { Trainer } from "./types";

dotenv.config();

const SUPER_SECRETO = process.env.SECRET;

type TokenPayload = {
  userId: string;
};

export const signToken = (userId: string) => {
  return jwt.sign({ userId }, SUPER_SECRETO!, { expiresIn: "1h" });
};

export const verifyToken = (token: string): TokenPayload | null => {
  try {
    const cleanToken = token.replace("Bearer ", "");

    return jwt.verify(cleanToken, SUPER_SECRETO!) as TokenPayload;
  } catch (err) {
    return null;
  }
};

export const getUserFromToken = async (token: string): Promise<Trainer | null> => {
  const payload = verifyToken(token);

  if (!payload) return null;

  const db = getDB();

  return await db.collection<Trainer>("entrenadores").findOne({
    _id: new ObjectId(payload.userId),
  });
};