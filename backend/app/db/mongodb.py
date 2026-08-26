from pymongo import ASCENDING, AsyncMongoClient

from backend.app.config import settings

client = AsyncMongoClient(settings.mongodb_uri)

db = client[settings.database_name]


async def connect_db():
    await client.admin.command("ping")

    await db.users.create_index([("email", ASCENDING)], unique=True)

    await db.medicines.create_index(
        [("name", ASCENDING), ("strength", ASCENDING), ("form", ASCENDING)], unique=True
    )

    await db.prescriptions.create_index(
        [("patient_id", ASCENDING), ("medicine_id", ASCENDING)]
    )

    await db.orders.create_index([("patient_id", ASCENDING)])

    await db.purchase_history.create_index(
        [("patient_id", ASCENDING), ("medicine_id", ASCENDING)]
    )

    await db.refill_alerts.create_index(
        [
            ("patient_id", ASCENDING),
            ("medicine_id", ASCENDING),
            ("predicted_date", ASCENDING),
        ],
        unique=True,
    )

    print("MongoDB connected")


async def close_db():
    await client.close()
    print("MongoDB disconnected")
