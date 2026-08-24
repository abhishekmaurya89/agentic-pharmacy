import jwt

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from bson import ObjectId

from backend.app.config import settings
from backend.app.db.mongodb import db


security = HTTPBearer()

ALGORITHM = "HS256"


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):

    token = credentials.credentials

    try:

        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[ALGORITHM]
        )

        user_id = payload.get("sub")

        if not user_id:
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token"
            )

    except jwt.ExpiredSignatureError:

        raise HTTPException(
            status_code=401,
            detail="Token expired"
        )

    except jwt.InvalidTokenError:

        raise HTTPException(
            status_code=401,
            detail="Invalid authentication token"
        )

    if not ObjectId.is_valid(user_id):

        raise HTTPException(
            status_code=401,
            detail="Invalid user ID"
        )

    user = await db.users.find_one({
        "_id": ObjectId(user_id)
    })

    if not user:

        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    user["id"] = str(user.pop("_id"))

    return user