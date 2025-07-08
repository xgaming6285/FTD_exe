#!/usr/bin/env python3
"""
Diagnostic script for manual injection environment
This script tests all components needed for manual injection to work
"""

import os
import sys
import subprocess
import json
import time
from pathlib import Path

def log(message):
    """Log with timestamp"""
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {message}")
    sys.stdout.flush()

def test_environment():
    """Test the environment for manual injection"""
    log("🔍 DIAGNOSTIC: Testing Manual Injection Environment")
    log("=" * 60)
    
    # Test 1: Check DISPLAY environment
    display = os.environ.get('DISPLAY')
    log(f"1. DISPLAY environment: {display}")
    
    # Test 2: Check if X11 is working
    try:
        result = subprocess.run(['xdpyinfo', '-display', display or ':99'], 
                              capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            log("2. ✅ X11 display is working")
            # Extract display info
            lines = result.stdout.split('\n')
            for line in lines[:5]:
                if line.strip():
                    log(f"   {line.strip()}")
        else:
            log("2. ❌ X11 display is not working")
            log(f"   Error: {result.stderr}")
    except Exception as e:
        log(f"2. ❌ X11 display test failed: {e}")
    
    # Test 3: Check Python environment
    log(f"3. Python version: {sys.version}")
    log(f"   Python executable: {sys.executable}")
    
    # Test 4: Check if Playwright is installed
    try:
        from playwright.sync_api import sync_playwright
        log("4. ✅ Playwright is available")
        
        # Test 5: Check if Chromium browser is available
        try:
            with sync_playwright() as p:
                browser_path = p.chromium.executable_path
                log(f"5. ✅ Chromium browser path: {browser_path}")
                
                # Test 6: Try to launch browser in headless mode first
                try:
                    log("6. Testing headless browser launch...")
                    browser = p.chromium.launch(headless=True)
                    context = browser.new_context()
                    page = context.new_page()
                    page.goto("data:text/html,<h1>Test</h1>")
                    title = page.title()
                    browser.close()
                    log("6. ✅ Headless browser test successful")
                except Exception as e:
                    log(f"6. ❌ Headless browser test failed: {e}")
                
                # Test 7: Try to launch browser with display
                try:
                    log("7. Testing browser launch with display...")
                    browser = p.chromium.launch(
                        headless=False,
                        args=[
                            '--no-sandbox',
                            '--disable-setuid-sandbox',
                            '--disable-dev-shm-usage',
                            '--disable-gpu',
                            '--single-process',
                            '--no-zygote',
                            f'--display={display or ":99"}',
                            '--window-size=800,600',
                        ]
                    )
                    context = browser.new_context()
                    page = context.new_page()
                    
                    # Create a simple test page
                    test_html = """
                    <html>
                    <head><title>Manual Injection Test</title></head>
                    <body style="background: red; color: white; font-size: 24px; text-align: center; padding: 50px;">
                        <h1>🧪 DIAGNOSTIC TEST</h1>
                        <p>If you can see this in the GUI, the browser is working!</p>
                        <p>Time: """ + time.strftime("%H:%M:%S") + """</p>
                    </body>
                    </html>
                    """
                    
                    page.goto(f"data:text/html,{test_html}")
                    log("7. ✅ Browser launched with display - keeping open for 15 seconds")
                    log("   🔍 CHECK GUI NOW - You should see a red test page!")
                    
                    # Keep browser open for 15 seconds
                    for i in range(15, 0, -1):
                        log(f"   ⏱️  Browser visible for {i} more seconds...")
                        time.sleep(1)
                    
                    browser.close()
                    log("7. ✅ Display browser test completed")
                    
                except Exception as e:
                    log(f"7. ❌ Display browser test failed: {e}")
                    import traceback
                    traceback.print_exc()
                    
        except Exception as e:
            log(f"5. ❌ Chromium browser not available: {e}")
            
    except ImportError as e:
        log(f"4. ❌ Playwright not available: {e}")
    
            # Test 8: Check display processes
        log("8. Checking display processes...")
        processes_to_check = ['Xvfb']
    for process in processes_to_check:
        try:
            result = subprocess.run(['pgrep', '-f', process], 
                                  capture_output=True, text=True)
            if result.returncode == 0:
                pids = result.stdout.strip().split('\n')
                log(f"   ✅ {process} running (PIDs: {', '.join(pids)})")
            else:
                log(f"   ❌ {process} not running")
        except Exception as e:
            log(f"   ❌ Error checking {process}: {e}")
    
    # Test 9: Check ports
            log("9. Checking display ports...")
    ports_to_check = [5900, 6080]
    for port in ports_to_check:
        try:
            result = subprocess.run(['netstat', '-tuln'], 
                                  capture_output=True, text=True)
            if f":{port} " in result.stdout:
                log(f"   ✅ Port {port} is listening")
            else:
                log(f"   ❌ Port {port} is not listening")
        except Exception as e:
            log(f"   ❌ Error checking port {port}: {e}")
    
    # Test 10: Check file permissions
    log("10. Checking file permissions...")
    script_path = Path(__file__).parent / "manual_injector_playwright.py"
    if script_path.exists():
        log(f"   ✅ Manual injection script exists: {script_path}")
        log(f"   📋 File size: {script_path.stat().st_size} bytes")
        log(f"   📋 File permissions: {oct(script_path.stat().st_mode)[-3:]}")
    else:
        log(f"   ❌ Manual injection script not found: {script_path}")
    
    log("=" * 60)
    log("🏁 DIAGNOSTIC COMPLETE")
    log("=" * 60)

if __name__ == "__main__":
    test_environment() 