"""Forum endpoint testleri."""
import uuid
from collections.abc import Generator

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from db.base import Base
from db.session import get_db
from main import app
import models  # noqa: F401

TEST_DB_URL = "sqlite:///./test_forum.db"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db() -> Generator[Session, None, None]:
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


client = TestClient(app)


def setup_module() -> None:
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def teardown_module() -> None:
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.pop(get_db, None)


def test_lawyer_role_exists() -> None:
    from models.enums import UserRole
    assert UserRole.LAWYER.value == "lawyer"


def test_forum_vote_type_exists() -> None:
    from models.enums import ForumVoteType
    assert ForumVoteType.THREAD.value == "thread"
    assert ForumVoteType.REPLY.value == "reply"
