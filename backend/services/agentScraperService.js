const axios = require("axios");
const cron = require("node-cron");

class AgentScraperService {
  constructor() {
    this.scraperUrl = "https://agent-report-scraper.onrender.com";
    this.credentials = {
      username: "admiin",
      password: "AdminPBX@123",
    };
    this.isScheduled = false;
    this.lastRunTime = null;
    this.lastRunStatus = null;
    this.config = {
      // Run every hour
      cronSchedule: "0 * * * *",
      timeout: 120000, // 2 minutes timeout
      retryAttempts: 3,
      retryDelay: 5000, // 5 seconds between retries
    };
  }

  /**
   * Initialize the scheduled scraper job
   */
  initializeScheduledJob() {
    if (this.isScheduled) {
      console.log("⚠️ Agent scraper service already scheduled");
      return;
    }

    console.log("🤖 Initializing Agent Scraper Service...");

    // Schedule the cron job
    cron.schedule(this.config.cronSchedule, async () => {
      console.log("⏰ Scheduled agent scraper job triggered");
      await this.triggerScraper();
    });

    this.isScheduled = true;
    console.log(
      `✅ Agent scraper scheduled: ${this.config.cronSchedule} (every hour)`
    );

    // Run immediately on startup for testing
    setTimeout(() => {
      console.log("🚀 Running initial scraper trigger...");
      this.triggerScraper();
    }, 5000); // Wait 5 seconds after startup
  }

  /**
   * Trigger the scraper with retry logic
   */
  async triggerScraper() {
    const startTime = Date.now();
    console.log("🔄 Starting agent data scraper...");

    let lastError = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        console.log(
          `📡 Attempt ${attempt}/${this.config.retryAttempts}: Sending scraper request...`
        );

        const response = await axios.post(
          `${this.scraperUrl}/api/scrape`,
          this.credentials,
          {
            timeout: this.config.timeout,
            headers: {
              "Content-Type": "application/json",
              "User-Agent": "FTD-Backend-Scheduler/1.0",
            },
          }
        );

        // Success
        const duration = Date.now() - startTime;
        this.lastRunTime = new Date();
        this.lastRunStatus = "success";

        console.log("✅ Agent scraper completed successfully");
        console.log(`📊 Response status: ${response.status}`);
        console.log(`⏱️ Duration: ${duration}ms`);

        if (response.data) {
          console.log(
            "📄 Response data:",
            JSON.stringify(response.data, null, 2)
          );
        }

        return {
          success: true,
          duration,
          attempt,
          response: response.data,
        };
      } catch (error) {
        lastError = error;
        const duration = Date.now() - startTime;

        console.error(`❌ Attempt ${attempt} failed:`, error.message);

        if (error.response) {
          console.error(`📄 Response status: ${error.response.status}`);
          console.error(`📄 Response data:`, error.response.data);
        } else if (error.request) {
          console.error("📡 No response received from scraper");
        } else {
          console.error("⚙️ Request setup error:", error.message);
        }

        // If this is not the last attempt, wait before retrying
        if (attempt < this.config.retryAttempts) {
          console.log(`⏳ Waiting ${this.config.retryDelay}ms before retry...`);
          await new Promise((resolve) =>
            setTimeout(resolve, this.config.retryDelay)
          );
        }
      }
    }

    // All attempts failed
    const duration = Date.now() - startTime;
    this.lastRunTime = new Date();
    this.lastRunStatus = "failed";

    console.error("💥 All scraper attempts failed");
    console.error(`⏱️ Total duration: ${duration}ms`);
    console.error("🔍 Last error:", lastError?.message || "Unknown error");

    return {
      success: false,
      duration,
      attempts: this.config.retryAttempts,
      error: lastError?.message || "Unknown error",
    };
  }

  /**
   * Manual trigger for testing
   */
  async manualTrigger() {
    console.log("🔧 Manual scraper trigger requested");
    return await this.triggerScraper();
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isScheduled: this.isScheduled,
      cronSchedule: this.config.cronSchedule,
      lastRunTime: this.lastRunTime,
      lastRunStatus: this.lastRunStatus,
      scraperUrl: this.scraperUrl,
      nextRunTime: this.isScheduled ? this.getNextRunTime() : null,
    };
  }

  /**
   * Get next scheduled run time
   */
  getNextRunTime() {
    if (!this.isScheduled) return null;

    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0);

    return nextHour;
  }

  /**
   * Stop the scheduled job
   */
  stop() {
    if (this.isScheduled) {
      console.log("🛑 Stopping agent scraper service...");
      this.isScheduled = false;
      console.log("✅ Agent scraper service stopped");
    }
  }
}

module.exports = AgentScraperService;
