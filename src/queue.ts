import { InternalServerErrorException, RateLimitException } from "./exceptions";

type SendFn = (batch: Record<string, unknown>[]) => Promise<void>;

export class EventQueue {
  readonly uploadSize: number;
  readonly uploadInterval: number;
  readonly maxQueueSize: number;

  private readonly sendFn: SendFn;
  private readonly pending: Record<string, unknown>[] = [];
  private timer?: ReturnType<typeof setInterval>;
  private isShuttingDown = false;
  private drainPromise?: Promise<void>;

  constructor(opts: {
    sendFn: SendFn;
    uploadSize?: number;
    uploadInterval?: number;
    maxQueueSize?: number;
  }) {
    this.sendFn = opts.sendFn;
    this.uploadSize = opts.uploadSize ?? 10;
    this.uploadInterval = opts.uploadInterval ?? 1.0;
    this.maxQueueSize = opts.maxQueueSize ?? 10_000;

    this.startTimer();
  }

  enqueue(payload: Record<string, unknown>): void {
    if (this.isShuttingDown) {
      console.warn("[atheon-codex] Event dropped: queue is shutting down.");
      return;
    }
    if (this.pending.length >= this.maxQueueSize) {
      console.warn(
        "[atheon-codex] Event queue is full — dropping event. " +
          "Consider calling flush() more frequently or increasing maxQueueSize.",
      );
      return;
    }

    this.pending.push(payload);

    if (this.pending.length >= this.uploadSize) {
      void this.drain();
    }
  }

  async flush(): Promise<void> {
    await this.drain();
  }

  async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    this.stopTimer();
    await this.drain();
  }

  private startTimer(): void {
    this.timer = setInterval(
      () => void this.drain(),
      this.uploadInterval * 1_000,
    );
    if (this.timer && typeof this.timer === "object" && "unref" in this.timer) {
      (this.timer as NodeJS.Timeout).unref();
    }
  }

  private stopTimer(): void {
    if (this.timer !== undefined) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  private drain(): Promise<void> {
    if (this.drainPromise) {
      return this.drainPromise;
    }

    this.drainPromise = (async () => {
      while (this.pending.length) {
        const batch = this.pending.splice(0, this.uploadSize);
        await this.sendBatch(batch);
      }
    })().finally(() => {
      this.drainPromise = undefined;
    });

    return this.drainPromise;
  }

  private async sendBatch(batch: Record<string, unknown>[]): Promise<void> {
    if (batch.length === 0) return;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await this.sendFn(batch);
        return;
      } catch (err) {
        const isRetryable =
          err instanceof RateLimitException ||
          err instanceof InternalServerErrorException;

        if (isRetryable && attempt < 2) {
          await new Promise((r) => setTimeout(r, 200 * 2 ** attempt));
          continue;
        }

        console.error(
          "[atheon-codex] Failed to send event batch after retry:",
          err,
        );
        return;
      }
    }
  }
}
