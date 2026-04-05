import { getDb } from './database';

export const getSetting = async (key: string): Promise<string | null> => {
  const db = await getDb();
  const result = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [key]
  );
  return result?.value || null;
};

export const setSetting = async (key: string, value: string): Promise<void> => {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [key, value]
  );
};

export interface Food {
  id: number;
  name: string;
  brand: string | null;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fats_per_100g: number;
}

export const addFood = async (food: Omit<Food, 'id'>): Promise<number> => {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO foods (name, brand, calories_per_100g, protein_per_100g, carbs_per_100g, fats_per_100g)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      food.name,
      food.brand || null,
      food.calories_per_100g,
      food.protein_per_100g,
      food.carbs_per_100g,
      food.fats_per_100g,
    ]
  );
  return result.lastInsertRowId;
};

export const updateFood = async (id: number, food: Omit<Food, 'id'>): Promise<void> => {
  const db = await getDb();
  await db.runAsync(
    `UPDATE foods SET name = ?, brand = ?, calories_per_100g = ?, protein_per_100g = ?, carbs_per_100g = ?, fats_per_100g = ?
     WHERE id = ?`,
    [
      food.name,
      food.brand || null,
      food.calories_per_100g,
      food.protein_per_100g,
      food.carbs_per_100g,
      food.fats_per_100g,
      id,
    ]
  );
};

export const searchFoods = async (query: string): Promise<Food[]> => {
  const db = await getDb();
  return await db.getAllAsync<Food>(
    `SELECT f.* 
     FROM foods f 
     LEFT JOIN logs l ON f.id = l.food_id 
     WHERE f.name LIKE ? OR f.brand LIKE ? 
     GROUP BY f.id 
     ORDER BY MAX(l.logged_at) DESC NULLS LAST, f.name ASC`,
    [`%${query}%`, `%${query}%`]
  );
};

export const getAllFoods = async (): Promise<Food[]> => {
  const db = await getDb();
  return await db.getAllAsync<Food>(
    `SELECT f.* 
     FROM foods f 
     LEFT JOIN logs l ON f.id = l.food_id 
     GROUP BY f.id 
     ORDER BY MAX(l.logged_at) DESC NULLS LAST, f.name ASC`
  );
};

export const addServingSize = async (foodId: number, name: string, weightInGrams: number): Promise<number> => {
  const db = await getDb();
  const result = await db.runAsync(
    'INSERT INTO serving_sizes (food_id, name, weight_in_grams) VALUES (?, ?, ?)',
    [foodId, name, weightInGrams]
  );
  return result.lastInsertRowId;
};

export const deleteServingSizes = async (foodId: number): Promise<void> => {
  const db = await getDb();
  await db.runAsync('DELETE FROM serving_sizes WHERE food_id = ?', [foodId]);
};

export const getServingSizes = async (foodId: number) => {
  const db = await getDb();
  return await db.getAllAsync<{ id: number, name: string, weight_in_grams: number }>(
    'SELECT * FROM serving_sizes WHERE food_id = ?',
    [foodId]
  );
};

export const logFood = async (
  foodId: number,
  servingSizeId: number | null,
  amountLogged: number,
  hardcodedCalories: number,
  hardcodedProtein: number,
  hardcodedCarbs: number,
  hardcodedFats: number
): Promise<number> => {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO logs (food_id, serving_size_id, amount_logged, hardcoded_calories, hardcoded_protein, hardcoded_carbs, hardcoded_fats)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [foodId, servingSizeId, amountLogged, hardcodedCalories, hardcodedProtein, hardcodedCarbs, hardcodedFats]
  );
  return result.lastInsertRowId;
};

export interface LogEntry {
  id: number;
  food_id: number;
  serving_size_id: number | null;
  amount_logged: number;
  hardcoded_calories: number;
  hardcoded_protein: number;
  hardcoded_carbs: number;
  hardcoded_fats: number;
  logged_at: string;
  name: string;
}

export const getTodaysLogs = async (): Promise<LogEntry[]> => {
  const db = await getDb();
  return await db.getAllAsync<LogEntry>(
    `SELECT l.*, f.name 
     FROM logs l 
     JOIN foods f ON l.food_id = f.id 
     WHERE date(l.logged_at, 'localtime') = date('now', 'localtime')
     ORDER BY l.logged_at DESC`
  );
};

export const getLogsByDate = async (dateString: string): Promise<LogEntry[]> => {
  const db = await getDb();
  return await db.getAllAsync<LogEntry>(
    `SELECT l.*, f.name 
     FROM logs l 
     JOIN foods f ON l.food_id = f.id 
     WHERE date(l.logged_at, 'localtime') = ?
     ORDER BY l.logged_at DESC`,
    [dateString]
  );
};

export const deleteLog = async (id: number): Promise<void> => {
  const db = await getDb();
  await db.runAsync('DELETE FROM logs WHERE id = ?', [id]);
};

export const getLogById = async (id: number): Promise<(LogEntry & { calories_per_100g: number, protein_per_100g: number, carbs_per_100g: number, fats_per_100g: number }) | null> => {
  const db = await getDb();
  return await db.getFirstAsync<LogEntry & { calories_per_100g: number, protein_per_100g: number, carbs_per_100g: number, fats_per_100g: number }>(
    `SELECT l.*, f.name, f.calories_per_100g, f.protein_per_100g, f.carbs_per_100g, f.fats_per_100g
     FROM logs l 
     JOIN foods f ON l.food_id = f.id 
     WHERE l.id = ?`,
    [id]
  );
};

export const updateLog = async (
  id: number,
  servingSizeId: number | null,
  amountLogged: number,
  hardcodedCalories: number,
  hardcodedProtein: number,
  hardcodedCarbs: number,
  hardcodedFats: number
): Promise<void> => {
  const db = await getDb();
  await db.runAsync(
    `UPDATE logs 
     SET serving_size_id = ?, amount_logged = ?, hardcoded_calories = ?, hardcoded_protein = ?, hardcoded_carbs = ?, hardcoded_fats = ?
     WHERE id = ?`,
    [servingSizeId, amountLogged, hardcodedCalories, hardcodedProtein, hardcodedCarbs, hardcodedFats, id]
  );
};
