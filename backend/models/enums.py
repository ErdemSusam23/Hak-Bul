from enum import Enum


class UserRole(str, Enum):
    USER = "user"
    ADMIN = "admin"


class MessageRole(str, Enum):
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"
