"""Weather API handler for Gateway integration."""

import json
from typing import Any


def handler(event: dict, context: Any) -> dict:
    """Handle weather API requests."""
    # In a real implementation, this would call a weather API

    location = event.get("queryStringParameters", {}).get("location", "Unknown")

    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json"
        },
        "body": json.dumps({
            "location": location,
            "temperature": 72,
            "unit": "fahrenheit",
            "conditions": "Sunny",
            "humidity": 45
        })
    }
