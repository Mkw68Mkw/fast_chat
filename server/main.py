from fastapi import FastAPI, Depends, HTTPException, Form
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# User model
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password = Column(String)

# Create tables
Base.metadata.create_all(bind=engine)

# Add test users
def create_test_users():
    db = SessionLocal()
    try:
        if not db.query(User).filter(User.username == "anna12").first():
            user_anna = User(username="anna12", password="dummy_password1")
            db.add(user_anna)
        
        if not db.query(User).filter(User.username == "max34").first():
            user_max = User(username="max34", password="dummy_password2")
            db.add(user_max)
            
        db.commit()
    finally:
        db.close()

# Create FastAPI app
app = FastAPI()

# Create test users on startup
@app.on_event("startup")
def startup_event():
    create_test_users()

# Root endpoint
@app.get("/")
def read_root():
    return {"message": "Chat API is running"}

# Füge diese Funktion unter der SessionLocal-Definition hinzu
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Get all users endpoint
@app.get("/users")
def get_users(db: Session = Depends(get_db)):  # Hier get_db statt SessionLocal verwenden
    return db.query(User).all()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define a Pydantic model for the login request
class LoginRequest(BaseModel):
    username: str
    password: str

# Update the login endpoint to use the Pydantic model
@app.post("/login")
def login(
    request: LoginRequest,  # Use the Pydantic model to parse JSON body
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.username == request.username).first()
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    if user.password != request.password:
        raise HTTPException(status_code=401, detail="Incorrect password")
    
    return {"message": "Login successful", "user": request.username}
