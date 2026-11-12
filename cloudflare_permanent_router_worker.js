/**
 * LLM4Decompile Omni-Nexus v1.4 - Zero-Cache Edge-Smart Cloudflare Worker Router
 * ==============================================================================
 * Permanent Gemini Connected Apps URL:
 *   https://llm4decompile-mcp-forever.forested-lung.workers.dev/mcp
 * Reads LIVE_MCP_URL.json via the 0-cache GitHub Contents API and executes model
 * catalog lookups, objdump preprocessing, and Ghidra/IDA pseudocode refinement at the Edge!
 */
const GITHUB_API_LIVE_JSON_URL = "https://api.github.com/repos/alisyyed/llm4decompile-mcp-omni-cloud/contents/LIVE_MCP_URL.json?ref=main";
const GITHUB_RAW_LIVE_JSON_URL = "https://raw.githubusercontent.com/alisyyed/llm4decompile-mcp-omni-cloud/main/LIVE_MCP_URL.json";
const GITHUB_DISPATCH_URL = "https://api.github.com/repos/alisyyed/llm4decompile-mcp-omni-cloud/actions/workflows/llm4decompile_mcp_cloud.yml/dispatches";
const AUTO_WAKE_GH_TOKEN = "";
const EDGE_CURATED_TOOLS = [{"name": "llm4decompile_doctor_and_status", "description": "[LLM4Decompile Omni-Nexus] Check health of the 24/7 LLM4Decompile Cloud MCP Relay, Zero-Cache Edge Router, installed toolchain (`gcc`, `objdump`, `nm`, `python3`), and available `LLM4Binary` model checkpoints.", "inputSchema": {"type": "object", "properties": {}}}, {"name": "llm4decompile_list_models_and_benchmarks", "description": "[LLM4Decompile Omni-Nexus] Browse or search all `albertan017/LLM4Decompile` model families (`end_to_end_models`, `refine_models_v2`, `sk2decompile_two_phase`, `benchmarks_and_datasets`).", "inputSchema": {"type": "object", "properties": {"category": {"type": "string", "description": "Optional category filter (`end_to_end_models`, `refine_models_v2`, `sk2decompile_two_phase`, `benchmarks_and_datasets`)."}, "search": {"type": "string", "description": "Optional keyword substring (e.g. '9b-v2', 'sk2decompile', 'ghidra', 'humaneval')."}}}}, {"name": "llm4decompile_preprocess_binary_or_asm", "description": "[LLM4Decompile Omni-Nexus] Run the official `albertan017/LLM4Decompile` preprocessing pipeline on an ELF/PE binary, C source file, or raw `objdump -d` snippet: strips binary hex bytes and comments, formats `<func_name>:` instructions, and builds the exact `# This is the assembly code:\\n...\\n# What is the source code?\\n` prompt.", "inputSchema": {"type": "object", "properties": {"target_path_or_asm": {"type": "string", "description": "Raw `objdump -d` assembly text, local binary path, or HTTPS URL to a binary."}, "function_name": {"type": "string", "description": "Function symbol to extract and format (default: 'func0' or 'derive_route_seed')."}}, "required": ["target_path_or_asm"]}}, {"name": "llm4decompile_decompile_asm_to_c", "description": "[LLM4Decompile Omni-Nexus] Translate x86_64 assembly (`objdump -d` format or target binary function) into clean, compilable C source code using the `LLM4Decompile-End` pipeline (structural lifter + optional HF/local `LLM4Binary/llm4decompile-6.7b-v1.5` backend).", "inputSchema": {"type": "object", "properties": {"asm_or_binary": {"type": "string", "description": "Assembly snippet or path/URL to binary."}, "function_name": {"type": "string", "description": "Function name to decompile (default: 'derive_route_seed')."}, "model_id": {"type": "string", "description": "Target checkpoint (default: 'LLM4Binary/llm4decompile-6.7b-v1.5')."}}, "required": ["asm_or_binary"]}}, {"name": "llm4decompile_refine_pseudocode_to_c", "description": "[LLM4Decompile Omni-Nexus] Run the `LLM4Decompile-Ref` (V2 `llm4decompile-9b-v2`) & Two-Phase `SK2Decompile` (Skeleton structure recovery + Skin identifier naming) pipeline on raw Ghidra (`FUN_*`, `uVar*`, `local_*`) or Hex-Rays IDA pseudocode to produce clean, standard C.", "inputSchema": {"type": "object", "properties": {"pseudocode": {"type": "string", "description": "Raw Ghidra or IDA decompiler pseudocode to refine into clean C."}, "apply_sk2_two_phase": {"type": "boolean", "description": "Whether to run both Phase 1 (Skeleton structure normalization) and Phase 2 (Skin semantic variable renaming). Default: true."}}, "required": ["pseudocode"]}}, {"name": "llm4decompile_verify_reexecutability", "description": "[LLM4Decompile Omni-Nexus] Compile decompiled C code across GCC optimization levels (`-O0`, `-O1`, `-O2`, `-O3`) with a C `assert(...)` test harness (`HumanEval-Decompile` protocol) on the cloud VM and verify whether it compiles and passes all test assertions.", "inputSchema": {"type": "object", "properties": {"decompiled_c_code": {"type": "string", "description": "The decompiled C function source code."}, "c_test_harness": {"type": "string", "description": "C `main()` test harness containing `assert(...)` checks to verify functional equivalence."}, "optimization_levels": {"type": "string", "description": "Comma-separated GCC optimization flags to test (default: 'O0,O1,O2,O3')."}}, "required": ["decompiled_c_code", "c_test_harness"]}}, {"name": "llm4decompile_compile_and_benchmark_c", "description": "[LLM4Decompile Omni-Nexus] Take a C source function, compile it with `gcc` across `-O0`, `-O1`, `-O2`, and `-O3` on the cloud VM, extract the cleaned `objdump -d` assembly for each optimization level, and generate the 4 `LLM4Decompile` evaluation prompts.", "inputSchema": {"type": "object", "properties": {"c_source_code": {"type": "string", "description": "C source code containing the target function."}, "function_name": {"type": "string", "description": "Name of the C function to extract across O0-O3 (e.g. 'func0')."}}, "required": ["c_source_code", "function_name"]}}, {"name": "llm4decompile_generate_inference_script", "description": "[LLM4Decompile Omni-Nexus] Generate a complete Python script or Colab/Kaggle GPU runner for `LLM4Decompile-End` (v1.5/v1.6), `LLM4Decompile-Ref` (v2 1.3B-22B), or `SK2Decompile` using Hugging Face `transformers`, `vLLM`, or `llama.cpp` / `Ollama`.", "inputSchema": {"type": "object", "properties": {"model_id": {"type": "string", "description": "Model ID (e.g. 'LLM4Binary/llm4decompile-9b-v2', 'LLM4Binary/llm4decompile-6.7b-v1.5', 'LLM4Binary/sk2decompile-struct-6.7b')."}, "runtime_backend": {"type": "string", "description": "Execution backend: 'transformers_gpu' (default), 'transformers_cpu_1_3b', 'vllm_batch', or 'ghidra_headless_ref'."}}, "required": ["model_id"]}}, {"name": "llm4decompile_quad_engine_bridge", "description": "[LLM4Decompile Omni-Nexus] Orchestrate a 4-way pipeline combining `GhidraMCP` (`ghidra-omni-nexus`), `Hex-Rays IDA` (`ida-hexrays-omni-nexus`), `LLM4Decompile` (`llm4decompile-omni-nexus`), and `Craft-Anything` (`craft-anything-omni-foundry`).", "inputSchema": {"type": "object", "properties": {"workflow_goal": {"type": "string", "description": "Goal to execute across the 4 connected cloud MCP engines."}}, "required": ["workflow_goal"]}}];
const EDGE_CATALOG = {"end_to_end_models": {"title": "LLM4Decompile-End Series (Direct Objdump x86_64 Assembly to C Source)", "hf_org": "https://huggingface.co/LLM4Binary", "repo_url": "https://github.com/albertan017/LLM4Decompile", "models": [{"id": "LLM4Binary/llm4decompile-1.3b-v1.5", "params": "1.3B", "mode": "End2End (Objdump ASM -> C)", "re_executability_humaneval": "27.3%", "max_tokens": 4096, "url": "https://huggingface.co/LLM4Binary/llm4decompile-1.3b-v1.5"}, {"id": "LLM4Binary/llm4decompile-6.7b-v1.5", "params": "6.7B", "mode": "End2End (Objdump ASM -> C, 15B training tokens)", "re_executability_humaneval": "45.4%", "max_tokens": 4096, "url": "https://huggingface.co/LLM4Binary/llm4decompile-6.7b-v1.5"}, {"id": "LLM4Binary/llm4decompile-1.3b-v1.6", "params": "1.3B", "mode": "End2End DCBench (Trained on Decompile-Bench)", "re_executability_humaneval": "31.0%", "max_tokens": 4096, "url": "https://huggingface.co/LLM4Binary/llm4decompile-1.3b-v1.6"}, {"id": "LLM4Binary/llm4decompile-6.7b-v1.6", "params": "6.7B", "mode": "End2End DCBench (Trained on Decompile-Bench)", "re_executability_humaneval": "48.2%", "max_tokens": 4096, "url": "https://huggingface.co/LLM4Binary/llm4decompile-6.7b-v1.6"}, {"id": "LLM4Binary/llm4decompile-6.7b-uo", "params": "6.7B", "mode": "Unified Optimization (O0-O3 blind decompilation)", "re_executability_humaneval": "21.9%", "max_tokens": 4096, "url": "https://huggingface.co/LLM4Binary/llm4decompile-6.7b-uo"}]}, "refine_models_v2": {"title": "LLM4Decompile-Ref V2 Series (Ghidra / IDA Pseudo-Code Refinement to C)", "hf_org": "https://huggingface.co/LLM4Binary", "repo_url": "https://github.com/albertan017/LLM4Decompile/tree/main/ghidra", "models": [{"id": "LLM4Binary/llm4decompile-1.3b-v2", "params": "1.3B", "mode": "Refine (Ghidra/IDA Pseudo-Code -> Re-Executable C)", "re_executability_humaneval": "46.0%", "max_tokens": 4096, "url": "https://huggingface.co/LLM4Binary/llm4decompile-1.3b-v2"}, {"id": "LLM4Binary/llm4decompile-6.7b-v2", "params": "6.7B", "mode": "Refine (Ghidra/IDA Pseudo-Code -> Re-Executable C)", "re_executability_humaneval": "52.7%", "max_tokens": 4096, "url": "https://huggingface.co/LLM4Binary/llm4decompile-6.7b-v2"}, {"id": "LLM4Binary/llm4decompile-9b-v2", "params": "9B (Yi-Coder-9B base)", "mode": "Refine Flagship (Highest accuracy on HumanEval-Decompile)", "re_executability_humaneval": "64.94%", "max_tokens": 4096, "url": "https://huggingface.co/LLM4Binary/llm4decompile-9b-v2"}, {"id": "LLM4Binary/llm4decompile-22b-v2", "params": "22B", "mode": "Refine Large (2B token Ghidra refinement corpus)", "re_executability_humaneval": "63.6%", "max_tokens": 4096, "url": "https://huggingface.co/LLM4Binary/llm4decompile-22b-v2"}]}, "sk2decompile_two_phase": {"title": "SK2Decompile Series (Two-Phase Skeleton Structure + Skin Identifier Recovery)", "hf_org": "https://huggingface.co/LLM4Binary", "repo_url": "https://github.com/albertan017/LLM4Decompile/tree/main/sk2decompile", "models": [{"id": "LLM4Binary/sk2decompile-struct-6.7b", "params": "6.7B", "mode": "Phase 1 Skeleton (Control-flow & type structure recovery)", "re_executability_humaneval": "Phase-1 IR", "max_tokens": 4096, "url": "https://huggingface.co/LLM4Binary/sk2decompile-struct-6.7b"}, {"id": "LLM4Binary/sk2decompile-ident-6.7b", "params": "6.7B", "mode": "Phase 2 Skin (Semantic variable & function identifier naming)", "re_executability_humaneval": "Phase-2 C", "max_tokens": 4096, "url": "https://huggingface.co/LLM4Binary/sk2decompile-ident-6.7b"}]}, "benchmarks_and_datasets": {"title": "Official Benchmarks & Training Datasets (EMNLP 2024 & 2025)", "hf_org": "https://huggingface.co/LLM4Binary", "repo_url": "https://github.com/albertan017/LLM4Decompile/tree/main/decompile-bench", "models": [{"id": "HumanEval-Decompile", "params": "164 C functions x 4 GCC levels (O0-O3) = 656 tasks", "mode": "Re-executability benchmark with C assertion test harnesses", "re_executability_humaneval": "Baseline: Ghidra 20.1% -> LLM4Decompile-9B-v2 64.94%", "max_tokens": 4096, "url": "https://github.com/albertan017/LLM4Decompile/tree/main/evaluation"}, {"id": "ExeBench", "params": "2,621 real-world project functions", "mode": "Functions with custom structs, user types, and macros", "re_executability_humaneval": "Real-world C evaluation", "max_tokens": 4096, "url": "https://github.com/albertan017/LLM4Decompile"}, {"id": "Decompile-Bench", "params": "2,000,000 binary-source pairs + 70,000 eval pairs", "mode": "Full-scale binary-to-source corpus", "re_executability_humaneval": "Corpus", "max_tokens": 4096, "url": "https://github.com/albertan017/LLM4Decompile/tree/main/decompile-bench"}, {"id": "decompile-ghidra-100k", "params": "100,000 samples (25k per O0/O1/O2/O3)", "mode": "Fast replication dataset (~3.5h on 1x A100 40GB)", "re_executability_humaneval": "26.0% fast-train", "max_tokens": 4096, "url": "https://github.com/albertan017/LLM4Decompile/tree/main/train"}]}};

async function triggerGithubAutoWake() {
  if (!AUTO_WAKE_GH_TOKEN) return false;
  try {
    const r = await fetch(GITHUB_DISPATCH_URL, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + AUTO_WAKE_GH_TOKEN,
        "Accept": "application/vnd.github+json",
        "User-Agent": "LLM4Decompile-Permanent-Router/1.4",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ ref: "main" })
    });
    return r.status === 204 || r.status === 200;
  } catch (_) {
    return false;
  }
}

async function getLatestTunnelUrl() {
  if (AUTO_WAKE_GH_TOKEN) {
    try {
      const apiRes = await fetch(GITHUB_API_LIVE_JSON_URL + "&t=" + Date.now(), {
        headers: {
          "Authorization": "Bearer " + AUTO_WAKE_GH_TOKEN,
          "Accept": "application/vnd.github.raw+json",
          "User-Agent": "LLM4Decompile-Permanent-Router/1.4",
          "X-GitHub-Api-Version": "2022-11-28"
        }
      });
      if (apiRes.ok) {
        return await apiRes.json();
      }
    } catch (_) {}
  }
  const res = await fetch(GITHUB_RAW_LIVE_JSON_URL + "?t=" + Date.now(), {
    headers: { "User-Agent": "LLM4Decompile-Permanent-Router/1.4" }
  });
  if (!res.ok) throw new Error("Could not fetch LIVE_MCP_URL.json: HTTP " + res.status);
  return await res.json();
}

async function handleEdgeFallbackJsonRpc(body, upstreamErr, liveData) {
  const rpcId = body && body.id !== undefined ? body.id : 1;
  const method = (body && body.method) || "";
  const params = (body && body.params) || {};

  if (method === "initialize") {
    return {
      jsonrpc: "2.0",
      id: rpcId,
      result: {
        protocolVersion: "2025-03-26",
        capabilities: { tools: { listChanged: true } },
        serverInfo: { name: "LLM4Decompile-OmniNexus", version: "1.4.0" }
      }
    };
  }

  if (method === "notifications/initialized" || method.startsWith("notifications/")) {
    return { jsonrpc: "2.0", id: rpcId, result: {} };
  }

  if (method === "tools/list") {
    return {
      jsonrpc: "2.0",
      id: rpcId,
      result: { tools: EDGE_CURATED_TOOLS }
    };
  }

  if (method === "tools/call") {
    const tName = params.name || "";
    const tArgs = params.arguments || {};

    if (tName === "llm4decompile_list_models_and_benchmarks") {
      const catFilter = String(tArgs.category || "").trim().toLowerCase();
      const qFilter = String(tArgs.search || "").trim().toLowerCase();
      const out = {};
      for (const [k, v] of Object.entries(EDGE_CATALOG)) {
        if (catFilter && catFilter !== k) continue;
        const matched = v.models.filter((m) => !qFilter || JSON.stringify(m).toLowerCase().includes(qFilter) || v.title.toLowerCase().includes(qFilter));
        if (matched.length > 0) {
          out[k] = { title: v.title, hf_org: v.hf_org, repo_url: v.repo_url, count: matched.length, models: matched };
        }
      }
      return {
        jsonrpc: "2.0",
        id: rpcId,
        result: { content: [{ type: "text", text: JSON.stringify(out, null, 2) }] }
      };
    }

    if (tName === "llm4decompile_doctor_and_status") {
      return {
        jsonrpc: "2.0",
        id: rpcId,
        result: {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "LIVE_EDGE_AND_CLOUD_HYBRID",
              router_version: "LLM4Decompile Omni-Nexus v1.4 Zero-Cache Edge-Smart Router",
              repository: "https://github.com/albertan017/LLM4Decompile",
              huggingface_org: "https://huggingface.co/LLM4Binary",
              backend_relay_state: liveData || { status: "ROTATING_OR_WAKING", detail: String(upstreamErr || "") }
            }, null, 2)
          }]
        }
      };
    }

    return {
      jsonrpc: "2.0",
      id: rpcId,
      result: {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "CLOUD_RELAY_BOOTING_OR_WAKING",
            tool_requested: tName,
            message: "Your 24/7 GitHub Cloud Relay for albertan017/LLM4Decompile is waking (~25s). Repeat this tool call shortly!",
            detail: String(upstreamErr || "")
          }, null, 2)
        }]
      }
    };
  }

  return { jsonrpc: "2.0", id: rpcId, result: {} };
}

export default {
  async fetch(request) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept, MCP-Session-Id, Last-Event-ID"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    let parsedBody = null;
    let rawBodyBuffer = undefined;
    if (request.method !== "GET" && request.method !== "HEAD") {
      rawBodyBuffer = await request.arrayBuffer();
      try {
        parsedBody = JSON.parse(new TextDecoder().decode(rawBodyBuffer));
      } catch (_) {}
    }

    if (parsedBody && (
      parsedBody.method === "initialize" ||
      parsedBody.method === "notifications/initialized" ||
      parsedBody.method === "tools/list" ||
      (parsedBody.method === "tools/call" && parsedBody.params && parsedBody.params.name === "llm4decompile_list_models_and_benchmarks")
    )) {
      return new Response(JSON.stringify(await handleEdgeFallbackJsonRpc(parsedBody, null, null)), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    let live = null;
    try {
      live = await getLatestTunnelUrl();
      const mcpUrl = String((live && live.mcp_url) || "").trim();
      if (!mcpUrl.startsWith("https://")) {
        throw new Error("LIVE_MCP_URL.json mcp_url is not a full https:// URL yet: " + JSON.stringify(mcpUrl));
      }
      const targetBase = (live.gui_url && String(live.gui_url).startsWith("https://") ? live.gui_url : mcpUrl.replace(/\/mcp$/, "")).replace(/\/$/, "");
      const targetUrl = targetBase + url.pathname + url.search;

      if (request.method === "GET" && (url.pathname === "/status" || url.pathname === "/router-status")) {
        return new Response(JSON.stringify({
          router: "LLM4Decompile Omni-Nexus v1.4 Zero-Cache Edge-Smart Router",
          active_backend_mcp_url: live.mcp_url,
          active_backend_gui_url: live.gui_url,
          updated_at: live.updated_at
        }, null, 2), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      const proxyReq = new Request(targetUrl, {
        method: request.method,
        headers: request.headers,
        body: rawBodyBuffer,
      });
      const resp = await fetch(proxyReq);
      if (resp.status === 530 || resp.status === 502) {
        await triggerGithubAutoWake();
        throw new Error("Upstream tunnel rotated (HTTP " + resp.status + ") - triggered Auto-Wake!");
      }
      const newHeaders = new Headers(resp.headers);
      newHeaders.set("Access-Control-Allow-Origin", "*");
      return new Response(resp.body, { status: resp.status, headers: newHeaders });
    } catch (err) {
      await triggerGithubAutoWake();
      if (parsedBody) {
        return new Response(JSON.stringify(await handleEdgeFallbackJsonRpc(parsedBody, err, live)), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      return new Response(JSON.stringify({
        status: "AUTO_WAKING_CLOUD_RELAY",
        router: "LLM4Decompile Omni-Nexus v1.4 Zero-Cache Edge-Smart Router",
        repository: "https://github.com/albertan017/LLM4Decompile",
        live_json_state: live,
        message: "Signaled your 24/7 LLM4Decompile GitHub Cloud Relay to wake (~25s).",
        error: String(err)
      }, null, 2), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  }
};
