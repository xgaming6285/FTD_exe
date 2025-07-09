#!/usr/bin/env python3
"""
VNC Deployment Testing Script
Tests the complete Docker/VNC solution for FTD GUI browser sessions
"""

import asyncio
import json
import logging
import os
import subprocess
import sys
import time
import requests
from datetime import datetime
from typing import Dict, List, Optional
import docker
import websocket
import threading

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('vnc_deployment_test.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class VNCDeploymentTester:
    def __init__(self):
        self.docker_client = None
        self.test_results = {
            'docker_build': False,
            'container_start': False,
            'vnc_server': False,
            'novnc_web': False,
            'session_api': False,
            'browser_session': False,
            'device_simulation': False,
            'proxy_support': False,
            'kiosk_mode': False,
            'session_cleanup': False
        }
        self.test_session_id = f"test_session_{int(time.time())}"
        
    def setup_docker_client(self):
        """Initialize Docker client"""
        try:
            self.docker_client = docker.from_env()
            logger.info("🐳 Docker client initialized successfully")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to initialize Docker client: {e}")
            return False
    
    def test_docker_build(self):
        """Test Docker image build"""
        try:
            logger.info("🔨 Testing Docker image build...")
            
            # Build the VNC image
            result = subprocess.run([
                'docker', 'build', '-f', 'Dockerfile.vnc', '-t', 'ftd-vnc-test', '.'
            ], capture_output=True, text=True, timeout=300)
            
            if result.returncode == 0:
                logger.info("✅ Docker image built successfully")
                self.test_results['docker_build'] = True
                return True
            else:
                logger.error(f"❌ Docker build failed: {result.stderr}")
                return False
                
        except subprocess.TimeoutExpired:
            logger.error("❌ Docker build timed out")
            return False
        except Exception as e:
            logger.error(f"❌ Docker build error: {e}")
            return False
    
    def test_container_startup(self):
        """Test container startup and health"""
        try:
            logger.info("🚀 Testing container startup...")
            
            # Start container with test configuration
            result = subprocess.run([
                'docker', 'run', '-d',
                '--name', 'ftd-vnc-test-container',
                '-p', '3001:3001',
                '-p', '6080:6080',
                '-p', '8080:8080',
                '-p', '5901:5901',
                '-e', 'DISPLAY=:1',
                '-e', 'VNC_PASSWORD=testpassword',
                '-e', 'NODE_ENV=test',
                '--cap-add', 'SYS_ADMIN',
                '--security-opt', 'seccomp:unconfined',
                '--shm-size', '1gb',
                'ftd-vnc-test'
            ], capture_output=True, text=True)
            
            if result.returncode == 0:
                container_id = result.stdout.strip()
                logger.info(f"✅ Container started: {container_id}")
                
                # Wait for container to be ready
                time.sleep(30)
                
                # Check container health
                health_result = subprocess.run([
                    'docker', 'exec', container_id, 'curl', '-f', 'http://localhost:3001/health'
                ], capture_output=True, text=True)
                
                if health_result.returncode == 0:
                    logger.info("✅ Container health check passed")
                    self.test_results['container_start'] = True
                    return True
                else:
                    logger.error("❌ Container health check failed")
                    return False
            else:
                logger.error(f"❌ Container startup failed: {result.stderr}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Container startup error: {e}")
            return False
    
    def test_vnc_server(self):
        """Test VNC server availability"""
        try:
            logger.info("🖥️ Testing VNC server...")
            
            # Check if VNC server is running
            result = subprocess.run([
                'docker', 'exec', 'ftd-vnc-test-container', 
                'ps', 'aux'
            ], capture_output=True, text=True)
            
            if 'Xtightvnc' in result.stdout:
                logger.info("✅ VNC server is running")
                self.test_results['vnc_server'] = True
                return True
            else:
                logger.error("❌ VNC server not found")
                return False
                
        except Exception as e:
            logger.error(f"❌ VNC server test error: {e}")
            return False
    
    def test_novnc_web_interface(self):
        """Test noVNC web interface"""
        try:
            logger.info("🌐 Testing noVNC web interface...")
            
            # Test noVNC web interface
            response = requests.get('http://localhost:8080', timeout=10)
            
            if response.status_code == 200 and 'noVNC' in response.text:
                logger.info("✅ noVNC web interface is accessible")
                self.test_results['novnc_web'] = True
                return True
            else:
                logger.error(f"❌ noVNC web interface failed: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"❌ noVNC web interface test error: {e}")
            return False
    
    def test_session_api(self):
        """Test session management API"""
        try:
            logger.info("🔌 Testing session API...")
            
            # Test health endpoint
            health_response = requests.get('http://localhost:3001/health', timeout=10)
            if health_response.status_code != 200:
                logger.error("❌ Session API health check failed")
                return False
            
            # Test session creation
            session_data = {
                'sessionId': self.test_session_id,
                'domain': 'https://www.google.com',
                'viewport': {'width': 1920, 'height': 1080},
                'userAgent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
                'leadInfo': {
                    'firstName': 'Test',
                    'lastName': 'User',
                    'email': 'test@example.com'
                }
            }
            
            create_response = requests.post(
                'http://localhost:3001/sessions',
                json=session_data,
                timeout=30
            )
            
            if create_response.status_code == 200:
                logger.info("✅ Session API is working")
                self.test_results['session_api'] = True
                return True
            else:
                logger.error(f"❌ Session API failed: {create_response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Session API test error: {e}")
            return False
    
    def test_browser_session(self):
        """Test browser session creation"""
        try:
            logger.info("🌐 Testing browser session...")
            
            # Wait for browser session to initialize
            time.sleep(10)
            
            # Check if browser process is running
            result = subprocess.run([
                'docker', 'exec', 'ftd-vnc-test-container',
                'ps', 'aux'
            ], capture_output=True, text=True)
            
            if 'chromium' in result.stdout.lower() or 'chrome' in result.stdout.lower():
                logger.info("✅ Browser session is running")
                self.test_results['browser_session'] = True
                return True
            else:
                logger.error("❌ Browser session not found")
                return False
                
        except Exception as e:
            logger.error(f"❌ Browser session test error: {e}")
            return False
    
    def test_device_simulation(self):
        """Test device simulation features"""
        try:
            logger.info("📱 Testing device simulation...")
            
            # Test mobile device simulation
            mobile_session_data = {
                'sessionId': f"{self.test_session_id}_mobile",
                'domain': 'https://www.google.com',
                'viewport': {'width': 375, 'height': 667},
                'userAgent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
                'leadInfo': {
                    'firstName': 'Mobile',
                    'lastName': 'Test',
                    'email': 'mobile@example.com'
                }
            }
            
            mobile_response = requests.post(
                'http://localhost:3001/sessions',
                json=mobile_session_data,
                timeout=30
            )
            
            if mobile_response.status_code == 200:
                logger.info("✅ Device simulation is working")
                self.test_results['device_simulation'] = True
                return True
            else:
                logger.error(f"❌ Device simulation failed: {mobile_response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Device simulation test error: {e}")
            return False
    
    def test_proxy_support(self):
        """Test proxy configuration"""
        try:
            logger.info("🔗 Testing proxy support...")
            
            # Test session with proxy configuration
            proxy_session_data = {
                'sessionId': f"{self.test_session_id}_proxy",
                'domain': 'https://www.google.com',
                'viewport': {'width': 1920, 'height': 1080},
                'userAgent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
                'proxy': {
                    'server': 'http://proxy.example.com:8080',
                    'username': 'testuser',
                    'password': 'testpass'
                },
                'leadInfo': {
                    'firstName': 'Proxy',
                    'lastName': 'Test',
                    'email': 'proxy@example.com'
                }
            }
            
            proxy_response = requests.post(
                'http://localhost:3001/sessions',
                json=proxy_session_data,
                timeout=30
            )
            
            if proxy_response.status_code == 200:
                logger.info("✅ Proxy support is working")
                self.test_results['proxy_support'] = True
                return True
            else:
                logger.error(f"❌ Proxy support failed: {proxy_response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Proxy support test error: {e}")
            return False
    
    def test_kiosk_mode(self):
        """Test kiosk mode functionality"""
        try:
            logger.info("🎭 Testing kiosk mode...")
            
            # Check if browser is running in kiosk mode
            result = subprocess.run([
                'docker', 'exec', 'ftd-vnc-test-container',
                'ps', 'aux'
            ], capture_output=True, text=True)
            
            if '--kiosk' in result.stdout:
                logger.info("✅ Kiosk mode is enabled")
                self.test_results['kiosk_mode'] = True
                return True
            else:
                logger.error("❌ Kiosk mode not detected")
                return False
                
        except Exception as e:
            logger.error(f"❌ Kiosk mode test error: {e}")
            return False
    
    def test_session_cleanup(self):
        """Test session cleanup"""
        try:
            logger.info("🧹 Testing session cleanup...")
            
            # Test session termination
            cleanup_response = requests.delete(
                f'http://localhost:3001/sessions/{self.test_session_id}',
                timeout=10
            )
            
            if cleanup_response.status_code in [200, 404]:
                logger.info("✅ Session cleanup is working")
                self.test_results['session_cleanup'] = True
                return True
            else:
                logger.error(f"❌ Session cleanup failed: {cleanup_response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Session cleanup test error: {e}")
            return False
    
    def cleanup_test_environment(self):
        """Clean up test containers and images"""
        try:
            logger.info("🧹 Cleaning up test environment...")
            
            # Stop and remove test container
            subprocess.run(['docker', 'stop', 'ftd-vnc-test-container'], 
                         capture_output=True)
            subprocess.run(['docker', 'rm', 'ftd-vnc-test-container'], 
                         capture_output=True)
            
            # Remove test image
            subprocess.run(['docker', 'rmi', 'ftd-vnc-test'], 
                         capture_output=True)
            
            logger.info("✅ Test environment cleaned up")
            
        except Exception as e:
            logger.error(f"❌ Cleanup error: {e}")
    
    def generate_test_report(self):
        """Generate comprehensive test report"""
        report = {
            'test_timestamp': datetime.now().isoformat(),
            'test_session_id': self.test_session_id,
            'results': self.test_results,
            'summary': {
                'total_tests': len(self.test_results),
                'passed': sum(1 for result in self.test_results.values() if result),
                'failed': sum(1 for result in self.test_results.values() if not result),
                'success_rate': (sum(1 for result in self.test_results.values() if result) / len(self.test_results)) * 100
            }
        }
        
        # Save report to file
        with open('vnc_deployment_test_report.json', 'w') as f:
            json.dump(report, f, indent=2)
        
        return report
    
    def run_all_tests(self):
        """Run all deployment tests"""
        logger.info("🚀 Starting VNC deployment tests...")
        
        # Initialize Docker client
        if not self.setup_docker_client():
            return False
        
        # Run tests in sequence
        tests = [
            ('Docker Build', self.test_docker_build),
            ('Container Startup', self.test_container_startup),
            ('VNC Server', self.test_vnc_server),
            ('noVNC Web Interface', self.test_novnc_web_interface),
            ('Session API', self.test_session_api),
            ('Browser Session', self.test_browser_session),
            ('Device Simulation', self.test_device_simulation),
            ('Proxy Support', self.test_proxy_support),
            ('Kiosk Mode', self.test_kiosk_mode),
            ('Session Cleanup', self.test_session_cleanup)
        ]
        
        for test_name, test_func in tests:
            logger.info(f"🔍 Running test: {test_name}")
            try:
                success = test_func()
                if success:
                    logger.info(f"✅ {test_name} passed")
                else:
                    logger.error(f"❌ {test_name} failed")
            except Exception as e:
                logger.error(f"💥 {test_name} crashed: {e}")
        
        # Generate test report
        report = self.generate_test_report()
        
        # Print summary
        logger.info("\n" + "="*50)
        logger.info("📊 TEST SUMMARY")
        logger.info("="*50)
        logger.info(f"Total Tests: {report['summary']['total_tests']}")
        logger.info(f"Passed: {report['summary']['passed']}")
        logger.info(f"Failed: {report['summary']['failed']}")
        logger.info(f"Success Rate: {report['summary']['success_rate']:.1f}%")
        
        # Show detailed results
        logger.info("\n📋 DETAILED RESULTS:")
        for test_name, result in self.test_results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            logger.info(f"  {test_name}: {status}")
        
        # Clean up
        self.cleanup_test_environment()
        
        return report['summary']['success_rate'] >= 80  # 80% success rate threshold

def main():
    """Main entry point"""
    try:
        tester = VNCDeploymentTester()
        success = tester.run_all_tests()
        
        if success:
            logger.info("🎉 VNC deployment tests completed successfully!")
            sys.exit(0)
        else:
            logger.error("❌ VNC deployment tests failed!")
            sys.exit(1)
            
    except KeyboardInterrupt:
        logger.info("🛑 Tests interrupted by user")
        sys.exit(0)
    except Exception as e:
        logger.error(f"💥 Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 