"""
Amazon Alexa Skills Kit (ASK) Production Webhook Adapter
========================================================
Implements the official Amazon Alexa Skills Kit JSON request/response contract.
Supports:
  - LaunchRequest, IntentRequest, and SessionEndedRequest.
  - Multi-turn PIN challenge sessions maintaining pending_query in sessionAttributes.
  - Built-in Stop, Cancel, Help, and Fallback intents.
  - Timestamp staleness and Skill ID verification.
"""

import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from bedrock_agent import BedrockMCPAgent

logger = logging.getLogger("AlexaSkillHandler")
agent = BedrockMCPAgent()
ALEXA_SKILL_ID = os.getenv("ALEXA_SKILL_ID")  # Optional: amzn1.ask.skill....

_INTENT_TEXT = {"AMAZON.HelpIntent": "help", "AMAZON.FallbackIntent": "status"}

def _slot(slots: Dict[str, Any], name: str) -> Optional[str]:
    return (slots.get(name) or {}).get("value")

def verify_alexa_basics(body: Dict[str, Any]) -> None:
    req = body.get("request", {})
    ts = req.get("timestamp")
    if ts:
        try:
            age = abs((datetime.now(timezone.utc) -
                       datetime.fromisoformat(ts.replace("Z", "+00:00"))).total_seconds())
            if age > 150:
                raise ValueError("stale Alexa request (> 150s)")
        except Exception as e:
            if "stale" in str(e):
                raise

    app = (body.get("session", {}).get("application")
           or body.get("context", {}).get("System", {}).get("application", {}))
    if ALEXA_SKILL_ID and app and app.get("applicationId") != ALEXA_SKILL_ID:
        raise ValueError("unexpected skill id")

def handle_alexa_request(body: Dict[str, Any]) -> Dict[str, Any]:
    verify_alexa_basics(body)
    req = body.get("request", {})
    rtype = req.get("type", "LaunchRequest")
    attrs = (body.get("session") or {}).get("attributes") or {}

    if rtype == "SessionEndedRequest":
        return {"version": "1.0", "response": {}}
    if rtype == "LaunchRequest":
        return _resp("Welcome to LifeSync. Ask about deliveries, your briefing, or say night lockdown.",
                     end=False, reprompt="What would you like to do?")
    if rtype != "IntentRequest":
        return _resp("LifeSync received an unrecognized event.")

    intent = req.get("intent", {})
    name, slots = intent.get("name", ""), intent.get("slots") or {}

    if name in ("AMAZON.StopIntent", "AMAZON.CancelIntent"):
        return _resp("Goodbye from LifeSync.")
    if name == "AMAZON.HelpIntent":
        return _resp("You can ask who delivered a package, get your briefing, or run night lockdown.",
                     end=False, reprompt="What would you like to do?")

    pin = _slot(slots, "pin")  # AMAZON.FOUR_DIGIT_NUMBER slot on a PinIntent
    if pin and attrs.get("pending_query"):
        query = attrs["pending_query"]
    elif _slot(slots, "query"):
        query = _slot(slots, "query")
    elif _slot(slots, "routine"):
        query = f"Activate {_slot(slots, 'routine')} routine"
    else:
        query = _INTENT_TEXT.get(name, "") or "Give me my daily briefing"

    result = agent.process_message(query, provided_pin=pin)

    if result.get("security_status") == "PIN_CHALLENGE_REQUIRED":
        return _resp(result["response"], end=False,
                     reprompt="Please say your four digit PIN.",
                     attrs={"pending_query": query})
    return _resp(result["response"])

def _resp(text: str, end: bool = True, reprompt: Optional[str] = None,
          attrs: Optional[dict] = None) -> Dict[str, Any]:
    r: Dict[str, Any] = {
        "outputSpeech": {"type": "PlainText", "text": text},
        "card": {"type": "Simple", "title": "Alexa+ LifeSync", "content": text},
        "shouldEndSession": end,
    }
    if reprompt:
        r["reprompt"] = {"outputSpeech": {"type": "PlainText", "text": reprompt}}
    return {"version": "1.0", "sessionAttributes": attrs or {}, "response": r}
