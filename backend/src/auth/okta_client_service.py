# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
"""Okta JWKS client with caching for JWT verification."""

import logging

import jwt
from jwt import PyJWKClient

from src.config.config_service import config_service

logger = logging.getLogger(__name__)


class OktaClient:
    """A class to manage the Okta JWKS client with caching for
    efficient JWT signature verification."""

    def __init__(self):
        """Initializes the JWKS client pointing to the Okta JWKS endpoint."""
        self._issuer = config_service.OKTA_ISSUER
        self._audience = config_service.OKTA_AUDIENCE
        self._jwks_uri = f"{self._issuer}/v1/keys"

        logger.info(
            "Initializing Okta JWKS client with URI: %s", self._jwks_uri
        )

        # PyJWKClient handles JWKS fetching and caching internally.
        # It will cache keys and refresh them when encountering an
        # unknown key ID (kid).
        self._jwks_client = PyJWKClient(
            self._jwks_uri,
            cache_keys=True,
            lifespan=3600,  # Cache keys for 1 hour
        )

        logger.info("✅ Okta JWKS client initialized successfully.")

    @property
    def jwks_client(self) -> PyJWKClient:
        """Returns the configured PyJWKClient instance."""
        return self._jwks_client

    @property
    def issuer(self) -> str:
        """Returns the Okta issuer URI."""
        return self._issuer

    @property
    def audience(self) -> str:
        """Returns the expected audience (client ID)."""
        return self._audience

    def verify_token(self, token: str) -> dict:
        """Verifies an Okta JWT token and returns the decoded claims.

        Args:
            token: The JWT access token or ID token to verify.

        Returns:
            dict: The decoded token claims.

        Raises:
            jwt.ExpiredSignatureError: If the token has expired.
            jwt.InvalidTokenError: If the token is invalid.
        """
        # Get the signing key from JWKS based on the token's kid header
        signing_key = self._jwks_client.get_signing_key_from_jwt(token)

        # Decode and verify the token
        decoded_token = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=self._audience,
            issuer=self._issuer,
            options={
                "verify_exp": True,
                "verify_iss": True,
                "verify_aud": True,
            },
        )

        return decoded_token


# Create a single, cached instance to be used throughout the app.
okta_client = OktaClient()
