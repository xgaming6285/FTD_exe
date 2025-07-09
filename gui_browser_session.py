#!/usr/bin/env python3
"""
GUI Browser Session Script with VNC Support
This script launches a GUI Chromium browser in kiosk mode for interactive FTD sessions.
The browser is displayed on a VNC server that can be streamed to users' browsers.
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

class VNCGUIBrowserSession:
    def __init__(self, session_data):
        self.session_data = session_data
        self.browser = None
        self.context = None
        self.page = None
        self.session_active = True
        
    def _get_device_config(self):
        """Get device configuration for simulation"""
        # Extract device info from session data
        viewport = self.session_data.get('viewport', {'width': 1920, 'height': 1080})
        user_agent = self.session_data.get('userAgent', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
        
        # Check if this is a mobile device simulation
        is_mobile = 'Mobile' in user_agent or 'iPhone' in user_agent or 'Android' in user_agent
        
        # Device configuration
        device_config = {
            'viewport': viewport,
            'user_agent': user_agent,
            'is_mobile': is_mobile,
            'has_touch': is_mobile,
            'device_scale_factor': 3 if is_mobile else 1,
            'locale': 'en-US',
            'timezone_id': 'America/New_York'
        }
        
        logger.info(f"🎭 Device simulation configured: {viewport['width']}x{viewport['height']}, mobile: {is_mobile}")
        return device_config
        
    def _get_kiosk_browser_args(self):
        """Get browser arguments for kiosk mode"""
        viewport = self.session_data.get('viewport', {'width': 1920, 'height': 1080})
        
        # Base kiosk arguments
        kiosk_args = [
            '--kiosk',  # Full kiosk mode
            '--start-fullscreen',
            '--disable-infobars',
            '--disable-session-crashed-bubble',
            '--disable-restore-session-state',
            '--disable-translate',
            '--disable-features=TranslateUI',
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-default-apps',
            '--disable-popup-blocking',
            '--disable-prompt-on-repost',
            '--disable-hang-monitor',
            '--disable-background-networking',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-features=VizDisplayCompositor',
            '--disable-ipc-flooding-protection',
            '--disable-component-update',
            '--disable-extensions',
            '--disable-plugins',
            '--disable-sync',
            '--disable-web-security',
            '--allow-running-insecure-content',
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu-sandbox',
            '--disable-software-rasterizer',
            '--use-gl=swiftshader',
            '--enable-features=UseOzonePlatform',
            '--ozone-platform=x11',
            '--force-device-scale-factor=1',
            f'--window-size={viewport["width"]},{viewport["height"]}',
            f'--display={os.environ.get("DISPLAY", ":1")}',
            '--window-position=0,0'
        ]
        
        # Add proxy configuration if available
        proxy_config = self.session_data.get('proxy')
        if proxy_config:
            if 'server' in proxy_config:
                # New format: server contains full URL
                proxy_url = proxy_config['server']
            else:
                # Old format: build URL from host and port
                proxy_url = f"http://{proxy_config['host']}:{proxy_config['port']}"
            
            kiosk_args.append(f'--proxy-server={proxy_url}')
            logger.info(f"🔗 Kiosk mode using proxy: {proxy_url}")
        
        return kiosk_args
        
    async def setup_browser(self):
        """Initialize GUI browser with VNC display and kiosk mode"""
        try:
            session_id = self.session_data.get('sessionId')
            if not session_id:
                raise ValueError("sessionId is required")

            logger.info(f"🚀 Starting VNC GUI browser session: {session_id}")
            
            # Ensure VNC display is available
            display = os.environ.get('DISPLAY', ':1')
            logger.info(f"🖥️ Using display: {display}")
            
            # Create user data directory for this session
            user_data_dir = f"/app/sessions/{session_id}"
            os.makedirs(user_data_dir, exist_ok=True)
            
            # Get device configuration
            device_config = self._get_device_config()
            
            # Get kiosk browser arguments
            browser_args = self._get_kiosk_browser_args()
            
            playwright = await async_playwright().start()
            
            # Launch browser in kiosk mode
            context_options = {
                'headless': False,  # GUI mode for VNC
                'args': browser_args,
                'env': {
                    'DISPLAY': display
                },
                'viewport': device_config['viewport'],
                'user_agent': device_config['user_agent'],
                'is_mobile': device_config['is_mobile'],
                'has_touch': device_config['has_touch'],
                'device_scale_factor': device_config['device_scale_factor'],
                'locale': device_config['locale'],
                'timezone_id': device_config['timezone_id']
            }
            
            # Handle proxy authentication if needed
            proxy_config = self.session_data.get('proxy')
            if proxy_config and 'username' in proxy_config and 'password' in proxy_config:
                context_options['proxy'] = {
                    'server': proxy_config.get('server') or f"http://{proxy_config['host']}:{proxy_config['port']}",
                    'username': proxy_config['username'],
                    'password': proxy_config['password']
                }
                logger.info(f"🔐 Proxy authentication configured")
            
            # Launch persistent context with user data directory
            self.context = await playwright.chromium.launch_persistent_context(
                user_data_dir=user_data_dir,
                **context_options
            )
            
            # Get the browser instance from the context
            self.browser = self.context.browser
            
            # Restore session data if available
            await self.restore_session_data()
            
            # Create new page
            self.page = await self.context.new_page()
            
            # Set up page for kiosk mode
            await self.setup_kiosk_page()
            
            logger.info("✅ VNC GUI browser session initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error setting up VNC GUI browser: {e}")
            return False
    
    async def setup_kiosk_page(self):
        """Configure page for kiosk mode with enhanced security and device simulation"""
        try:
            # Disable context menu and developer tools
            await self.page.add_init_script("""
                // Disable context menu
                document.addEventListener('contextmenu', e => e.preventDefault());
                
                // Disable keyboard shortcuts
                document.addEventListener('keydown', e => {
                    // Disable F11, F12, Ctrl+Shift+I, etc.
                    if (e.key === 'F11' || e.key === 'F12' || 
                        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
                        (e.ctrlKey && e.shiftKey && e.key === 'C') ||
                        (e.ctrlKey && e.shiftKey && e.key === 'J') ||
                        (e.ctrlKey && e.key === 'u') ||
                        (e.ctrlKey && e.key === 'U')) {
                        e.preventDefault();
                        return false;
                    }
                });
                
                // Disable text selection for kiosk mode
                document.addEventListener('selectstart', e => e.preventDefault());
                
                // Add kiosk mode CSS
                const style = document.createElement('style');
                style.textContent = `
                    * {
                        -webkit-user-select: none;
                        -moz-user-select: none;
                        -ms-user-select: none;
                        user-select: none;
                    }
                    
                    input, textarea {
                        -webkit-user-select: text;
                        -moz-user-select: text;
                        -ms-user-select: text;
                        user-select: text;
                    }
                    
                    body {
                        overflow-x: hidden;
                        cursor: default;
                    }
                `;
                document.head.appendChild(style);
                
                // Hide scrollbars for cleaner kiosk experience
                document.documentElement.style.scrollbarWidth = 'none';
                document.documentElement.style.msOverflowStyle = 'none';
                
                // Add device simulation indicators if mobile
                const userAgent = navigator.userAgent;
                const isMobile = /Mobile|iPhone|iPad|Android/.test(userAgent);
                
                if (isMobile) {
                    // Add mobile-specific kiosk behaviors
                    document.addEventListener('touchstart', e => {
                        // Prevent zoom on double tap
                        if (e.touches.length > 1) {
                            e.preventDefault();
                        }
                    });
                    
                    // Add viewport meta tag for mobile
                    const viewport = document.querySelector('meta[name="viewport"]');
                    if (!viewport) {
                        const meta = document.createElement('meta');
                        meta.name = 'viewport';
                        meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
                        document.head.appendChild(meta);
                    }
                }
            """)
            
            # Set viewport for device simulation
            viewport = self.session_data.get('viewport', {'width': 1920, 'height': 1080})
            await self.page.set_viewport_size(viewport['width'], viewport['height'])
            
            # Configure device-specific settings
            device_config = self._get_device_config()
            if device_config['is_mobile']:
                # Mobile-specific kiosk configuration
                await self.page.emulate_media(media='screen')
                await self.page.set_extra_http_headers({
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                })
                logger.info(f"📱 Mobile kiosk mode configured: {viewport['width']}x{viewport['height']}")
            else:
                # Desktop-specific kiosk configuration
                await self.page.emulate_media(media='screen')
                logger.info(f"🖥️ Desktop kiosk mode configured: {viewport['width']}x{viewport['height']}")
            
            # Add kiosk mode event listeners
            await self.page.evaluate("""
                // Prevent page unload in kiosk mode
                window.addEventListener('beforeunload', (e) => {
                    e.preventDefault();
                    return '';
                });
                
                // Log kiosk mode activity
                console.log('🎭 Kiosk mode activated with device simulation');
            """)
            
            logger.info("🎭 Enhanced kiosk page configuration completed")
            
        except Exception as e:
            logger.error(f"❌ Error setting up kiosk page: {e}")
    
    async def restore_session_data(self):
        """Restore cookies and session data"""
        try:
            # Restore cookies if available
            cookies = self.session_data.get('cookies', [])
            if cookies:
                await self.context.add_cookies(cookies)
                logger.info(f"🍪 Restored {len(cookies)} cookies")
            
            # Restore localStorage and sessionStorage
            local_storage = self.session_data.get('localStorage', {})
            session_storage = self.session_data.get('sessionStorage', {})
            
            if local_storage or session_storage:
                # Create a temporary page to set storage
                temp_page = await self.context.new_page()
                await temp_page.goto('about:blank')
                
                # Set localStorage
                for key, value in local_storage.items():
                    await temp_page.evaluate(f'localStorage.setItem("{key}", "{value}")')
                
                # Set sessionStorage
                for key, value in session_storage.items():
                    await temp_page.evaluate(f'sessionStorage.setItem("{key}", "{value}")')
                
                await temp_page.close()
                logger.info(f"💾 Restored localStorage ({len(local_storage)} items) and sessionStorage ({len(session_storage)} items)")
                
        except Exception as e:
            logger.error(f"❌ Error restoring session data: {e}")
    
    async def navigate_to_domain(self):
        """Navigate to the target domain"""
        try:
            domain = self.session_data.get('domain')
            if not domain:
                # Default to Google for testing
                domain = 'https://www.google.com'
            
            # Ensure domain has protocol
            if not domain.startswith(('http://', 'https://')):
                domain = f'https://{domain}'
            
            logger.info(f"🌐 Navigating to domain: {domain}")
            await self.page.goto(domain, wait_until='domcontentloaded', timeout=30000)
            
            # Wait for page to be fully loaded
            await self.page.wait_for_load_state('networkidle', timeout=10000)
            
            logger.info("✅ Successfully navigated to domain")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error navigating to domain: {e}")
            return False
    
    async def setup_session_banner(self):
        """Add a session info banner to the page"""
        try:
            lead_info = self.session_data.get('leadInfo', {})
            session_id = self.session_data.get('sessionId')
            
            banner_html = f"""
            <div id="session-banner" style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 8px 16px;
                font-family: Arial, sans-serif;
                font-size: 14px;
                z-index: 999999;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                display: flex;
                justify-content: space-between;
                align-items: center;
            ">
                <div>
                    <strong>🎯 FTD Session:</strong> {lead_info.get('firstName', '')} {lead_info.get('lastName', '')}
                    {' | ' + lead_info.get('email', '') if lead_info.get('email') else ''}
                </div>
                <div style="font-size: 12px; opacity: 0.9;">
                    Session: {session_id[:8]}...
                </div>
            </div>
            """
            
            await self.page.evaluate(f"""
                const banner = document.createElement('div');
                banner.innerHTML = `{banner_html}`;
                document.body.appendChild(banner.firstElementChild);
                
                // Adjust body padding to account for banner
                document.body.style.paddingTop = '50px';
            """)
            
            logger.info("📋 Session banner added successfully")
            
        except Exception as e:
            logger.error(f"❌ Error adding session banner: {e}")
    
    async def keep_session_alive(self):
        """Keep the session alive and monitor for activity"""
        try:
            logger.info("🔄 Session keep-alive started")
            
            while self.session_active:
                # Check if browser is still connected
                if not self.browser or not self.browser.is_connected():
                    logger.warning("⚠️ Browser disconnected, ending session")
                    break
                
                # Check if page is still available
                if not self.page or self.page.is_closed():
                    logger.warning("⚠️ Page closed, ending session")
                    break
                
                # Keep session alive
                await asyncio.sleep(30)
                
                # Optional: Take periodic screenshots for monitoring
                try:
                    screenshot_path = f"/app/logs/session_{self.session_data.get('sessionId')}_screenshot.png"
                    await self.page.screenshot(path=screenshot_path)
                    logger.debug(f"📸 Screenshot saved: {screenshot_path}")
                except Exception as screenshot_error:
                    logger.debug(f"📸 Screenshot failed: {screenshot_error}")
            
            logger.info("🔄 Session keep-alive ended")
            
        except Exception as e:
            logger.error(f"❌ Error in keep-alive: {e}")
    
    async def cleanup(self):
        """Clean up browser resources"""
        try:
            self.session_active = False
            
            if self.browser:
                await self.browser.close()
                logger.info("🧹 Browser resources cleaned up")
                
        except Exception as e:
            logger.error(f"❌ Error during cleanup: {e}")
    
    async def run(self):
        """Main execution flow"""
        try:
            logger.info("🎯 Starting VNC GUI browser session...")
            
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
            logger.error(f"❌ Error during VNC GUI browser session: {e}")
            return False
        finally:
            await self.cleanup()

def signal_handler(signum, frame):
    """Handle termination signals"""
    logger.info(f"🛑 Received signal {signum}, shutting down gracefully...")
    sys.exit(0)

def main():
    """Main entry point"""
    try:
        # Set up signal handlers
        signal.signal(signal.SIGTERM, signal_handler)
        signal.signal(signal.SIGINT, signal_handler)
        
        parser = argparse.ArgumentParser(description='Launch VNC GUI browser session for FTD lead')
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
            
        browser_session = VNCGUIBrowserSession(session_data)
        success = asyncio.run(browser_session.run())

        if success:
            logger.info("✅ VNC GUI browser session completed successfully")
            sys.exit(0)
        else:
            logger.error("❌ VNC GUI browser session failed")
            sys.exit(1)

    except KeyboardInterrupt:
        logger.info("🛑 VNC GUI browser session interrupted by user")
        sys.exit(0)
    except Exception as e:
        logger.error(f"💥 Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 