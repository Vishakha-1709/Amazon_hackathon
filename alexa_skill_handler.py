"""
Amazon Alexa Skills Kit (ASK) Compatible Webhook Adapter
========================================================
Implements the official Amazon Alexa Skills Kit JSON request/response contract.
Allows connecting this self-hosted server directly to the official Alexa Developer Console
(developer.amazon.com) simulator or production Echo devices via HTTPS webhook.
"""

import json
import logging
from typing import Dict, Any

from bedrock_agent import BedrockMCPAgent

logger = logging.getLogger("AlexaSkillHandler")
agent = BedrockMCPAgent()


def handle_alexa_request(request_body: Dict[str, Any]) -> Dict[str, Any]:
    """
    Processes standard Alexa Skills Kit JSON payload.
    Supports LaunchRequest, IntentRequest, and SessionEndedRequest.
    """
    req_type = request_body.get("request", {}).get("type", "LaunchRequest")
    session = request_body.get("session", {})
    user_id = session.get("user", {}).get("userId", "default_user")

    if req_type == "LaunchRequest":
        speech_text = (
            "Welcome to LifeSync for Alexa+. Your Model Context Protocol server is connected. "
            "You can ask about Ring deliveries, live weather briefings, or run your Night Lockdown routine."
        )
        return _build_alexa_response(speech_text, should_end_session=False)

    elif req_type == "IntentRequest":
        intent_name = request_body.get("request", {}).get("intent", {}).get("name", "")
        slots = request_body.get("request", {}).get("intent", {}).get("slots", {})

        # Extract spoken utterance or query
        query_text = ""
        if "query" in slots:
            query_text = slots["query"].get("value", "")
        elif "routine" in slots:
            query_text = f"Activate {slots['routine'].get('value', '')} routine"
        else:
            query_text = intent_name.replace("AMAZON.", "").replace("Intent", "")

        logger.info("Received Alexa Intent '%s' with query: '%s'", intent_name, query_text)

        # Route through Bedrock Agent
        agent_result = agent.process_message(query_text or "Give me my daily briefing")
        speech_text = agent_result["response"]

        return _build_alexa_response(speech_text, should_end_session=True)

    elif req_type == "SessionEndedRequest":
        return _build_alexa_response("Goodbye from LifeSync.", should_end_session=True)

    else:
        return _build_alexa_response("LifeSync received an unrecognized Alexa event.", should_end_session=True)


def _build_alexa_response(speech_text: str, should_end_session: bool = True) -> Dict[str, Any]:
    """Formats payload adhering to standard Alexa Skills Kit response schema."""
    return {
        "version": "1.0",
        "response": {
            "outputSpeech": {
                "type": "PlainText",
                "text": speech_text
            },
            "card": {
                "type": "Simple",
                "title": "Alexa+ LifeSync MCP",
                "content": speech_text
            },
            "shouldEndSession": should_end_session
        }
    }
