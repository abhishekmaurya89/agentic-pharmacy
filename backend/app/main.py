from contextlib import asynccontextmanager

from fastapi import FastAPI

from backend.app.db.mongodb import connect_db, close_db
from backend.app.api.medicines import router as medicine_router
from backend.app.api.orders import router as order_router
from backend.app.api.auth import router as auth_router
from backend.app.api.agent import router as agent_router
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver

from backend.app.agent.graph import build_pharmacy_graph

@asynccontextmanager
async def lifespan(app: FastAPI):

    await connect_db()

    async with AsyncSqliteSaver.from_conn_string(
        "langgraph_checkpoints.sqlite"
    ) as checkpointer:

        app.state.pharmacy_graph = (
            await build_pharmacy_graph()
        ).compile(
            checkpointer=checkpointer
        )

        yield

    await close_db()


app = FastAPI(
    title="Agentic Pharmacy AI",
    version="2.0.0",
    lifespan=lifespan
)

app.include_router(medicine_router)
app.include_router(order_router)
app.include_router(auth_router)
app.include_router(agent_router)

@app.get("/")
async def root():
    return {
        "name": "Agentic Pharmacy AI",
        "status": "running"
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy"
    }