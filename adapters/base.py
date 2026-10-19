"""
Base Adapter Specification for Alexa+ LifeSync MCP
===================================================
Provides a unified abstract interface for all device subsystems,
allowing clean separation between live production APIs and modular simulators.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List

class DeviceAdapter(ABC):
    @property
    @abstractmethod
    def adapter_name(self) -> str:
        """Human-readable identifier of the subsystem."""
        pass

    @property
    @abstractmethod
    def integration_type(self) -> str:
        """Either 'LIVE_REAL_API' or 'MODULAR_SIMULATOR'."""
        pass

    @property
    @abstractmethod
    def description(self) -> str:
        """Detailed description of what this adapter manages."""
        pass

    @abstractmethod
    def health_check(self) -> Dict[str, Any]:
        """Returns health telemetry and connectivity state."""
        pass

    @abstractmethod
    def get_status_summary(self) -> Dict[str, Any]:
        """Returns current operational status for the Alexa+ agent."""
        pass
