"""
Utility functions for timestamp calculations and market slug handling
"""
import math
from datetime import datetime, timezone
from typing import Optional


def get_current_15min_timestamp() -> int:
    """
    Get the current 15-minute interval timestamp (Unix timestamp)
    
    Returns the start timestamp of the current 15-minute interval
    Example: If it's 10:17, returns the timestamp for 10:15
    """
    now = datetime.now(timezone.utc)
    # Round down to the nearest 15 minutes
    minutes = (now.minute // 15) * 15
    rounded = now.replace(minute=minutes, second=0, microsecond=0)
    return int(rounded.timestamp())


def get_next_15min_timestamp() -> int:
    """
    Get the next 15-minute interval timestamp
    
    Returns the timestamp for the next 15-minute interval
    """
    now = datetime.now(timezone.utc)
    current_15min = get_current_15min_timestamp()
    # Add 15 minutes (900 seconds)
    return current_15min + 900


def extract_timestamp_from_slug(slug: str) -> Optional[int]:
    """
    Extract timestamp from event slug
    Examples:
    - "btc-updown-15m-1761921000" -> 1761921000
    - "eth-updown-15m-1761921000" -> 1761921000
    """
    try:
        # Try to find timestamp at the end (last segment after last dash)
        parts = slug.split("-")
        if parts:
            timestamp_str = parts[-1]
            if timestamp_str.isdigit():
                return int(timestamp_str)
    except:
        pass
    return None


def update_slug_with_current_timestamp(base_slug: str) -> str:
    """
    Update a slug with the current 15-minute timestamp
    
    Args:
        base_slug: Slug pattern like "btc-updown-15m" or "btc-updown-15m-1761921000"
    
    Returns:
        Updated slug with current timestamp
    Example:
        "btc-updown-15m-1761921000" -> "btc-updown-15m-1761921600" (if time moved to next interval)
    """
    # Remove old timestamp if present
    parts = base_slug.split("-")
    # Keep everything except the last part (if it's a timestamp)
    if len(parts) > 1 and parts[-1].isdigit():
        base_parts = parts[:-1]
    else:
        base_parts = parts
    
    # Add current timestamp
    current_timestamp = get_current_15min_timestamp()
    return "-".join(base_parts) + "-" + str(current_timestamp)


def is_15min_interval_market(condition_id_or_slug: str) -> bool:
    """
    Check if a condition_id or slug is for a 15-minute interval market
    
    Returns True if it matches patterns like:
    - btc-updown-15m-*
    - eth-updown-15m-*
    """
    slug_lower = condition_id_or_slug.lower()
    return (
        "-15m-" in slug_lower or 
        slug_lower.startswith("btc-updown-15m") or
        slug_lower.startswith("eth-updown-15m")
    )


def get_seconds_until_next_15min() -> int:
    """
    Get the number of seconds until the next 15-minute interval
    
    Useful for scheduling refreshes
    """
    now = datetime.now(timezone.utc)
    current_timestamp = get_current_15min_timestamp()
    next_timestamp = current_timestamp + 900  # Add 15 minutes
    
    # Convert to datetime for calculation
    next_dt = datetime.fromtimestamp(next_timestamp, timezone.utc)
    delta = next_dt - now
    
    return int(delta.total_seconds())


