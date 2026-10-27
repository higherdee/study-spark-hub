import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MaintenanceGate } from "@/components/maintenance-gate";

afterEach(cleanup);

describe("Public platform access", () => {
  it("renders the platform without a maintenance passcode or browser storage", () => {
    render(<MaintenanceGate><main>Course library</main></MaintenanceGate>);
    expect(screen.getByRole("main")).toHaveTextContent("Course library");
    expect(screen.queryByText(/scheduled maintenance/i)).not.toBeInTheDocument();
  });
});
