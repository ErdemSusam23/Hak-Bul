import pytest

from main import limiter as main_limiter
from routers.auth import limiter as auth_limiter


@pytest.fixture(autouse=True)
def reset_rate_limits():
    main_limiter._storage.reset()
    auth_limiter._storage.reset()
    yield
