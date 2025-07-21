from fastapi import FastAPI, Depends, HTTPException, Form, WebSocket, WebSocketDisconnect
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timedelta
import jwt
from passlib.context import CryptContext

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

    messages = relationship("Message", back_populates="sender")

class Chatroom(Base):
    __tablename__ = "chatrooms"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)

    messages = relationship("Message", back_populates="chatroom")

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(String)
    timestamp = Column(DateTime, default=datetime.now)

    sender_id = Column(Integer, ForeignKey("users.id"))
    chatroom_id = Column(Integer, ForeignKey("chatrooms.id"))

    sender = relationship("User", back_populates="messages")
    chatroom = relationship("Chatroom", back_populates="messages")

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

def create_test_chatrooms():
    db = SessionLocal()
    try:
        if not db.query(Chatroom).filter(Chatroom.name == "General").first():
            chatroom_general = Chatroom(name="General")
            db.add(chatroom_general)
        if not db.query(Chatroom).filter(Chatroom.name == "Gaming").first():
            chatroom_private = Chatroom(name="Gaming")
            db.add(chatroom_private)
        db.commit()
    finally:
        db.close()

# Create FastAPI app
app = FastAPI()

# Create test users on startup
@app.on_event("startup")
def startup_event():
    create_test_users()
    create_test_chatrooms()

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

# Secret key for JWT
SECRET_KEY = "your_secret_key"
ALGORITHM = "HS256"

# Function to create a JWT token
def create_jwt_token(username: str):
    payload = {
        "sub": username,
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(hours=1)  # Token valid for 1 hour
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

# Update the login endpoint to return a JWT token
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
    
    # Generate JWT token
    token = create_jwt_token(user.username)
    print(token)
    return {"message": "Login successful", "user": request.username, "token": token}

# Füge unter der LoginRequest-Klasse hinzu
class SignupRequest(BaseModel):
    username: str
    password: str

# Passwort-Hashing Setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Füge vor dem Login-Endpoint hinzu
@app.post("/signup")
def signup(
    request: SignupRequest,
    db: Session = Depends(get_db)
):
    # Prüfe ob Benutzer existiert
    existing_user = db.query(User).filter(User.username == request.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Erstelle neuen User (ohne Hashing für jetzt)
    new_user = User(
        username=request.username,
        password=request.password  # In Produktion: pwd_context.hash(request.password)
    )
    
    db.add(new_user)
    db.commit()
    
    return {"message": "User created successfully"}

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, chatroom_id: int):
        await websocket.accept()
        if chatroom_id not in self.active_connections:
            self.active_connections[chatroom_id] = []
        self.active_connections[chatroom_id].append(websocket)

    def disconnect(self, websocket: WebSocket, chatroom_id: int):
        self.active_connections[chatroom_id].remove(websocket)

    async def broadcast(self, message: str, chatroom_id: int):
        for connection in self.active_connections.get(chatroom_id, []):
            await connection.send_json(message)

manager = ConnectionManager()

@app.websocket("/ws/chatrooms/{chatroom_id}")
async def websocket_endpoint(
    websocket: WebSocket, 
    chatroom_id: int
):
    await manager.connect(websocket, chatroom_id)
    try:
        while True:
            data = await websocket.receive_json()
            await manager.broadcast({
                "username": data["username"],
                "message": data["message"]
            }, chatroom_id)
    except WebSocketDisconnect:
        manager.disconnect(websocket, chatroom_id)

@app.get("/chatrooms/{chatroom_id}")
def get_chatroom_name(chatroom_id: int, db: Session = Depends(get_db)):
    chatroom = db.query(Chatroom).filter(Chatroom.id == chatroom_id).first()
    if not chatroom:
        raise HTTPException(status_code=404, detail="Chatroom not found")
    return {"name": chatroom.name}