import asyncio
from typing import Optional, Any, Dict
from server.services.model_router import get_model_router


class ErrorHandler:
    def __init__(self):
        self.failure_count = 0
        self.last_error: Optional[Exception] = None
        self.simulation_mode = False
        self.max_failures_before_simulation = 3

    def on_error(self, error: Exception) -> None:
        """에러 발생 시 호출: 실패 카운트 증가 및 시뮬레이션 모드 전환 결정"""
        self.last_error = error
        self.failure_count += 1
        if self.failure_count >= self.max_failures_before_simulation and not self.simulation_mode:
            self.simulation_mode = True  # 자동 시뮬레이션 모드 전환

    def on_success(self) -> None:
        """성공 시 호출: 실패 카운트 리셋 및 시뮬레이션 모드 종료"""
        self.failure_count = 0
        self.simulation_mode = False

    def get_retry_delay(self) -> float:
        """
        지수 백오프에 따른 대기 시간 반환
        
        Returns:
            초 단위의 대기 시간 (최대 30초)
        """
        return min(2 ** self.failure_count, 30.0)  # 2, 4, 8, 16, 30초


class PipelineResult:
    def __init__(self, success: bool, data: Any = None, error: Optional[str] = None):
        self.success = success
        self.data = data
        self.error = error


class PipelineExecutor:
    def __init__(self, max_retries: int = 3, backoff_base: float = 2.0):
        self.max_retries = max_retries
        self.backoff_base = backoff_base
        self.error_handler = ErrorHandler()
        self.model_router = get_model_router()

    async def execute(self, pipeline_name: str, context: Dict[str, Any]) -> PipelineResult:
        """
        파이프라인 자동 실행 with self-healing
        
        Args:
            pipeline_name: 파이프라인 이름 (full_cycle, app_builder, etc.)
            context: 파이프라인 실행 컨텍스트 (vram_mb, task_complexity 등)
            
        Returns:
            PipelineResult: 실행 결과
        """
        for attempt in range(self.max_retries + 1):
            try:
                # 모델 라우팅 기반 라우팅
                available_vram = context.get("vram_mb", 0)
                task_complexity = context.get("task_complexity", "simple")
                route_res = self.model_router.route_task(task_complexity, available_vram)
                model = route_res[0] if isinstance(route_res, tuple) else route_res
                context["model"] = model
                
                # 모델이 None이면 시뮬레이션 모드로 전환
                if model is None:
                    self.error_handler.on_error(
                        Exception("VRAM insufficient for requested task - switching to simulation mode")
                    )
                    if self.error_handler.simulation_mode:
                        context["model"] = "simulation"
                    else:
                        continue  # 재시도
                
                # 파이프라인 단계별 실행
                result = await self._run_pipeline_steps(pipeline_name, context)
                self.error_handler.on_success()
                return PipelineResult(success=True, data=result)
                
            except Exception as e:
                self.error_handler.on_error(e)
                if attempt < self.max_retries:
                    wait_time = self.error_handler.get_retry_delay()
                    await asyncio.sleep(wait_time)
                    continue
                return PipelineResult(success=False, error=f"Max retries exceeded: {e}")
        
        return PipelineResult(success=False, error="Max retries exceeded")

    async def _run_pipeline_steps(self, name: str, ctx: Dict[str, Any]) -> Any:
        """
        파이프라인별 단계 정의 및 실행 (서브클래스에서 구현 또는 설정로드)
        
        Args:
            name: 파이프라인 이름
            ctx: 컨텍스트
            
        Returns:
            파이프라인 실행 결과
        """
        return {
            "pipeline": name,
            "steps_executed": True,
            "model_used": ctx.get("model", "unknown"),
            "context": ctx
        }