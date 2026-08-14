import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";
import { setupServer } from "msw/node";
import { handlers } from "@/mocks/handlers";

export const server = setupServer(...handlers);

const memory = new Map<string, string>();
const localStorageMock: Storage = {
  get length() { return memory.size; },
  clear: () => memory.clear(),
  getItem: (key) => memory.get(key) ?? null,
  key: (index) => [...memory.keys()][index] ?? null,
  removeItem: (key) => { memory.delete(key); },
  setItem: (key, value) => { memory.set(key, String(value)); },
};
Object.defineProperty(window, "localStorage", { value: localStorageMock, configurable: true });
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock, configurable: true });

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  window.localStorage.clear();
});
afterAll(() => server.close());
