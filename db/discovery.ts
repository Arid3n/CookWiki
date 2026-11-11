import { expoDb } from './index';

export type MissingLinkResult = {
  recipe_id: string;
  recipe_title: string;
  missing_ingredient_id: string;
  missing_ingredient_name: string | null;
  missing_amount: number;
};

export async function findMissingLinkRecipes(userId: string | null): Promise<MissingLinkResult[]> {
  /*
    * PURE SQL ALGEBRAIC MATRIX:
    * 1. Filters mapping against current authorized scopes (NULL=Global, ID=Private).
    * 2. Extracts missing edges comparing 'recipe_ingredients' against 'user_pantry'.
    * 3. Groups vertically collapsing the node mapping paths entirely by explicitly valid recipes.
    * 4. Exclusively traps rows evaluating exactly 1 singular missing link explicitly via HAVING maps!
    */
  const sql = `
    SELECT 
      r.id as recipe_id, 
      r.title as recipe_title, 
      MIN(ri.ingredient_id) as missing_ingredient_id,
      MIN(i.name) as missing_ingredient_name,
      MIN(ri.amount - COALESCE(up.amount, 0)) as missing_amount
    FROM recipes r
    JOIN recipe_ingredients ri ON r.id = ri.recipe_id
    LEFT JOIN ingredients i ON ri.ingredient_id = i.id
    LEFT JOIN user_pantry up ON up.ingredient_id = ri.ingredient_id
    WHERE (r.isDeleted = 0 OR r.isDeleted IS NULL)
      AND (r.user_id IS NULL OR r.user_id = ?)
      AND ri.amount > COALESCE(up.amount, 0)
    GROUP BY r.id, r.title
    HAVING COUNT(ri.ingredient_id) = 1
    LIMIT 30
  `;

  // Safely passes bound parameters isolating strictly natively
  return await expoDb.getAllAsync<MissingLinkResult>(sql, [userId || 'none']);
}
