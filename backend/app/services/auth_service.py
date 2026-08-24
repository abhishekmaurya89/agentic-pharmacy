from datetime import datetime, timedelta, timezone

import jwt
from fastapi import HTTPException
from pwdlib import PasswordHash

from backend.app.config import settings
from backend.app.db.mongodb import db


password_hash = PasswordHash.recommended()

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(
    password: str,
    hashed_password: str
) -> bool:
    return password_hash.verify(
        password,
        hashed_password
    )


def create_access_token(
    user_id: str,
    role: str
) -> str:

    expire = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": user_id,
        "role": role,
        "exp": expire
    }

    return jwt.encode(
        payload,
        settings.jwt_secret,
        algorithm=ALGORITHM
    )


async def register_user(
    name: str,
    email: str,
    password: str,
    role: str = "patient"
):

    existing = await db.users.find_one({
        "email": email
    })

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Email already registered"
        )

    hashed_password = hash_password(password)

    user = {
        "name": name,
        "email": email,
        "password_hash": hashed_password,
        "role": role,
        "created_at": datetime.now(timezone.utc)
    }

    result = await db.users.insert_one(user)

    return {
        "id": str(result.inserted_id),
        "name": name,
        "email": email,
        "role": role
    }


async def authenticate_user(
    email: str,
    password: str
):

    user = await db.users.find_one({
        "email": email
    })

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if not verify_password(
        password,
        user["password_hash"]
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    token = create_access_token(
        str(user["_id"]),
        user["role"]
    )

    return {
        "access_token": token,
        "token_type": "bearer"
    }