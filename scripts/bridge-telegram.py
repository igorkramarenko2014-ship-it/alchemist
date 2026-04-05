#!/usr/bin/env python3
import os, sys, json, asyncio
from telethon import TelegramClient


def load_env():
    env_path = os.path.join(os.getcwd(), ".env")
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                if "=" in line and not line.startswith("#"):
                    k, v = line.strip().split("=", 1)
                    os.environ.setdefault(k, v)


load_env()
API_ID = os.getenv("TG_API_ID")
API_HASH = os.getenv("TG_HASH")
SESSION_PATH = os.path.expanduser("~/.alchemist/sessions/alchemist.session")
USAGE = "Usage: bridge-telegram.py <peer> [limit]"


async def main():
    if len(sys.argv) >= 2 and sys.argv[1] in {"--help", "-h"}:
        print(USAGE)
        return

    if not API_ID or not API_HASH:
        print(json.dumps({"error": "Missing TG_API_ID or TG_HASH"}), file=sys.stderr)
        sys.exit(1)

    if len(sys.argv) < 2:
        print(json.dumps({"error": USAGE}), file=sys.stderr)
        sys.exit(1)

    peer = sys.argv[1]
    limit = int(sys.argv[2]) if len(sys.argv) > 2 else 100

    os.makedirs(os.path.dirname(SESSION_PATH), exist_ok=True)
    client = TelegramClient(SESSION_PATH, int(API_ID), API_HASH)
    await client.start()

    me = await client.get_me()
    messages = []

    async for msg in client.iter_messages(peer, limit=limit):
        if msg.text and msg.sender_id != me.id:
            messages.append({
                "date": msg.date.isoformat(),
                "text": msg.text
            })

    print(json.dumps(messages, indent=2, ensure_ascii=False))
    await client.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
