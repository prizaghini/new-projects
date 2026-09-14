#!/usr/bin/env python3
"""One-time interactive Outlook login to get a refresh token.

Run this once (locally, or ask Claude to run it in a session) after
creating the Azure app registration. It prints a short code and a URL;
sign in there with your Outlook account and approve access. It then
prints a refresh token - paste that into the OUTLOOK_REFRESH_TOKEN
GitHub secret. Nothing here needs to run again afterward: the scheduled
workflow refreshes and persists the token on its own from then on.

Required environment variable:
    OUTLOOK_CLIENT_ID - Azure app registration's Application (client) ID
"""

import os

import msal

AUTHORITY = "https://login.microsoftonline.com/consumers"
SCOPES = ["Mail.Read", "Mail.Send", "offline_access"]


def main() -> None:
    client_id = os.environ["OUTLOOK_CLIENT_ID"]
    app = msal.PublicClientApplication(client_id, authority=AUTHORITY)

    flow = app.initiate_device_flow(scopes=SCOPES)
    if "user_code" not in flow:
        raise RuntimeError(f"Failed to start device login: {flow}")

    print(flow["message"])
    print()

    result = app.acquire_token_by_device_flow(flow)  # blocks until you sign in
    if "refresh_token" not in result:
        raise RuntimeError(
            f"Login failed: {result.get('error')}: {result.get('error_description')}"
        )

    print("Success. Copy this value into the OUTLOOK_REFRESH_TOKEN GitHub secret:")
    print()
    print(result["refresh_token"])


if __name__ == "__main__":
    main()
