import { afterEach, describe, expect, it, vi } from "vitest";
import { flushQueue, queueSize, submit } from "../api/client";
import type { SubmissionCreate } from "../types";

const payload: SubmissionCreate = {
  type: "drill",
  contributor: { consent_to_credit: false },
  fields: { name: "4 lines" },
};

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

function mockFetch(impl: (url: string) => Partial<Response> | Promise<Partial<Response>>) {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => impl(url) as Response));
}

describe("submit()", () => {
  it("returns the submission id on 201", async () => {
    mockFetch(() => ({
      status: 201,
      json: async () => ({ submission_id: "abc-123" }),
    }));
    const r = await submit(payload);
    expect(r.ok).toBe(true);
    expect(r.submissionId).toBe("abc-123");
    expect(queueSize()).toBe(0);
  });

  it("queues the payload on network failure (offline), never losing it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      })
    );
    const r = await submit(payload);
    expect(r.ok).toBe(false);
    expect(r.queued).toBe(true);
    expect(queueSize()).toBe(1);
  });

  it("does NOT queue a server rejection (4xx)", async () => {
    mockFetch(() => ({ status: 429, json: async () => ({ detail: "slow down" }) }));
    const r = await submit(payload);
    expect(r.ok).toBe(false);
    expect(r.rejected).toBe(true);
    expect(r.detail).toBe("slow down");
    expect(queueSize()).toBe(0);
  });
});

describe("flushQueue()", () => {
  it("delivers a previously queued submission once back online", async () => {
    // First submit fails and queues.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      })
    );
    await submit(payload);
    expect(queueSize()).toBe(1);

    // Now the network is back.
    mockFetch(() => ({ status: 201, json: async () => ({ submission_id: "z" }) }));
    const delivered = await flushQueue();
    expect(delivered).toBe(1);
    expect(queueSize()).toBe(0);
  });
});
