"""Root conftest — shared fixtures for all services."""
import sys
import os

# Make shared packages importable without installation
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "packages/shared-utils"))
