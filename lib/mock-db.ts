import { seedDatabase } from "@/lib/mock-data";
import type { MockDatabase } from "@/lib/types";

const STORAGE_KEY = "payroll-admin-demo-db-v6";

const cloneSeed = () => structuredClone(seedDatabase);

export function readMockDatabase(): MockDatabase {
  if (typeof window === "undefined") return cloneSeed();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seed = cloneSeed();
    writeMockDatabase(seed);
    return seed;
  }
  try {
    const parsed = JSON.parse(raw) as MockDatabase;
    if (parsed.schemaVersion !== seedDatabase.schemaVersion) {
      return resetMockDatabase();
    }
    return parsed;
  } catch {
    return resetMockDatabase();
  }
}

export function writeMockDatabase(database: MockDatabase) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
  }
}

export function mutateMockDatabase(mutator: (database: MockDatabase) => void) {
  const database = readMockDatabase();
  mutator(database);
  writeMockDatabase(database);
  return database;
}

export function resetMockDatabase() {
  const seed = cloneSeed();
  writeMockDatabase(seed);
  return seed;
}
