
import logging
import secrets
from typing import Optional, Tuple
from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from eth_account.messages import encode_defunct
from eth_account import Account
from rest_framework_simplejwt.tokens import RefreshToken

from core.models import Profile

logger = logging.getLogger(__name__)


class AuthenticationError(Exception):
    pass


class InvalidSignatureError(AuthenticationError):
    pass


class NonceExpiredError(AuthenticationError):
    pass


class InvalidAddressError(AuthenticationError):
    pass


DEFAULT_MESSAGE_TEMPLATE = """Sign this message to authenticate with CrowdFund.

This signature proves you own this wallet address.
This request will not trigger a blockchain transaction or cost any gas fees.

Nonce: {nonce}
Wallet: {wallet_address}
Timestamp: {timestamp}"""

                                  
NONCE_EXPIRATION_MINUTES = getattr(settings, 'AUTH_NONCE_EXPIRATION_MINUTES', 5)


def generate_nonce() -> str:
    return secrets.token_hex(16)


def get_signing_message(wallet_address: str, nonce: str) -> str:
    template = getattr(settings, 'AUTH_MESSAGE_TEMPLATE', DEFAULT_MESSAGE_TEMPLATE)
    
    return template.format(
        nonce=nonce,
        wallet_address=wallet_address,
        timestamp=timezone.now().isoformat()
    )


def normalize_address(address: str) -> str:
    try:
                                                                  
        from eth_utils import to_checksum_address, is_hex_address
        
        if not is_hex_address(address):
            raise InvalidAddressError(f"Invalid address format: {address}")
        
        return to_checksum_address(address)
    except Exception as e:
        raise InvalidAddressError(f"Invalid address: {e}") from e


def verify_signature(
    wallet_address: str,
    signature: str,
    message: str
) -> bool:
    try:
                                       
        expected_address = normalize_address(wallet_address)
        
                                                                     
        message_encoded = encode_defunct(text=message)
        
                                                
        recovered_address = Account.recover_message(message_encoded, signature=signature)
        
                                              
        if recovered_address.lower() != expected_address.lower():
            logger.warning(
                f"Signature address mismatch: expected {expected_address}, "
                f"recovered {recovered_address}"
            )
            raise InvalidSignatureError("Signature does not match the claimed address")
        
        logger.info(f"Successfully verified signature for {wallet_address}")
        return True
        
    except InvalidSignatureError:
        raise
    except Exception as e:
        logger.error(f"Signature verification failed: {e}")
        raise InvalidSignatureError(f"Failed to verify signature: {e}") from e


def get_or_create_profile(wallet_address: str) -> Tuple[Profile, bool]:
    normalized_address = normalize_address(wallet_address)
    
    profile, created = Profile.objects.get_or_create(
        wallet_address=normalized_address.lower(),
        defaults={
            'nonce': generate_nonce(),
            'nonce_generated_at': timezone.now(),
        }
    )
    
    if created:
        logger.info(f"Created new profile for {normalized_address}")
    
    return profile, created


def refresh_nonce(profile: Profile) -> str:
    profile.nonce = generate_nonce()
    profile.nonce_generated_at = timezone.now()
    profile.save(update_fields=['nonce', 'nonce_generated_at'])
    
    logger.debug(f"Refreshed nonce for {profile.wallet_address}")
    return profile.nonce


def validate_nonce(profile: Profile) -> bool:
    if not profile.is_nonce_valid(max_age_minutes=NONCE_EXPIRATION_MINUTES):
        raise NonceExpiredError(
            f"Nonce has expired. Please request a new one. "
            f"Nonces expire after {NONCE_EXPIRATION_MINUTES} minutes."
        )
    return True


def create_jwt_tokens(profile: Profile) -> dict:
                          
    refresh = RefreshToken()
    
                       
    refresh['wallet_address'] = profile.wallet_address
    if profile.display_name:
        refresh['display_name'] = profile.display_name
    
                                     
    access = refresh.access_token
    access['wallet_address'] = profile.wallet_address
    if profile.display_name:
        access['display_name'] = profile.display_name
    
    return {
        'access': str(access),
        'refresh': str(refresh),
    }


def authenticate_with_signature(
    wallet_address: str,
    signature: str,
    message: str
) -> Tuple[Profile, dict]:
                       
    normalized_address = normalize_address(wallet_address).lower()
    
                 
    try:
        profile = Profile.objects.get(wallet_address=normalized_address)
    except Profile.DoesNotExist:
        raise InvalidSignatureError("No nonce found for this address. Please request a nonce first.")
    
                                   
    validate_nonce(profile)
    
                      
    verify_signature(wallet_address, signature, message)
    
                                                
    refresh_nonce(profile)
    
                       
    tokens = create_jwt_tokens(profile)
    
    logger.info(f"Successfully authenticated {wallet_address}")
    
    return profile, tokens


def get_wallet_from_token(token_payload: dict) -> Optional[str]:
    return token_payload.get('wallet_address')
