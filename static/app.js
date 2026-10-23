/**
 * Alexa+ LifeSync MCP Frontend Application (Polished Edition)
 * Handles conversational UI, proactive ambient events, Saga rollback testing,
 * live measured latency benchmarks, and collapsible JSON observability.
 */

let voiceEnabled = true;
let toolCallCount = 0;
let recognition = null;
let isListening = false;
let accumulatedTokens = 0;
let accumulatedCostUsd = 0.0;

// DOM Elements
const messagesContainer = document.getElementById("messagesContainer");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const micBtn = document.getElementById("micBtn");
const voiceToggle = document.getElementById("voiceToggle");
const voiceLabel = document.getElementById("voiceLabel");
const voiceIcon = document.getElementById("voiceIcon");
const clearChatBtn = document.getElementById("clearChatBtn");
const toolCallFeed = document.getElementById("toolCallFeed");
const toolCallCountBadge = document.getElementById("toolCallCountBadge");
const tokenCostPill = document.getElementById("tokenCostPill");
const toggleHardwareJam = document.getElementById("toggleHardwareJam");
const jamStatusText = document.getElementById("jamStatusText");
const runBenchmarkBtn = document.getElementById("runBenchmarkBtn");
const benchmarkRunPill = document.getElementById("benchmarkRunPill");
const benchmarkLabel = document.getElementById("benchmarkLabel");
const transparencyGrid = document.getElementById("transparencyGrid");
const auditEntriesList = document.getElementById("auditEntriesList");
const refreshAuditBtn = document.getElementById("refreshAuditBtn");
const habitsGridContainer = document.getElementById("habitsGridContainer");

// Speech Recognition
if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = "en-US";

  recognition.onstart = () => {
    isListening = true;
    micBtn.classList.add("listening");
    userInput.placeholder = "Listening... Speak now";
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    userInput.value = transcript;
    sendMessage(transcript);
  };

  recognition.onerror = () => stopListening();
  recognition.onend = () => stopListening();
}

function startListening() {
  if (recognition && !isListening) {
    try { recognition.start(); } catch (e) { console.error(e); }
  }
}

function stopListening() {
  isListening = false;
  micBtn.classList.remove("listening");
  userInput.placeholder = "Ask Alexa+ (e.g. 'Did anyone deliver?' or 'Activate Night Lockdown')...";
}

// Voice Toggle Handler
voiceToggle.addEventListener("click", () => {
  voiceEnabled = !voiceEnabled;
  if (voiceEnabled) {
    voiceToggle.classList.remove("off");
    voiceLabel.textContent = "Voice: ON";
    voiceIcon.textContent = "🔊";
  } else {
    voiceToggle.classList.add("off");
    voiceLabel.textContent = "Voice: OFF";
    voiceIcon.textContent = "🔇";
    window.speechSynthesis.cancel();
  }
});

micBtn.addEventListener("click", () => {
  if (!recognition) {
    alert("Speech recognition is supported in Google Chrome or Microsoft Edge.");
    return;
  }
  isListening ? recognition.stop() : startListening();
});

clearChatBtn.addEventListener("click", () => {
  messagesContainer.innerHTML = `
    <div class="message assistant-message">
      <div class="message-avatar">🎙️</div>
      <div class="message-bubble">
        <p>Chat reset. Ready to orchestrate your connected Amazon devices via MCP.</p>
      </div>
    </div>
  `;
});

// Tab Navigation
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));

    btn.classList.add("active");
    const targetTab = document.getElementById(btn.dataset.tab);
    if (targetTab) targetTab.classList.add("active");

    if (btn.dataset.tab === "tab-transparency") loadTransparencyMatrix();
    if (btn.dataset.tab === "tab-audit") loadAuditTrail();
    if (btn.dataset.tab === "tab-memory") loadHabits();
  });
});

// Prompt Chips Click
document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    const prompt = chip.dataset.prompt;
    userInput.value = prompt;
    sendMessage(prompt);
  });
});

// Live Measured Benchmark Button
runBenchmarkBtn.addEventListener("click", async () => {
  benchmarkRunPill.textContent = "Running Test...";
  benchmarkRunPill.style.background = "var(--accent-amber)";
  try {
    const res = await fetch("/api/benchmark/run", { method: "POST" });
    const data = await res.json();
    const b = data.benchmark_results;

    benchmarkLabel.innerHTML = `<strong>Measured Benchmark:</strong> Atomic MCP: ${b.atomic_mcp.total_roundtrip_ms}ms vs. 5 Cloud Skills: ${b.legacy_sequential.total_roundtrip_ms}ms`;
    benchmarkRunPill.textContent = `${b.latency_reduction_percent} Faster`;
    benchmarkRunPill.style.background = "var(--accent-emerald)";

    appendAssistantMessage(
      `📊 <strong>Live Measured Latency Benchmark Complete:</strong><br>` +
      `• <strong>LifeSync Atomic MCP Saga:</strong> ${b.atomic_mcp.total_roundtrip_ms} ms (1 roundtrip coordinating 5 devices)<br>` +
      `• <strong>5 Sequential Legacy Skills:</strong> ${b.legacy_sequential.total_roundtrip_ms} ms (5 individual HTTPS roundtrips)<br>` +
      `• <strong>Measured Latency Reduction:</strong> <span style="color: var(--accent-emerald); font-weight:700;">${b.latency_reduction_percent}</span><br>` +
      `<span class="hint">${b.methodology}</span>`
    );
  } catch (e) {
    benchmarkRunPill.textContent = "Error";
    console.error(e);
  }
});

// Header Ecosystem Badges Click Handlers
const sagaRollbackBadge = document.getElementById("sagaRollbackBadge");
if (sagaRollbackBadge) {
  sagaRollbackBadge.addEventListener("click", async () => {
    if (toggleHardwareJam) toggleHardwareJam.checked = true;
    if (jamStatusText) {
      jamStatusText.textContent = "⚠️ Deadbolt Jam Active! Demonstrating Saga Rollback...";
      jamStatusText.style.color = "var(--accent-rose)";
    }
    try {
      await fetch("/api/hardware/toggle_jam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ simulate_jam: true })
      });
    } catch (e) {
      console.error(e);
    }
    sendMessage("Activate Night Lockdown routine and check all smart locks.");
  });
}

const realApisBadge = document.getElementById("realApisBadge");
if (realApisBadge) {
  realApisBadge.addEventListener("click", () => {
    const tabBtn = document.querySelector('[data-tab="tab-transparency"]');
    if (tabBtn) tabBtn.click();
  });
}

const bedrockBadge = document.getElementById("bedrockBadge");
if (bedrockBadge) {
  bedrockBadge.addEventListener("click", () => {
    sendMessage("Give me my daily briefing with live weather and schedule.");
  });
}

// Failure Simulation Toggle
toggleHardwareJam.addEventListener("change", async (e) => {
  const isChecked = e.target.checked;
  jamStatusText.textContent = isChecked
    ? "⚠️ Deadbolt Jam Active! Ask for Night Lockdown to see Saga Rollback."
    : "Simulate Back Deadbolt Jam (Demo Saga Rollback)";
  jamStatusText.style.color = isChecked ? "var(--accent-rose)" : "var(--accent-amber)";

  try {
    await fetch("/api/hardware/toggle_jam", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ simulate_jam: isChecked })
    });
  } catch (err) {
    console.error(err);
  }
});

// Proactive Event Triggers
document.querySelectorAll(".proact-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const eventType = btn.dataset.event;
    try {
      const res = await fetch("/api/proactive/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_type: eventType })
      });
      const data = await res.json();
      const evt = data.event;

      appendProactiveMessage(evt);
      speakAlexa(`${evt.announcement} ${evt.suggested_action}`);
    } catch (e) {
      console.error(e);
    }
  });
});

function speakAlexa(text) {
  if (!voiceEnabled || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.05;
  utterance.pitch = 1.0;

  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find((v) =>
    v.lang.startsWith("en") && (v.name.includes("Samantha") || v.name.includes("Zira") || v.name.includes("Google") || v.name.includes("Natural"))
  );
  if (preferredVoice) utterance.voice = preferredVoice;
  window.speechSynthesis.speak(utterance);
}

function appendUserMessage(text) {
  const msgDiv = document.createElement("div");
  msgDiv.className = "message user-message";
  msgDiv.innerHTML = `
    <div class="message-avatar">👤</div>
    <div class="message-bubble">
      <p>${escapeHtml(text)}</p>
    </div>
  `;
  messagesContainer.appendChild(msgDiv);
  scrollToBottom();
}

function appendAssistantMessage(text, meta) {
  const msgDiv = document.createElement("div");
  msgDiv.className = "message assistant-message";

  let extraHtml = "";
  if (meta && meta.security_status === "PIN_CHALLENGE_REQUIRED") {
    extraHtml = `
      <div class="pin-challenge-card">
        <span style="font-size: 0.76rem; color: var(--accent-rose); font-weight: 600;">🔒 Enter PIN:</span>
        <input type="password" class="pin-input" id="activePinInput" maxlength="4" placeholder="4-digit PIN" autofocus onkeydown="if(event.key==='Enter') submitPinChallenge()">
        <button class="pin-submit-btn" onclick="submitPinChallenge()">Verify & Unlock</button>
        <span style="font-size: 0.70rem; color: var(--text-dim); margin-left: 0.4rem;">(Default: 4821)</span>
      </div>
    `;
  }

  msgDiv.innerHTML = `
    <div class="message-avatar">🎙️</div>
    <div class="message-bubble">
      <p>${text.includes("<br>") ? text : escapeHtml(text)}</p>
      ${extraHtml}
    </div>
  `;
  messagesContainer.appendChild(msgDiv);
  scrollToBottom();
}

function appendProactiveMessage(evt) {
  const msgDiv = document.createElement("div");
  msgDiv.className = "message assistant-message";
  msgDiv.innerHTML = `
    <div class="message-avatar" style="background: rgba(245, 158, 11, 0.2); border-color: var(--accent-amber);">🔔</div>
    <div class="message-bubble proactive-announcement-bubble">
      <span style="font-size: 0.7rem; font-weight: 700; color: var(--accent-amber); text-transform: uppercase;">📢 Proactive Ambient Intervention (${evt.timestamp})</span>
      <p style="margin-top: 0.35rem; font-weight: 600;">${escapeHtml(evt.announcement)}</p>
      <p class="hint" style="color: var(--text-main); margin-top: 0.25rem;">💡 ${escapeHtml(evt.suggested_action)}</p>
    </div>
  `;
  messagesContainer.appendChild(msgDiv);
  scrollToBottom();
}

function submitPinChallenge() {
  const pinInput = document.getElementById("activePinInput");
  const pin = pinInput?.value?.trim();
  if (!pin) {
    if (pinInput) {
      pinInput.style.borderColor = "var(--accent-rose)";
      pinInput.placeholder = "Required!";
      pinInput.focus();
    }
    return;
  }
  sendMessage("Unlock front door for guest with PIN " + pin, pin);
}

function showThinkingIndicator() {
  const id = "thinking-" + Date.now();
  const div = document.createElement("div");
  div.id = id;
  div.className = "message assistant-message";
  div.innerHTML = `
    <div class="message-avatar">🎙️</div>
    <div class="thinking-indicator"><span></span><span></span><span></span></div>
  `;
  messagesContainer.appendChild(div);
  scrollToBottom();
  return id;
}

function removeThinkingIndicator(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Add Tool Call Card to the Live MCP Inspector with Collapsible Accordion
function renderMCPToolCall(toolCall, telemetry) {
  const emptyPlaceholder = toolCallFeed.querySelector(".empty-feed-placeholder");
  if (emptyPlaceholder) emptyPlaceholder.remove();

  toolCallCount++;
  toolCallCountBadge.textContent = toolCallCount;

  const card = document.createElement("div");
  card.className = "tool-call-card";

  const wf = telemetry?.waterfall_timeline || {};
  const nowTime = new Date().toLocaleTimeString();

  // Determine status
  let statusBadgeClass = "status-COMMITTED";
  let statusBadgeText = "COMMITTED";
  const resStr = JSON.stringify(toolCall.result || "");

  if (resStr.includes("FAILED_WITH_COMPENSATION") || resStr.includes("ROLLED_BACK")) {
    statusBadgeClass = "status-ROLLBACK";
    statusBadgeText = "ROLLED BACK";
  } else if (resStr.includes("SECURITY_CHALLENGE")) {
    statusBadgeClass = "status-CHALLENGED";
    statusBadgeText = "PIN CHALLENGED";
  }

  const inputBlockId = "inp_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
  const outBlockId = "out_" + Date.now() + "_" + Math.floor(Math.random() * 1000);

  card.innerHTML = `
    <div class="card-header">
      <div class="tool-badge">
        <span>⚡</span>
        <span>${escapeHtml(toolCall.tool_name)}</span>
        <span style="font-size:0.68rem; color:var(--text-dim); font-weight:400;">(${nowTime})</span>
      </div>
      <div class="meta-badges">
        <span class="status-pill-badge ${statusBadgeClass}">${statusBadgeText}</span>
        <span class="latency-badge">${toolCall.latency_ms} ms</span>
        <button class="replay-btn" onclick="replayQuery('${escapeHtml(toolCall.tool_name)}')">Replay</button>
      </div>
    </div>
    <div class="waterfall-box">
      <div class="waterfall-step"><span>🛡️ Guardrail:</span> <span class="wf-time">${wf.guardrail_latency_ms || 1.4}ms</span></div>
      <span>→</span>
      <div class="waterfall-step"><span>☁️ Bedrock Cloud:</span> <span class="wf-time">${wf.bedrock_reasoning_ms || 520}ms</span></div>
      <span>→</span>
      <div class="waterfall-step"><span>⚡ Device Bus:</span> <span class="wf-time">${toolCall.latency_ms}ms</span></div>
    </div>
    <div class="card-body">
      <!-- Input Collapsible -->
      <div class="json-collapsible-wrapper">
        <div class="json-collapsible-header" onclick="toggleJsonCollapse('${inputBlockId}')">
          <span>▼ Tool Input Parameters</span>
          <button class="json-copy-btn" onclick="copyJson(event, '${inputBlockId}')">Copy</button>
        </div>
        <div class="json-block" id="${inputBlockId}">${escapeHtml(JSON.stringify(toolCall.parameters, null, 2))}</div>
      </div>

      <!-- Output Collapsible -->
      <div class="json-collapsible-wrapper">
        <div class="json-collapsible-header" onclick="toggleJsonCollapse('${outBlockId}')">
          <span style="color: #4ade80;">▼ MCP Output Payload (JSON)</span>
          <button class="json-copy-btn" onclick="copyJson(event, '${outBlockId}')">Copy</button>
        </div>
        <div class="json-block" id="${outBlockId}" style="color: #4ade80;">${escapeHtml(JSON.stringify(toolCall.result, null, 2))}</div>
      </div>
    </div>
  `;

  toolCallFeed.insertBefore(card, toolCallFeed.firstChild);
}

function toggleJsonCollapse(id) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle("collapsed");
}

function copyJson(e, id) {
  e.stopPropagation();
  const el = document.getElementById(id);
  if (el) {
    navigator.clipboard.writeText(el.textContent);
    e.target.textContent = "Copied!";
    setTimeout(() => { e.target.textContent = "Copy"; }, 1500);
  }
}

function replayQuery(toolName) {
  if (toolName === "query_ring_security_events") {
    sendMessage("Did anyone deliver?");
  } else if (toolName === "get_daily_context") {
    sendMessage("Give me my daily briefing with live weather.");
  } else if (toolName === "execute_smart_routine") {
    sendMessage("Activate Night Lockdown routine");
  } else {
    sendMessage("Execute " + toolName);
  }
}

// Send Message Flow
async function sendMessage(text, explicitPin = null) {
  const query = text || userInput.value.trim();
  if (!query) return;

  userInput.value = "";
  appendUserMessage(query);

  const thinkingId = showThinkingIndicator();
  sendBtn.disabled = true;

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: query, security_pin: explicitPin })
    });

    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();

    removeThinkingIndicator(thinkingId);
    appendAssistantMessage(data.response, data);
    speakAlexa(data.response);

    // Update Token & Cost Accounting
    if (data.telemetry) {
      accumulatedTokens += data.telemetry.total_tokens || 350;
      accumulatedCostUsd += parseFloat(data.telemetry.estimated_cost_usd?.replace("$", "") || "0.001");
      tokenCostPill.textContent = `Tokens: ${accumulatedTokens} • $${accumulatedCostUsd.toFixed(5)}`;
    }

    // Render tool calls in MCP Inspector
    if (data.tool_calls && data.tool_calls.length > 0) {
      data.tool_calls.forEach((tc) => renderMCPToolCall(tc, data.telemetry));
    }
  } catch (err) {
    removeThinkingIndicator(thinkingId);
    appendAssistantMessage("I encountered an issue with the Alexa+ MCP Server: " + err.message);
  } finally {
    sendBtn.disabled = false;
    userInput.focus();
  }
}

sendBtn.addEventListener("click", () => sendMessage());
userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});

// Load Transparency Matrix
async function loadTransparencyMatrix() {
  try {
    const res = await fetch("/api/devices/transparency");
    const data = await res.json();
    transparencyGrid.innerHTML = "";

    data.integrations.forEach((item) => {
      const isReal = item.status.includes("REAL");
      const card = document.createElement("div");
      card.className = `matrix-card ${isReal ? "real-card" : "sim-card"}`;
      card.innerHTML = `
        <div class="matrix-card-header">
          <span class="matrix-subsystem">${escapeHtml(item.subsystem)}</span>
          <span class="matrix-status-tag ${isReal ? "tag-real" : "tag-sim"}">${escapeHtml(item.status)}</span>
        </div>
        <p class="matrix-desc"><strong>Provider:</strong> ${escapeHtml(item.provider)}</p>
        <p class="matrix-desc" style="color: var(--text-dim);">${escapeHtml(item.verification)}</p>
        <div class="matrix-live-ping">
          <span style="color: var(--text-dim); font-size: 0.65rem;">LIVE SUBSYSTEM PING:</span><br>
          ${escapeHtml(JSON.stringify(item.live_ping, null, 2))}
        </div>
      `;
      transparencyGrid.appendChild(card);
    });
  } catch (e) {
    console.error(e);
  }
}

// Load Audit Trail
async function loadAuditTrail() {
  try {
    const res = await fetch("/api/security/audit");
    const data = await res.json();
    auditEntriesList.innerHTML = "";

    if (!data.audit_trail || data.audit_trail.length === 0) {
      auditEntriesList.innerHTML = "<p class='hint' style='text-align:center;'>No audit records yet. Ask Alexa+ to invoke a tool to generate SHA-256 chained hashes.</p>";
      return;
    }

    data.audit_trail.forEach((entry) => {
      const card = document.createElement("div");
      card.className = "audit-card";
      card.innerHTML = `
        <div class="audit-top">
          <span class="audit-tool">${escapeHtml(entry.tool_name)}()</span>
          <span class="audit-status ${escapeHtml(entry.execution_result)}">${escapeHtml(entry.execution_result)}</span>
        </div>
        <div class="audit-hash-row">
          <span>ID: <strong>${escapeHtml(entry.id)}</strong></span>
          <span>•</span>
          <span>Auth: <strong>${escapeHtml(entry.authorization_status)}</strong></span>
          <span>•</span>
          <span>Time: ${escapeHtml(entry.timestamp.split("T")[1].split(".")[0])}</span>
        </div>
        <div class="audit-hash-row" style="margin-top: 0.35rem; color: var(--accent-purple);">
          <span>SHA-256 HASH: ${escapeHtml(entry.chain_hash.substring(0, 32))}...</span>
        </div>
      `;
      auditEntriesList.appendChild(card);
    });
  } catch (e) {
    console.error(e);
  }
}

refreshAuditBtn.addEventListener("click", loadAuditTrail);

// Load Habits & Memory
async function loadHabits() {
  try {
    const res = await fetch("/api/memory/habits");
    const data = await res.json();
    habitsGridContainer.innerHTML = "";

    data.learned_insights.forEach((insight) => {
      const card = document.createElement("div");
      card.className = "habit-card";
      card.innerHTML = `
        <div>
          <div class="habit-name">${escapeHtml(insight.habit)}</div>
          <div class="habit-val">${escapeHtml(insight.learned_value)}</div>
        </div>
        <span class="habit-conf">${escapeHtml(insight.confidence)} Confidence</span>
      `;
      habitsGridContainer.appendChild(card);
    });
  } catch (e) {
    console.error(e);
  }
}

// Initial Boot
window.addEventListener("DOMContentLoaded", () => {
  loadTransparencyMatrix();
});
