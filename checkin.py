import os
import sys
from typing import Iterable

import requests

BASE_URL = os.getenv("CHECKIN_BASE_URL", "https://ai.xem8k5.top").rstrip("/")
STRICT_MODE = os.getenv("CHECKIN_STRICT", "false").lower() == "true"


def _candidate_checkin_urls(base_url: str) -> Iterable[str]:
    return (
        f"{base_url}/api/user/aff_signin",
        f"{base_url}/api/user/checkin",
        f"{base_url}/api/user/sign",
        f"{base_url}/api/checkin",
        f"{base_url}/api/user/attendance",
        f"{base_url}/api/user/reward",
    )


def auto_checkin(username: str, password: str) -> int:
    login_url = f"{BASE_URL}/api/user/login"
    session = requests.Session()
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Content-Type": "application/json",
    }

    print("正在尝试登录...")
    try:
        res = session.post(
            login_url,
            json={"username": username, "password": password},
            headers=headers,
            timeout=20,
        )
    except requests.RequestException as exc:
        print(f"❌ 登录请求出错: {exc}")
        return 2

    try:
        payload = res.json()
    except ValueError:
        payload = {}

    if res.status_code != 200 or not payload.get("success"):
        print(f"❌ 登录失败 (HTTP {res.status_code}): {res.text[:200]}")
        return 1

    print("✅ 登录成功，开始探测签到接口…")

    for url in _candidate_checkin_urls(BASE_URL):
        print(f"[{url}] -> 正在探测...")
        try:
            resp = session.post(url, headers=headers, timeout=20)
        except requests.RequestException as exc:
            print(f"  请求失败: {exc}")
            continue

        if resp.status_code == 404:
            print("  接口不存在 (404)")
            continue

        try:
            data = resp.json()
        except ValueError:
            data = {}

        if resp.status_code == 200 and isinstance(data, dict) and data.get("success"):
        if resp.status_code == 200 and data.get("success"):
            print(f"🎉 签到成功！命中接口: {url}")
            message = data.get("message")
            if message:
                print(f"服务器消息: {message}")
            return 0

        message = data.get("message", "") if isinstance(data, dict) else ""
        print(
            f"  响应: HTTP {resp.status_code}; success={data.get('success') if isinstance(data, dict) else None}; message={message}"
        )

    print("\n⚠️ 未命中可用签到接口。")
    print("建议：浏览器登录后打开开发者工具 Network，点击签到按钮抓包确认真实 API 路径。")
    if STRICT_MODE:
        print("STRICT 模式开启：返回非 0 退出码。")
        return 3

    print("STRICT 模式关闭：为避免定时任务整体失败，本次返回 0。")
    return 0
        print(f"  响应: HTTP {resp.status_code}; success={data.get('success') if isinstance(data, dict) else None}; message={message}")

    print("\n⚠️ 未命中可用签到接口。")
    print("建议：浏览器登录后打开开发者工具 Network，点击签到按钮抓包确认真实 API 路径。")
    return 3


def main() -> int:
    username = os.getenv("CHECKIN_USERNAME")
    password = os.getenv("CHECKIN_PASSWORD")
    if not username or not password:
        print("❌ 缺少环境变量 CHECKIN_USERNAME / CHECKIN_PASSWORD")
        return 4
    return auto_checkin(username, password)


if __name__ == "__main__":
    sys.exit(main())
