// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { File as NodeFile } from "node:buffer";
import { PDFDocument } from "pdf-lib";
import { PdfWorkshop } from "@/components/native-web/pdf-workshop";

const state = vi.hoisted(() => ({ paid: true, fail: false }));
vi.mock("@/hooks/use-membership", () => ({
  useMembership: () => ({
    data: { paid: state.paid },
    isPending: false,
    refetch: async () => (state.fail ? { data: undefined } : { data: { paid: state.paid } }),
  }),
}));
vi.mock("@/components/native-web/screens", () => ({
  NativePageTitle: () => <h1>PDF workshop</h1>,
}));

async function pdf(name: string, pages = 1) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) doc.addPage([420, 600]);
  return new NodeFile([await doc.save()], name, { type: "application/pdf" });
}
function choose(container: HTMLElement, files: NodeFile[]) {
  fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files } });
}
beforeEach(() => {
  state.paid = true;
  state.fail = false;
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("PDF workshop user flow", () => {
  it("keeps selected files, builds a real merged PDF, and downloads only when requested", async () => {
    const blobs: Blob[] = [];
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn((blob: Blob) => {
        blobs.push(blob);
        return "blob:test";
      }),
    });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const { container } = render(<PdfWorkshop />);
    choose(container, [await pdf("first.pdf"), await pdf("second.pdf", 2)]);
    expect(screen.getByText("first.pdf")).toBeTruthy();
    expect(screen.getByText("second.pdf")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Build PDF" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Download PDF" })).toBeTruthy());
    expect(click).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Download PDF" }));
    expect(click).toHaveBeenCalledOnce();
    const bytes = await new Promise<ArrayBuffer>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.readAsArrayBuffer(blobs[0]!);
    });
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(3);
    fireEvent.click(screen.getByRole("button", { name: "Remove first.pdf" }));
    expect(screen.queryByRole("button", { name: "Download PDF" })).toBeNull();
  });
  it("enforces the free page limit in the actual form", async () => {
    state.paid = false;
    const { container } = render(<PdfWorkshop />);
    choose(container, [await pdf("large.pdf", 16)]);
    fireEvent.click(screen.getByRole("button", { name: "Build PDF" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("15 pages"));
    expect(screen.queryByRole("button", { name: "Download PDF" })).toBeNull();
  });
  it("unlocks a free export after the visible promotion without an automatic download", async () => {
    state.paid = false;
    vi.spyOn(document, "hasFocus").mockReturnValue(true);
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    let tick: (() => void) | undefined;
    vi.spyOn(globalThis, "setInterval").mockImplementation(((callback: () => void) => {
      tick = callback;
      return 1;
    }) as typeof setInterval);
    const { container } = render(<PdfWorkshop />);
    choose(container, [await pdf("notes.pdf")]);
    fireEvent.click(screen.getByRole("button", { name: "Build PDF" }));
    await waitFor(() => expect(screen.getByText("Your PDF unlocks in 30s")).toBeTruthy());
    expect(tick).toBeTypeOf("function");
    act(() => {
      for (let i = 0; i < 30; i++) tick!();
    });
    expect(screen.getByRole("button", { name: "Download PDF" })).toBeTruthy();
  });
  it("shows membership failures without losing selected files", async () => {
    state.fail = true;
    const { container } = render(<PdfWorkshop />);
    choose(container, [await pdf("notes.pdf")]);
    fireEvent.click(screen.getByRole("button", { name: "Build PDF" }));
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("verify your membership"),
    );
    expect(screen.getByText("notes.pdf")).toBeTruthy();
  });
});
