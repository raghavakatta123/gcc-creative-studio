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
"""Authentication guards and user retrieval using Okta JWT verification."""


import asyncio
import logging

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from src.auth.okta_client_service import okta_client
from src.config.config_service import config_service
from src.users.user_model import UserModel, UserRoleEnum
from src.users.user_service import UserService

# This scheme will require the client to send a token in the Authorization
# header. It tells FastAPI how to find the token but doesn't validate it
# itself.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


logger = logging.getLogger(__name__)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    user_service: UserService = Depends(UserService),
) -> UserModel:
    """Dependency that handles the entire authentication and user
    provisioning flow.

    1. Verifies the Okta JWT token (signature, issuer, audience, expiration).
    2. Checks group membership against the allowed groups.
    3. Extracts user information (email, name).
    4. Checks if a user document exists in the database.
    5. If the user is new, creates their document ("Just-In-Time Provisioning").
    6. Returns a Pydantic model with the user's data.
    """
    email = None
    try:
        # Verify the Okta JWT token using the JWKS client
        decoded_token = await asyncio.to_thread(
            okta_client.verify_token, token
        )

        email = decoded_token.get("email")
        name = decoded_token.get("name", "")
        picture = decoded_token.get("picture", "")
        groups = decoded_token.get("groups", [])

        # Verify the user has a valid email in the token
        if not email:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Forbidden: User identity could not be confirmed from "
                    "token. No email claim present."
                ),
            )

        # Check group membership if OKTA_ALLOWED_GROUPS is configured
        if config_service.OKTA_ALLOWED_GROUPS:
            user_groups = set(groups) if isinstance(groups, list) else set()
            allowed_groups = config_service.OKTA_ALLOWED_GROUPS

            if not user_groups.intersection(allowed_groups):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=(
                        f"Forbidden: User '{email}' is not a member of any "
                        "allowed group."
                    ),
                )

        # Just-In-Time (JIT) User Provisioning:
        # Create a user profile in our database on their first API call.
        user_doc = await user_service.create_user_if_not_exists(
            email=email,
            name=name,
            picture=picture,
        )

        if not user_doc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Could not create or retrieve user profile.",
            )

        if not user_doc.picture and picture:
            logger.info("Updating picture for user: %s", email)
            user_doc.picture = picture
            if user_doc.id:
                await user_service.user_repo.update(
                    user_doc.id, {"picture": picture}
                )

        return user_doc

    except jwt.ExpiredSignatureError as exc:
        logger.error(
            "[get_current_user - ExpiredSignatureError] for %s", email
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired.",
        ) from exc
    except jwt.InvalidAudienceError as exc:
        logger.error(
            "[get_current_user - InvalidAudienceError] for %s: %s",
            email,
            exc,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token audience.",
        ) from exc
    except jwt.InvalidIssuerError as exc:
        logger.error(
            "[get_current_user - InvalidIssuerError] for %s: %s",
            email,
            exc,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token issuer.",
        ) from exc
    except jwt.InvalidTokenError as exc:
        logger.error(
            "[get_current_user - InvalidTokenError] for %s: %s",
            email,
            exc,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {exc}",
        ) from exc
    except HTTPException as e:
        logger.error("[get_current_user - HTTPException]: %s", e.detail)
        raise e
    except Exception as e:
        logger.error("[get_current_user - Exception]: %s", e)
        raise HTTPException(
            status_code=getattr(
                e,
                "status_code",
                status.HTTP_500_INTERNAL_SERVER_ERROR,
            ),
            detail=f"An unexpected error occurred during authentication: {e}",
        ) from e


class RoleChecker:
    """Dependency that checks if the authenticated user has the required roles.
    It depends on `get_current_user` to ensure the user is authenticated first.
    """

    def __init__(self, allowed_roles: list[UserRoleEnum]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: UserModel = Depends(get_current_user)):
        """Checks the user's roles against the allowed roles."""
        is_authorized = any(role in self.allowed_roles for role in user.roles)

        if not is_authorized:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "You do not have sufficient permissions to perform this "
                    "action."
                ),
            )
