from fastapi import APIRouter

from backend.app.models.user import UserCreate
from backend.app.services.auth_service import (
    register_user,
    authenticate_user
)


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


@router.post("/register")
async def register(
    user: UserCreate
):
    return await register_user(
        name=user.name,
        email=user.email,
        password=user.password,
        role=user.role
    )


@router.post("/login")
async def login(
    email: str,
    password: str
):
    return await authenticate_user(
        email,
        password
    )