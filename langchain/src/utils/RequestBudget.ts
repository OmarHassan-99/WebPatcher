import { logger } from "../../logging/logger";

/**
 * Daily request budget tracker (singleton).
 *
 * Tracks the number of LLM requests made today and enforces a
 * configurable daily limit.  The counter auto-resets when a new
 * calendar day is detected.
 *
 * Default limit: 50 requests/day (override with LLM_DAILY_REQUEST_LIMIT env var).
 */
export class RequestBudget {
    private static instance: RequestBudget;

    private dailyLimit: number;
    private requestsToday: number = 0;
    private currentDay: string;

    private constructor() {
        this.dailyLimit = parseInt(process.env.LLM_DAILY_REQUEST_LIMIT || "50", 10);
        this.currentDay = this.todayKey();
        logger.info(`[RequestBudget] Initialized — daily limit: ${this.dailyLimit}`);
    }

    public static getInstance(): RequestBudget {
        if (!RequestBudget.instance) {
            RequestBudget.instance = new RequestBudget();
        }
        return RequestBudget.instance;
    }

    /** Check whether the budget still allows another request. */
    public canMakeRequest(): boolean {
        this.resetIfNewDay();
        return this.requestsToday < this.dailyLimit;
    }

    /** Record that one request has been consumed. */
    public recordRequest(): void {
        this.resetIfNewDay();
        this.requestsToday++;
    }

    /** Number of requests remaining today. */
    public getRemaining(): number {
        this.resetIfNewDay();
        return Math.max(0, this.dailyLimit - this.requestsToday);
    }

    /** Number of requests used today. */
    public getUsed(): number {
        this.resetIfNewDay();
        return this.requestsToday;
    }

    // ── Internal ────────────────────────────────────────────

    private todayKey(): string {
        return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
    }

    private resetIfNewDay(): void {
        const today = this.todayKey();
        if (today !== this.currentDay) {
            logger.info(
                `[RequestBudget] New day detected (${this.currentDay} → ${today}). Resetting counter.`
            );
            this.requestsToday = 0;
            this.currentDay = today;
        }
    }
}
