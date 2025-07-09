#!/usr/bin/env python3
"""
Session API with VNC Support
FastAPI service to manage GUI browser sessions with VNC streaming on EC2 instance
"""

import os
import json
import asyncio
import logging
import subprocess
import signal
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/app/logs/session_api.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Data models
class SessionData(BaseModel):
    sessionId: str
    leadId: str
    cookies: List[Dict] = []
    localStorage: Dict = {}
    sessionStorage: Dict = {}
    userAgent: str = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    viewport: Dict = {"width": 1920, "height": 1080}
    domain: Optional[str] = None
    proxy: Optional[Dict] = None
    leadInfo: Dict = {}

class SessionResponse(BaseModel):
    success: bool
    message: str
    sessionId: str
    sessionStatus: str
    vncUrl: Optional[str] = None
    vncPort: Optional[int] = None

class SessionStatusResponse(BaseModel):
    sessionId: str
    status: str
    startTime: datetime
    lastActivity: datetime
    vncUrl: Optional[str] = None
    vncPort: Optional[int] = None
    leadInfo: Dict = {}

# Global session management
active_sessions: Dict[str, Dict] = {}
vnc_port_counter = 5902  # Start from 5902 (5901 is used by display :1)

app = FastAPI(title="FTD GUI Browser Session API with VNC", version="2.0.0")

def get_next_vnc_port():
    """Get the next available VNC port"""
    global vnc_port_counter
    port = vnc_port_counter
    vnc_port_counter += 1
    return port

def get_vnc_url(session_id: str, request: Request) -> str:
    """Generate VNC URL for a session"""
    base_url = f"{request.url.scheme}://{request.url.netloc}"
    return f"{base_url}/vnc/{session_id}"

async def start_browser_session(session_data: SessionData, request: Request) -> Dict:
    """Start VNC GUI browser session in background"""
    try:
        session_id = session_data.sessionId
        logger.info(f"🚀 Starting VNC GUI browser session: {session_id}")
        
        # Get VNC port for this session
        vnc_port = get_next_vnc_port()
        
        # Prepare session data for Python script
        session_json = session_data.json()
        
        # Start the VNC GUI browser session script
        process = subprocess.Popen([
            'python3', '/app/gui_browser_session.py', session_json
        ], 
        stdout=subprocess.PIPE, 
        stderr=subprocess.PIPE,
        preexec_fn=os.setsid,  # Create new process group
        env={
            **os.environ,
            'DISPLAY': ':1',
            'VNC_PORT': str(vnc_port),
            'SESSION_ID': session_id
        }
        )
        
        # Generate VNC URL
        vnc_url = get_vnc_url(session_id, request)
        
        # Store session info
        active_sessions[session_id] = {
            'process': process,
            'startTime': datetime.now(),
            'lastActivity': datetime.now(),
            'status': 'starting',
            'sessionData': session_data.dict(),
            'vncPort': vnc_port,
            'vncUrl': vnc_url
        }
        
        # Wait a bit to check if process started successfully
        await asyncio.sleep(3)
        
        if process.poll() is None:  # Process is still running
            active_sessions[session_id]['status'] = 'active'
            logger.info(f"✅ VNC GUI browser session started successfully: {session_id}")
            logger.info(f"🖥️ VNC URL: {vnc_url}")
            return {
                'success': True,
                'vncUrl': vnc_url,
                'vncPort': vnc_port
            }
        else:
            # Process died, get error output
            stdout, stderr = process.communicate()
            logger.error(f"❌ VNC GUI browser session failed to start: {stderr.decode()}")
            if session_id in active_sessions:
                del active_sessions[session_id]
            return {
                'success': False,
                'error': stderr.decode()
            }
            
    except Exception as e:
        logger.error(f"❌ Error starting VNC browser session: {e}")
        return {
            'success': False,
            'error': str(e)
        }

async def stop_browser_session(session_id: str) -> bool:
    """Stop a browser session"""
    try:
        if session_id not in active_sessions:
            logger.warning(f"⚠️ Session not found: {session_id}")
            return False
        
        session_info = active_sessions[session_id]
        process = session_info['process']
        
        logger.info(f"🛑 Stopping VNC GUI browser session: {session_id}")
        
        # Terminate the process group
        try:
            os.killpg(os.getpgid(process.pid), signal.SIGTERM)
            
            # Wait for graceful shutdown
            await asyncio.sleep(2)
            
            # Force kill if still running
            if process.poll() is None:
                os.killpg(os.getpgid(process.pid), signal.SIGKILL)
                
        except ProcessLookupError:
            # Process already terminated
            pass
        
        # Update session status
        session_info['status'] = 'stopped'
        session_info['lastActivity'] = datetime.now()
        
        logger.info(f"✅ VNC GUI browser session stopped: {session_id}")
        return True
        
    except Exception as e:
        logger.error(f"❌ Error stopping session {session_id}: {e}")
        return False

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "FTD GUI Browser Session API with VNC", "version": "2.0.0", "status": "running"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.post("/sessions", response_model=SessionResponse)
async def create_session(session_data: SessionData, request: Request, background_tasks: BackgroundTasks):
    """Create a new VNC GUI browser session"""
    try:
        session_id = session_data.sessionId
        
        # Check if session already exists
        if session_id in active_sessions:
            logger.warning(f"⚠️ Session already exists: {session_id}")
            return SessionResponse(
                success=False,
                message="Session already exists",
                sessionId=session_id,
                sessionStatus="error"
            )
        
        # Start browser session
        result = await start_browser_session(session_data, request)
        
        if result['success']:
            return SessionResponse(
                success=True,
                message="VNC GUI browser session created successfully",
                sessionId=session_id,
                sessionStatus="active",
                vncUrl=result['vncUrl'],
                vncPort=result['vncPort']
            )
        else:
            return SessionResponse(
                success=False,
                message=f"Failed to create VNC GUI browser session: {result.get('error', 'Unknown error')}",
                sessionId=session_id,
                sessionStatus="error"
            )
            
    except Exception as e:
        logger.error(f"❌ Error creating session: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/sessions/{session_id}", response_model=SessionStatusResponse)
async def get_session_status(session_id: str):
    """Get session status"""
    try:
        if session_id not in active_sessions:
            raise HTTPException(status_code=404, detail="Session not found")
        
        session_info = active_sessions[session_id]
        
        # Check if process is still running
        process = session_info['process']
        if process.poll() is not None:
            session_info['status'] = 'stopped'
        
        return SessionStatusResponse(
            sessionId=session_id,
            status=session_info['status'],
            startTime=session_info['startTime'],
            lastActivity=session_info['lastActivity'],
            vncUrl=session_info.get('vncUrl'),
            vncPort=session_info.get('vncPort'),
            leadInfo=session_info['sessionData'].get('leadInfo', {})
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting session status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/sessions/{session_id}")
async def stop_session(session_id: str):
    """Stop a session"""
    try:
        success = await stop_browser_session(session_id)
        
        if success:
            return {"success": True, "message": f"Session {session_id} stopped successfully"}
        else:
            raise HTTPException(status_code=404, detail="Session not found")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error stopping session: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/sessions")
async def list_sessions():
    """List all active sessions"""
    try:
        sessions = []
        for session_id, session_info in active_sessions.items():
            # Check if process is still running
            process = session_info['process']
            if process.poll() is not None:
                session_info['status'] = 'stopped'
            
            sessions.append({
                'sessionId': session_id,
                'status': session_info['status'],
                'startTime': session_info['startTime'].isoformat(),
                'lastActivity': session_info['lastActivity'].isoformat(),
                'vncUrl': session_info.get('vncUrl'),
                'vncPort': session_info.get('vncPort'),
                'leadInfo': session_info['sessionData'].get('leadInfo', {})
            })
        
        return {
            "success": True,
            "sessions": sessions,
            "totalSessions": len(sessions)
        }
        
    except Exception as e:
        logger.error(f"❌ Error listing sessions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/vnc/{session_id}", response_class=HTMLResponse)
async def vnc_viewer(session_id: str, request: Request):
    """Serve VNC viewer for a specific session"""
    try:
        if session_id not in active_sessions:
            return HTMLResponse(
                content=f"<h1>Session Not Found</h1><p>Session {session_id} does not exist or has expired.</p>",
                status_code=404
            )
        
        session_info = active_sessions[session_id]
        lead_info = session_info['sessionData'].get('leadInfo', {})
        
        # Read the VNC web interface template
        try:
            with open('/app/vnc_web_interface.html', 'r') as f:
                html_content = f.read()
        except FileNotFoundError:
            # Fallback to basic HTML if template not found
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>VNC Session {session_id}</title>
                <style>
                    body {{ font-family: Arial, sans-serif; margin: 20px; }}
                    .container {{ max-width: 800px; margin: 0 auto; }}
                    .error {{ color: red; padding: 20px; border: 1px solid red; background: #ffe6e6; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>VNC Session {session_id}</h1>
                    <p>Lead: {lead_info.get('firstName', '')} {lead_info.get('lastName', '')}</p>
                    <p>Email: {lead_info.get('email', 'N/A')}</p>
                    <p>VNC Port: {session_info.get('vncPort', 'N/A')}</p>
                    <div class="error">
                        <h3>VNC Interface Not Available</h3>
                        <p>The VNC web interface template is not available. Please check the deployment.</p>
                    </div>
                </div>
            </body>
            </html>
            """
        
        return HTMLResponse(content=html_content)
        
    except Exception as e:
        logger.error(f"❌ Error serving VNC viewer: {e}")
        return HTMLResponse(
            content=f"<h1>Error</h1><p>An error occurred while loading the VNC viewer: {str(e)}</p>",
            status_code=500
        )

@app.post("/sessions/{session_id}/activity")
async def update_session_activity(session_id: str):
    """Update session activity timestamp"""
    try:
        if session_id not in active_sessions:
            raise HTTPException(status_code=404, detail="Session not found")
        
        active_sessions[session_id]['lastActivity'] = datetime.now()
        
        return {"success": True, "message": "Activity updated"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error updating activity: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Background cleanup task
async def cleanup_inactive_sessions():
    """Clean up sessions that have been inactive for too long"""
    while True:
        try:
            current_time = datetime.now()
            inactive_threshold = timedelta(hours=2)  # 2 hours of inactivity
            
            sessions_to_remove = []
            for session_id, session_info in active_sessions.items():
                # Check if process is still running
                process = session_info['process']
                if process.poll() is not None:
                    sessions_to_remove.append(session_id)
                    continue
                
                # Check for inactivity
                last_activity = session_info['lastActivity']
                if current_time - last_activity > inactive_threshold:
                    logger.info(f"🧹 Cleaning up inactive session: {session_id}")
                    await stop_browser_session(session_id)
                    sessions_to_remove.append(session_id)
            
            # Remove stopped sessions
            for session_id in sessions_to_remove:
                if session_id in active_sessions:
                    del active_sessions[session_id]
            
            if sessions_to_remove:
                logger.info(f"🧹 Cleaned up {len(sessions_to_remove)} inactive sessions")
            
        except Exception as e:
            logger.error(f"❌ Error during cleanup: {e}")
        
        # Wait 10 minutes before next cleanup
        await asyncio.sleep(600)

# Start cleanup task
@app.on_event("startup")
async def startup_event():
    """Start background tasks"""
    asyncio.create_task(cleanup_inactive_sessions())
    logger.info("🚀 VNC GUI Browser Session API started")

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up on shutdown"""
    logger.info("🛑 Shutting down VNC GUI Browser Session API")
    
    # Stop all active sessions
    for session_id in list(active_sessions.keys()):
        await stop_browser_session(session_id)
    
    logger.info("✅ All sessions stopped, API shutdown complete")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='VNC GUI Browser Session API')
    parser.add_argument('--host', default='0.0.0.0', help='Host to bind to')
    parser.add_argument('--port', type=int, default=3001, help='Port to bind to')
    parser.add_argument('--debug', action='store_true', help='Enable debug logging')
    
    args = parser.parse_args()
    
    if args.debug:
        logging.getLogger().setLevel(logging.DEBUG)
    
    logger.info(f"🚀 Starting VNC GUI Browser Session API on {args.host}:{args.port}")
    
    uvicorn.run(
        app,
        host=args.host,
        port=args.port,
        log_level="info" if not args.debug else "debug"
    ) 