"""
Agent Session Browser Script
This script restores a browser session for agents to access stored FTD sessions.
It receives session data from the Node.js backend and opens a browser with the restored session.
"""
import sys
import json
import asyncio
import logging
from datetime import datetime
from playwright.async_api import async_playwright
import argparse
import os
from urllib.parse import quote

# --- Configuration ---
# IMPORTANT: Replace "YOUR_API_KEY" with your actual Browserless.io API key.
BROWSERLESS_API_KEY = os.environ.get('BROWSERLESS_API_KEY', '5166444b-4402-4554-a92c-153664d48526')
# ---------------------

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('agent_session_browser.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)
class AgentSessionBrowser:
    def __init__(self, session_data):
        self.session_data = session_data
        self.browser = None
        self.context = None
        self.page = None
    async def setup_browser(self):
        """Initialize connection to a persistent browser session on Browserless.io"""
        try:
            session_id = self.session_data.get('sessionId')
            if not session_id:
                raise ValueError("sessionId is required to connect to a browser session.")

            logger.info(f"🚀 Connecting to Browserless.io for session: {session_id}")

            # Collect launch arguments into a list.
            launch_args = [
                f"--user-data-dir=/home/chrome/sessions/{session_id}"
            ]
            
            # JSON-encode and then URL-encode the launch options.
            launch_options = {"args": launch_args}
            encoded_launch_options = quote(json.dumps(launch_options))

            # Construct the connection endpoint for Browserless.io
            browserless_endpoint = (
                f"wss://production-sfo.browserless.io?token={BROWSERLESS_API_KEY}"
                f"&launch={encoded_launch_options}"
            )

            playwright = await async_playwright().start()
            
            self.browser = await playwright.chromium.connect_over_cdp(
                endpoint_url=browserless_endpoint,
                slow_mo=100
            )

            # In this model, we expect there to be only one context and page
            # associated with the persistent session.
            contexts = self.browser.contexts
            if contexts:
                self.context = contexts[0]
                pages = self.context.pages
                if pages:
                    self.page = pages[0]
                else:
                    self.page = await self.context.new_page()
            else:
                # If no context exists, create a new one. This happens on first connect.
                self.context = await self.browser.new_context()
                self.page = await self.context.new_page()

            logger.info("✅ Successfully connected to browser session on Browserless.io")
            return True
        except Exception as e:
            logger.error(f"❌ Error setting up browser connection: {e}")
            return False
    async def navigate_to_domain(self):
        """Navigate to the stored domain or a default page."""
        try:
            # Check if the page is already on a meaningful URL
            current_url = self.page.url
            if current_url and "about:blank" not in current_url:
                logger.info(f"🌐 Page is already at a valid URL: {current_url}. Skipping navigation.")
                return True

            domain = self.session_data.get('domain')
            target_url = None
            if domain:
                if not domain.startswith(('http://', 'https://')):
                    domain = f'https://{domain}'
                target_url = domain
                logger.info(f"🌐 Navigating to stored domain: {domain}")
            else:
                target_url = 'https://www.google.com'
                logger.info("🌐 No domain specified, navigating to Google homepage")

            await self.page.goto(target_url, wait_until='domcontentloaded', timeout=30000)
            await self.page.wait_for_timeout(2000)
            logger.info(f"✅ Successfully navigated to {target_url}")
            return True
        except Exception as e:
            logger.error(f"❌ Error during navigation: {e}")
            logger.warning(f"⚠️ Current page URL is: {self.page.url}")
            return False
    async def setup_page_info(self):
        """Add a banner to the page with session information."""
        try:
            lead_info = self.session_data.get('leadInfo', {})
            session_id = self.session_data.get('sessionId', 'Unknown')
            
            # Simple device info, as detailed fingerprinting is handled by Browserless
            device_info = "Cloud Browser Session"
            
            banner_text = "FTD Agent Live Session"
            
            logger.info("📋 Injecting session information banner into the page...")

            await self.page.evaluate("""
                (info) => {
                    // Remove any existing banner
                    const existingBanner = document.getElementById('session-info-banner');
                    if (existingBanner) {
                        existingBanner.remove();
                    }

                    const banner = document.createElement('div');
                    banner.id = 'session-info-banner';
                    banner.style.cssText = `
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 10px 20px;
                        font-family: Arial, sans-serif;
                        font-size: 14px;
                        z-index: 2147483647;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    `;
                    
                    banner.innerHTML = `
                        <div>
                            <strong>${info.bannerText}</strong> - 
                            Lead: ${info.leadName} (${info.email}) | 
                            Session: ${info.sessionId.substring(0, 16)}...
                        </div>
                        <button onclick="this.parentElement.style.display='none'" 
                                style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 5px 10px; border-radius: 3px; cursor: pointer;">
                            ✕
                        </button>
                    `;
                    
                    document.body.appendChild(banner);
                }
            """, {
                'bannerText': banner_text,
                'leadName': f"{lead_info.get('firstName', '')} {lead_info.get('lastName', '')}".strip(),
                'email': lead_info.get('email', ''),
                'sessionId': session_id
            })
            logger.info("✅ Added session information banner to page")
        except Exception as e:
            logger.error(f"❌ Error setting up page info: {e}")
    async def keep_browser_open(self):
        """Keep the browser open for agent interaction"""
        try:
            logger.info("🔄 Browser is ready for agent interaction")
            logger.info("💡 Instructions:")
            logger.info("   - The cloud browser session has been restored.")
            logger.info("   - You can continue from where the previous session left off.")
            logger.info("   - Close the browser window when you're finished to disconnect.")
            
            # The session remains open until the script is terminated or the browser is closed.
            # We wait for the 'close' event on the context.
            await self.context.wait_for_event('close')
            
            logger.info("🔚 Browser session ended by user.")
        except Exception as e:
            logger.error(f"❌ Error during browser session: {e}")
    async def run(self):
        """Main execution flow"""
        try:
            logger.info("🎯 Starting agent session restoration via Browserless.io...")
            logger.info(f"📋 Lead: {self.session_data.get('leadInfo', {}).get('firstName', '')} {self.session_data.get('leadInfo', {}).get('lastName', '')}")
            logger.info(f"🔑 Session ID: {self.session_data.get('sessionId', 'Unknown')}")
            logger.info(f"🌐 Domain: {self.session_data.get('domain', 'Not specified')}")

            if not await self.setup_browser():
                logger.error("❌ Failed to setup browser connection.")
                return False

            # With persistent sessions, cookies and storage are already restored.
            # We just need to ensure we are on the right page.
            await self.navigate_to_domain()
            
            await self.setup_page_info()
            
            await self.keep_browser_open()
            return True
        except Exception as e:
            logger.error(f"❌ Error during session restoration: {e}")
            return False
        finally:
            try:
                if self.browser and self.browser.is_connected():
                    await self.browser.close()
                    logger.info("🧹 Browser connection closed.")
            except Exception as e:
                logger.error(f"❌ Error during cleanup: {e}")
def main():
    """Main entry point"""
    if not BROWSERLESS_API_KEY or BROWSERLESS_API_KEY == 'YOUR_API_KEY':
        logger.error("❌FATAL: BROWSERLESS_API_KEY is not set. Please edit the script to add your API key.")
        sys.exit(1)
        
    try:
        parser = argparse.ArgumentParser(description='Restore browser session via Browserless.io for agent access')
        parser.add_argument('session_data', help='JSON string containing session data (must include sessionId)')
        parser.add_argument('--debug', action='store_true', help='Enable debug logging')
        args = parser.parse_args()

        if args.debug:
            logging.getLogger().setLevel(logging.DEBUG)

        try:
            session_data = json.loads(args.session_data)
        except json.JSONDecodeError as e:
            logger.error(f"❌ Invalid JSON in session data: {e}")
            sys.exit(1)

        # The only truly required field is sessionId now.
        if 'sessionId' not in session_data:
            logger.error(f"❌ Missing required field: 'sessionId'")
            sys.exit(1)
            
        browser = AgentSessionBrowser(session_data)
        success = asyncio.run(browser.run())

        if success:
            logger.info("✅ Session restoration completed successfully")
            sys.exit(0)
        else:
            logger.error("❌ Session restoration failed")
            sys.exit(1)

    except KeyboardInterrupt:
        logger.info("🛑 Session restoration interrupted by user")
        sys.exit(0)
    except Exception as e:
        logger.error(f"💥 Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()