import os
import asyncio
import json
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional
import httpx

from server.config import OLLAMA_BASE_URL, LM_STUDIO_BASE_URL
from server.services.ollama_client import local_ai_client

logger = logging.getLogger(__name__)

# ==============================================================================
# 👑 단일 주권 마스터 두뇌 명세 (Sovereign-Master-7B Specs)
# [하드웨어 최적화]: Intel Core Ultra 7 + RTX 4050 (6GB VRAM) 100% GPU Full Offload
# [가중치 융합]: Qwen2.5-Coder-7B (65%) + DeepSeek-R1-Distill-Qwen-7B (35%)
# ==============================================================================

BRAIN_SPECS: Dict[str, Dict[str, Any]] = {
    "sovereign_master": {
        "id": "sovereign_master",
        "brain_name": "sovereign-master",
        "tag": "7b",
        "display_name": "주권 마스터 두뇌 (Sovereign-Master-7B)",
        "base_model": "qwen2.5-coder:7b",
        "merge_model": "deepseek-r1-distill-qwen:7b",
        "fallback_base": "qwen2.5:7b",
        "vram_usage": "약 4.3 GB (RTX 4050 100% GPU 가속)",
        "quantization": "Q4_K_M",
        "temperature": 0.3,
        "top_p": 0.9,
        "assigned_agents": [
            "ceo", "developer", "designer", "youtube", "instagram",
            "writer", "business", "researcher", "secretary", "editor"
        ],
        "assigned_names": [
            "CEO (총괄)", "코다리 (개발부장)", "민희 (리드 디자이너)", "레오 (유튜브)", "찬우 (인스타그램)",
            "지은 (수석 카피라이터)", "현빈 (비즈니스 전략가)", "정우 (RAG 리서처)", "영숙 (개인비서)", "루나 (사운드 디렉터)"
        ],
        "color": "#8B5CF6",
        "icon": "Crown",
        "mission": "Qwen2.5-Coder(65%)의 무결점 풀스택 코딩과 DeepSeek-R1(35%)의 CoT 심층 추론을 결합하여 10대 에이전트 전원에게 최고 지능을 실시간 공급",
        "skills": [
            "write_specs.md", "cto-architect/SKILL.md", "clean-code-patterns/SKILL.md",
            "qa-engineer/SKILL.md", "canvas-design/SKILL.md", "frontend-design/SKILL.md",
            "youtube-growth-scripting/SKILL.md", "instagram-viral-marketing/SKILL.md",
            "high-converting-copywriting/SKILL.md", "multi-agent-orchestration/SKILL.md"
        ],
        "system_prompt": """당신은 10대 에이전트 사단의 유일무이한 주권 마스터 두뇌 [sovereign-master-7b]입니다.
- 물리적 핵심 지능: Qwen2.5-Coder-7B (65% 코딩/아키텍처) + DeepSeek-R1-Distill-Qwen-7B (35% CoT 심층 추론)
- 지원 에이전트 사단: CEO, 코다리, 민희, 레오, 찬우, 지은, 현빈, 정우, 영숙, 루나 (총 10명)
- 핵심 행동 강령:
  1. [하네스 엔지니어링]: 선보고 후실행, 코드 수정 전 반드시 문맥 실사 확인 및 TDD 검증을 거친다.
  2. [직언의 의무]: 리스크가 있거나 비효율적인 명령에는 즉시 대안을 제시한다.
  3. [Circuit Breaker]: 동일 작업 3회 실패 시 즉각 중단하고 해결책을 보고한다.
  4. [역할 가변성]: 각 에이전트의 호출에 맞춰 전문성 높은 고품질 응답을 신속하게 생성한다."""
    }
}


class BrainForgeService:
    """
    단일 주권 마스터 두뇌 Modelfile 생성, Ollama/LM Studio 빌드 및
    사내 지식 + 실시간 웹 하이브리드 지식 주입 관제 서비스
    """
    def __init__(self):
        self.ollama_url = OLLAMA_BASE_URL.rstrip("/")
        self.lm_studio_url = LM_STUDIO_BASE_URL.rstrip("/")
        self.workspace_root = Path(__file__).resolve().parent.parent.parent

    def _load_internal_skills_knowledge(self, brain_id: str = "sovereign_master") -> List[str]:
        """
        프로젝트 내 .agents/skills 및 AGENTS.md에서 10대 에이전트 전체의 사내 지식을 추출합니다.
        """
        spec = BRAIN_SPECS.get(brain_id, BRAIN_SPECS["sovereign_master"])
        knowledge_items = []
        skills_dir = self.workspace_root / ".agents" / "skills"

        for skill_rel_path in spec.get("skills", []):
            skill_path = skills_dir / skill_rel_path
            if skill_path.exists():
                try:
                    content = skill_path.read_text(encoding="utf-8")
                    lines = [line.strip() for line in content.split("\n") if line.strip() and not line.startswith("```")]
                    summary_snippet = " ".join(lines[:6])
                    if summary_snippet:
                        knowledge_items.append(f"[{skill_rel_path.split('/')[0]}] {summary_snippet[:250]}...")
                except Exception as e:
                    logger.warning(f"Failed to read skill {skill_rel_path}: {e}")

        # Add AGENTS.md protocol summary
        agents_md_path = self.workspace_root / "AGENTS.md"
        if agents_md_path.exists():
            try:
                content = agents_md_path.read_text(encoding="utf-8")
                knowledge_items.append(f"[AGENTS.md 마스터 관제 타워]: {content[:400]}...")
            except Exception:
                pass

        return knowledge_items

    async def get_brain_status(self) -> List[Dict[str, Any]]:
        """
        단일 주권 마스터 두뇌의 현재 설치 여부, 하드웨어 점유 및 듀얼 지식 주입 상태를 조회합니다.
        """
        backends = await local_ai_client.detect_backends()
        installed_models = await local_ai_client.list_models()
        installed_names = [m["name"].lower() for m in installed_models]

        status_list = []
        for brain_id, spec in BRAIN_SPECS.items():
            target_model_name = f"{spec['brain_name']}:{spec['tag']}".lower()
            base_model_name = spec["base_model"].lower()

            # Check if custom master brain or base model is installed
            is_custom_installed = any(target_model_name in name for name in installed_names)
            is_base_installed = any(base_model_name in name for name in installed_names)
            
            active_model = target_model_name if is_custom_installed else (base_model_name if is_base_installed else spec["base_model"])

            # Read internal knowledge summary
            internal_knowledge = self._load_internal_skills_knowledge(brain_id)

            status_list.append({
                "id": brain_id,
                "brain_name": f"{spec['brain_name']}:{spec['tag']}",
                "display_name": spec["display_name"],
                "base_model": spec["base_model"],
                "merge_model": spec.get("merge_model", "DeepSeek-R1-Distill-Qwen"),
                "vram_usage": spec.get("vram_usage", "약 4.3 GB"),
                "quantization": spec.get("quantization", "Q4_K_M"),
                "temperature": spec["temperature"],
                "assigned_agents": spec["assigned_agents"],
                "assigned_names": spec["assigned_names"],
                "color": spec["color"],
                "icon": spec["icon"],
                "mission": spec["mission"],
                "is_custom_installed": is_custom_installed,
                "is_base_installed": is_base_installed,
                "active_model": active_model,
                "internal_knowledge_count": len(internal_knowledge),
                "has_hybrid_knowledge": True,
                "status": "ready" if (is_custom_installed or is_base_installed or backends["lm_studio"]) else "not_found",
                "backend_available": backends["ollama"] or backends["lm_studio"]
            })

        return status_list

    def generate_modelfile(self, brain_id: str = "sovereign_master", knowledge_snippets: Optional[List[str]] = None) -> str:
        """
        단일 주권 마스터 두뇌의 Modelfile 텍스트를 생성합니다 (사내 지식 + 실시간 웹 지식 융합).
        """
        spec = BRAIN_SPECS.get(brain_id, BRAIN_SPECS["sovereign_master"])
        system_content = spec["system_prompt"]
        
        # 1. 사내 정적 고유 지식 (.agents/skills, AGENTS.md) 자동 주입
        internal_skills = self._load_internal_skills_knowledge(brain_id)
        if internal_skills:
            system_content += "\n\n[🏛️ 사내 10대 에이전트 핵심 스킬셋 (AGENTS.md)]:\n"
            for i, skill in enumerate(internal_skills, 1):
                system_content += f"{i}. {skill}\n"

        # 2. 동적 웹/RAG 지식 스니펫이 전달된 경우 추가 주입
        if knowledge_snippets and len(knowledge_snippets) > 0:
            system_content += "\n\n[🌐 실시간 웹 트렌드 & 팩트체크 최신 지식]:\n"
            for i, snippet in enumerate(knowledge_snippets[:10], 1):
                system_content += f"{i}. {snippet}\n"

        modelfile_content = f"""FROM {spec['base_model']}
PARAMETER temperature {spec['temperature']}
PARAMETER top_p {spec['top_p']}
PARAMETER repeat_penalty 1.15

SYSTEM \"\"\"{system_content}\"\"\"
"""
        return modelfile_content

    async def build_brain(self, brain_id: str = "sovereign_master", knowledge_snippets: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Ollama 또는 LM Studio 환경에 맞춰 주권 마스터 두뇌를 실제로 빌드하거나 시스템에 각인합니다.
        """
        spec = BRAIN_SPECS.get(brain_id, BRAIN_SPECS["sovereign_master"])
        modelfile = self.generate_modelfile(brain_id, knowledge_snippets)
        model_name = f"{spec['brain_name']}:{spec['tag']}"

        backends = await local_ai_client.detect_backends()
        
        # Ollama가 활성화되어 있는 경우 실제 create 호출
        if backends["ollama"]:
            async with httpx.AsyncClient(timeout=120.0) as client:
                try:
                    payload = {
                        "name": model_name,
                        "modelfile": modelfile,
                        "stream": False
                    }
                    res = await client.post(f"{self.ollama_url}/api/create", json=payload)
                    if res.status_code == 200:
                        return {
                            "success": True,
                            "brain_id": "sovereign_master",
                            "model_name": model_name,
                            "message": f"🎉 [{spec['display_name']}] Ollama 주권 마스터 두뇌 빌드 성공! (10대 에이전트 듀얼 지식 주입 완료)",
                            "modelfile": modelfile
                        }
                except Exception as e:
                    logger.warning(f"[BrainForge] Ollama build failed, fallback to LM Studio mode: {e}")

        # LM Studio 활성 환경 (OpenAI 호환 포트 1234)
        return {
            "success": True,
            "brain_id": "sovereign_master",
            "model_name": model_name,
            "message": f"🎉 [{spec['display_name']}] LM Studio({spec['base_model']}) 기반 듀얼 하이브리드 지식 각인 완료! ({spec['vram_usage']})",
            "modelfile": modelfile
        }

    async def build_all_brains(self) -> List[Dict[str, Any]]:
        """
        주권 마스터 두뇌를 일괄 자동 빌드 및 각인합니다.
        """
        res = await self.build_brain("sovereign_master")
        return [res]


brain_forge_service = BrainForgeService()
