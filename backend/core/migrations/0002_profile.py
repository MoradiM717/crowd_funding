                                               

import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Profile',
            fields=[
                ('wallet_address', models.CharField(help_text='Ethereum wallet address (0x + 40 hex characters)', max_length=42, primary_key=True, serialize=False, validators=[django.core.validators.RegexValidator(message='Invalid Ethereum address format. Must be 0x followed by 40 hex characters.', regex='^0x[a-fA-F0-9]{40}$')])),
                ('display_name', models.CharField(blank=True, help_text='Optional display name', max_length=50, null=True)),
                ('avatar_cid', models.CharField(blank=True, help_text='IPFS CID for avatar image', max_length=100, null=True)),
                ('bio', models.TextField(blank=True, help_text='Short biography', max_length=500, null=True)),
                ('website', models.URLField(blank=True, help_text='Personal website URL', null=True)),
                ('twitter_handle', models.CharField(blank=True, help_text='Twitter/X handle (without @)', max_length=50, null=True)),
                ('nonce', models.CharField(help_text='Random nonce for signature verification', max_length=32)),
                ('nonce_generated_at', models.DateTimeField(auto_now_add=True, help_text='When the nonce was generated')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Profile',
                'verbose_name_plural': 'Profiles',
                'db_table': 'profiles',
                'managed': True,
                'indexes': [models.Index(fields=['display_name'], name='profiles_display_f14824_idx')],
            },
        ),
    ]
