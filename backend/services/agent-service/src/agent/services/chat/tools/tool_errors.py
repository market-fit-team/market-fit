class ChatToolError(Exception):
    """분류해도 안전한 chat tool 실패의 기본 예외입니다."""


class InvalidToolInputError(ChatToolError):
    """tool이 사용자/model이 제공한 잘못된 인자를 받았을 때 발생합니다."""


class ToolPermissionError(ChatToolError):
    """tool이 허용 범위 밖의 resource에 접근하려 할 때 발생합니다."""
