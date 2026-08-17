import gc
import psutil
from typing import Dict, Any, Optional

class HardwareProfiler:
    def __init__(self):
        self._cached_profile = None

    def get_system_profile(self) -> Dict[str, Any]:
        """Collect real-time CPU, RAM, and GPU/VRAM hardware specs."""
        # 1. CPU Specs
        cpu_count_logical = psutil.cpu_count(logical=True) or 4
        cpu_count_physical = psutil.cpu_count(logical=False) or 2
        cpu_percent = psutil.cpu_percent(interval=None)

        # 2. System RAM Specs
        ram = psutil.virtual_memory()
        total_ram_gb = round(ram.total / (1024 ** 3), 1)
        available_ram_gb = round(ram.available / (1024 ** 3), 1)
        ram_percent = ram.percent

        # 3. GPU / VRAM Specs (Safe detection via torch or fallback)
        gpu_info = self._detect_gpu_specs()

        # 4. Infer Profile Tier & Model Recommendations
        tier, tier_name, recommendations = self._classify_hardware_tier(gpu_info, total_ram_gb)

        profile = {
            "tier": tier,
            "tier_name": tier_name,
            "cpu": {
                "physical_cores": cpu_count_physical,
                "logical_threads": cpu_count_logical,
                "usage_percent": cpu_percent
            },
            "ram": {
                "total_gb": total_ram_gb,
                "available_gb": available_ram_gb,
                "usage_percent": ram_percent
            },
            "gpu": gpu_info,
            "recommendations": recommendations
        }
        self._cached_profile = profile
        return profile

    def _detect_gpu_specs(self) -> Dict[str, Any]:
        """Detect NVIDIA/CUDA GPU via nvidia-smi with torch fallback."""
        gpu_data = {
            "has_gpu": False,
            "device_name": "CPU Only (No CUDA GPU)",
            "total_vram_gb": 0.0,
            "free_vram_gb": 0.0,
            "cuda_version": "N/A"
        }

        # 1. First try nvidia-smi (Most accurate for physical VRAM & Driver)
        import subprocess
        try:
            res = subprocess.run(
                ["nvidia-smi", "--query-gpu=name,memory.total,memory.free,driver_version", "--format=csv,noheader,nounits"],
                capture_output=True, text=True, timeout=2
            )
            if res.returncode == 0 and res.stdout.strip():
                parts = [p.strip() for p in res.stdout.strip().split(",")]
                if len(parts) >= 3:
                    gpu_data["has_gpu"] = True
                    gpu_data["device_name"] = parts[0]
                    total_mb = float(parts[1])
                    free_mb = float(parts[2])
                    gpu_data["total_vram_gb"] = round(total_mb / 1024, 1)
                    gpu_data["free_vram_gb"] = round(free_mb / 1024, 1)
                    if len(parts) >= 4:
                        gpu_data["cuda_version"] = f"Driver {parts[3]}"
                    return gpu_data
        except Exception:
            pass

        # 2. PyTorch CUDA fallback
        try:
            import torch
            if torch.cuda.is_available():
                gpu_data["has_gpu"] = True
                gpu_data["device_name"] = torch.cuda.get_device_name(0)
                total_vram = torch.cuda.get_device_properties(0).total_memory / (1024 ** 3)
                free_vram = (torch.cuda.get_device_properties(0).total_memory - torch.cuda.memory_allocated(0)) / (1024 ** 3)
                gpu_data["total_vram_gb"] = round(total_vram, 1)
                gpu_data["free_vram_gb"] = round(free_vram, 1)
                gpu_data["cuda_version"] = torch.version.cuda or "N/A"
        except Exception:
            pass

        return gpu_data

    def _classify_hardware_tier(self, gpu_info: Dict[str, Any], ram_gb: float) -> tuple:
        """Classify hardware into Low-VRAM / Mid-VRAM / High-VRAM."""
        has_gpu = gpu_info.get("has_gpu", False)
        vram_gb = gpu_info.get("total_vram_gb", 0.0)

        if not has_gpu or vram_gb < 6.0:
            # Low-VRAM (Entry) or CPU fallback
            return (
                "low_vram",
                "Low-VRAM (엔트리 4GB 미만)",
                {
                    "llm_small": "llama3.2:3b / qwen2.5:3b (초경량 SLM)",
                    "llm_medium": "qwen2.5:7b (Q4 양자화)",
                    "llm_large": "qwen2.5-coder:7b (코딩 전문)",
                    "reasoning": "deepseek-r1:1.5b / 7b / 8b (고속 추론)",
                    "strategy": "적극적 VRAM Flush 및 텍스트 인코더 RAM Offloading 필수"
                }
            )
        elif 6.0 <= vram_gb <= 12.0:
            # Mid-VRAM (Mainstream: RTX 4050/3060/4060 등 6GB~12GB)
            return (
                "mid_vram",
                f"Mid-VRAM (메인스트림 {vram_gb}GB VRAM + {ram_gb}GB RAM)",
                {
                    "llm_small": "llama3.2:3b / qwen2.5:3b (초고속 속공)",
                    "llm_medium": "qwen2.5:7b / mistral-nemo:12b / qwen2.5vl:7b (밸런스/비전)",
                    "llm_large": "qwen2.5-coder:14b (GPT-4o급 코딩)",
                    "reasoning": "deepseek-r1:14b / deepseek-r1:8b (SOTA CoT 추론)",
                    "strategy": f"VRAM {vram_gb}GB GPU 전담 + {ram_gb}GB 시스템 RAM 하이브리드 최적화"
                }
            )
        else:
            # High-VRAM (High-End 16GB+)
            return (
                "high_vram",
                "High-VRAM (하이엔드 16GB+)",
                {
                    "llm_small": "qwen2.5:7b / llama3.3:70b",
                    "llm_medium": "qwen2.5-coder:14b / qwen2.5vl:7b",
                    "llm_large": "qwen2.5-coder:32b (최상위 엔지니어링)",
                    "reasoning": "deepseek-r1:32b / 70b (초정밀 추론)",
                    "strategy": "FP16/Q8 풀 모델 VRAM 상주 및 10대 에이전트 고속 병렬 추론"
                }
            )

    def auto_assign_optimal_models(self, detected_models: list) -> Dict[str, str]:
        """
        Intelligently assigns the best matching local model for each of the 10 agents
        based on detected local models (Ollama & LM Studio).
        Follows 100-Point SOTA commercial-grade priority fallback chains.
        """
        model_names = [m["name"] if isinstance(m, dict) else str(m) for m in detected_models]
        if not model_names:
            return {}

        def find_best(candidates: list, fallback: str) -> str:
            for c in candidates:
                for m in model_names:
                    if c.lower() in m.lower():
                        return m
            return model_names[0] if model_names else fallback

        # 100-Point SOTA Golden Mapping Rules
        mapping = {
            # 🧠 기획/추론 계열 (CoT 논리 추론 및 사실 검증)
            "ceo": find_best(["deepseek-r1:14b", "deepseek-r1:8b", "deepseek-r1:7b", "qwen2.5:14b", "qwen2.5:7b"], "qwen2.5:7b"),
            "researcher": find_best(["deepseek-r1:14b", "deepseek-r1:8b", "deepseek-r1:7b", "qwen2.5:14b", "qwen2.5:7b"], "qwen2.5:7b"),
            "business": find_best(["qwen2.5:14b", "deepseek-r1:14b", "deepseek-r1:8b", "qwen2.5:7b"], "qwen2.5:7b"),

            # 💻 코딩/시각 계열 (코드 및 Vision 멀티모달)
            "developer": find_best(["qwen2.5-coder:14b", "qwen2.5-coder:7b", "qwen2.5-coder"], "qwen2.5-coder:14b"),
            "designer": find_best(["qwen2.5vl:7b", "qwen2.5-coder:7b", "qwen2.5:7b"], "qwen2.5:7b"),

            # ✍️ 작문/마케팅/사운드 계열 (자연어 및 카피라이팅)
            "writer": find_best(["qwen2.5:7b", "mistral-nemo", "llama3:8b"], "qwen2.5:7b"),
            "youtube": find_best(["qwen2.5:7b", "mistral-nemo", "llama3:8b"], "qwen2.5:7b"),
            "editor": find_best(["mistral-nemo", "qwen2.5:7b", "gemma2:9b"], "qwen2.5:7b"),

            # ⚡ 초경량 비서/SNS 계열 (초당 60+ 토큰 속공)
            "instagram": find_best(["llama3.2:3b", "qwen2.5:3b", "qwen2.5:7b"], "llama3.2:3b"),
            "secretary": find_best(["llama3.2:3b", "qwen2.5:3b", "qwen2.5:7b"], "llama3.2:3b")
        }
        return mapping

    def get_tier_recommendations(self, detected_models: list) -> Dict[str, Any]:
        """
        Check if ideal SOTA models are installed for current hardware tier
        and return missing recommended models with pull commands.
        """
        profile = self.get_system_profile()
        tier = profile.get("tier", "mid_vram")
        model_names = [m["name"] if isinstance(m, dict) else str(m) for m in detected_models]
        lower_names = [m.lower() for m in model_names]

        tier_targets = {
            "low_vram": [
                {"role": "코딩", "name": "qwen2.5-coder:7b", "cmd": "ollama pull qwen2.5-coder:7b"},
                {"role": "추론", "name": "deepseek-r1:7b", "cmd": "ollama pull deepseek-r1:7b"},
                {"role": "비서", "name": "llama3.2:3b", "cmd": "ollama pull llama3.2:3b"}
            ],
            "mid_vram": [
                {"role": "수석 엔지니어", "name": "qwen2.5-coder:14b", "cmd": "ollama pull qwen2.5-coder:14b"},
                {"role": "기획/추론 총괄", "name": "deepseek-r1:14b", "cmd": "ollama pull deepseek-r1:14b"},
                {"role": "UI/비전 디자인", "name": "qwen2.5vl:7b", "cmd": "ollama pull qwen2.5vl:7b"},
                {"role": "작문/마케팅", "name": "qwen2.5:7b", "cmd": "ollama pull qwen2.5:7b"}
            ],
            "high_vram": [
                {"role": "코딩 마스터", "name": "qwen2.5-coder:32b", "cmd": "ollama pull qwen2.5-coder:32b"},
                {"role": "초정밀 추론", "name": "deepseek-r1:32b", "cmd": "ollama pull deepseek-r1:32b"},
                {"role": "종합 비즈니스", "name": "llama3.3:70b", "cmd": "ollama pull llama3.3:70b"}
            ]
        }

        targets = tier_targets.get(tier, tier_targets["mid_vram"])
        missing = []
        installed = []

        for target in targets:
            is_present = any(target["name"].lower() in m for m in lower_names)
            if is_present:
                installed.append(target)
            else:
                missing.append(target)

        readiness = int((len(installed) / len(targets)) * 100) if targets else 100
        return {
            "tier": tier,
            "tier_name": profile.get("tier_name"),
            "installed_sota": installed,
            "missing_sota": missing,
            "readiness_score": readiness
        }

    def flush_vram(self) -> Dict[str, Any]:
        """
        Execute aggressive Garbage Collection & VRAM flush
        to prevent memory leaks & OOM in local continuous loops.
        """
        # 1. Python System GC
        collected_objs = gc.collect()

        # 2. CUDA VRAM Empty Cache
        cuda_flushed = False
        try:
            import torch
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                if hasattr(torch.cuda, "ipc_collect"):
                    torch.cuda.ipc_collect()
                cuda_flushed = True
        except Exception:
            pass

        return {
            "status": "flushed",
            "collected_garbage_objects": collected_objs,
            "cuda_vram_emptied": cuda_flushed
        }

hardware_profiler = HardwareProfiler()

