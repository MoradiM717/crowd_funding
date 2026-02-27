from django.db import models
from django.core.validators import RegexValidator


ethereum_address_validator = RegexValidator(
    regex=r"^0x[a-fA-F0-9]{40}$",
    message="Invalid Ethereum address format. Must be 0x followed by 40 hex characters.",
)


class Chain(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255)
    chain_id = models.BigIntegerField(unique=True)
    rpc_url = models.CharField(max_length=512, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=False)
    updated_at = models.DateTimeField(auto_now=False)

    class Meta:
        managed = False
        db_table = "chains"
        verbose_name = "Chain"
        verbose_name_plural = "Chains"

    def __str__(self):
        return f"{self.name} (Chain ID: {self.chain_id})"


class SyncState(models.Model):
    chain_id = models.BigIntegerField(primary_key=True)
    last_block = models.BigIntegerField(default=0)
    last_block_hash = models.CharField(max_length=66, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=False)

    class Meta:
        managed = False
        db_table = "sync_state"
        verbose_name = "Sync State"
        verbose_name_plural = "Sync States"

    def __str__(self):
        return f"Sync State for Chain {self.chain_id} (Block: {self.last_block})"

    @property
    def chain(self):
        try:
            return Chain.objects.get(chain_id=self.chain_id)
        except Chain.DoesNotExist:
            return None


class Campaign(models.Model):
    STATUS_CHOICES = [
        ("ACTIVE", "Active"),
        ("SUCCESS", "Success"),
        ("FAILED", "Failed"),
        ("WITHDRAWN", "Withdrawn"),
    ]

    address = models.CharField(
        max_length=42, primary_key=True, validators=[ethereum_address_validator]
    )
    factory_address = models.CharField(
        max_length=42, validators=[ethereum_address_validator]
    )
    creator_address = models.CharField(
        max_length=42, validators=[ethereum_address_validator]
    )
    goal_wei = models.BigIntegerField()
    deadline_ts = models.BigIntegerField()
    cid = models.CharField(max_length=255, null=True, blank=True)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default="ACTIVE")
    total_raised_wei = models.BigIntegerField(default=0)
    withdrawn = models.BooleanField(default=False)
    withdrawn_amount_wei = models.BigIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=False)
    updated_at = models.DateTimeField(auto_now=False)

    class Meta:
        managed = False
        db_table = "campaigns"
        verbose_name = "Campaign"
        verbose_name_plural = "Campaigns"
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["factory_address"]),
            models.Index(fields=["creator_address"]),
        ]

    def __str__(self):
        return f"Campaign {self.address} ({self.status})"


class Contribution(models.Model):
    id = models.AutoField(primary_key=True)
    campaign_address = models.ForeignKey(
        Campaign,
        on_delete=models.CASCADE,
        to_field="address",
        db_column="campaign_address",
        related_name="contributions",
    )
    donor_address = models.CharField(
        max_length=42, validators=[ethereum_address_validator]
    )
    contributed_wei = models.BigIntegerField(default=0)
    refunded_wei = models.BigIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=False)
    updated_at = models.DateTimeField(auto_now=False)

    class Meta:
        managed = False
        db_table = "contributions"
        verbose_name = "Contribution"
        verbose_name_plural = "Contributions"
        unique_together = [["campaign_address", "donor_address"]]
        indexes = [
            models.Index(fields=["campaign_address"]),
            models.Index(fields=["donor_address"]),
        ]

    def __str__(self):
        return f"Contribution {self.id} from {self.donor_address} to {self.campaign_address}"


class Event(models.Model):
    id = models.AutoField(primary_key=True)
    chain_id = models.ForeignKey(
        Chain,
        on_delete=models.CASCADE,
        to_field="chain_id",
        db_column="chain_id",
        related_name="events",
    )
    tx_hash = models.CharField(max_length=66)
    log_index = models.IntegerField()
    block_number = models.BigIntegerField()
    block_hash = models.CharField(max_length=66)
    address = models.ForeignKey(
        Campaign,
        on_delete=models.SET_NULL,
        to_field="address",
        db_column="address",
        null=True,
        blank=True,
        related_name="events",
    )
    event_name = models.CharField(max_length=100)
    event_data = models.TextField(null=True, blank=True)
    removed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=False)

    class Meta:
        managed = False
        db_table = "events"
        verbose_name = "Event"
        verbose_name_plural = "Events"
        unique_together = [["chain_id", "tx_hash", "log_index"]]
        indexes = [
            models.Index(fields=["block_number"]),
            models.Index(fields=["address"]),
            models.Index(fields=["event_name"]),
            models.Index(fields=["chain_id"]),
        ]

    def __str__(self):
        return f"Event {self.event_name} at block {self.block_number}"


class CampaignMetadata(models.Model):
    CATEGORY_CHOICES = [
        ("technology", "Technology"),
        ("art", "Art & Creative"),
        ("music", "Music"),
        ("film", "Film & Video"),
        ("games", "Games"),
        ("publishing", "Publishing"),
        ("food", "Food & Craft"),
        ("fashion", "Fashion & Design"),
        ("environment", "Environment"),
        ("community", "Community"),
        ("health", "Health & Wellness"),
        ("education", "Education"),
        ("sports", "Sports"),
        ("travel", "Travel & Adventure"),
        ("charity", "Charity & Nonprofit"),
        ("other", "Other"),
    ]

    id = models.AutoField(primary_key=True)
    campaign = models.OneToOneField(
        Campaign,
        on_delete=models.CASCADE,
        to_field="address",
        db_column="campaign_address",
        related_name="metadata",
    )
    cid = models.CharField(max_length=255, help_text="IPFS Content Identifier")

    name = models.CharField(max_length=255, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    short_description = models.CharField(max_length=500, null=True, blank=True)

    image_cid = models.CharField(
        max_length=255, null=True, blank=True, help_text="IPFS CID for main image"
    )
    banner_cid = models.CharField(
        max_length=255, null=True, blank=True, help_text="IPFS CID for banner image"
    )

    category = models.CharField(
        max_length=100, choices=CATEGORY_CHOICES, null=True, blank=True
    )
    tags = models.JSONField(
        null=True, blank=True, default=list, help_text="List of tags"
    )

    location = models.CharField(max_length=255, null=True, blank=True)

    creator_name = models.CharField(max_length=255, null=True, blank=True)
    creator_avatar_cid = models.CharField(max_length=255, null=True, blank=True)

    website_url = models.URLField(max_length=512, null=True, blank=True)
    twitter_handle = models.CharField(max_length=100, null=True, blank=True)
    discord_url = models.URLField(max_length=512, null=True, blank=True)

    raw_json = models.JSONField(
        null=True, blank=True, help_text="Complete raw JSON from IPFS"
    )

    ipfs_fetched_at = models.DateTimeField(
        null=True, blank=True, help_text="When metadata was fetched from IPFS"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = True
        db_table = "campaign_metadata"
        verbose_name = "Campaign Metadata"
        verbose_name_plural = "Campaign Metadata"
        indexes = [
            models.Index(fields=["category"]),
            models.Index(fields=["name"]),
        ]

    def __str__(self):
        return f"Metadata for {self.campaign_id}: {self.name or 'Unnamed'}"


class Profile(models.Model):
    wallet_address = models.CharField(
        max_length=42,
        primary_key=True,
        validators=[ethereum_address_validator],
        help_text="Ethereum wallet address (0x + 40 hex characters)",
    )
    display_name = models.CharField(
        max_length=50, blank=True, null=True, help_text="Optional display name"
    )
    avatar_cid = models.CharField(
        max_length=100, blank=True, null=True, help_text="IPFS CID for avatar image"
    )
    bio = models.TextField(
        max_length=500, blank=True, null=True, help_text="Short biography"
    )
    website = models.URLField(
        max_length=200, blank=True, null=True, help_text="Personal website URL"
    )
    twitter_handle = models.CharField(
        max_length=50, blank=True, null=True, help_text="Twitter/X handle (without @)"
    )

    nonce = models.CharField(
        max_length=32, help_text="Random nonce for signature verification"
    )
    nonce_generated_at = models.DateTimeField(
        auto_now_add=True, help_text="When the nonce was generated"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = True
        db_table = "profiles"
        verbose_name = "Profile"
        verbose_name_plural = "Profiles"
        indexes = [
            models.Index(fields=["display_name"]),
        ]

    def __str__(self):
        if self.display_name:
            return f"{self.display_name} ({self.wallet_address[:10]}...)"
        return f"Profile {self.wallet_address[:10]}..."

    def is_nonce_valid(self, max_age_minutes: int = 5) -> bool:
        from django.utils import timezone
        from datetime import timedelta

        if not self.nonce_generated_at:
            return False

        expiry_time = self.nonce_generated_at + timedelta(minutes=max_age_minutes)
        return timezone.now() < expiry_time
