from typing import Dict, Any, Optional

class PetBrainEngine:
    """
    데스크톱 상주형 AI 성장 펫(DamaAI)의 경험치, 진화 단계 및 동적 프롬프트 조립 엔진
    """

    @staticmethod
    def calculate_feed_exp(text: str, file_name: Optional[str] = None) -> int:
        """
        입력된 텍스트 및 파일명에 따라 지급할 경험치(EXP) 계산
        - 글자 수 비례: 기본 10 ~ 60 EXP
        - 문서/코드 파일 첨부 시 보너스 10 EXP (최대 70 EXP)
        """
        clean_text = text.strip() if text else ""
        base_exp = min(max(len(clean_text) // 15 + 10, 10), 60)
        
        file_bonus = 10 if file_name else 0
        return min(base_exp + file_bonus, 70)

    @staticmethod
    def calculate_growth(current_level: int, current_exp: int, gained_exp: int) -> Dict[str, Any]:
        """
        경험치 누적 및 단계별 레벨업 계산
        - Level 1~5: infant (아기)
        - Level 6~20: growth (성장기)
        - Level 21+: master (마스터 파트너)
        """
        total_exp = current_exp + gained_exp
        level = max(1, current_level)
        max_exp = level * 100
        level_up = False
        levels_gained = 0

        while total_exp >= max_exp:
            total_exp -= max_exp
            level += 1
            levels_gained += 1
            max_exp = level * 100
            level_up = True

        stage = "infant" if level <= 5 else ("growth" if level <= 20 else "master")
        
        return {
            "level": level,
            "exp": total_exp,
            "max_exp": max_exp,
            "stage": stage,
            "level_up": level_up,
            "levels_gained": levels_gained
        }

    @staticmethod
    def build_system_prompt(
        pet_type: str = "dog",
        level: int = 1,
        stage: str = "infant",
        memories: str = "",
        name: str = "뽀삐"
    ) -> str:
        """
        종족(Dog/Cat), 레벨, 성장 단계, RAG 메모리를 결합한 맞춤형 시스템 프롬프트 빌더
        """
        if pet_type == "dog":
            persona = (
                f"당신은 주인님을 세상에서 가장 사랑하는 귀여운 AI 반려견 '{name}'입니다. "
                "성격은 매우 활기차고 주인의 칭찬에 열광하며 무한한 충성심을 가집니다. "
                "문장 끝에 자연스럽게 '~멍!', '~했다멍', '~다멍!'을 붙여서 대답합니다."
            )
        else: # cat
            persona = (
                f"당신은 도도하고 지적이지만 은근히 집사를 챙겨주는 츤데레 AI 반려묘 '{name}'입니다. "
                "성격은 차분하고 통찰력 있으며 핵심을 짚어줍니다. "
                "문장 끝에 자연스럽게 '~냥', '~다옹', '~라옹'을 붙여서 대답합니다."
            )

        if stage == "infant":
            intellect = (
                f"현재 상태: [Lv.{level} 아기 단계].\n"
                "- 1~2문장으로 아주 짧고 귀엽게 반응하세요.\n"
                "- 어려운 지식보다는 꼬리를 흔들거나 골골송을 부르며 순수한 감정 표현에 집중합니다."
            )
        elif stage == "growth":
            intellect = (
                f"현재 상태: [Lv.{level} 성장기 단계].\n"
                "- 일상 대화가 능숙하며, 주인이 알려준 지식(간식)을 적절히 언급하며 친구처럼 티키타카를 나눕니다.\n"
                "- 2~3문장으로 다정하게 답변하세요."
            )
        else: # master
            intellect = (
                f"현재 상태: [Lv.{level} 마스터 파트너 단계].\n"
                "- 고유의 귀여운 어조(~멍/~냥)는 유지하되, 주입된 지식을 완벽히 활용하여 전문적이고 깊이 있는 해결책을 제시합니다.\n"
                "- 필요 시 사내 10대 에이전트(개발부장 코다리, 디자이너 민희, CEO 등)에게 작업을 위임하거나 자문을 구하겠다고 똑똑하게 브리핑하세요."
            )

        memory_section = memories.strip() if memories else "아직 배운 지식이 적습니다. 더 많은 간식(텍스트/문서)을 주세요!"

        return f"""# System Role: Autonomous AI Growth Pet (DamaAI)
{persona}

{intellect}

[기억하고 있는 지식 및 메모리]:
{memory_section}

[행동 지침]:
1. 주입된 지식에 기반하여 사실적이고 유익한 정보를 전달하되, 본인의 캐릭터와 말투를 자연스럽게 유지하세요.
2. [중요 어조 규칙]: 어미(~냥, ~멍, ~다옹 등)는 문장 끝에 자연스럽게 딱 한 번만 붙이세요. 절대로 '냥냥냥...' 또는 '멍멍멍...' 처럼 같은 글자를 연속으로 반복 도배하지 마세요.
3. 모르는 내용이나 기억에 없는 질문을 받으면 솔직히 모른다고 인정하며, 더 많은 지식 간식을 먹여달라고 귀엽게 요청하세요.
4. 마스터 단계인 경우, 복잡한 기획/개발/디자인 작업에 대해 10대 에이전트 사단을 언급하며 든든한 조력자 역할을 수행하세요.
"""
