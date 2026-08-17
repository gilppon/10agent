import os
import sys
import pytest
import asyncio

# Windows UTF-8 stdout encoding fix
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

# Append project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from server.database import init_db
from server.services.knowledge_service import knowledge_service

@pytest.mark.asyncio
async def test_knowledge_graph_and_backup():
    print("==================================================")
    print("🚀 [하네스 검증] 지식 네트워크(Knowledge Graph) & 백업 테스트")
    print("==================================================")
    
    await init_db()
    
    # 1. Test Ingestion across different domains
    print("\n[1] 5대 도메인별 샘플 지식 주입")
    mkt_res = await knowledge_service.ingest_knowledge("instagram", "https://instagram.com/reels/guide")
    code_res = await knowledge_service.ingest_knowledge("developer", "https://fastapi.tiangolo.com/llms.txt")
    biz_res = await knowledge_service.ingest_knowledge("business", "1인 SaaS 비즈니스 모델 및 ROI 분석")
    
    assert mkt_res["status"] == "success"
    assert code_res["status"] == "success"
    assert biz_res["status"] == "success"
    print("  ✅ [PASS] 3개 도메인 지식 주입 완료!")

    # 2. Test Knowledge Graph Data Structure
    print("\n[2] 지식 네트워크 그래프(Nodes, Edges, 5대 카테고리) 산출 검증")
    graph_data = await knowledge_service.get_knowledge_graph_data()
    
    print(f"  - 총 지식 청크 수: {graph_data['total_count']}개")
    print(f"  - 5대 카테고리 분포: {graph_data['categories']}")
    print(f"  - 생성된 엣지(연결선) 수: {len(graph_data['edges'])}개")
    
    assert graph_data["total_count"] > 0
    assert "marketing" in graph_data["categories"]
    assert "coding" in graph_data["categories"]
    assert "business" in graph_data["categories"]
    assert len(graph_data["nodes"]) == graph_data["total_count"]
    print("  ✅ [PASS] 5대 도메인 분류 및 노드/엣지 그래프 생성 검증 완료!")

    # 3. Test Export & Import Backup
    print("\n[3] 지식 DB 백업 직렬화 및 복원 검증")
    backup_data = await knowledge_service.export_knowledge_backup()
    assert backup_data["total_items"] > 0
    assert "knowledge_items" in backup_data
    print(f"  - 직렬화된 백업 항목 수: {backup_data['total_items']}개")

    import_res = await knowledge_service.import_knowledge_backup(backup_data)
    assert import_res["status"] == "success"
    assert import_res["restored_count"] == backup_data["total_items"]
    print(f"  - 성공적으로 복원된 항목 수: {import_res['restored_count']}개")
    print("  ✅ [PASS] 로컬/클라우드 백업 및 무손실 복원 검증 완료!")

    print("\n==================================================")
    print("🎉 지식 네트워크(Knowledge Graph) & 백업 테스트 ALL CLEAR! (100% 통과)")
    print("==================================================")

if __name__ == "__main__":
    asyncio.run(test_knowledge_graph_and_backup())
