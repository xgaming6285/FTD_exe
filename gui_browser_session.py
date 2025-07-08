#!/usr/bin/env python3
"""
GUI Browser Session Script
This script launches a GUI Chromium browser for interactive FTD sessions.
Unlike the headless version, this opens a real browser window that users can interact with.
"""

import sys
import json
import asyncio
import logging
import os
import subprocess
import time
from datetime import datetime
from playwright.async_api import async_playwright
import argparse
from urllib.parse import urlparse
import signal
import threading

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/app/logs/gui_browser_session.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class GUIBrowserSession:
    def __init__(self, session_data):
        self.session_data = session_data
        self.browser = None
        self.context = None
        self.page = None
        self.session_active = True
        
    async def setup_browser(self):
        """Initialize GUI browser with restored session data"""
        try:
            session_id = self.session_data.get('sessionId')
            if not session_id:
                raise ValueError("sessionId is required")

            logger.info(f"🚀 Starting GUI browser session: {session_id}")
            
            # Create user data directory for this session
            user_data_dir = f"/app/sessions/{session_id}"
            os.makedirs(user_data_dir, exist_ok=True)
            
            # Browser launch arguments for GUI mode
            launch_args = [
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu-sandbox',
                '--disable-software-rasterizer',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--disable-features=TranslateUI',
                '--disable-ipc-flooding-protection',
                '--enable-features=NetworkService,NetworkServiceLogging',
                '--force-color-profile=srgb',
                '--metrics-recording-only',
                '--no-first-run',
                '--password-store=basic',
                '--use-mock-keychain',
                '--disable-blink-features=AutomationControlled',
                '--disable-web-security',
                '--allow-running-insecure-content',
                '--disable-features=VizDisplayCompositor',
                '--start-maximized'
            ]
            
            # Add proxy configuration if available
            proxy_config = self.session_data.get('proxy')
            if proxy_config:
                proxy_url = f"http://{proxy_config['host']}:{proxy_config['port']}"
                launch_args.append(f'--proxy-server={proxy_url}')
                logger.info(f"🔗 Using proxy: {proxy_url}")
            
            # Add viewport configuration
            viewport = self.session_data.get('viewport', {'width': 1920, 'height': 1080})
            launch_args.append(f'--window-size={viewport["width"]},{viewport["height"]}')
            
            playwright = await async_playwright().start()
            
            # Use launch_persistent_context for user data directory
            context_options = {
                'headless': False,  # GUI mode
                'args': launch_args,
                'env': {
                    'DISPLAY': ':1'
                },
                'viewport': viewport,
                'user_agent': self.session_data.get('userAgent', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'),
                'locale': 'en-US',
                'timezone_id': 'America/New_York'
            }
            
            # Launch persistent context with user data directory
            self.context = await playwright.chromium.launch_persistent_context(
                user_data_dir=user_data_dir,
                **context_options
            )
            
            # Get the browser instance from the context
            self.browser = self.context.browser
            
            # Restore session data
            await self.restore_session_data()
            
            # Create new page
            self.page = await self.context.new_page()
            
            logger.info("✅ GUI browser session initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error setting up GUI browser: {e}")
            return False
    
    async def restore_session_data(self):
        """Restore cookies, localStorage, and sessionStorage"""
        try:
            # Restore cookies
            cookies = self.session_data.get('cookies', [])
            if cookies:
                await self.context.add_cookies(cookies)
                logger.info(f"🍪 Restored {len(cookies)} cookies")
            
            # Note: localStorage and sessionStorage will be restored after page navigation
            
        except Exception as e:
            logger.error(f"❌ Error restoring session data: {e}")
    
    async def navigate_to_domain(self):
        """Navigate to the target domain"""
        try:
            domain = self.session_data.get('domain')
            if domain:
                if not domain.startswith(('http://', 'https://')):
                    domain = f'https://{domain}'
                target_url = domain
                logger.info(f"🌐 Navigating to: {domain}")
            else:
                target_url = 'https://www.google.com'
                logger.info("🌐 No domain specified, navigating to Google")
            
            await self.page.goto(target_url, wait_until='domcontentloaded', timeout=30000)
            
            # Restore localStorage and sessionStorage after navigation
            await self.restore_storage_data()
            
            # Refresh page to ensure storage data is loaded
            await self.page.reload(wait_until='domcontentloaded')
            
            logger.info(f"✅ Successfully navigated to {target_url}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error during navigation: {e}")
            return False
    
    async def restore_storage_data(self):
        """Restore localStorage and sessionStorage after page load"""
        try:
            # Restore localStorage
            local_storage = self.session_data.get('localStorage', {})
            if local_storage:
                for key, value in local_storage.items():
                    await self.page.evaluate(f'localStorage.setItem("{key}", "{value}")')
                logger.info(f"💾 Restored {len(local_storage)} localStorage items")
            
            # Restore sessionStorage
            session_storage = self.session_data.get('sessionStorage', {})
            if session_storage:
                for key, value in session_storage.items():
                    await self.page.evaluate(f'sessionStorage.setItem("{key}", "{value}")')
                logger.info(f"🗂️ Restored {len(session_storage)} sessionStorage items")
                
        except Exception as e:
            logger.error(f"❌ Error restoring storage data: {e}")
    
    async def setup_session_banner(self):
        """Add session information banner to the page"""
        try:
            lead_info = self.session_data.get('leadInfo', {})
            session_id = self.session_data.get('sessionId', 'Unknown')
            
            banner_script = """
                (info) => {
                    // Remove existing banner
                    const existingBanner = document.getElementById('ftd-session-banner');
                    if (existingBanner) {
                        existingBanner.remove();
                    }

                    const banner = document.createElement('div');
                    banner.id = 'ftd-session-banner';
                    banner.style.cssText = `
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 12px 20px;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        font-size: 14px;
                        z-index: 2147483647;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        border-bottom: 2px solid rgba(255,255,255,0.2);
                    `;
                    
                    banner.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 20px;">
                            <div style="font-weight: bold; font-size: 16px;">🎯 FTD Live Session</div>
                            <div>Lead: ${info.leadName}</div>
                            <div>Email: ${info.email}</div>
                            <div>Session: ${info.sessionId.substring(0, 8)}...</div>
                        </div>
                        <button onclick="this.parentElement.style.display='none'" 
                                style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 14px;">
                            ✕ Hide
                        </button>
                    `;
                    
                    document.body.appendChild(banner);
                    
                    // Adjust page content to avoid overlap
                    document.body.style.paddingTop = '60px';
                }
            """
            
            await self.page.evaluate(banner_script, {
                'leadName': f"{lead_info.get('firstName', '')} {lead_info.get('lastName', '')}".strip() or 'Unknown',
                'email': lead_info.get('email', 'N/A'),
                'sessionId': session_id
            })
            
            logger.info("✅ Session banner added to page")
            
        except Exception as e:
            logger.error(f"❌ Error adding session banner: {e}")
    
    async def keep_session_alive(self):
        """Keep the browser session alive and monitor for closure"""
        try:
            logger.info("🔄 GUI browser session is ready for user interaction")
            logger.info("💡 Session Information:")
            logger.info(f"   - Session ID: {self.session_data.get('sessionId')}")
            logger.info(f"   - Lead: {self.session_data.get('leadInfo', {}).get('firstName', '')} {self.session_data.get('leadInfo', {}).get('lastName', '')}")
            logger.info(f"   - Domain: {self.session_data.get('domain', 'N/A')}")
            logger.info("   - GUI browser session started successfully")
            
            # Wait for browser to be closed
            while self.session_active and self.browser and self.browser.is_connected():
                await asyncio.sleep(5)
                
                # Check if browser is still alive
                try:
                    contexts = self.browser.contexts
                    if not contexts:
                        logger.info("🔚 Browser contexts closed, ending session")
                        break
                except:
                    logger.info("🔚 Browser disconnected, ending session")
                    break
            
            logger.info("🔚 GUI browser session ended")
            
        except Exception as e:
            logger.error(f"❌ Error during session monitoring: {e}")
    
    async def cleanup(self):
        """Clean up browser resources"""
        try:
            if self.browser:
                await self.browser.close()
                logger.info("🧹 Browser resources cleaned up")
        except Exception as e:
            logger.error(f"❌ Error during cleanup: {e}")
    
    async def run(self):
        """Main execution flow"""
        try:
            logger.info("🎯 Starting GUI browser session...")
            
            if not await self.setup_browser():
                logger.error("❌ Failed to setup browser")
                return False
            
            if not await self.navigate_to_domain():
                logger.error("❌ Failed to navigate to domain")
                return False
            
            await self.setup_session_banner()
            
            # Keep session alive
            await self.keep_session_alive()
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Error during GUI browser session: {e}")
            return False
        finally:
            await self.cleanup()

def signal_handler(signum, frame):
    """Handle shutdown signals"""
    logger.info(f"🛑 Received signal {signum}, shutting down...")
    sys.exit(0)

def main():
    """Main entry point"""
    try:
        # Set up signal handlers
        signal.signal(signal.SIGTERM, signal_handler)
        signal.signal(signal.SIGINT, signal_handler)
        
        parser = argparse.ArgumentParser(description='Launch GUI browser session for FTD lead')
        parser.add_argument('session_data', help='JSON string containing session data')
        parser.add_argument('--debug', action='store_true', help='Enable debug logging')
        args = parser.parse_args()

        if args.debug:
            logging.getLogger().setLevel(logging.DEBUG)

        try:
            session_data = json.loads(args.session_data)
        except json.JSONDecodeError as e:
            logger.error(f"❌ Invalid JSON in session data: {e}")
            sys.exit(1)

        # Validate required fields
        if 'sessionId' not in session_data:
            logger.error("❌ Missing required field: 'sessionId'")
            sys.exit(1)
            
        browser_session = GUIBrowserSession(session_data)
        success = asyncio.run(browser_session.run())

        if success:
            logger.info("✅ GUI browser session completed successfully")
            sys.exit(0)
        else:
            logger.error("❌ GUI browser session failed")
            sys.exit(1)

    except KeyboardInterrupt:
        logger.info("🛑 GUI browser session interrupted by user")
        sys.exit(0)
    except Exception as e:
        logger.error(f"💥 Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 