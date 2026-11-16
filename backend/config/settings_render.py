"""
Render-specific settings. Local settings.py is unchanged.
"""

import os
import ssl
import certifi
import pymysql

required = [
    "DJANGO_SECRET_KEY",
    "TIDB_DB_HOST",
    "TIDB_DB_USER",
    "TIDB_DB_PASSWORD",
]

missing = [name for name in required if not os.getenv(name)]

if missing:
    raise RuntimeError(
        "Missing environment variables: " + ", ".join(missing)
    )

pymysql.install_as_MySQLdb()

# Supply cloud credentials to the base settings import.
# These changes affect only the current Python process.
os.environ["DB_NAME"] = os.getenv(
    "TIDB_DB_NAME", "smart_inventory_db"
)
os.environ["DB_USER"] = os.environ["TIDB_DB_USER"]
os.environ["DB_PASSWORD"] = os.environ["TIDB_DB_PASSWORD"]
os.environ["DB_HOST"] = os.environ["TIDB_DB_HOST"]
os.environ["DB_PORT"] = os.getenv("TIDB_DB_PORT", "4000")

from .settings import *

DEBUG = False
SECRET_KEY = os.environ["DJANGO_SECRET_KEY"]

ALLOWED_HOSTS = [
    value.strip()
    for value in os.getenv("DJANGO_ALLOWED_HOSTS", "").split(",")
    if value.strip()
]

render_host = os.getenv("RENDER_EXTERNAL_HOSTNAME", "").strip()

if render_host and render_host not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(render_host)

if not ALLOWED_HOSTS:
    raise RuntimeError("No production allowed hosts configured.")

CSRF_TRUSTED_ORIGINS = (
    ["https://" + render_host] if render_host else []
)

CSRF_TRUSTED_ORIGINS.extend(
    value.strip()
    for value in os.getenv(
        "DJANGO_CSRF_TRUSTED_ORIGINS", ""
    ).split(",")
    if value.strip()
)

CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [
    value.strip().rstrip("/")
    for value in os.getenv("CORS_ALLOWED_ORIGINS", "").split(",")
    if value.strip()
]

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 3600

tls_context = ssl.create_default_context(
    cafile=certifi.where()
)
tls_context.check_hostname = True
tls_context.verify_mode = ssl.CERT_REQUIRED

DATABASES = {
    "default": {
        "ENGINE": "django_tidb",
        "NAME": os.getenv(
            "TIDB_DB_NAME", "smart_inventory_db"
        ),
        "USER": os.environ["TIDB_DB_USER"],
        "PASSWORD": os.environ["TIDB_DB_PASSWORD"],
        "HOST": os.environ["TIDB_DB_HOST"],
        "PORT": os.getenv("TIDB_DB_PORT", "4000"),
        "OPTIONS": {
            "ssl": tls_context,
            "charset": "utf8mb4",
        },
        "CONN_MAX_AGE": 0,
    }
}

STATIC_ROOT = BASE_DIR / "staticfiles"

try:
    STORAGES = dict(STORAGES)
except NameError:
    STORAGES = {
        "default": {
            "BACKEND": "django.core.files.storage.FileSystemStorage"
        }
    }

STORAGES["staticfiles"] = {
    "BACKEND": (
        "whitenoise.storage."
        "CompressedManifestStaticFilesStorage"
    )
}
