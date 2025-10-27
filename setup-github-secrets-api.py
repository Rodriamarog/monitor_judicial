#!/usr/bin/env python3
"""
GitHub Actions Secrets Setup via API
This script uses the GitHub API to set repository secrets
"""

import json
import base64
import requests
from nacl import encoding, public
import sys

REPO_OWNER = "Rodriamarog"
REPO_NAME = "monitor_judicial"
VERCEL_URL = "https://monitor-judicial.vercel.app"
CRON_SECRET = "dev-test-secret-12345"

def encrypt(public_key: str, secret_value: str) -> str:
    """Encrypt a Unicode string using the public key."""
    public_key = public.PublicKey(public_key.encode("utf-8"), encoding.Base64Encoder())
    sealed_box = public.SealedBox(public_key)
    encrypted = sealed_box.encrypt(secret_value.encode("utf-8"))
    return base64.b64encode(encrypted).decode("utf-8")

def set_secret(token: str, secret_name: str, secret_value: str):
    """Set a repository secret using GitHub API."""
    # Get the repository's public key
    url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/actions/secrets/public-key"
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json"
    }

    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        print(f"❌ Failed to get public key: {response.status_code}")
        print(response.text)
        return False

    public_key_data = response.json()
    key_id = public_key_data["key_id"]
    public_key = public_key_data["key"]

    # Encrypt the secret
    encrypted_value = encrypt(public_key, secret_value)

    # Set the secret
    url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/actions/secrets/{secret_name}"
    data = {
        "encrypted_value": encrypted_value,
        "key_id": key_id
    }

    response = requests.put(url, headers=headers, json=data)
    if response.status_code in [201, 204]:
        print(f"✅ Secret '{secret_name}' set successfully")
        return True
    else:
        print(f"❌ Failed to set secret '{secret_name}': {response.status_code}")
        print(response.text)
        return False

def main():
    print("🚀 GitHub Actions Secrets Setup via API\n")

    # Check if PyNaCl is installed
    try:
        import nacl
    except ImportError:
        print("❌ PyNaCl library not found")
        print("\nInstall it with:")
        print("  pip install PyNaCl")
        return 1

    # Get GitHub token
    token = input("Enter your GitHub Personal Access Token (with 'repo' scope): ").strip()
    if not token:
        print("❌ No token provided")
        return 1

    print(f"\nRepository: {REPO_OWNER}/{REPO_NAME}\n")

    # Set secrets
    success = True
    success &= set_secret(token, "VERCEL_DEPLOYMENT_URL", VERCEL_URL)
    success &= set_secret(token, "CRON_SECRET", CRON_SECRET)

    if success:
        print("\n✅ All secrets configured successfully!")
        print(f"\nVerify at: https://github.com/{REPO_OWNER}/{REPO_NAME}/settings/secrets/actions")
        return 0
    else:
        print("\n❌ Some secrets failed to set")
        return 1

if __name__ == "__main__":
    sys.exit(main())
