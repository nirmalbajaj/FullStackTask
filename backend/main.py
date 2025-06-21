from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uuid
from sqlalchemy import create_engine, Column, String, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
import os

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./feedback_system.db")


engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Database Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    role = Column(String, nullable=False)  # 'manager' or 'employee'
    team_id = Column(String, ForeignKey("teams.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships - Fixed with explicit foreign_keys and back_populates
    team = relationship("Team", foreign_keys=[team_id], back_populates="members")
    managed_teams = relationship("Team", foreign_keys="Team.manager_id", back_populates="manager")
    given_feedback = relationship("Feedback", foreign_keys="Feedback.manager_id", back_populates="manager")
    received_feedback = relationship("Feedback", foreign_keys="Feedback.employee_id", back_populates="employee")

class Team(Base):
    __tablename__ = "teams"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    manager_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships - Fixed with explicit foreign_keys and back_populates
    manager = relationship("User", foreign_keys=[manager_id], back_populates="managed_teams")
    members = relationship("User", foreign_keys="User.team_id", back_populates="team")

class Feedback(Base):
    __tablename__ = "feedback"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    manager_id = Column(String, ForeignKey("users.id"), nullable=False)
    employee_id = Column(String, ForeignKey("users.id"), nullable=False)
    strengths = Column(Text, nullable=False)
    areas_to_improve = Column(Text, nullable=False)
    sentiment = Column(String, nullable=False)  # 'positive', 'neutral', 'negative'
    acknowledged = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    manager = relationship("User", foreign_keys=[manager_id], back_populates="given_feedback")
    employee = relationship("User", foreign_keys=[employee_id], back_populates="received_feedback")

# Create tables
Base.metadata.create_all(bind=engine)

# FastAPI app
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic models for API
class UserCreate(BaseModel):
    username: str
    password: str
    role: str
    team_id: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    username: str
    role: str
    team_id: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str

class FeedbackCreate(BaseModel):
    employee_id: str
    strengths: str
    areas_to_improve: str
    sentiment: str

class FeedbackUpdate(BaseModel):
    strengths: str
    areas_to_improve: str
    sentiment: str

class FeedbackResponse(BaseModel):
    id: str
    manager_id: str
    employee_id: str
    strengths: str
    areas_to_improve: str
    sentiment: str
    created_at: datetime
    updated_at: datetime
    acknowledged: bool
    manager_name: Optional[str] = None
    employee_name: Optional[str] = None

# Initialize sample data
def init_sample_data(db: Session):
    # Check if data already exists
    if db.query(User).first():
        return
    
    # Create team
    team = Team(
        name="Development Team",
        manager_id=""  # Will be updated after creating manager
    )
    db.add(team)
    db.flush()  # Get the team ID
    
    # Create manager
    manager = User(
        username="manager1",
        password="password123",
        role="manager",
        team_id=team.id
    )
    db.add(manager)
    db.flush()
    
    # Update team with manager ID
    team.manager_id = manager.id
    
    # Create employees
    employee1 = User(
        username="employee1",
        password="password123",
        role="employee",
        team_id=team.id
    )
    employee2 = User(
        username="employee2",
        password="password123",
        role="employee",
        team_id=team.id
    )
    
    db.add_all([employee1, employee2])
    db.commit()

# Initialize data on startup
@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    try:
        init_sample_data(db)
    finally:
        db.close()

# API Endpoints
@app.post("/login")
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        User.username == request.username,
        User.password == request.password
    ).first()
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    return {
        "user_id": user.id,
        "username": user.username,
        "role": user.role,
        "team_id": user.team_id
    }

@app.get("/team-members/{manager_id}")
async def get_team_members_route(manager_id: str, db: Session = Depends(get_db)):
    # Get the manager's team
    manager = db.query(User).filter(User.id == manager_id).first()
    if not manager:
        raise HTTPException(status_code=404, detail="Manager not found")
    
    # Get team members
    members = db.query(User).filter(
        User.team_id == manager.team_id,
        User.role == "employee"
    ).all()
    
    return [{"id": member.id, "username": member.username, "role": member.role} for member in members]

@app.post("/feedback")
async def create_feedback(feedback: FeedbackCreate, manager_id: str, db: Session = Depends(get_db)):
    new_feedback = Feedback(
        manager_id=manager_id,
        employee_id=feedback.employee_id,
        strengths=feedback.strengths,
        areas_to_improve=feedback.areas_to_improve,
        sentiment=feedback.sentiment
    )
    
    db.add(new_feedback)
    db.commit()
    db.refresh(new_feedback)
    
    return {
        "id": new_feedback.id,
        "manager_id": new_feedback.manager_id,
        "employee_id": new_feedback.employee_id,
        "strengths": new_feedback.strengths,
        "areas_to_improve": new_feedback.areas_to_improve,
        "sentiment": new_feedback.sentiment,
        "created_at": new_feedback.created_at.isoformat(),
        "updated_at": new_feedback.updated_at.isoformat(),
        "acknowledged": new_feedback.acknowledged
    }

@app.get("/feedback/employee/{employee_id}")
async def get_employee_feedback(employee_id: str, db: Session = Depends(get_db)):
    feedback_list = db.query(Feedback).filter(
        Feedback.employee_id == employee_id
    ).order_by(Feedback.created_at.desc()).all()
    
    result = []
    for feedback in feedback_list:
        manager = db.query(User).filter(User.id == feedback.manager_id).first()
        result.append({
            "id": feedback.id,
            "manager_id": feedback.manager_id,
            "employee_id": feedback.employee_id,
            "strengths": feedback.strengths,
            "areas_to_improve": feedback.areas_to_improve,
            "sentiment": feedback.sentiment,
            "created_at": feedback.created_at.isoformat(),
            "updated_at": feedback.updated_at.isoformat(),
            "acknowledged": feedback.acknowledged,
            "manager_name": manager.username if manager else "Unknown"
        })
    
    return result

@app.get("/feedback/manager/{manager_id}")
async def get_manager_feedback(manager_id: str, db: Session = Depends(get_db)):
    feedback_list = db.query(Feedback).filter(
        Feedback.manager_id == manager_id
    ).order_by(Feedback.created_at.desc()).all()
    
    result = []
    for feedback in feedback_list:
        employee = db.query(User).filter(User.id == feedback.employee_id).first()
        result.append({
            "id": feedback.id,
            "manager_id": feedback.manager_id,
            "employee_id": feedback.employee_id,
            "strengths": feedback.strengths,
            "areas_to_improve": feedback.areas_to_improve,
            "sentiment": feedback.sentiment,
            "created_at": feedback.created_at.isoformat(),
            "updated_at": feedback.updated_at.isoformat(),
            "acknowledged": feedback.acknowledged,
            "employee_name": employee.username if employee else "Unknown"
        })
    
    return result

@app.put("/feedback/{feedback_id}")
async def update_feedback(feedback_id: str, feedback_update: FeedbackUpdate, db: Session = Depends(get_db)):
    feedback = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
    
    feedback.strengths = feedback_update.strengths
    feedback.areas_to_improve = feedback_update.areas_to_improve
    feedback.sentiment = feedback_update.sentiment
    feedback.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(feedback)
    
    return {
        "id": feedback.id,
        "manager_id": feedback.manager_id,
        "employee_id": feedback.employee_id,
        "strengths": feedback.strengths,
        "areas_to_improve": feedback.areas_to_improve,
        "sentiment": feedback.sentiment,
        "created_at": feedback.created_at.isoformat(),
        "updated_at": feedback.updated_at.isoformat(),
        "acknowledged": feedback.acknowledged
    }

@app.put("/feedback/{feedback_id}/acknowledge")
async def acknowledge_feedback(feedback_id: str, db: Session = Depends(get_db)):
    feedback = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
    
    feedback.acknowledged = True
    db.commit()
    
    return {"message": "Feedback acknowledged"}

@app.get("/dashboard/manager/{manager_id}")
async def get_manager_dashboard(manager_id: str, db: Session = Depends(get_db)):
    # Get team members
    manager = db.query(User).filter(User.id == manager_id).first()
    if not manager:
        raise HTTPException(status_code=404, detail="Manager not found")
    
    team_members = db.query(User).filter(
        User.team_id == manager.team_id,
        User.role == "employee"
    ).all()
    
    dashboard_data = []
    total_feedback_given = 0
    
    for member in team_members:
        member_feedback = db.query(Feedback).filter(
            Feedback.employee_id == member.id
        ).all()
        
        sentiment_counts = {"positive": 0, "neutral": 0, "negative": 0}
        for feedback in member_feedback:
            sentiment_counts[feedback.sentiment] += 1
        
        latest_feedback_date = None
        if member_feedback:
            latest_feedback = max(member_feedback, key=lambda f: f.created_at)
            latest_feedback_date = latest_feedback.created_at.isoformat()
        
        total_feedback_given += len(member_feedback)
        
        dashboard_data.append({
            "employee_id": member.id,
            "employee_name": member.username,
            "total_feedback": len(member_feedback),
            "sentiment_breakdown": sentiment_counts,
            "latest_feedback_date": latest_feedback_date
        })
    
    return {
        "team_overview": dashboard_data,
        "total_team_members": len(team_members),
        "total_feedback_given": total_feedback_given
    }

@app.get("/dashboard/employee/{employee_id}")
async def get_employee_dashboard(employee_id: str, db: Session = Depends(get_db)):
    employee_feedback = db.query(Feedback).filter(
        Feedback.employee_id == employee_id
    ).order_by(Feedback.created_at).all()
    
    timeline = []
    for feedback in employee_feedback:
        manager = db.query(User).filter(User.id == feedback.manager_id).first()
        timeline.append({
            "date": feedback.created_at.isoformat(),
            "manager_name": manager.username if manager else "Unknown",
            "sentiment": feedback.sentiment,
            "acknowledged": feedback.acknowledged
        })
    
    sentiment_counts = {"positive": 0, "neutral": 0, "negative": 0}
    for feedback in employee_feedback:
        sentiment_counts[feedback.sentiment] += 1
    
    unacknowledged_count = len([f for f in employee_feedback if not f.acknowledged])
    
    return {
        "timeline": timeline,
        "total_feedback": len(employee_feedback),
        "sentiment_breakdown": sentiment_counts,
        "unacknowledged_count": unacknowledged_count
    }

@app.get("/")
async def root():
    return {"message": "Feedback System API with SQL Database"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)