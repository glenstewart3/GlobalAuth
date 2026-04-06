from dotenv import load_dotenv
load_dotenv()

import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Register all models with Base before init_db
import models  # noqa: F401
from database import init_db, AsyncSessionLocal
from routers.auth_router import router as auth_router
from routers.admin_router import router as admin_router
from routers.onboarding_router import router as onboarding_router
from routers.audit_router import router as audit_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

DEFAULT_APPS = [
    {"name": "WellTrack", "slug": "welltrack", "description": "Student wellbeing tracking platform"},
    {"name": "BeeShopKiosk", "slug": "beeshopkiosk", "description": "School shop kiosk system"},
]


async def seed_apps():
    from models import App
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        for app_data in DEFAULT_APPS:
            existing = (await db.execute(select(App).where(App.slug == app_data["slug"]))).scalar_one_or_none()
            if not existing:
                db.add(App(**app_data))
        await db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await seed_apps()
    logger.info("MPS Auth started — database ready")
    yield


app = FastAPI(title="MPS Auth", version="1.0.0", lifespan=lifespan)

_cors_origins = os.environ.get("CORS_ORIGINS", "*").split(",")
# When wildcard is set, reflect the request origin so credentialed requests work
if _cors_origins == ["*"]:
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r".*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

API_PREFIX = os.environ.get("API_PREFIX", "/auth/api")
logger.info(f"API prefix: {API_PREFIX}")

app.include_router(auth_router, prefix=API_PREFIX)
app.include_router(admin_router, prefix=API_PREFIX)
app.include_router(onboarding_router, prefix=API_PREFIX)
app.include_router(audit_router, prefix=API_PREFIX)


@app.get("/")
async def root():
    return {"service": "MPS Auth", "version": "1.0.0", "api_prefix": API_PREFIX}
