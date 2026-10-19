# 🎬 Hackathon Demo Video Script (< 3 Minutes)

**Title:** Alexa+ LifeSync: Autonomous Ambient Agent with Compensating Saga & MCP  
**Submission:** Build, Ship, Shape: Amazon Developer Hackathon 2026 (Devpost)  
**Target Duration:** 2 minutes 45 seconds  

---

### Segment 1: The Problem & Accessibility Impact (0:00 - 0:30)
* **Visual:** Title Slide / Speaker Facecam showing the Devpost Hackathon banner.
* **Audio / Script:**
  > *"Hi everyone! Smart homes today suffer from three critical flaws: they break when users speak naturally, their multi-device routines are pseudo-atomic—meaning a jammed lock leaves your home half-secured without rollback—and high-risk actions like unlocking deadbolts lack voice authorization.
  > 
  > For seniors and people with mobility limits, these aren't minor inconveniences—they're real safety risks.
  > 
  > With Amazon opening up Alexa+ to the Model Context Protocol (MCP), we built **Alexa+ LifeSync**—an autonomous ambient agent with genuine API credibility, Compensating Saga orchestration, and cryptographic trust guardrails powered by AWS Bedrock."*

---

### Segment 2: Natural Paraphrasing & Ring Vision (0:30 - 1:00)
* **Action:** Go to `http://localhost:8000`. Click microphone or type: **"Did anyone deliver?"**
* **Visual:** Show the tool call card `query_ring_security_events` appear with timing waterfall.
* **Audio / Script:**
  > *"First, notice how I asked: 'Did anyone deliver?' No rigid skill invocation phrase. 
  > 
  > Our intent engine maps natural, sloppy paraphrases directly to the `query_ring_security_events` MCP tool. 
  > 
  > In 520 milliseconds of realistic Bedrock cloud inference and under 1 millisecond on the local device bus, Alexa reports the Amazon Logistics courier on the porch mat, while respecting our strict zero-retention camera privacy policy."*

---

### Segment 3: Failure Engineering & Compensating Saga Rollback (1:00 - 1:45)
* **Action 1:** Click **"Night Lockdown"** without failure $\rightarrow$ Show committed state.
* **Action 2:** Flip **"Simulate Back Deadbolt Jam"** switch to ON $\rightarrow$ Click **"Night Lockdown"**.
* **Visual:** Show the red `ROLLED BACK` card in the Inspector and the audit entry in the Audit tab.
* **Audio / Script:**
  > *"Now for our deepest distributed systems capability: True Atomicity via the Saga Pattern.
  > 
  > Most routines blindly fire 5 commands. But here, we've simulated a physical motor obstruction on the back deadbolt.
  > 
  > Watch: The Saga coordinator detects the jam at step 2, halts forward execution, and immediately triggers compensating rollbacks: it disarms the perimeter alarm so you aren't given false confidence, restores the thermostat, and sounds an exact voice diagnostic.
  > 
  > That is real engineering resilience."*

---

### Segment 4: Security PIN Challenge & Proactive Ambient Alert (1:45 - 2:20)
* **Action 1:** Say or click **"Unlock the front door for guest"**.
* **Visual:** Show the PIN challenge card pop up in chat.
* **Audio / Script:**
  > *"Next, our Trust Layer: High-risk actions like unlocking exterior deadbolts are blocked by a security guardrail until the homeowner provides their voice PIN—4821.
  > 
  > And LifeSync isn't just reactive. Watch what happens when an ambient event triggers."*
* **Action 2:** Click **"📦 Porch Delivery"** on the Judge Ribbon:
* **Audio / Script:**
  > *"The ambient event bus proactively interrupts: Alexa announces the delivery and offers to illuminate the walkway unprompted."*

---

### Segment 5: Live Benchmark, Credibility & Alexa Console (2:20 - 2:45)
* **Action:** Click **"▶ Run Live Test"** on the top header benchmark button.
* **Visual:** Show the measured side-by-side comparison (85.3% reduction) and click the **"Real vs Simulated"** tab.
* **Audio / Script:**
  > *"Finally, no fake numbers: our live benchmark runner executes a measured side-by-side test showing an 85.3% latency reduction compared to 5 sequential cloud skills.
  > 
  > We wired up genuinely real Open-Meteo weather and iCal sync, and even included an official Alexa Skills Kit webhook for testing in developer.amazon.com.
  > 
  > Check out our open-source repo, AWS SAM template, and friction log on GitHub. Thank you!"*
