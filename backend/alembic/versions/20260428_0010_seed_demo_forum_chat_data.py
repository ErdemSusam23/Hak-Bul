"""seed demo forum/chat/share data for local and dev environments

Revision ID: 20260428_0010
Revises: 20260330_0009
Create Date: 2026-04-28
"""

from __future__ import annotations

import os
import uuid
from datetime import datetime, timedelta
from typing import Any, Sequence, Union

from alembic import op
import sqlalchemy as sa

from auth.security import hash_password

revision: str = "20260428_0010"
down_revision: Union[str, Sequence[str], None] = "20260330_0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_NS = uuid.UUID("12345678-1234-5678-1234-567812345678")
_NOW = datetime(2026, 4, 28, 12, 0, 0)


def _uid(key: str) -> str:
    return str(uuid.uuid5(_NS, key))


def _ts(minutes: int) -> datetime:
    return _NOW + timedelta(minutes=minutes)


def _is_enabled_env() -> bool:
    return os.getenv("APP_ENV", "").strip().lower() in {"local", "dev", "development"}


def _exists(bind: sa.Connection, table: str, row_id: str) -> bool:
    query = sa.text(f"SELECT 1 FROM {table} WHERE id = :id LIMIT 1")
    return bind.execute(query, {"id": row_id}).first() is not None


def _insert_if_missing(bind: sa.Connection, table: str, values: dict[str, Any]) -> None:
    if _exists(bind, table, str(values["id"])):
        return

    cols = ", ".join(values.keys())
    params = ", ".join(f":{key}" for key in values.keys())
    bind.execute(sa.text(f"INSERT INTO {table} ({cols}) VALUES ({params})"), values)


def _update_forum_thread_category(bind: sa.Connection, row_id: str, category: str) -> None:
    bind.execute(
        sa.text("UPDATE forum_threads SET category = :category WHERE id = :id"),
        {"id": row_id, "category": category},
    )


def _build_users() -> list[dict[str, Any]]:
    users: list[dict[str, Any]] = []
    roles = ["user", "lawyer", "user", "user", "lawyer", "user", "user", "user", "lawyer", "user", "user", "user"]
    for i in range(12):
        email = f"demo.user{i + 1:02d}@hakbul.local"
        users.append(
            {
                "id": _uid(f"user:{email}"),
                "email": email,
                "password_hash": hash_password("DemoPass123!"),
                "is_active": True,
                "role": roles[i],
                "created_at": _ts(i),
                "updated_at": _ts(i),
            }
        )
    return users


def _build_threads(users: list[dict[str, Any]]) -> list[dict[str, Any]]:
    topics = [
        ("Kira artisi siniri", "Ev sahibim yillik artis oraninin ustune cikmak istiyor. Ne yapmaliyim?", "Taşınmaz Mülk"),
        ("Isten cikarilma bildirimi", "Bildirim suresi verilmeden isten cikarildim. Haklarim nelerdir?", "İş Hukuku"),
        ("Tuketici iadesi", "Online alisveriste ayipli urun iadesi kabul edilmiyor.", "Tüketici Hukuku"),
        ("Bosanma sureci", "Anlasmali bosanma icin temel belgeler nelerdir?", "Medeni Hukuk"),
        ("Trafik cezasi itirazi", "Haksiz trafik cezasi icin nereye itiraz etmeliyim?", "İdare Hukuku"),
        ("Kredi karti borcu", "Yasal takip oncesi yapilandirma secenekleri neler?", "Ticaret Hukuku"),
        ("Miras paylasimi", "Kardesler arasinda miras paylasimi nasil yapilir?", "Genel"),
        ("Icra takibi mesaji", "SMS ile gelen icra bildirimi gercek mi nasil anlarim?", "Genel"),
        ("Is kazasi raporu", "Is kazasinda tutanak ve rapor suresi kac gun?", "İş Hukuku"),
        ("Tahliye taahhutnamesi", "Tahliye taahhutnamesi gecerlilik kosullari nelerdir?", "Taşınmaz Mülk"),
    ]
    rows: list[dict[str, Any]] = []
    for i, (title, content, category) in enumerate(topics):
        owner = users[i % len(users)]
        rows.append(
            {
                "id": _uid(f"thread:{i}"),
                "user_id": owner["id"],
                "title": f"[DEMO] {title}",
                "content": content,
                "category": category,
                "is_locked": False,
                "created_at": _ts(20 + i),
                "updated_at": _ts(20 + i),
                "deleted_at": None,
            }
        )
    return rows


def _build_replies(users: list[dict[str, Any]], threads: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    reply_templates = [
        "Benzer bir durum yasadim, noter ihtari faydali oldu.",
        "Basvuru yaparken belgeleri eksiksiz sunmak cok kritik.",
        "E-devlet uzerinden sureci takip etmek daha hizli ilerliyor.",
        "Baro adli yardim birimiyle gorusmek yararli olabilir.",
    ]
    idx = 0
    for thread in threads:
        for j in range(3):
            author = users[(idx + j + 1) % len(users)]
            rows.append(
                {
                    "id": _uid(f"reply:{thread['id']}:{j}"),
                    "thread_id": thread["id"],
                    "user_id": author["id"],
                    "content": f"[DEMO] {reply_templates[(idx + j) % len(reply_templates)]}",
                    "is_verified": author["role"] == "lawyer" and j == 0,
                    "created_at": _ts(60 + idx),
                    "updated_at": _ts(60 + idx),
                    "deleted_at": None,
                }
            )
            idx += 1
    return rows


def _build_votes(users: list[dict[str, Any]], threads: list[dict[str, Any]], replies: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for i, thread in enumerate(threads):
        voter = users[(i + 2) % len(users)]
        rows.append(
            {
                "id": _uid(f"vote:thread:{thread['id']}:{voter['id']}"),
                "user_id": voter["id"],
                "target_type": "thread",
                "target_id": thread["id"],
                "value": 1 if i % 3 else -1,
                "created_at": _ts(200 + i),
            }
        )

    for i, reply in enumerate(replies[:30]):
        voter = users[(i + 3) % len(users)]
        rows.append(
            {
                "id": _uid(f"vote:reply:{reply['id']}:{voter['id']}"),
                "user_id": voter["id"],
                "target_type": "reply",
                "target_id": reply["id"],
                "value": 1 if i % 4 else -1,
                "created_at": _ts(260 + i),
            }
        )
    return rows


def _build_chat_rows(users: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    categories = ["Is Hukuku", "Kira Hukuku", "Tuketici Hukuku", "Aile Hukuku", "Genel"]
    for i in range(10):
        user = users[i % len(users)]
        conv_id = _uid(f"conversation:{i}")
        title = f"[DEMO] Konusma {i + 1}"
        user_msg_id = _uid(f"chat:{conv_id}:user")
        assistant_msg_id = _uid(f"chat:{conv_id}:assistant")

        rows.append(
            {
                "id": user_msg_id,
                "user_id": user["id"],
                "conversation_id": conv_id,
                "role": "user",
                "content": f"[DEMO] Soru {i + 1}: Bu konuda nasil ilerlemeliyim?",
                "metadata_json": None,
                "created_at": _ts(400 + i * 2),
                "guest_session_id": None,
                "category": categories[i % len(categories)],
                "title": title,
                "deleted_at": None,
            }
        )
        rows.append(
            {
                "id": assistant_msg_id,
                "user_id": user["id"],
                "conversation_id": conv_id,
                "role": "assistant",
                "content": "[DEMO] Genel bilgilendirme yaniti. Somut olay icin avukata danisin.",
                "metadata_json": '{"kaynaklar": ["DEMO-1", "DEMO-2"]}',
                "created_at": _ts(401 + i * 2),
                "guest_session_id": None,
                "category": categories[i % len(categories)],
                "title": title,
                "deleted_at": None,
            }
        )
    return rows


def _build_feedback(users: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for i in range(10):
        message_id = _uid(f"chat:{_uid(f'conversation:{i}')}:assistant")
        owner = users[(i + 4) % len(users)]
        rows.append(
            {
                "id": _uid(f"feedback:{message_id}"),
                "message_id": message_id,
                "puan": 1 if i % 2 == 0 else -1,
                "user_id": owner["id"],
                "guest_session_id": None,
                "created_at": _ts(520 + i),
            }
        )
    return rows


def _build_shared(users: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for i in range(8):
        rows.append(
            {
                "id": _uid(f"share:{i}"),
                "share_token": f"demo-share-{i + 1:02d}",
                "conversation_id": _uid(f"conversation:{i}"),
                "user_id": users[i % len(users)]["id"],
                "is_active": True,
                "created_at": _ts(560 + i),
            }
        )
    return rows


def _build_seed_payload() -> dict[str, list[dict[str, Any]]]:
    users = _build_users()
    threads = _build_threads(users)
    replies = _build_replies(users, threads)
    return {
        "users": users,
        "threads": threads,
        "replies": replies,
        "votes": _build_votes(users, threads, replies),
        "chat_rows": _build_chat_rows(users),
        "feedback_rows": _build_feedback(users),
        "shared_rows": _build_shared(users),
    }


def upgrade() -> None:
    if not _is_enabled_env():
        return

    bind = op.get_bind()

    payload = _build_seed_payload()
    for row in payload["users"]:
        _insert_if_missing(bind, "users", row)
    for row in payload["threads"]:
        if _exists(bind, "forum_threads", str(row["id"])):
            _update_forum_thread_category(bind, str(row["id"]), str(row["category"]))
        else:
            _insert_if_missing(bind, "forum_threads", row)
    for row in payload["replies"]:
        _insert_if_missing(bind, "forum_replies", row)
    for row in payload["votes"]:
        _insert_if_missing(bind, "forum_votes", row)
    for row in payload["chat_rows"]:
        _insert_if_missing(bind, "chat_history", row)
    for row in payload["feedback_rows"]:
        _insert_if_missing(bind, "message_feedback", row)
    for row in payload["shared_rows"]:
        _insert_if_missing(bind, "shared_conversations", row)


def downgrade() -> None:
    bind = op.get_bind()
    payload = _build_seed_payload()

    shared_ids = [row["id"] for row in payload["shared_rows"]]
    feedback_ids = [row["id"] for row in payload["feedback_rows"]]
    chat_ids = [row["id"] for row in payload["chat_rows"]]
    vote_ids = [row["id"] for row in payload["votes"]]
    reply_ids = [row["id"] for row in payload["replies"]]
    thread_ids = [row["id"] for row in payload["threads"]]
    user_ids = [row["id"] for row in payload["users"]]

    for table, ids in [
        ("shared_conversations", shared_ids),
        ("message_feedback", feedback_ids),
        ("forum_votes", vote_ids),
        ("forum_replies", reply_ids),
        ("forum_threads", thread_ids),
        ("chat_history", chat_ids),
        ("users", user_ids),
    ]:
        for row_id in ids:
            bind.execute(sa.text(f"DELETE FROM {table} WHERE id = :id"), {"id": row_id})
