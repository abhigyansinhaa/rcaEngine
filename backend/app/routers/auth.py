from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import create_access_token, hash_password, verify_password
from app.db import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas import Token, UserCreate, UserLogin, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut)
def register(body: UserCreate, db: Annotated[Session, Depends(get_db)]) -> User:
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    user = User(email=body.email, password_hash=hash_password(body.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/me", response_model=UserOut)
def me(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    return current_user


@router.post("/login", response_model=Token)
def login(body: UserLogin, db: Annotated[Session, Depends(get_db)]) -> Token:
    user = db.query(User).filter(User.email == body.email).first()
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    token = create_access_token(user.email)
    return Token(access_token=token)
