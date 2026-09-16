import re

from bson import ObjectId
from fastapi import HTTPException

from backend.app.db.mongodb import db


async def create_medicine(data: dict):
    existing = await db.medicines.find_one(
        {
            "name": data["name"],
            "strength": data.get("strength"),
            "form": data.get("form"),
        }
    )

    if existing:
        raise HTTPException(status_code=409, detail="Medicine already exists")

    result = await db.medicines.insert_one(data)

    return {
        "id": str(result.inserted_id),
        **{key: value for key, value in data.items() if key != "_id"},
    }


async def get_medicine(medicine_id: str):
    if not ObjectId.is_valid(medicine_id):
        raise HTTPException(status_code=400, detail="Invalid medicine ID")

    medicine = await db.medicines.find_one({"_id": ObjectId(medicine_id)})

    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")

    medicine["id"] = str(medicine.pop("_id"))

    return medicine


async def search_medicines(name: str):
    normalized_name = " ".join(name.split()).strip()
    cursor = db.medicines.find(
        {"name": {"$regex": re.escape(normalized_name), "$options": "i"}}
    )

    medicines = []

    async for medicine in cursor:
        medicine["id"] = str(medicine.pop("_id"))
        medicines.append(medicine)

    if not medicines:
        base_name = re.sub(
            r"\s+\d+(?:\.\d+)?\s*(?:mg|g|mcg|ml|iu|%)$",
            "",
            normalized_name,
            flags=re.IGNORECASE,
        ).strip()
        if base_name != normalized_name:
            cursor = db.medicines.find(
                {"name": {"$regex": f"^{re.escape(base_name)}$", "$options": "i"}}
            )
            async for medicine in cursor:
                medicine["id"] = str(medicine.pop("_id"))
                medicines.append(medicine)

    return medicines


async def search_medicines_by_keyword(keyword: str):
    ignored_words = {
        "a",
        "an",
        "the",
        "my",
        "medicine",
        "medication",
        "drug",
        "for",
        "i",
        "need",
        "want",
        "to",
        "order",
        "refill",
    }
    keywords = [
        word
        for word in re.findall(r"[a-z0-9]+", keyword.lower())
        if word not in ignored_words
    ]
    if not keywords:
        return []

    cursor = db.medicines.find(
        {
            "$and": [
                {
                    "$or": [
                        {field: {"$regex": re.escape(keyword), "$options": "i"}}
                        for field in ("name", "uses", "description")
                    ]
                }
                for keyword in keywords
            ]
        }
    )

    medicines = []
    async for medicine in cursor:
        medicine["id"] = str(medicine.pop("_id"))
        medicines.append(medicine)

    return medicines


async def check_inventory(
    medicine_id: str,
    quantity: int,
):
    if quantity is None:
        return {
            "allowed": False,
            "reason": "QUANTITY_REQUIRED",
        }

    if quantity <= 0:
        return {
            "allowed": False,
            "reason": "INVALID_QUANTITY",
        }

    medicine = await get_medicine(medicine_id)

    available = medicine.get("stock", 0)

    if available < quantity:
        return {
            "allowed": False,
            "reason": "INSUFFICIENT_STOCK",
            "available": available,
            "requested": quantity,
        }

    return {
        "allowed": True,
        "reason": "STOCK_AVAILABLE",
        "available": available,
        "requested": quantity,
    }
