// @vitest-environment jsdom
import React from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, configure } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GiftCashout } from "@/components/native-web/gift-cashout";
import { BossComposer, BossWelcome } from "@/components/native-web/boss-studio";
configure({ asyncUtilTimeout: 10000 });
const state = vi.hoisted(() => ({ points: 10000, request: vi.fn() }));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: { id: "test", email: "student@example.com" },
    getToken: async () => "test-token",
  }),
}));
vi.mock("@/lib/profile", () => ({
  useProfile: () => ({ data: { points: state.points }, isPending: false }),
}));
vi.mock("@/integrations/turso/client", () => ({ getWithdrawals: async () => [] }));
vi.mock("@/lib/upload.functions", () => ({ requestWithdrawalServerFn: state.request }));
vi.mock("@/components/wallet/membership-gifts", () => ({
  MembershipGifts: () => <section>SyllaPlus gifts</section>,
}));
vi.mock("@/components/native-web/screens", () => ({
  NativePageTitle: ({ title }: { title: string }) => <h1>{title}</h1>,
}));
beforeEach(() => {
  state.points = 10000;
  state.request.mockReset().mockResolvedValue({ id: "request" });
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            options: [
              { amountUsd: 5, points: 5000, label: "$5 USD" },
              { amountUsd: 10, points: 10000, label: "$10 USD" },
            ],
          }),
          { status: 200 },
        ),
    ),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function cashout() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <GiftCashout />
    </QueryClientProvider>,
  );
}
describe("App cashout confirmations", () => {
  it("does not submit or deduct points until confirmation, then submits the selected quote", async () => {
    cashout();
    await screen.findByRole("button", { name: /\$5 USD/ });
    fireEvent.change(screen.getByRole("textbox", { name: /Delivery email/ }), {
      target: { value: "delivery@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Review request" }));
    expect(await screen.findByRole("alertdialog")).toBeTruthy();
    expect(state.request).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm request" }));
    await waitFor(() =>
      expect(state.request).toHaveBeenCalledWith({
        data: { brand: "amazon", amount: 5, email: "delivery@example.com" },
      }),
    );
    await screen.findByText("Request received.");
  });
  it("keeps the balance untouched when a request is cancelled", async () => {
    cashout();
    await screen.findByRole("button", { name: /\$5 USD/ });
    fireEvent.change(screen.getByRole("textbox", { name: /Delivery email/ }), {
      target: { value: "delivery@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Review request" }));
    await screen.findByRole("alertdialog");
    fireEvent.click(screen.getByRole("button", { name: "Keep my points" }));
    expect(state.request).not.toHaveBeenCalled();
  });
  it("prevents a request above the available balance", async () => {
    state.points = 100;
    cashout();
    await screen.findByRole("button", { name: /\$5 USD/ });
    expect(
      (screen.getByRole("button", { name: "Review request" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});
describe("Native Boss AI controls", () => {
  it("sends a useful starter prompt", () => {
    const send = vi.fn();
    render(<BossWelcome send={send} />);
    fireEvent.click(screen.getByRole("button", { name: /Understand a concept/ }));
    expect(send).toHaveBeenCalledWith(expect.stringContaining("Ask which concept"));
  });
  it("opens study modes and sends from the visible composer", () => {
    const mode = vi.fn(),
      send = vi.fn();
    render(
      <BossComposer
        value="Explain induction"
        change={() => {}}
        send={send}
        busy={false}
        recording={false}
        record={() => {}}
        library={() => {}}
        upload={() => {}}
        mode={mode}
        inputRef={{ current: null }}
        mobile={false}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "MCQ" }));
    expect(mode).toHaveBeenCalledWith("mcq");
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    expect(send).toHaveBeenCalledOnce();
  });
});
