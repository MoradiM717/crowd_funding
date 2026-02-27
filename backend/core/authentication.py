import logging
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed
from rest_framework_simplejwt.tokens import AccessToken

from core.models import Profile

logger = logging.getLogger(__name__)


class WalletUser:

    
    def __init__(self, profile: Profile):
        self.profile = profile
        self.wallet_address = profile.wallet_address
        self.is_authenticated = True
        self.is_active = True
        self.is_anonymous = False
    
    @property
    def pk(self):
        return self.wallet_address
    
    @property
    def id(self):
        return self.wallet_address
    
    def __str__(self):
        return self.profile.display_name or self.wallet_address


class WalletJWTAuthentication(JWTAuthentication):
    
    def get_user(self, validated_token):

        try:
            wallet_address = validated_token.get('wallet_address')
            
            if not wallet_address:
                raise InvalidToken('Token contained no wallet_address')
            
                                    
            wallet_address = wallet_address.lower()
            
            try:
                profile = Profile.objects.get(wallet_address=wallet_address)
            except Profile.DoesNotExist:
                raise AuthenticationFailed('Profile not found for this wallet address')
            
            return WalletUser(profile)
            
        except Exception as e:
            logger.error(f"JWT authentication error: {e}")
            raise InvalidToken(str(e))
    
    def authenticate(self, request):

        header = self.get_header(request)
        if header is None:
            return None
        
        raw_token = self.get_raw_token(header)
        if raw_token is None:
            return None
        
        validated_token = self.get_validated_token(raw_token)
        user = self.get_user(validated_token)
        
                                                                           
        return (user, validated_token)
