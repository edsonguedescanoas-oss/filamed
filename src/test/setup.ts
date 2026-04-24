import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock ResizeObserver which is used by some Radix UI components
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserverMock;

// Mock window.open
window.open = vi.fn();
