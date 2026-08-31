from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver

from backend.app.agent.graph import build_pharmacy_graph
from backend.app.api.agent import router as agent_router
from backend.app.api.auth import router as auth_router
from backend.app.api.medicines import router as medicine_router
from backend.app.api.orders import router as order_router
from backend.app.api.pharmacist import router as pharmacist_router
from backend.app.api.refills import router as refill_router
from backend.app.config import settings
from backend.app.db.mongodb import close_db, connect_db
from backend.app.jobs.refill_job import run_refill_predictions

scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):

    await connect_db()

    async with AsyncSqliteSaver.from_conn_string(
        "langgraph_checkpoints.sqlite"
    ) as checkpointer:
        app.state.pharmacy_graph = (build_pharmacy_graph()).compile(
            checkpointer=checkpointer
        )

        scheduler.add_job(
            run_refill_predictions,
            trigger=IntervalTrigger(hours=24),
            id="refill_prediction_job",
            replace_existing=True,
        )

        scheduler.start()

        print("Refill prediction scheduler started.")

        try:
            yield

        finally:
            # Stop scheduler
            if scheduler.running:
                scheduler.shutdown(wait=False)

    await close_db()


app = FastAPI(title="Agentic Pharmacy AI", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers

app.include_router(pharmacist_router)

app.include_router(medicine_router)

app.include_router(order_router)

app.include_router(auth_router)

app.include_router(agent_router)

app.include_router(refill_router)

# Health


@app.get("/")
async def root():

    return {"name": "Agentic Pharmacy AI", "status": "running"}


@app.get("/health")
async def health():

    return {"status": "healthy"}
