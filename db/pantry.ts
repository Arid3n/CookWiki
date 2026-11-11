import { db } from "./index";
import { userPantry } from "./schema";
import { eq } from "drizzle-orm";

export async function updatePantryAmount(ingredientId: string, amount: number) {
  if (amount <= 0) {
    await db.delete(userPantry).where(eq(userPantry.ingredientId, ingredientId)).execute();
  } else {
    await db.insert(userPantry).values({ ingredientId, amount })
      .onConflictDoUpdate({ target: userPantry.ingredientId, set: { amount } }).execute();
  }
}

export async function getPantryIngredientIds() {
  const records = await db.select({ ingredientId: userPantry.ingredientId, amount: userPantry.amount }).from(userPantry);
  const map = new Map<string, number>();
  records.forEach(r => map.set(r.ingredientId, r.amount));
  return map;
}
