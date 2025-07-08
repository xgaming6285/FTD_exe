#!/usr/bin/env python3
"""
Session API
FastAPI service to manage GUI browser sessions on EC2 instance
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
from fastapi import FastAPI, HTTPException, BackgroundTasks
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

class SessionStatus(BaseModel):
    sessionId: str
    status: str
    startTime: datetime
    lastActivity: datetime
    leadInfo: Dict

# Global session management
active_sessions: Dict[str, Dict] = {}
app = FastAPI(title="FTD GUI Browser Session API", version="1.0.0")



async def start_browser_session(session_data: SessionData) -> bool:
    """Start GUI browser session in background"""
    try:
        session_id = session_data.sessionId
        logger.info(f"🚀 Starting GUI browser session: {session_id}")
        
        # Prepare session data for Python script
        session_json = session_data.json()
        
        # Start the GUI browser session script
        process = subprocess.Popen([
            'python3', '/app/gui_browser_session.py', session_json
        ], 
        stdout=subprocess.PIPE, 
        stderr=subprocess.PIPE,
        preexec_fn=os.setsid  # Create new process group
        )
        
        # Store session info
        active_sessions[session_id] = {
            'process': process,
            'startTime': datetime.now(),
            'lastActivity': datetime.now(),
            'status': 'starting',
            'sessionData': session_data.dict()
        }
        
        # Wait a bit to check if process started successfully
        await asyncio.sleep(2)
        
        if process.poll() is None:  # Process is still running
            active_sessions[session_id]['status'] = 'active'
            logger.info(f"✅ GUI browser session started successfully: {session_id}")
            return True
        else:
            # Process died, get error output
            stdout, stderr = process.communicate()
            logger.error(f"❌ GUI browser session failed to start: {stderr.decode()}")
            if session_id in active_sessions:
                del active_sessions[session_id]
            return False
            
    except Exception as e:
        logger.error(f"❌ Error starting browser session: {e}")
        return False

async def stop_browser_session(session_id: str) -> bool:
    """Stop GUI browser session"""
    try:
        if session_id not in active_sessions:
            logger.warning(f"⚠️ Session not found: {session_id}")
            return False
        
        session_info = active_sessions[session_id]
        process = session_info['process']
        
        logger.info(f"🛑 Stopping GUI browser session: {session_id}")
        
        # Try graceful shutdown first
        try:
            os.killpg(os.getpgid(process.pid), signal.SIGTERM)
            await asyncio.sleep(5)
        except:
            pass
        
        # Force kill if still running
        if process.poll() is None:
            try:
                os.killpg(os.getpgid(process.pid), signal.SIGKILL)
            except:
                pass
        
        # Clean up session
        active_sessions[session_id]['status'] = 'stopped'
        del active_sessions[session_id]
        
        logger.info(f"✅ GUI browser session stopped: {session_id}")
        return True
        
    except Exception as e:
        logger.error(f"❌ Error stopping browser session: {e}")
        return False

# API Routes
@app.get("/")
async def root():
    """API health check"""
    return {
        "message": "FTD GUI Browser Session API", 
        "status": "running",
        "active_sessions": len(active_sessions)
    }

@app.post("/sessions", response_model=SessionResponse)
async def create_session(session_data: SessionData, background_tasks: BackgroundTasks):
    """Create a new GUI browser session"""
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
        success = await start_browser_session(session_data)
        
        if success:
            return SessionResponse(
                success=True,
                message="GUI browser session created successfully",
                sessionId=session_id,
                sessionStatus="active"
            )
        else:
            return SessionResponse(
                success=False,
                message="Failed to create GUI browser session",
                sessionId=session_id,
                sessionStatus="error"
            )
            
    except Exception as e:
        logger.error(f"❌ Error creating session: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/sessions/{session_id}", response_model=SessionStatus)
async def get_session_status(session_id: str):
    """Get status of a specific session"""
    try:
        if session_id not in active_sessions:
            raise HTTPException(status_code=404, detail="Session not found")
        
        session_info = active_sessions[session_id]
        
        # Check if process is still running
        process = session_info['process']
        if process.poll() is not None:
            session_info['status'] = 'stopped'
        
        return SessionStatus(
            sessionId=session_id,
            status=session_info['status'],
            startTime=session_info['startTime'],
            lastActivity=session_info['lastActivity'],
            leadInfo=session_info['sessionData'].get('leadInfo', {})
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting session status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    """Stop and delete a session"""
    try:
        success = await stop_browser_session(session_id)
        
        if success:
            return {"message": f"Session {session_id} stopped successfully"}
        else:
            raise HTTPException(status_code=404, detail="Session not found")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error deleting session: {e}")
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
                'startTime': session_info['startTime'],
                'lastActivity': session_info['lastActivity'],
                'leadInfo': session_info['sessionData'].get('leadInfo', {})
            })
        
        return {"sessions": sessions, "total": len(sessions)}
        
    except Exception as e:
        logger.error(f"❌ Error listing sessions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/sessions/{session_id}/activity")
async def update_session_activity(session_id: str):
    """Update last activity time for a session"""
    try:
        if session_id not in active_sessions:
            raise HTTPException(status_code=404, detail="Session not found")
        
        active_sessions[session_id]['lastActivity'] = datetime.now()
        return {"message": "Activity updated"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error updating session activity: {e}")
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

@app.on_event("startup")
async def startup_event():
    """Start background tasks"""
    logger.info("🚀 Starting FTD GUI Browser Session API")
    
    # Start cleanup task
    asyncio.create_task(cleanup_inactive_sessions())

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up on shutdown"""
    logger.info("🛑 Shutting down FTD GUI Browser Session API")
    
    # Stop all active sessions
    for session_id in list(active_sessions.keys()):
        await stop_browser_session(session_id)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 3001))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info") 