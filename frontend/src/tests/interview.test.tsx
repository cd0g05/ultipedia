import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";

function jsonResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, opts?: RequestInit) => {
      if (url === "/api/interview/start")
        return jsonResponse({ session_id: "s1", assistant: "What's the drill called?", stage: "await_name" });
      if (url === "/api/interview/turn") {
        const body = JSON.parse((opts!.body as string) ?? "{}");
        return jsonResponse({
          session_id: "s1",
          assistant: `Got it: "${body.user_text}". How do you set it up?`,
          stage: "probe",
          target_aspect: "setup",
        });
      }
      if (url === "/api/interview/submit")
        return jsonResponse({ submission_id: "sub-1" });
      return jsonResponse({}, 204); // analytics events
    })
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("interview flow", () => {
  it("starts an interview and exchanges a turn", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Try the interview/ }));
    await user.click(screen.getByRole("button", { name: "Drills" }));

    // First question from the engine appears.
    await waitFor(() =>
      expect(screen.getByText("What's the drill called?")).toBeInTheDocument()
    );

    await user.type(screen.getByPlaceholderText("Type your answer…"), "4 lines");
    await user.click(screen.getByRole("button", { name: "Send" }));

    // The user's message and the next question render.
    await waitFor(() => expect(screen.getByText("4 lines")).toBeInTheDocument());
    expect(screen.getByText(/How do you set it up/)).toBeInTheDocument();
  });

  it("submitting the interview reaches the thank-you screen", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Try the interview/ }));
    await user.click(screen.getByRole("button", { name: "Drills" }));
    await waitFor(() =>
      expect(screen.getByText("What's the drill called?")).toBeInTheDocument()
    );

    await user.click(screen.getByRole("button", { name: /I'm done — submit/ }));
    await waitFor(() => expect(screen.getByText(/Thank you/)).toBeInTheDocument());
  });
});
