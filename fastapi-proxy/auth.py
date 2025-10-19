"""Clerk JWT authentication middleware."""
import logging
from typing import Optional
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt
from jwt import PyJWKClient
from functools import lru_cache

from config import get_settings
from models import UserClaims

logger = logging.getLogger(__name__)
security = HTTPBearer()


@lru_cache()
def get_jwks_client() -> PyJWKClient:
    """Get cached JWKS client for JWT verification."""
    settings = get_settings()
    return PyJWKClient(settings.clerk_jwks_url)


async def verify_clerk_token(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> UserClaims:
    """
    Verify Clerk JWT token and extract user claims.

    Args:
        credentials: HTTP Authorization credentials with Bearer token

    Returns:
        UserClaims: Validated user claims from JWT

    Raises:
        HTTPException: If token is invalid or verification fails
    """
    token = credentials.credentials
    settings = get_settings()

    try:
        # Get signing key from JWKS
        jwks_client = get_jwks_client()
        signing_key = jwks_client.get_signing_key_from_jwt(token)

        # Verify and decode token
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={
                "verify_signature": True,
                "verify_exp": True,
                "verify_iat": True,
                "verify_aud": settings.clerk_audience is not None,
            },
            audience=settings.clerk_audience,
        )

        # Extract user claims
        user_claims = UserClaims(
            sub=payload.get("sub"),
            email=payload.get("email"),
            first_name=payload.get("given_name") or payload.get("first_name"),
            last_name=payload.get("family_name") or payload.get("last_name"),
        )

        logger.info(f"Successfully authenticated user: {user_claims.sub}")
        return user_claims

    except jwt.ExpiredSignatureError:
        logger.warning("JWT token has expired")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid JWT token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        logger.error(f"Token verification failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(
        HTTPBearer(auto_error=False)
    ),
) -> Optional[UserClaims]:
    """
    Optional authentication - returns None if no token provided.

    Args:
        credentials: Optional HTTP Authorization credentials

    Returns:
        UserClaims if token provided and valid, None otherwise
    """
    if not credentials:
        return None

    try:
        return verify_clerk_token(credentials)
    except HTTPException:
        return None
