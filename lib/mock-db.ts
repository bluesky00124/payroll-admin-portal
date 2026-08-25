import { seedDatabase } from "@/lib/mock-data";
import type { MockDatabase } from "@/lib/types";

const STORAGE_KEY = "payroll-admin-demo-db-v21";

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
    if (
      parsed.schemaVersion !== seedDatabase.schemaVersion ||
      !parsed.projectEmployeeGroups ||
      parsed.projectEmployeeGroups.length === 0 ||
      !parsed.projectCustomVariables ||
      parsed.projectCustomVariables.length === 0 ||
      !parsed.activityLogs ||
      parsed.activityLogs.length === 0 ||
      !parsed.payrollRuns ||
      !parsed.payrollAttendanceSheets ||
      !parsed.payrollLines ||
      !parsed.payrollFeedbacks ||
      !parsed.payrollAuditEvents
    ) {
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
