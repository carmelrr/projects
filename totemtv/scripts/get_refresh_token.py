#!/usr/bin/env python3
"""
One-time helper: get a Google Drive OAuth refresh token for the TotemTV uploader.

Why: the service account has NO storage quota, so it cannot CREATE new files in a
normal Drive folder (403 "Service Accounts do not have storage quota"). Uploading
as YOU (the folder owner, who has quota) fixes the automation's final upload step.
This prints a refresh token you then store as a GitHub secret.

Setup before running:
  1. Google Cloud Console (project totemtv-slideshow) -> APIs & Services ->
     Credentials -> Create Credentials -> OAuth client ID -> type "Desktop app".
     Copy the Client ID and Client secret.
  2. APIs & Services -> OAuth consent screen -> add your Google account under
     "Test users", and make sure the Google Drive API is enabled.

Run:
    pip install google-auth-oauthlib
    python scripts/get_refresh_token.py

Then add three repo secrets (GitHub -> Settings -> Secrets and variables -> Actions):
    GDRIVE_CLIENT_ID, GDRIVE_CLIENT_SECRET, GDRIVE_REFRESH_TOKEN
"""
import sys

try:
    from google_auth_oauthlib.flow import InstalledAppFlow
except ImportError:
    sys.exit("Missing dependency. Run:  pip install google-auth-oauthlib")

SCOPES = ["https://www.googleapis.com/auth/drive"]


def main():
    client_id = input("OAuth Client ID: ").strip()
    client_secret = input("OAuth Client secret: ").strip()
    if not client_id or not client_secret:
        sys.exit("Both Client ID and Client secret are required.")

    config = {
        "installed": {
            "client_id": client_id,
            "client_secret": client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": ["http://localhost"],
        }
    }
    flow = InstalledAppFlow.from_client_config(config, scopes=SCOPES)
    # Opens a browser; sign in as the account that owns the "totemtv" Drive folder.
    creds = flow.run_local_server(port=0, prompt="consent", access_type="offline")

    if not creds.refresh_token:
        sys.exit("No refresh token returned. Re-run (it forces prompt=consent) and allow access.")

    print("\n" + "=" * 64)
    print("Add these THREE secrets to the GitHub repo (Settings -> Secrets):")
    print("  GDRIVE_CLIENT_ID     =", client_id)
    print("  GDRIVE_CLIENT_SECRET =", client_secret)
    print("  GDRIVE_REFRESH_TOKEN =", creds.refresh_token)
    print("=" * 64)


if __name__ == "__main__":
    main()
