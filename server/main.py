from fastapi import FastAPI, Depends, HTTPException, Form, WebSocket, WebSocketDisconnect, Query, Header
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
            user_anna = User(username="anna12", password=pwd_context.hash("dummy_password1"))
            db.add(user_anna)
        
        if not db.query(User).filter(User.username == "max34").first():
            user_max = User(username="max34", password=pwd_context.hash("dummy_password2"))
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

async def get_current_user(authorization: str = Header(...), db: Session = Depends(get_db)):
    try:
        scheme, token = authorization.split()
        if scheme.lower() != 'bearer':
            raise HTTPException(status_code=401, detail="Invalid authentication scheme")
        
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except (jwt.PyJWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")
        
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user

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
        "exp": datetime.utcnow() + timedelta(minutes=1)  # Token valid for 1 hour
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
    
    if not pwd_context.verify(request.password, user.password):
        raise HTTPException(status_code=401, detail="Incorrect password")
    
    # Generate JWT token
    token = create_jwt_token(user.username)
    print(token)
    return {"message": "Login successful", "user": request.username, "token": token}

# Füge unter der LoginRequest-Klasse hinzu
class SignupRequest(BaseModel):
    username: str
    password: str

class UpdateUsernameRequest(BaseModel):
    new_username: str

class UpdatePasswordRequest(BaseModel):
    old_password: str
    new_password: str

# Passwort-Hashing Setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Füge vor dem Login-Endpoint hinzu
@app.post("/signup")
def signup(
    request: SignupRequest,
    db: Session = Depends(get_db)
):
    # Check if user exists
    existing_user = db.query(User).filter(User.username == request.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Create new user
    new_user = User(
        username=request.username,
        password=pwd_context.hash(request.password)
    )
    
    db.add(new_user)
    db.commit()
    
    return {"message": "User created successfully"}

@app.put("/user/username")
def update_username(
    request: UpdateUsernameRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if db.query(User).filter(User.username == request.new_username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    
    current_user.username = request.new_username
    db.commit()
    
    new_token = create_jwt_token(current_user.username)
    
    return {"message": "Username updated successfully", "new_username": current_user.username, "token": new_token}

@app.put("/user/password")
def update_password(
    request: UpdatePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not pwd_context.verify(request.old_password, current_user.password):
        raise HTTPException(status_code=401, detail="Incorrect old password")
        
    current_user.password = pwd_context.hash(request.new_password)
    db.commit()
    
    return {"message": "Password updated successfully"}

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[tuple[int, str], WebSocket] = {}  # (chatroom_id, username) -> WebSocket

    async def connect(self, websocket: WebSocket, chatroom_id: int, username: str):
        # Close existing connection for this user in chatroom
        key = (chatroom_id, username)
        if key in self.active_connections:
            await self.active_connections[key].close()
            
        await websocket.accept()
        self.active_connections[key] = websocket

    def disconnect(self, websocket: WebSocket, chatroom_id: int, username: str):
        key = (chatroom_id, username)
        if key in self.active_connections and self.active_connections[key] == websocket:
            del self.active_connections[key]

    async def broadcast(self, message: str, chatroom_id: int):
        for (room_id, username), connection in self.active_connections.items():
            if room_id == chatroom_id:
                try:
                    await connection.send_json(message)
                except:
                    self.disconnect(connection, chatroom_id, username)

manager = ConnectionManager()

@app.websocket("/ws/chatrooms/{chatroom_id}")
async def websocket_endpoint(
    websocket: WebSocket, 
    chatroom_id: int,
    token: str = Query(...)  # Get token from query params
):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if not username:
            await websocket.close(code=4001)
            return
    except:
        await websocket.close(code=4001)
        return

    await manager.connect(websocket, chatroom_id, username)
    try:
        while True:
            data = await websocket.receive_json()
            
            # Neue Nachricht in Datenbank speichern
            db = SessionLocal()
            try:
                user = db.query(User).filter(User.username == data["username"]).first()
                if user:
                    new_message = Message(
                        content=data["message"],
                        sender_id=user.id,
                        chatroom_id=chatroom_id
                    )
                    db.add(new_message)
                    db.commit()
            finally:
                db.close()

            await manager.broadcast({
                "username": data["username"],
                "message": data["message"],
                "timestamp": datetime.now().isoformat()
            }, chatroom_id)
    except WebSocketDisconnect:
        manager.disconnect(websocket, chatroom_id, username)

@app.get("/chatrooms")
def get_all_chatrooms(db: Session = Depends(get_db)):
    chatrooms = db.query(Chatroom).all()
    return [{"id": room.id, "name": room.name} for room in chatrooms]

@app.get("/chatrooms/{chatroom_id}")
def get_chatroom_name(chatroom_id: int, db: Session = Depends(get_db)):
    chatroom = db.query(Chatroom).filter(Chatroom.id == chatroom_id).first()
    if not chatroom:
        raise HTTPException(status_code=404, detail="Chatroom not found")
    return {"name": chatroom.name}

# Neue Endpoint für Nachrichtenverlauf hinzufügen
@app.get("/chatrooms/{chatroom_id}/messages")
def get_chat_history(chatroom_id: int, db: Session = Depends(get_db)):
    chatroom = db.query(Chatroom).filter(Chatroom.id == chatroom_id).first()
    if not chatroom:
        raise HTTPException(status_code=404, detail="Chatroom not found")
    
    messages = db.query(Message, User.username).join(
        User, Message.sender_id == User.id
    ).filter(
        Message.chatroom_id == chatroom_id
    ).order_by(Message.timestamp.asc()).all()
    
    return [{
        "content": message.content,
        "timestamp": message.timestamp.isoformat(),
        "username": username
    } for message, username in messages]