"""
Smart Home Saga Orchestration with Compensating Rollback
=========================================================
Ensures distributed transaction resilience across Zigbee/Matter devices using the Saga Pattern.
If a step fails (e.g. back deadbolt motor jams), the Saga coordinator triggers
compensating actions to revert previously committed steps to a safe state,
reporting an exact diagnostic rather than leaving an insecure half-state.
"""

import time
import logging
from typing import Dict, Any, List, Optional
from adapters.base import DeviceAdapter

logger = logging.getLogger("SmartHomeSaga")

class SmartHomeSagaAdapter(DeviceAdapter):
    def __init__(self):
        self._name = "Smart Home Device Hub (Zigbee/Matter)"
        self._integration_type = "MODULAR_SIMULATOR"
        self._description = "Matter/Zigbee device coordinator supporting Saga atomic multi-device routines with compensating rollback."
        
        # Hardware failure simulation toggle for live demos
        self.simulate_hardware_failure = False
        self.failure_target_device = "back_deadbolt"

        # Current physical state
        self.state = {
            "security_system": "Disarmed",
            "front_door_lock": "Locked",
            "back_door_lock": "Unlocked",
            "garage_door": "Closed",
            "living_room_lights": "On (warm white, 65%)",
            "office_lights": "On (daylight 5000K, 90%)",
            "patio_lights": "Off",
            "thermostat_hvac": {
                "mode": "auto",
                "target_temp_f": 71,
                "current_temp_f": 71,
                "humidity_percent": 44
            },
            "power_consumption_watts": 820
        }

    @property
    def adapter_name(self) -> str:
        return self._name

    @property
    def integration_type(self) -> str:
        return self._integration_type

    @property
    def description(self) -> str:
        return self._description

    def health_check(self) -> Dict[str, Any]:
        return {
            "adapter": self.adapter_name,
            "type": self.integration_type,
            "connected_devices_count": 8,
            "protocol": "Matter 1.3 over Thread / Zigbee 3.0",
            "failure_injection_active": self.simulate_hardware_failure,
            "transaction_pattern": "Saga with Compensating Transactions"
        }

    def get_status_summary(self) -> Dict[str, Any]:
        return self.state

    def execute_night_lockdown_saga(self) -> Dict[str, Any]:
        """
        Executes the 'Night Lockdown' routine as an atomic Saga with compensating rollback.
        Steps:
          1. Lock Front Deadbolt (Compensate: unlock)
          2. Lock Back Deadbolt (Compensate: unlock)
          3. Arm Ring Security (Compensate: disarm)
          4. Set Thermostat to 68°F (Compensate: restore previous temp)
          5. Turn off Living Room & Office lights (Compensate: turn on lights)
        """
        logger.info("Initiating Night Lockdown Compensating Saga...")
        completed_steps = []
        compensations_executed = []
        prev_thermostat = self.state["thermostat_hvac"]["target_temp_f"]

        try:
            # Step 1: Front Deadbolt
            self.state["front_door_lock"] = "Locked"
            completed_steps.append({
                "step": 1,
                "action": "Engage Front Deadbolt",
                "device": "front_deadbolt",
                "status": "SUCCESS"
            })

            # Step 2: Back Deadbolt (Fails if failure injection is toggled on)
            if self.simulate_hardware_failure:
                raise RuntimeError("HARDWARE_JAM: Back Door Deadbolt motor obstructed (sensor reports deadbolt failed to throw fully into strike plate).")

            self.state["back_door_lock"] = "Locked"
            completed_steps.append({
                "step": 2,
                "action": "Engage Back Deadbolt",
                "device": "back_deadbolt",
                "status": "SUCCESS"
            })

            # Step 3: Arm Ring Security
            self.state["security_system"] = "Armed (Home Mode)"
            completed_steps.append({
                "step": 3,
                "action": "Arm Ring Security to Home Mode",
                "device": "ring_alarm_base",
                "status": "SUCCESS"
            })

            # Step 4: Adjust Thermostat
            self.state["thermostat_hvac"]["target_temp_f"] = 68
            completed_steps.append({
                "step": 4,
                "action": "Set Thermostat to 68°F (Sleep Mode)",
                "device": "smart_thermostat",
                "status": "SUCCESS"
            })

            # Step 5: Extinguish Lights
            self.state["living_room_lights"] = "Off"
            self.state["office_lights"] = "Off"
            completed_steps.append({
                "step": 5,
                "action": "Extinguish Living Room and Office lighting",
                "device": "smart_lighting_group",
                "status": "SUCCESS"
            })

            return {
                "status": "SUCCESS",
                "saga_state": "FULLY_COMMITTED",
                "transaction_pattern": "Saga Orchestration (Compensating Actions Defined)",
                "steps_completed_count": len(completed_steps),
                "steps": completed_steps,
                "message": "Night Lockdown completed successfully. All perimeter deadbolts confirmed, security armed, and climate adjusted."
            }

        except Exception as ex:
            logger.error("Saga step 2 failed: %s. Initiating compensating rollback...", ex)
            
            # --- SAGA COMPENSATING ROLLBACK ---
            compensations_executed.append("Preserved Front Deadbolt locked state for perimeter defense.")
            self.state["security_system"] = "Disarmed (Perimeter Incomplete)"
            compensations_executed.append("Reverted Ring Alarm from Armed to 'Disarmed (Warning)' due to unlatched back entry.")
            self.state["thermostat_hvac"]["target_temp_f"] = prev_thermostat
            compensations_executed.append(f"Restored Thermostat target back to {prev_thermostat}°F.")

            return {
                "status": "FAILED_WITH_COMPENSATION",
                "saga_state": "COMPENSATED_TO_SAFE_STATE",
                "transaction_pattern": "Saga Orchestration with Compensating Transactions",
                "error": str(ex),
                "failed_step": {
                    "step": 2,
                    "device": "back_deadbolt",
                    "reason": "Physical deadbolt obstruction / Motor jam sensor"
                },
                "compensating_actions": compensations_executed,
                "current_partial_state": {
                    "front_door": self.state["front_door_lock"],
                    "back_door": "JAMMED_UNLOCKED",
                    "security_system": self.state["security_system"]
                },
                "recommended_user_action": "Please physically inspect the back door strike plate before retiring."
            }

smart_home_hub = SmartHomeSagaAdapter()
