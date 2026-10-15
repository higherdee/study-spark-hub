import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { WorkspaceStart } from "@/components/workspace-start";
import { PublicHeader } from "@/components/public-header";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    search: _search,
    ...props
  }: {
    children: ReactNode;
    to: string;
    search?: unknown;
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/syllaboss-logo", () => ({ SyllabossLogo: () => <a href="/">Syllaboss</a> }));

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("Student workspace orientation", () => {
  it("offers three real study destinations", () => {
    render(<WorkspaceStart />);
    expect(screen.getByRole("link", { name: /Find your materials/ }).getAttribute("href")).toBe(
      "/dashboard/library",
    );
    expect(screen.getByRole("link", { name: /Untangle a tough topic/ }).getAttribute("href")).toBe(
      "/dashboard/assistant",
    );
    expect(screen.getByRole("link", { name: /Find your study people/ }).getAttribute("href")).toBe(
      "/dashboard/community",
    );
  });
  it("remembers a dismissal without requiring an account mutation", () => {
    const view = render(<WorkspaceStart />);
    fireEvent.click(screen.getByRole("button", { name: /Dismiss getting started/ }));
    expect(screen.queryByText("Where shall we start?")).toBeNull();
    view.unmount();
    render(<WorkspaceStart />);
    expect(screen.queryByText("Where shall we start?")).toBeNull();
  });
});

describe("Public mobile navigation", () => {
  it("announces open state and closes after choosing a destination", () => {
    render(<PublicHeader />);
    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(
      screen.getByRole("button", { name: "Close navigation" }).getAttribute("aria-expanded"),
    ).toBe("true");
    fireEvent.click(screen.getByRole("link", { name: "About Syllaboss" }));
    expect(screen.queryByRole("navigation", { name: "Mobile navigation" })).toBeNull();
    expect(
      screen.getByRole("button", { name: "Open navigation" }).getAttribute("aria-expanded"),
    ).toBe("false");
  });
});
