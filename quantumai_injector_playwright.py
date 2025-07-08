#!/usr/bin/env python3
"""
QuantumAI Landing Page Injector with Popup Support
Modified from the original injector to work specifically with QuantumAI forms.
"""
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
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
COUNTRY_TO_PHONE_CODE = {
    "United States": "1",
    "United Kingdom": "44",
    "Canada": "1",
    "Australia": "61",
    "Germany": "49",
    "France": "33",
    "Italy": "39",
    "Spain": "34",
    "Netherlands": "31",
    "Belgium": "32",
    "Switzerland": "41",
    "Austria": "43",
    "Sweden": "46",
    "Norway": "47",
    "Denmark": "45",
    "Finland": "358",
    "Poland": "48",
    "Czech Republic": "420",
    "Hungary": "36",
    "Romania": "40",
    "Bulgaria": "359",
    "Greece": "30",
    "Portugal": "351",
    "Ireland": "353",
    "Luxembourg": "352",
    "Malta": "356",
    "Cyprus": "357",
    "Estonia": "372",
    "Latvia": "371",
    "Lithuania": "370",
    "Slovakia": "421",
    "Slovenia": "386",
    "Croatia": "385",
    "Serbia": "381",
    "Montenegro": "382",
    "Bosnia and Herzegovina": "387",
    "North Macedonia": "389",
    "Albania": "355",
    "Moldova": "373",
    "Ukraine": "380",
    "Belarus": "375",
    "Russia": "7",
    "China": "86",
    "Japan": "81",
    "South Korea": "82",
    "Korea": "82",
    "India": "91",
    "Indonesia": "62",
    "Thailand": "66",
    "Vietnam": "84",
    "Malaysia": "60",
    "Singapore": "65",
    "Philippines": "63",
    "Taiwan": "886",
    "Hong Kong": "852",
    "Macau": "853",
    "Mongolia": "976",
    "Kazakhstan": "7",
    "Uzbekistan": "998",
    "Turkmenistan": "993",
    "Kyrgyzstan": "996",
    "Tajikistan": "992",
    "Afghanistan": "93",
    "Pakistan": "92",
    "Bangladesh": "880",
    "Sri Lanka": "94",
    "Myanmar": "95",
    "Cambodia": "855",
    "Laos": "856",
    "Brunei": "673",
    "Nepal": "977",
    "Bhutan": "975",
    "Maldives": "960",
    "New Zealand": "64",
    "Turkey": "90",
    "Israel": "972",
    "Palestine": "970",
    "Palestinian Territory": "970",
    "Lebanon": "961",
    "Syria": "963",
    "Jordan": "962",
    "Iraq": "964",
    "Iran": "98",
    "Saudi Arabia": "966",
    "Kuwait": "965",
    "Bahrain": "973",
    "Qatar": "974",
    "United Arab Emirates": "971",
    "UAE": "971",
    "Oman": "968",
    "Yemen": "967",
    "Georgia": "995",
    "Armenia": "374",
    "Azerbaijan": "994",
    "Egypt": "20",
    "Libya": "218",
    "Tunisia": "216",
    "Algeria": "213",
    "Morocco": "212",
    "Sudan": "249",
    "South Sudan": "211",
    "Ethiopia": "251",
    "Kenya": "254",
    "Uganda": "256",
    "Tanzania": "255",
    "Rwanda": "250",
    "Burundi": "257",
    "Nigeria": "234",
    "Ghana": "233",
    "South Africa": "27",
    "Namibia": "264",
    "Botswana": "267",
    "Zimbabwe": "263",
    "Zambia": "260",
    "Malawi": "265",
    "Mozambique": "258",
    "Madagascar": "261",
    "Mauritius": "230",
    "Seychelles": "248",
    "Mexico": "52",
    "Guatemala": "502",
    "Belize": "501",
    "El Salvador": "503",
    "Honduras": "504",
    "Nicaragua": "505",
    "Costa Rica": "506",
    "Panama": "507",
    "Colombia": "57",
    "Venezuela": "58",
    "Guyana": "592",
    "Suriname": "597",
    "French Guiana": "594",
    "Brazil": "55",
    "Ecuador": "593",
    "Peru": "51",
    "Bolivia": "591",
    "Paraguay": "595",
    "Uruguay": "598",
    "Argentina": "54",
    "Chile": "56",
}
MAX_RETRIES = 3
RETRY_DELAY = 2
class QuantumAIInjector:
    """QuantumAI-specific lead injector with popup support."""
    def __init__(self, proxy_config=None):
        self.proxy_config = proxy_config
        self.target_url = None
    def _take_screenshot(self, page, name):
        """Take a screenshot for debugging purposes."""
        try:
            screenshots_dir = Path("screenshots")
            screenshots_dir.mkdir(exist_ok=True)
            screenshot_path = screenshots_dir / f"quantumai_{name}_{int(time.time())}.png"
            page.screenshot(path=str(screenshot_path))
            print(f"INFO: Screenshot saved: {screenshot_path}")
        except Exception as e:
            print(f"WARNING: Could not take screenshot '{name}': {str(e)}")
    def _setup_browser_config(self):
        """Setup browser configuration with proxy if available."""
        # Check if we're in a headless environment (no DISPLAY or CI)
        import os
        is_headless_env = not os.environ.get('DISPLAY') or os.environ.get('CI') == 'true'
        
        config = {
            'headless': is_headless_env,  # Auto-detect headless mode
            'slow_mo': 500,
            'args': [
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
                '--disable-extensions',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-web-security',
                '--allow-running-insecure-content',
                '--disable-features=VizDisplayCompositor'
            ]
        }
        
        # Log the browser mode
        if is_headless_env:
            print("INFO: QuantumAI running in headless mode (no display detected)")
        else:
            print("INFO: QuantumAI running in visible mode (display available)")
            
        # Add additional args for headless mode
        if is_headless_env:
            config["args"].extend([
                "--virtual-time-budget=5000",
                "--disable-background-networking"
            ])
        if self.proxy_config:
            server = self.proxy_config.get("server", "")
            username = self.proxy_config.get("username", "")
            password = self.proxy_config.get("password", "")
            config['proxy'] = {
                'server': server,
                'username': username,
                'password': password
            }
            print(f"INFO: QuantumAI using proxy configuration: {server}")
            print(f"DEBUG: QuantumAI proxy username: {username}")
            print(f"DEBUG: QuantumAI proxy country: {self.proxy_config.get('country', 'Unknown')}")
        else:
            print("INFO: QuantumAI proceeding without proxy (will use real IP)")
        return config
    def _human_like_typing(self, element, text):
        """Simulate human-like typing with random delays."""
        try:
            element.clear()
            for char in str(text):
                element.type(char)
                time.sleep(random.uniform(0.05, 0.15))
        except Exception as e:
            print(f"WARNING: Human-like typing failed: {str(e)}")
            element.fill(str(text))
    def _check_popup_visibility(self, page):
        """Check if the popup is visible on the page."""
        try:
            popup = page.query_selector('#popup_custom')
            if popup:
                style = popup.get_attribute('style')
                is_visible = 'visibility: hidden' not in style if style else True
                print(f"INFO: Popup visibility - Style: {style}, Is Visible: {is_visible}")
                return is_visible
            return False
        except Exception as e:
            print(f"WARNING: Error checking popup visibility: {str(e)}")
            return False
    def _trigger_popup(self, page):
        """Try to trigger the popup by simulating exit-intent behavior."""
        try:
            print("INFO: Attempting to trigger popup with exit-intent simulation...")
            page.mouse.move(0, 0)
            time.sleep(1)
            page.evaluate("window.scrollTo(0, 0)")
            time.sleep(1)
            page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            time.sleep(1)
            page.evaluate("window.dispatchEvent(new Event('beforeunload'))")
            time.sleep(1)
            page.mouse.move(100, 100)
            time.sleep(0.5)
            page.mouse.move(0, 0)
            time.sleep(0.5)
            return self._check_popup_visibility(page)
        except Exception as e:
            print(f"WARNING: Error triggering popup: {str(e)}")
            return False
    def _close_popup(self, page):
        """Close the popup if it's visible."""
        try:
            print("INFO: Attempting to close popup...")
            close_selectors = [
                '#popup_custom .close',
                '#popup_custom .close-btn',
                '#popup_custom .popup-close',
                '#popup_custom button[aria-label="Close"]',
                '#popup_custom .x-close',
                '#popup_custom [data-dismiss="modal"]',
                '#popup_custom .modal-close'
            ]
            close_button = None
            for selector in close_selectors:
                try:
                    close_button = page.query_selector(selector)
                    if close_button and close_button.is_visible():
                        print(f"INFO: Found close button using selector: {selector}")
                        break
                except Exception as e:
                    continue
            if close_button:
                close_button.click()
                print("✓ Popup close button clicked")
                time.sleep(0.5)
                if not self._check_popup_visibility(page):
                    print("✓ Popup successfully closed")
                    return True
                else:
                    print("WARNING: Popup still visible after close attempt")
            else:
                print("WARNING: No close button found for popup")
                print("INFO: Trying alternative popup close methods...")
                try:
                    page.keyboard.press('Escape')
                    time.sleep(0.5)
                    if not self._check_popup_visibility(page):
                        print("✓ Popup closed using Escape key")
                        return True
                except:
                    pass
                try:
                    page.click('body', position={'x': 10, 'y': 10})
                    time.sleep(0.5)
                    if not self._check_popup_visibility(page):
                        print("✓ Popup closed by clicking outside")
                        return True
                except:
                    pass
                try:
                    page.evaluate("""
                        const popup = document.getElementById('popup_custom');
                        if (popup) {
                            popup.style.display = 'none';
                            popup.style.visibility = 'hidden';
                        }
                    """)
                    time.sleep(0.5)
                    if not self._check_popup_visibility(page):
                        print("✓ Popup hidden via JavaScript")
                        return True
                except:
                    pass
            print("WARNING: Could not close popup with any method")
            return False
        except Exception as e:
            print(f"WARNING: Error closing popup: {str(e)}")
            return False
    def _fill_quantumai_form(self, page, lead_data, form_id):
        """Fill QuantumAI form fields for a specific form."""
        try:
            print(f"INFO: Filling QuantumAI form {form_id}...")
            if form_id == "myform1":
                phone_id = "kabelname-1"
                hidden_phone_id = "myText-1"
            elif form_id == "myform2":
                phone_id = "kabelname-2"
                hidden_phone_id = "myText-2"
            elif form_id == "myform3":
                phone_id = "kabelname-3"
                hidden_phone_id = "myText-3"
            else:
                print(f"WARNING: Unknown form ID: {form_id}")
                return False
            form_selector = f'#{form_id}'
            page.wait_for_selector(form_selector, timeout=10000)
            first_name_field = page.wait_for_selector(f'{form_selector} input[name="name"]', timeout=5000)
            self._human_like_typing(first_name_field, lead_data.get('firstName', ''))
            print(f"✓ First Name filled: {lead_data.get('firstName', '')}")
            last_name_field = page.wait_for_selector(f'{form_selector} input[name="lastname"]', timeout=5000)
            self._human_like_typing(last_name_field, lead_data.get('lastName', ''))
            print(f"✓ Last Name filled: {lead_data.get('lastName', '')}")
            email_field = page.wait_for_selector(f'{form_selector} input[name="email"]', timeout=5000)
            self._human_like_typing(email_field, lead_data.get('email', ''))
            print(f"✓ Email filled: {lead_data.get('email', '')}")
            phone_field = page.wait_for_selector(f'#{phone_id}', timeout=5000)
            phone_code_from_lead = lead_data.get('country_code')
            country_name_from_lead = lead_data.get('country')
            phone_code_to_use = None
            if country_name_from_lead and country_name_from_lead in COUNTRY_TO_PHONE_CODE:
                phone_code_to_use = COUNTRY_TO_PHONE_CODE[country_name_from_lead]
                print(f"INFO: Using phone code {phone_code_to_use} for country {country_name_from_lead}")
            elif phone_code_from_lead:
                phone_code_to_use = phone_code_from_lead
                print(f"WARNING: Country '{country_name_from_lead}' not in phone code mapping. Using provided country_code: {phone_code_to_use}")
            else:
                phone_code_to_use = "1"
                print(f"WARNING: No country or country_code provided. Using default: {phone_code_to_use}")
            phone_to_iso = {
                "1": "us",
                "44": "gb",
                "61": "au",
                "49": "de",
                "33": "fr",
                "39": "it",
                "34": "es",
                "31": "nl",
                "32": "be",
                "41": "ch",
                "43": "at",
                "46": "se",
                "47": "no",
                "45": "dk",
                "358": "fi",
                "48": "pl",
                "420": "cz",
                "36": "hu",
                "40": "ro",
                "359": "bg",
                "30": "gr",
                "351": "pt",
                "353": "ie",
                "352": "lu",
                "356": "mt",
                "357": "cy",
                "64": "nz",
            }
            country_iso = phone_to_iso.get(phone_code_to_use, "us")
            try:
                page.evaluate(f"""
                    (function() {{
                        const phoneInput = document.getElementById('{phone_id}');
                        if (phoneInput && window.intlTelInputGlobals) {{
                            const iti = window.intlTelInputGlobals.getInstance(phoneInput);
                            if (iti) {{
                                iti.setCountry('{country_iso}');
                                console.log('Set country to {country_iso} for phone code {phone_code_to_use}');
                            }}
                        }}
                    }})();
                """)
                print(f"✓ Country set in phone widget: {country_iso} (phone code +{phone_code_to_use})")
            except Exception as e:
                print(f"WARNING: Could not set country in phone widget: {str(e)}")
                try:
                    page.evaluate(f"document.getElementById('{phone_id}').setAttribute('data-code', '+{phone_code_to_use}')")
                    print(f"✓ Set data-code attribute: +{phone_code_to_use}")
                except Exception as e2:
                    print(f"WARNING: Could not set data-code attribute: {str(e2)}")
            self._human_like_typing(phone_field, lead_data.get('phone', ''))
            print(f"✓ Phone filled: {lead_data.get('phone', '')}")
            try:
                page.evaluate(f'document.getElementById("{hidden_phone_id}").value = "{phone_code_to_use}"')
                print(f"✓ Country code set in hidden field: +{phone_code_to_use}")
            except Exception as e:
                print(f"WARNING: Could not set country code in hidden field: {str(e)}")
            try:
                if form_id in ["myform1", "myform3"]:
                    checkbox_selectors = [
                        f'{form_selector} label[for="cbx-3"]',
                        f'{form_selector} .checked-svg',
                        f'{form_selector} label.checked-svg',
                        'label[for="cbx-3"]',
                        '.checked-svg'
                    ]
                    checkbox_checked = False
                    for selector in checkbox_selectors:
                        try:
                            checkbox_element = page.wait_for_selector(selector, timeout=2000)
                            if checkbox_element and checkbox_element.is_visible():
                                print(f"INFO: Found checkbox using selector: {selector}")
                                checkbox_element.click()
                                time.sleep(0.5)
                                actual_checkbox = page.query_selector('#cbx-3')
                                if actual_checkbox:
                                    is_checked = actual_checkbox.is_checked()
                                    print(f"INFO: Checkbox checked state: {is_checked}")
                                    if is_checked:
                                        checkbox_checked = True
                                        break
                                else:
                                    checkbox_checked = True
                                    break
                        except Exception as e:
                            continue
                    if checkbox_checked:
                        print("✓ Terms checkbox checked successfully")
                    else:
                        print("WARNING: Could not verify checkbox was checked")
                        try:
                            page.evaluate('document.getElementById("cbx-3").checked = true')
                            print("✓ Terms checkbox checked via JavaScript")
                        except Exception as js_e:
                            print(f"ERROR: Could not check checkbox via JavaScript: {str(js_e)}")
                else:
                    checkbox_label = page.wait_for_selector(f'{form_selector} .checked-svg', timeout=5000)
                    checkbox_label.click()
                    print("✓ Terms checkbox checked")
            except Exception as e:
                print(f"WARNING: Could not check terms checkbox: {str(e)}")
                try:
                    all_checkboxes = page.query_selector_all(f'{form_selector} input[type="checkbox"]')
                    if all_checkboxes:
                        for cb in all_checkboxes:
                            if not cb.is_checked():
                                cb.check()
                                print("✓ Fallback: Checkbox checked")
                                break
                except:
                    pass
            return True
        except Exception as e:
            print(f"ERROR: Failed to fill form {form_id}: {str(e)}")
            traceback.print_exc()
            return False
    def _submit_quantumai_form(self, page, form_id):
        """Submit the specified QuantumAI form."""
        try:
            print(f"INFO: Submitting QuantumAI form {form_id}...")
            if form_id in ["myform1", "myform3"]:
                try:
                    checkbox = page.query_selector('#cbx-3')
                    if checkbox:
                        is_checked = checkbox.is_checked()
                        print(f"INFO: Pre-submit checkbox verification for {form_id} - Checked: {is_checked}")
                        if not is_checked:
                            print(f"WARNING: Checkbox not checked for {form_id}! Attempting to check it now...")
                            label = page.query_selector('label[for="cbx-3"]')
                            if label:
                                label.click()
                                time.sleep(0.5)
                                is_checked = checkbox.is_checked()
                                print(f"INFO: After re-click - Checkbox checked: {is_checked}")
                            if not is_checked:
                                page.evaluate('document.getElementById("cbx-3").checked = true')
                                print(f"INFO: Forced checkbox check via JavaScript for {form_id}")
                    else:
                        print(f"WARNING: Could not find checkbox #cbx-3 for {form_id}")
                except Exception as e:
                    print(f"WARNING: Error verifying checkbox for {form_id}: {str(e)}")
            self._take_screenshot(page, f"before_submit_{form_id}")
            if form_id == "myform1":
                submit_selectors = [
                    f'#{form_id} button[name="submitBtn"]',
                    f'#{form_id} button[type="submit"]',
                    f'#{form_id} .btn_send',
                    f'#{form_id} button.btn',
                    f'#{form_id} input[type="submit"]',
                    f'#{form_id} button:has-text("Register")',
                    f'#{form_id} button:has-text("REGISTER")',
                    f'#{form_id} button:has-text("Submit")',
                    f'#{form_id} [role="button"]',
                    'button[name="submitBtn"]',
                    '.btn_send',
                    'button.btn:has-text("Register")'
                ]
            else:
                submit_selectors = [
                    f'#{form_id} button[name="submitBtn"]',
                    f'#{form_id} button[type="submit"]',
                    f'#{form_id} .btn_send',
                    f'#{form_id} button:has-text("Register")',
                    f'#{form_id} button.btn'
                ]
            submit_button = None
            for selector in submit_selectors:
                try:
                    submit_button = page.wait_for_selector(selector, timeout=2000)
                    if submit_button:
                        print(f"INFO: Found submit button using selector: {selector}")
                        break
                except:
                    continue
            if not submit_button:
                print(f"ERROR: Could not find submit button for form {form_id}")
                all_buttons = page.query_selector_all(f'#{form_id} button, #{form_id} input[type="submit"], #{form_id} [role="button"]')
                print(f"INFO: Found {len(all_buttons)} buttons in form {form_id}")
                for i, btn in enumerate(all_buttons):
                    btn_text = btn.inner_text()
                    btn_name = btn.get_attribute('name')
                    btn_type = btn.get_attribute('type')
                    btn_class = btn.get_attribute('class')
                    print(f"  Button {i}: text='{btn_text}', name='{btn_name}', type='{btn_type}', class='{btn_class}'")
                if form_id == "myform1":
                    print("INFO: Searching for register buttons outside the form for myform1...")
                    nearby_buttons = page.query_selector_all('button:has-text("Register"), button:has-text("REGISTER"), .btn_send, button[name="submitBtn"]')
                    print(f"INFO: Found {len(nearby_buttons)} nearby register buttons")
                    for i, btn in enumerate(nearby_buttons):
                        btn_text = btn.inner_text()
                        btn_name = btn.get_attribute('name')
                        btn_type = btn.get_attribute('type')
                        btn_class = btn.get_attribute('class')
                        print(f"  Nearby Button {i}: text='{btn_text}', name='{btn_name}', type='{btn_type}', class='{btn_class}'")
                        if btn.is_visible() and ('register' in btn_text.lower() or btn_name == 'submitBtn' or 'btn_send' in (btn_class or '')):
                            print(f"INFO: Using nearby register button: {btn_text}")
                            submit_button = btn
                            break
                if not submit_button:
                    return False
            submit_button.scroll_into_view_if_needed()
            time.sleep(0.5)
            print(f"INFO: Clicking submit button for form {form_id}...")
            submit_button.click()
            print(f"✓ Submit button clicked for form {form_id}")
            time.sleep(2)
            self._take_screenshot(page, f"after_submit_{form_id}")
            try:
                success_indicators = [
                    'text="Thank you"',
                    'text="Success"',
                    'text="Submitted"',
                    '.success',
                    '.thank-you'
                ]
                for indicator in success_indicators:
                    try:
                        if page.wait_for_selector(indicator, timeout=1000):
                            print(f"✓ Success indicator found: {indicator}")
                            break
                    except:
                        continue
            except Exception as e:
                print(f"INFO: No explicit success indicator found: {str(e)}")
            print(f"✓ Form {form_id} submission completed")
            return True
        except Exception as e:
            print(f"ERROR: Failed to submit form {form_id}: {str(e)}")
            traceback.print_exc()
            self._take_screenshot(page, f"submit_error_{form_id}")
            return False
    def inject_lead(self, lead_data, target_url):
        """Main injection method for QuantumAI with popup detection."""
        browser = None
        try:
            self.target_url = target_url
            if not self.proxy_config:
                print("FATAL: No proxy configuration available for QuantumAI injection")
                print("FATAL: QuantumAI injection cannot proceed without proxy - STOPPING IMMEDIATELY")
                return False
            with sync_playwright() as p:
                print("INFO: Launching browser for QuantumAI injection...")
                browser = p.chromium.launch(**self._setup_browser_config())
                context = browser.new_context(
                    viewport={'width': 1366, 'height': 768},
                    user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                )
                page = context.new_page()
                print(f"INFO: Navigating to QuantumAI page: {target_url}")
                page.goto(target_url, wait_until="domcontentloaded", timeout=30000)
                self._take_screenshot(page, "initial_load")
                time.sleep(3)
                popup_visible = self._check_popup_visibility(page)
                if not popup_visible:
                    print("INFO: Popup not immediately visible, attempting to trigger it...")
                    popup_visible = self._trigger_popup(page)
                success = False
                if popup_visible:
                    print("INFO: Popup is visible - filling popup form (PRIORITY)")
                    self._take_screenshot(page, "popup_detected")
                    success = self._fill_quantumai_form(page, lead_data, "myform3")
                    if success:
                        success = self._submit_quantumai_form(page, "myform3")
                        if success:
                            self._take_screenshot(page, "popup_form_submitted")
                            print("SUCCESS: Popup form submitted successfully!")
                if not success:
                    print("INFO: Filling main QuantumAI form (myform1) - ROOT FORM FALLBACK")
                    page.evaluate("document.getElementById('signin').scrollIntoView({behavior: 'smooth'})")
                    time.sleep(2)
                    success = self._fill_quantumai_form(page, lead_data, "myform1")
                    if success:
                        success = self._submit_quantumai_form(page, "myform1")
                        if success:
                            self._take_screenshot(page, "main_form_submitted")
                            print("SUCCESS: Main form (root page) submitted successfully!")
                if not success:
                    print("INFO: Trying footer form as final fallback (myform2)")
                    page.evaluate("document.getElementById('contacts').scrollIntoView({behavior: 'smooth'})")
                    time.sleep(2)
                    success = self._fill_quantumai_form(page, lead_data, "myform2")
                    if success:
                        success = self._submit_quantumai_form(page, "myform2")
                        if success:
                            self._take_screenshot(page, "footer_form_submitted")
                            print("SUCCESS: Footer form submitted successfully!")
                if success:
                    print("INFO: Waiting for redirects...")
                    time.sleep(10)
                    final_url = page.url
                    print(f"INFO: Final URL: {final_url}")
                    self._take_screenshot(page, "final_result")
                    print("INFO: Attempting to capture browser session...")
                    session_success = self._capture_and_store_session(page, lead_data, True)
                    if session_success:
                        print("SUCCESS: Browser session captured and stored successfully!")
                    else:
                        print("WARNING: Failed to capture browser session, but injection was successful.")
                    return True
                else:
                    print("ERROR: All QuantumAI form submission attempts failed")
                    self._take_screenshot(page, "all_forms_failed")
                    print("INFO: Attempting to capture session for debugging...")
                    try:
                        self._capture_and_store_session(page, lead_data, False)
                    except:
                        pass
                    return False
        except Exception as e:
            print(f"ERROR: QuantumAI injection failed: {str(e)}")
            traceback.print_exc()
            if browser:
                try:
                    page = browser.contexts[0].pages[0] if browser.contexts and browser.contexts[0].pages else None
                    if page:
                        self._take_screenshot(page, "error_state")
                except:
                    pass
            return False
        finally:
            if browser:
                try:
                    browser.close()
                except:
                    pass
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
                    'injectionType': 'auto_ftd',
                    'notes': f'QuantumAI FTD injection completed on {domain}',
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
    """Main function to run the QuantumAI injector."""
    if len(sys.argv) != 2:
        print("Usage: python quantumai_injector_playwright.py '<lead_data_json>'")
        sys.exit(1)
    try:
        lead_data = json.loads(sys.argv[1])
        print(f"INFO: Starting QuantumAI injection with lead data:")
        print(f"  - Name: {lead_data.get('firstName', '')} {lead_data.get('lastName', '')}")
        print(f"  - Email: {lead_data.get('email', '')}")
        print(f"  - Phone: {lead_data.get('phone', '')}")
        print(f"  - Country: {lead_data.get('country', '')}")
        proxy_config = lead_data.get('proxy')
        if proxy_config:
            print(f"DEBUG: QuantumAI Proxy configuration received:")
            print(f"  - Server: {proxy_config.get('server', 'Not set')}")
            print(f"  - Username: {proxy_config.get('username', 'Not set')}")
            print(f"  - Host: {proxy_config.get('host', 'Not set')}")
            print(f"  - Port: {proxy_config.get('port', 'Not set')}")
            print(f"  - Country: {proxy_config.get('country', 'Not set')}")
        else:
            print("FATAL: No proxy configuration provided to QuantumAI injector")
            print("FATAL: QuantumAI injection cannot proceed without proxy - STOPPING IMMEDIATELY")
            sys.exit(1)
        target_url = lead_data.get('targetUrl', 'https://k8ro.info/bKkkBWkK')
        injector = QuantumAIInjector(proxy_config)
        success = injector.inject_lead(lead_data, target_url)
        if success:
            print("SUCCESS: QuantumAI lead injection completed successfully!")
            sys.exit(0)
        else:
            print("ERROR: QuantumAI lead injection failed!")
            sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"ERROR: Invalid JSON data: {str(e)}")
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: Unexpected error: {str(e)}")
        traceback.print_exc()
        sys.exit(1)
if __name__ == "__main__":
    main()