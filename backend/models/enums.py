from enum import Enum


class UserRole(str, Enum):
    USER = "user"
    LAWYER = "lawyer"
    ADMIN = "admin"


class MessageRole(str, Enum):
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"


class ForumVoteType(str, Enum):
    THREAD = "thread"
    REPLY = "reply"
