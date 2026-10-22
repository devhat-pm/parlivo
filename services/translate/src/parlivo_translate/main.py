"""Placeholder entry point; real behaviour arrives in later prompts."""

from parlivo_translate import SERVICE_NAME


def describe() -> str:
    return f"parlivo-{SERVICE_NAME} placeholder"


def main() -> None:
    print(describe())


if __name__ == "__main__":
    main()
