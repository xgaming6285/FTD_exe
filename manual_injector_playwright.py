import asyncio
import json
import sys
import time
import random
import requests
import io
import traceback
import os
import string
from pathlib import Path
from playwright.sync_api import sync_playwright
from urllib.parse import urlparse

# Force unbuffered output
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Ensure immediate output
def log_with_flush(message):
    """Log message with immediate flush to ensure output appears in real-time"""
    print(message)
    sys.stdout.flush()
    sys.stderr.flush()

MAX_RETRIES = 3
RETRY_DELAY = 2
class ManualLeadInjector:
    """Manual lead injector that opens browser and auto-fills form fields."""
    def __init__(self, proxy_config=None):
        self.proxy_config = proxy_config
        self.target_url = None
    def _take_screenshot(self, page, name):
        """Take a screenshot for debugging purposes."""
        try:
            screenshots_dir = Path("screenshots")
            screenshots_dir.mkdir(exist_ok=True)
            screenshot_path = screenshots_dir / f"{name}_{int(time.time())}.png"
            page.screenshot(path=str(screenshot_path))
            print(f"INFO: Screenshot saved: {screenshot_path}")
        except Exception as e:
            print(f"WARNING: Could not take screenshot '{name}': {str(e)}")
    def _test_proxy_connectivity(self):
        """Test proxy connectivity before using it."""
        if not self.proxy_config:
            return True
        
        try:
            import requests
            proxy_url = self.proxy_config['server']
            username = self.proxy_config['username']
            password = self.proxy_config['password']
            
            # Update credentials if they match the pattern from logs
            if username.startswith('34998931-region-'):
                print("INFO: Updating proxy credentials to new format...")
                username = '34998931ol'
                password = 'Cw4Van9s'
                print(f"INFO: Updated proxy username: {username}")
            
            proxies = {
                'http': f"http://{username}:{password}@{proxy_url.replace('http://', '')}",
                'https': f"http://{username}:{password}@{proxy_url.replace('http://', '')}"
            }
            
            print("DEBUG: Testing proxy connectivity...")
            response = requests.get('http://httpbin.org/ip', proxies=proxies, timeout=10)
            if response.status_code == 200:
                print("SUCCESS: Proxy connectivity test passed")
                return True
            else:
                print(f"WARNING: Proxy test returned status code: {response.status_code}")
                return False
        except Exception as e:
            print(f"WARNING: Proxy connectivity test failed: {str(e)}")
            return False
    
    def _setup_browser_config(self):
        """Setup browser configuration."""
        # Check if we're in a headless environment (no DISPLAY or CI)
        import os
        display = os.environ.get('DISPLAY')
        
        # Force visible mode for manual injection
        print(f"INFO: DISPLAY environment variable: {display}")
        print(f"INFO: Manual injection - forcing visible browser mode")
        
        # Optimized browser configuration for GUI visibility
        config = {
            'headless': False,  # Always visible for manual injection
            'args': [
                # Essential flags for GUI environment
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--single-process',
                '--no-zygote',
                f'--display={display or ":99"}',
                '--window-size=1200,800',
                '--window-position=0,0',
                # X11 and display configuration
                '--disable-gpu-sandbox',
                '--use-gl=swiftshader',
                '--enable-features=UseOzonePlatform',
                '--ozone-platform=x11',
                '--force-device-scale-factor=1',
                # Window management for GUI
                '--start-maximized',
                '--disable-session-crashed-bubble',
                '--disable-infobars',
                '--no-first-run',
                '--no-default-browser-check',
                # Essential automation flags
                '--disable-blink-features=AutomationControlled',
                '--disable-web-security',
                '--enable-automation',
                '--remote-debugging-port=0',
                # Background process management
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--disable-background-mode',
                # Minimal feature disabling for stability
                '--disable-extensions',
                '--disable-default-apps',
                '--disable-popup-blocking',
                '--disable-translate',
                '--disable-sync',
                '--disable-component-update',
                # Logging for debugging
                '--enable-logging=stderr',
                '--v=1',
            ]
        }
        
        # Ensure display is set
        if not display:
            print("WARNING: No DISPLAY variable found - setting to :99")
            os.environ['DISPLAY'] = ':99'
            config['args'].append('--display=:99')
        
        if self.proxy_config:
            # Update credentials if they match the pattern from logs
            username = self.proxy_config['username']
            password = self.proxy_config['password']
            
            if username.startswith('34998931-region-'):
                print("INFO: Updating proxy credentials to new format...")
                username = '34998931ol'
                password = 'Cw4Van9s'
                print(f"INFO: Updated proxy username: {username}")
            
            config['proxy'] = {
                'server': self.proxy_config['server'],
                'username': username,
                'password': password
            }
            print(f"INFO: Using proxy server: {self.proxy_config['server']}")
            print(f"INFO: Proxy username: {username}")
            print("INFO: If navigation fails, the script will attempt to bypass proxy")
        else:
            print("INFO: No proxy configuration - using direct connection")
        
        print(f"DEBUG: Browser config: headless={config['headless']}")
        print(f"DEBUG: Browser args: {len(config['args'])} arguments configured")
        
        return config
    def _human_like_typing(self, element, text):
        """Type text in a human-like manner with random delays."""
        if not text:
            return
        element.click()
        element.fill('')
        for char in str(text):
            element.type(char)
            time.sleep(random.uniform(0.05, 0.15))
    def _select_country_code(self, page, country_code):
        """Select country code from the prefix dropdown."""
        try:
            if not country_code.startswith('+'):
                country_code = f"+{country_code}"
            print(f"INFO: Selecting country code: {country_code}")
            prefix_select = page.wait_for_selector('#prefix', timeout=10000)
            prefix_select.click()
            time.sleep(0.5)
            code_without_plus = country_code.replace('+', '')
            option_selector = f'[data-testid="prefix-option-{code_without_plus}"]'
            try:
                option = page.wait_for_selector(option_selector, timeout=5000)
                option.click()
                print(f"INFO: Successfully selected country code: {country_code}")
                return True
            except Exception as e:
                print(f"WARNING: Could not find exact option for {country_code}, trying alternative method")
                options = page.query_selector_all('[role="option"]')
                for option in options:
                    option_text = option.inner_text()
                    if country_code in option_text:
                        option.click()
                        print(f"INFO: Selected country code using alternative method: {country_code}")
                        return True
                print(f"ERROR: Could not select country code: {country_code}")
                return False
        except Exception as e:
            print(f"ERROR: Failed to select country code {country_code}: {str(e)}")
            return False
    def _auto_fill_form(self, page, lead_data):
        """Auto-fill the form fields with lead data."""
        try:
            lead_type = lead_data.get('leadType', 'FTD').upper()
            print("\n" + "="*50)
            print(f"AUTO-FILLING FORM WITH {lead_type} LEAD DATA:")
            print("="*50)
            page.wait_for_selector('#landingForm', timeout=15000)
            time.sleep(1)
            print(f"INFO: Filling First Name: {lead_data.get('firstName', 'N/A')}")
            first_name_field = page.wait_for_selector('#firstName', timeout=10000)
            self._human_like_typing(first_name_field, lead_data.get('firstName', ''))
            print(f"INFO: Filling Last Name: {lead_data.get('lastName', 'N/A')}")
            last_name_field = page.wait_for_selector('#lastName', timeout=10000)
            self._human_like_typing(last_name_field, lead_data.get('lastName', ''))
            print(f"INFO: Filling Email: {lead_data.get('email', 'N/A')}")
            email_field = page.wait_for_selector('#email', timeout=10000)
            self._human_like_typing(email_field, lead_data.get('email', ''))
            country_code = lead_data.get('country_code', '1')
            print(f"INFO: Selecting Country Code: +{country_code}")
            self._select_country_code(page, country_code)
            print(f"INFO: Filling Phone: {lead_data.get('phone', 'N/A')}")
            phone_field = page.wait_for_selector('#phone', timeout=10000)
            self._human_like_typing(phone_field, lead_data.get('phone', ''))
            print("="*50)
            print("FORM AUTO-FILL COMPLETED!")
            print("="*50)
            print("INSTRUCTIONS:")
            print("1. Review the auto-filled information above")
            print("2. Make any necessary corrections manually")
            print("3. Click the submit button to submit the form")
            print("4. Wait for any redirects to complete")
            print("5. Copy the final domain/URL from the address bar")
            print("6. Close this browser window when done")
            print("="*50)
            return True
        except Exception as e:
            print(f"ERROR: Failed to auto-fill form: {str(e)}")
            traceback.print_exc()
            return False
    def open_manual_injection_browser(self, lead_data, target_url):
        """Open browser for manual lead injection with auto-filled form."""
        browser = None
        try:
            self.target_url = target_url
            if not self.proxy_config:
                print("FATAL: No proxy configuration provided to manual injector")
                print("FATAL: Manual injection cannot proceed without proxy - STOPPING IMMEDIATELY")
                sys.exit(1)
            with sync_playwright() as p:
                log_with_flush("INFO: Launching browser for manual injection...")
                
                # Ensure window manager is running for better window visibility
                log_with_flush("DEBUG: Ensuring window manager is available...")
                try:
                    import subprocess
                    # Check if any window manager is running
                    wm_running = False
                    for wm in ['fluxbox', 'openbox', 'fvwm', 'twm', 'xfwm4', 'metacity']:
                        result = subprocess.run(['pgrep', '-f', wm], capture_output=True, text=True, timeout=3)
                        if result.returncode == 0:
                            log_with_flush(f"DEBUG: Window manager {wm} is running")
                            wm_running = True
                            break
                    
                    if not wm_running:
                        log_with_flush("DEBUG: No window manager detected, trying to start one...")
                        # Try to start TWM as it's usually available
                        try:
                            subprocess.Popen(['twm', '-display', os.environ.get('DISPLAY', ':99')], 
                                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                            time.sleep(2)
                            log_with_flush("DEBUG: Started TWM window manager")
                        except:
                            log_with_flush("DEBUG: Could not start window manager - continuing anyway")
                    
                except Exception as e:
                    log_with_flush(f"DEBUG: Window manager check failed: {e}")
                
                # Test proxy connectivity before launching browser
                proxy_working = self._test_proxy_connectivity()
                if not proxy_working and self.proxy_config:
                    print("WARNING: Proxy connectivity test failed - browser may have navigation issues")
                    print("INFO: Consider using a different proxy or checking proxy settings")
                
                # Get browser config and log it
                browser_config = self._setup_browser_config()
                log_with_flush(f"DEBUG: About to launch browser with config: {browser_config}")
                
                browser = None
                try:
                    log_with_flush("DEBUG: Attempting to launch Chromium browser...")
                    browser = p.chromium.launch(**browser_config)
                    log_with_flush("SUCCESS: Browser launched successfully!")
                except Exception as launch_error:
                    log_with_flush(f"FATAL: Browser launch failed: {str(launch_error)}")
                    log_with_flush("DEBUG: Attempting to launch with minimal config...")
                    
                    # Try with minimal config as fallback
                    minimal_config = {
                        'headless': False,
                        'args': [
                            '--no-sandbox',
                            '--disable-setuid-sandbox',
                            '--disable-dev-shm-usage',
                            '--disable-gpu',
                            '--single-process',
                            '--no-zygote',
                            f'--display={os.environ.get("DISPLAY", ":99")}',
                            '--window-size=1200,800',
                            '--disable-gpu-sandbox',
                            '--use-gl=swiftshader',
                            '--enable-features=UseOzonePlatform',
                            '--ozone-platform=x11',
                        ]
                    }
                    
                    if self.proxy_config:
                        minimal_config['proxy'] = {
                            'server': self.proxy_config['server'],
                            'username': self.proxy_config['username'],
                            'password': self.proxy_config['password']
                        }
                    
                    try:
                        print("DEBUG: Launching with minimal config...")
                        browser = p.chromium.launch(**minimal_config)
                        print("SUCCESS: Browser launched with minimal config!")
                    except Exception as minimal_error:
                        print(f"FATAL: Even minimal browser launch failed: {str(minimal_error)}")
                        
                        # Try ultra-minimal config as last resort
                        print("DEBUG: Attempting ultra-minimal browser launch...")
                        ultra_minimal_config = {
                            'headless': False,
                            'args': [
                                '--no-sandbox',
                                '--disable-setuid-sandbox',
                                f'--display={os.environ.get("DISPLAY", ":99")}',
                            ]
                        }
                        
                        try:
                            print("DEBUG: Launching with ultra-minimal config...")
                            browser = p.chromium.launch(**ultra_minimal_config)
                            print("SUCCESS: Browser launched with ultra-minimal config!")
                        except Exception as ultra_error:
                            print(f"FATAL: All browser launch attempts failed: {str(ultra_error)}")
                            raise ultra_error
                
                if not browser:
                    raise Exception("Failed to launch browser with any configuration")
                
                print(f"DEBUG: Browser object created: {browser}")
                
                # Force desktop configuration for GUI visibility
                print("INFO: Using desktop configuration for GUI manual injection")
                device_config = {
                    'screen': {
                        'width': 1200,
                        'height': 800
                    },
                    'viewport': {
                        'width': 1200,
                        'height': 800
                    },
                    'device_scale_factor': 1,
                    'is_mobile': False,
                    'has_touch': False,
                    'user_agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                }
                
                # Apply fingerprint properties if available (but keep desktop config)
                fingerprint = lead_data.get('fingerprint')
                if fingerprint:
                    print(f"INFO: Fingerprint available but using desktop config for GUI: {fingerprint.get('deviceId', 'unknown')}")
                    # Only apply user agent from fingerprint if it's not mobile
                    navigator = fingerprint.get('navigator', {})
                    user_agent = navigator.get('userAgent', device_config['user_agent'])
                    if 'Mobile' not in user_agent and 'iPhone' not in user_agent and 'Android' not in user_agent:
                        device_config['user_agent'] = user_agent
                        print(f"INFO: Applied desktop user agent from fingerprint")
                    else:
                        print(f"INFO: Skipped mobile user agent from fingerprint for GUI compatibility")
                else:
                    print("INFO: No fingerprint provided, using desktop configuration")
                
                print("DEBUG: Creating browser context...")
                context = browser.new_context(
                    **device_config,
                    locale="en-US"
                )
                print("DEBUG: Creating new page...")
                page = context.new_page()
                
                # Aggressive window visibility forcing
                print("DEBUG: Forcing window visibility with multiple methods...")
                
                # Method 1: JavaScript window management
                try:
                    page.evaluate("window.focus();")
                    page.evaluate("window.moveTo(0, 0);")
                    page.evaluate("window.resizeTo(1200, 800);")
                    page.evaluate("window.scrollTo(0, 0);")
                    print("DEBUG: JavaScript window positioning executed")
                except Exception as e:
                    print(f"DEBUG: JavaScript window positioning failed: {e}")
                
                # Method 2: Give time for window to appear and then force visibility
                print("DEBUG: Waiting for window to appear...")
                time.sleep(3)
                
                # Method 3: Use system tools to force window visibility
                try:
                    import subprocess
                    
                    # Try xdotool first (more reliable)
                    print("DEBUG: Attempting xdotool window management...")
                    try:
                        # Search for browser windows
                        result = subprocess.run(['xdotool', 'search', '--name', 'Chromium'], 
                                              capture_output=True, text=True, timeout=5)
                        if result.returncode == 0:
                            window_ids = result.stdout.strip().split('\n')
                            for window_id in window_ids:
                                if window_id.strip():
                                    print(f"DEBUG: Found Chromium window: {window_id}")
                                    # Move window to front
                                    subprocess.run(['xdotool', 'windowraise', window_id], timeout=3)
                                    # Focus window
                                    subprocess.run(['xdotool', 'windowfocus', window_id], timeout=3)
                                    # Move to top-left
                                    subprocess.run(['xdotool', 'windowmove', window_id, '0', '0'], timeout=3)
                                    print(f"DEBUG: Managed window {window_id} with xdotool")
                        else:
                            print("DEBUG: No Chromium windows found with xdotool")
                    except Exception as e:
                        print(f"DEBUG: xdotool failed: {e}")
                    
                    # Try wmctrl as backup
                    print("DEBUG: Attempting wmctrl window management...")
                    try:
                        result = subprocess.run(['wmctrl', '-l'], capture_output=True, text=True, timeout=5)
                        if result.returncode == 0:
                            print("DEBUG: Available windows:")
                            for line in result.stdout.split('\n'):
                                if line.strip():
                                    print(f"  {line}")
                                    # If it's a browser window, try to activate it
                                    if any(browser in line.lower() for browser in ['chromium', 'chrome']):
                                        try:
                                            subprocess.run(['wmctrl', '-a', 'Chromium'], timeout=3)
                                            print("DEBUG: Activated Chromium window with wmctrl")
                                        except:
                                            pass
                        else:
                            print("DEBUG: wmctrl not available or no windows found")
                    except Exception as e:
                        print(f"DEBUG: wmctrl failed: {e}")
                        
                except Exception as e:
                    print(f"DEBUG: System window management failed: {e}")
                
                # Method 4: Force window with X11 commands
                try:
                    print("DEBUG: Attempting X11 window refresh...")
                    subprocess.run(['xrefresh', '-display', os.environ.get('DISPLAY', ':99')], 
                                 timeout=3, capture_output=True)
                    print("DEBUG: X11 display refreshed")
                except Exception as e:
                    print(f"DEBUG: X11 refresh failed: {e}")
                
                # Test that the browser is actually visible with a simple check
                print("DEBUG: Testing browser visibility...")
                try:
                    # Simple browser test without navigation to data: URLs
                    print("DEBUG: Testing browser responsiveness...")
                    page.evaluate("() => { return document.readyState; }")
                    print("SUCCESS: Browser is responsive and ready")
                    
                    # Take a test screenshot to verify display connection
                    print("DEBUG: Taking test screenshot...")
                    self._take_screenshot(page, "browser_test")
                    print("SUCCESS: Test screenshot taken - browser is visible on display")
                    
                except Exception as test_error:
                    print(f"WARNING: Browser visibility test failed: {str(test_error)}")
                    print("WARNING: Browser may not be visible on GUI display")
                    print("WARNING: Continuing with manual injection anyway...")
                
                # Apply fingerprint if available (after successful navigation)
                if fingerprint:
                    print("DEBUG: Fingerprint will be applied after navigation...")
                else:
                    print("DEBUG: No fingerprint to apply")
                
                print(f"INFO: Navigating to target URL: {target_url}")
                success = False
                
                # Try different navigation strategies
                navigation_strategies = [
                    {"wait_until": "domcontentloaded", "timeout": 30000},
                    {"wait_until": "networkidle", "timeout": 45000},
                    {"wait_until": "load", "timeout": 60000},
                ]
                
                for strategy_idx, strategy in enumerate(navigation_strategies):
                    if success:
                        break
                        
                    print(f"INFO: Trying navigation strategy {strategy_idx + 1}/{len(navigation_strategies)}: {strategy}")
                    
                    for attempt in range(MAX_RETRIES):
                        try:
                            print(f"DEBUG: Navigation attempt {attempt+1}/{MAX_RETRIES} with strategy {strategy_idx + 1}")
                            
                            # Try to navigate with current strategy
                            page.goto(target_url, **strategy)
                            success = True
                            print("SUCCESS: Successfully navigated to target URL!")
                            break
                            
                        except Exception as e:
                            error_msg = str(e)
                            print(f"WARNING: Failed to navigate on attempt {attempt+1}/{MAX_RETRIES}: {error_msg}")
                            
                            # Check if browser context is closed
                            if "Target page, context or browser has been closed" in error_msg:
                                print("ERROR: Browser context has been closed - this usually means the browser crashed")
                                print("INFO: This can happen due to proxy authentication issues")
                                return False
                            
                            # Check if it's a proxy-related error
                            if "net::ERR_HTTP_RESPONSE_CODE_FAILURE" in error_msg:
                                print("INFO: Detected HTTP response code failure - this might be a proxy issue")
                                if self.proxy_config:
                                    print("INFO: Trying without proxy for this navigation...")
                                    try:
                                        # Instead of creating new context, try to reconfigure proxy
                                        print("INFO: Attempting to bypass proxy by creating new browser instance...")
                                        
                                        # Create a new browser without proxy
                                        no_proxy_config = self._setup_browser_config()
                                        if 'proxy' in no_proxy_config:
                                            del no_proxy_config['proxy']
                                        
                                        temp_browser = None
                                        try:
                                            temp_browser = p.chromium.launch(**no_proxy_config)
                                            temp_context = temp_browser.new_context(
                                                viewport={'width': 1200, 'height': 800}
                                            )
                                            temp_page = temp_context.new_page()
                                            temp_page.goto(target_url, **strategy)
                                            
                                            # If successful, close temp browser and continue with original
                                            temp_browser.close()
                                            
                                            # Now try original page without proxy by updating proxy settings
                                            print("INFO: Temp navigation successful, retrying with original browser...")
                                            
                                            # Try to navigate original page (proxy might work now)
                                            page.goto(target_url, **strategy)
                                            success = True
                                            print("SUCCESS: Navigation successful after proxy test!")
                                            break
                                            
                                        except Exception as temp_error:
                                            print(f"WARNING: Temp browser navigation also failed: {str(temp_error)}")
                                            if temp_browser:
                                                try:
                                                    temp_browser.close()
                                                except:
                                                    pass
                                    except Exception as proxy_error:
                                        print(f"WARNING: Navigation without proxy also failed: {str(proxy_error)}")
                                        # Cleanup handled in the temp browser try block above
                            
                            # Additional specific error handling
                            elif "net::ERR_PROXY_CONNECTION_FAILED" in error_msg:
                                print("INFO: Proxy connection failed - proxy server may be down")
                            elif "net::ERR_TUNNEL_CONNECTION_FAILED" in error_msg:
                                print("INFO: Proxy tunnel failed - check proxy authentication")
                            elif "net::ERR_TIMED_OUT" in error_msg:
                                print("INFO: Request timed out - try increasing timeout or check network")
                            
                            if attempt < MAX_RETRIES - 1:
                                print(f"Retrying in {RETRY_DELAY} seconds...")
                                time.sleep(RETRY_DELAY)
                
                if not success:
                    print("ERROR: Failed to navigate to target URL after all attempts and strategies")
                    print("INFO: This might be due to:")
                    print("  - Proxy configuration issues")
                    print("  - Network connectivity problems")
                    print("  - Target URL being temporarily unavailable")
                    print("  - Firewall or security restrictions")
                    return False
                
                print("DEBUG: Taking screenshot of loaded page...")
                self._take_screenshot(page, "manual_injection_page_loaded")
                
                # Apply fingerprint after successful navigation
                if fingerprint:
                    print("DEBUG: Applying fingerprint to page...")
                    self._apply_fingerprint_to_page(page, fingerprint)
                
                # Set viewport meta tag
                print("DEBUG: Setting viewport meta tag...")
                try:
                    page.evaluate("""() => {
                        const meta = document.createElement('meta');
                        meta.name = 'viewport';
                        meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
                        document.head.appendChild(meta);
                    }""")
                except Exception as e:
                    print(f"DEBUG: Could not set viewport meta tag: {str(e)}")
                
                print("DEBUG: Setting injection mode flag...")
                try:
                    page.evaluate("window.localStorage.setItem('isInjectionMode', 'true')")
                    print("INFO: Set injection mode flag for the landing page")
                except Exception as e:
                    print(f"WARNING: Could not set injection mode flag: {str(e)}")
                
                print("DEBUG: Attempting auto-fill...")
                auto_fill_success = self._auto_fill_form(page, lead_data)
                if auto_fill_success:
                    self._take_screenshot(page, "manual_injection_auto_filled")
                else:
                    print("WARNING: Auto-fill failed, but continuing with manual mode")
                    print("\n" + "="*50)
                    print("LEAD INFORMATION FOR MANUAL ENTRY (FALLBACK):")
                    print("="*50)
                    print(f"First Name: {lead_data.get('firstName', 'N/A')}")
                    print(f"Last Name: {lead_data.get('lastName', 'N/A')}")
                    print(f"Email: {lead_data.get('email', 'N/A')}")
                    print(f"Phone: {lead_data.get('phone', 'N/A')}")
                    print(f"Country: {lead_data.get('country', 'N/A')}")
                    print(f"Country Code: +{lead_data.get('country_code', 'N/A')}")
                    print("="*50)
                lead_type = lead_data.get('leadType', 'FTD').upper()
                print(f"\nINFO: Browser is ready. Form has been auto-filled with {lead_type} data.")
                print("INFO: Please review, submit the form manually, and complete the process.")
                print("INFO: After form submission, you can navigate to mail.com to test the session.")
                print("INFO: Close the browser when completely done to capture the session.")
                print("INFO: Waiting for browser to be closed manually...")
                try:
                    last_url = page.url
                    form_submitted = False
                    while True:
                        try:
                            current_url = page.url
                            if current_url != last_url and not form_submitted:
                                print(f"INFO: URL changed from {last_url} to {current_url}")
                                print("INFO: Form appears to have been submitted successfully!")
                                form_submitted = True
                                self._take_screenshot(page, "manual_injection_form_submitted")
                                print("\n" + "="*60)
                                print("OPTIONAL: TEST SESSION PERSISTENCE")
                                print("="*60)
                                print("You can now navigate to mail.com to test if the session persists.")
                                print("This will help verify that the captured session works correctly.")
                                print("Navigate to: https://mail.com")
                                print("Try to register/login to see if the session is maintained.")
                                print("When you're done testing, close the browser to capture the session.")
                                print("="*60)
                            last_url = current_url
                            time.sleep(2)
                        except Exception:
                            break
                    print("INFO: Browser was closed manually.")
                    if form_submitted:
                        print("INFO: Attempting to capture browser session...")
                        session_success = self._capture_and_store_session(page, lead_data, True)
                        if session_success:
                            print("SUCCESS: Browser session captured and stored successfully!")
                        else:
                            print("WARNING: Failed to capture browser session, but injection was successful.")
                    else:
                        print("WARNING: Form may not have been submitted (no URL change detected).")
                        print("INFO: Attempting to capture session anyway...")
                        session_success = self._capture_and_store_session(page, lead_data, False)
                        if session_success:
                            print("INFO: Browser session captured (submission status unknown).")
                    print("SUCCESS: Manual injection session completed.")
                    return True
                except KeyboardInterrupt:
                    print("\nINFO: Manual injection interrupted by user.")
                    try:
                        print("INFO: Attempting to capture session before exit...")
                        self._capture_and_store_session(page, lead_data, False)
                    except:
                        pass
                    return True
        except Exception as e:
            print(f"ERROR: Browser initialization failed - {str(e)}")
            traceback.print_exc()
            return False
        finally:
            if browser:
                try:
                    browser.close()
                except:
                    pass
    def _create_device_config_from_fingerprint(self, fingerprint):
        """Create Playwright device configuration from fingerprint data."""
        screen = fingerprint.get('screen', {})
        navigator = fingerprint.get('navigator', {})
        mobile = fingerprint.get('mobile', {})
        return {
            'screen': {
                'width': screen.get('width', 428),
                'height': screen.get('height', 926)
            },
            'viewport': {
                'width': screen.get('availWidth', screen.get('width', 428)),
                'height': screen.get('availHeight', screen.get('height', 926))
            },
            'device_scale_factor': screen.get('devicePixelRatio', 1),
            'is_mobile': mobile.get('isMobile', False),
            'has_touch': navigator.get('maxTouchPoints', 0) > 0,
            'user_agent': navigator.get('userAgent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
        }
    def _apply_fingerprint_to_page(self, page, fingerprint):
        """Apply fingerprint properties to the page context."""
        try:
            page.evaluate("() => { localStorage.setItem('isInjectionMode', 'true'); }")
            print("INFO: Set injection mode flag for the landing page")
            navigator = fingerprint.get('navigator', {})
            screen = fingerprint.get('screen', {})
            platform = json.dumps(navigator.get('platform', 'Win32'))
            user_agent = json.dumps(navigator.get('userAgent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'))
            page.evaluate(f"""() => {{
                try {{
                    // Set basic navigator properties
                    Object.defineProperty(navigator, 'platform', {{
                        get: () => {platform}
                    }});

                    // Set injection mode flag (redundant but important)
                    localStorage.setItem('isInjectionMode', 'true');

                    console.log('Fingerprint properties applied successfully');
                }} catch (error) {{
                    console.error('Error applying fingerprint:', error);
                    // Ensure injection mode is still set
                    localStorage.setItem('isInjectionMode', 'true');
                }}
            }};""")
            print(f"INFO: Applied fingerprint properties for device: {fingerprint.get('deviceId', 'unknown')}")
        except Exception as e:
            print(f"WARNING: Failed to apply fingerprint properties: {str(e)}")
            try:
                page.evaluate("() => { localStorage.setItem('isInjectionMode', 'true'); }")
                print("INFO: Set injection mode flag despite fingerprint error")
            except Exception as e2:
                print(f"WARNING: Could not set injection mode flag: {str(e2)}")
    def _capture_and_store_session(self, page, lead_data, success_status):
        """Capture browser session and send to backend for storage."""
        try:
            print("🔍 Starting browser session capture...")
            current_url = page.url
            domain = urlparse(current_url).netloc
            print(f"INFO: Capturing session from domain: {domain}")
            cookies = page.context.cookies()
            print(f"📄 Captured {len(cookies)} cookies")
            try:
                local_storage = page.evaluate("""() => {
                    const storage = {};
                    for (let i = 0; i < window.localStorage.length; i++) {
                        const key = window.localStorage.key(i);
                        storage[key] = window.localStorage.getItem(key);
                    }
                    return storage;
                }""")
            except Exception as e:
                print(f"WARNING: Could not capture localStorage: {str(e)}")
                local_storage = {}
            print(f"💾 Captured {len(local_storage)} localStorage items")
            try:
                session_storage = page.evaluate("""() => {
                    const storage = {};
                    for (let i = 0; i < window.sessionStorage.length; i++) {
                        const key = window.sessionStorage.key(i);
                        storage[key] = window.sessionStorage.getItem(key);
                    }
                    return storage;
                }""")
            except Exception as e:
                print(f"WARNING: Could not capture sessionStorage: {str(e)}")
                session_storage = {}
            print(f"🗂️ Captured {len(session_storage)} sessionStorage items")
            user_agent = page.evaluate("() => navigator.userAgent")
            viewport = page.viewport_size or {'width': 1366, 'height': 768}
            import time
            import random
            timestamp = int(time.time() * 1000)
            random_part = ''.join(random.choices(string.ascii_lowercase + string.digits, k=16))
            session_id = f"session_{timestamp}_{random_part}"
            session_data = {
                'sessionId': session_id,
                'cookies': [
                    {
                        'name': cookie['name'],
                        'value': cookie['value'],
                        'domain': cookie.get('domain', ''),
                        'path': cookie.get('path', '/'),
                        'expires': cookie.get('expires'),
                        'httpOnly': cookie.get('httpOnly', False),
                        'secure': cookie.get('secure', False),
                        'sameSite': cookie.get('sameSite', 'Lax')
                    }
                    for cookie in cookies
                ],
                'localStorage': local_storage,
                'sessionStorage': session_storage,
                'userAgent': user_agent,
                'viewport': viewport,
                'metadata': {
                    'domain': domain,
                    'success': success_status,
                    'injectionType': f'manual_{lead_data.get("leadType", "ftd").lower()}',
                    'notes': f'Manual {lead_data.get("leadType", "FTD").upper()} injection completed on {domain}',
                    'capturedAt': time.time()
                }
            }
            print(f"✅ Session data prepared: {len(cookies)} cookies, {len(local_storage)} localStorage, {len(session_storage)} sessionStorage")
            return self._send_session_to_backend(lead_data, session_data)
        except Exception as e:
            print(f"❌ Error capturing session: {str(e)}")
            traceback.print_exc()
            return False
    def _send_session_to_backend(self, lead_data, session_data):
        """Send captured session data to the Node.js backend."""
        try:
            backend_url = os.getenv('BACKEND_URL', 'http://localhost:5000')
            lead_id = lead_data.get('leadId') or lead_data.get('_id')
            if not lead_id:
                print("ERROR: No lead ID found in lead data")
                return False
            api_url = f"{backend_url}/api/leads/{lead_id}/session"
            payload = {
                'sessionData': session_data,
                'orderId': lead_data.get('orderId'),
                'assignedBy': lead_data.get('assignedBy')
            }
            print(f"📡 Sending session data to backend: {api_url}")
            response = requests.post(
                api_url,
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            if response.status_code == 200 or response.status_code == 201:
                result = response.json()
                print(f"✅ Session stored successfully in backend!")
                print(f"🔑 Session ID: {session_data['sessionId']}")
                return True
            else:
                print(f"❌ Backend returned error: {response.status_code}")
                print(f"Response: {response.text}")
                return False
        except requests.exceptions.RequestException as e:
            print(f"❌ Network error sending session to backend: {str(e)}")
            return False
        except Exception as e:
            print(f"❌ Error sending session to backend: {str(e)}")
            traceback.print_exc()
            return False
def main():
    """Main execution function."""
    log_with_flush("=" * 80)
    log_with_flush("🚀 MANUAL INJECTION SCRIPT STARTED")
    log_with_flush("=" * 80)
    
    # Log environment info
    import os
    log_with_flush(f"INFO: DISPLAY environment variable: {os.environ.get('DISPLAY', 'NOT SET')}")
    log_with_flush(f"INFO: Working directory: {os.getcwd()}")
    log_with_flush(f"INFO: Python executable: {sys.executable}")
    log_with_flush(f"INFO: Arguments count: {len(sys.argv)}")
    
    # Test Playwright availability
    try:
        from playwright.sync_api import sync_playwright
        log_with_flush("INFO: Playwright import successful")
        
        # Test basic Playwright functionality
        log_with_flush("DEBUG: Testing Playwright basic functionality...")
        try:
            with sync_playwright() as p:
                log_with_flush("DEBUG: Playwright context created successfully")
                log_with_flush("DEBUG: Playwright basic test passed")
        except Exception as basic_test_error:
            log_with_flush(f"WARNING: Playwright basic test failed: {str(basic_test_error)}")
            
    except ImportError as e:
        log_with_flush(f"FATAL: Playwright not available: {e}")
        sys.exit(1)
    except Exception as e:
        log_with_flush(f"FATAL: Playwright import error: {e}")
        sys.exit(1)
    
    if len(sys.argv) < 2:
        log_with_flush("FATAL: No input JSON provided.")
        sys.exit(1)
    try:
        injection_data_str = sys.argv[1]
        injection_data = json.loads(injection_data_str)
        log_with_flush(f"INFO: Processing manual injection data for lead {injection_data.get('leadId', 'unknown')}")
        proxy_config = injection_data.get('proxy')
        if not proxy_config:
            log_with_flush("FATAL: No proxy configuration provided to manual injector")
            log_with_flush("FATAL: Manual injection cannot proceed without proxy - STOPPING IMMEDIATELY")
            sys.exit(1)
        target_url = injection_data.get('targetUrl', "https://ftd-copy-g4r6.vercel.app/landing")
        log_with_flush(f"INFO: Target URL: {target_url}")
        injector = ManualLeadInjector(proxy_config)
        success = injector.open_manual_injection_browser(injection_data, target_url)
        if success:
            log_with_flush("INFO: Manual injection session completed successfully")
            return True
        else:
            log_with_flush("ERROR: Manual injection session failed")
            return False
    except json.JSONDecodeError:
        log_with_flush(f"FATAL: Invalid JSON provided")
        sys.exit(1)
    except Exception as e:
        try:
            error_msg = str(e)
            log_with_flush(f"FATAL: An error occurred during execution: {error_msg}")
            traceback.print_exc()
        except UnicodeEncodeError:
            log_with_flush(f"FATAL: An error occurred during execution (encoding error when displaying message)")
        return False
if __name__ == "__main__":
    main()