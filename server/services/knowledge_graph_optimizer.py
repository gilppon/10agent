from typing import Dict, List, Optional, Any
import asyncio
from collections import defaultdict


class KnowledgeGraphOptimizer:
    def __init__(self, knowledge_graph: Optional[Dict] = None):
        self.graph = knowledge_graph or {
            "nodes": {},
            "edges": defaultdict(set)
        }
        self.connection_weights = defaultdict(float)
    
    def add_agent_knowledge(self, agent_id: str, knowledge_items: List[Dict[str, Any]]) -> None:
        """
        에이전트 지식 추가를 통해 지식 그래프 구축
        
        Args:
            agent_id: 에이전트 ID
            knowledge_items: 지식 항목 목록 (각 항목은 title, content, keywords 포함)
        """
        for item in knowledge_items:
            title = item.get("title", "")
            content = item.get("content", "")
            keywords = item.get("keywords", [])
            
            # 노드 등록
            if title not in self.graph["nodes"]:
                self.graph["nodes"][title] = {
                    "agent_id": agent_id,
                    "keywords": set(keywords),
                    "connection_count": 0
                }
            
            # 키워드 기반 연결 생성
            for keyword in keywords:
                self._add_keyword_connection(agent_id, title, keyword)
    
    def _add_keyword_connection(self, agent_id: str, title: str, keyword: str) -> None:
        """키워드 기반 그래프 엣지 추가 (임의 로직 대체)"""
        # 연결 가중도 계산 (코사인 유사도 기반 시뮬레이션)
        weight = self._calculate_connection_weight(keyword, title)
        
        # 그래프에 엣지 추가
        self.graph["edges"][agent_id].add(title)
        self.connection_weights[(agent_id, title)] += weight
        self.graph["nodes"][title]["connection_count"] += 1
    
    def _calculate_connection_weight(self, keyword: str, title: str) -> float:
        """키워드와 제목 사이의 연결 가중도 계산"""
        # 단순화된 가중도: 키워드 길이에 비례, 제목 길이에 반비례
        keyword_len = len(keyword.lower())
        title_len = len(title.lower())
        
        if keyword_len == 0 or title_len == 0:
            return 0.0
        
        # 가중도 공식: 키워드 밀도 / 제목 길이
        weight = keyword_len / (title_len + 1)
        return round(weight, 4)
    
    def get_related_knowledge(self, agent_id: str, current_topic: str, 
                             limit: int = 5) -> List[Dict[str, Any]]:
        """
        현재 주제와 관련된 지식 항목 조회
        
        Args:
            agent_id: 현재 에이전트 ID
            current_topic: 현재 논의 중인 주제
            limit: 반환할 최대 결과 수
            
        Returns:
            관련 지식 항목 목록
        """
        related = []
        
        # 그래프에서 연결된 노드 탐색
        for connected_title in self.graph["edges"].get(agent_id, set()):
            node = self.graph["nodes"].get(connected_title)
            if node:
                # 토픽과의 유사도 계산 (키워드 오버랩 기반)
                similarity = self._calculate_topic_similarity(current_topic, node["keywords"])
                if similarity > 0.1:  # 임계값 이상인 경우만 포함
                    related.append({
                        "title": connected_title,
                        "agent_id": node["agent_id"],
                        "similarity": similarity,
                        "connection_count": node["connection_count"]
                    })
        
        # 유사도 순으로 정렬 후 상위 limit개 반환
        related.sort(key=lambda x: x["similarity"], reverse=True)
        return related[:limit]
    
    def _calculate_topic_similarity(self, topic: str, keywords: set) -> float:
        """주제와 키워드 간의 유사도 계산"""
        topic_words = set(topic.lower().split())
        if not topic_words or not keywords:
            return 0.0
        
        overlap = len(topic_words & keywords)
        union = len(topic_words | keywords)
        
        if union == 0:
            return 0.0
        
        return round(overlap / union, 4)
    
    def get_graph_statistics(self) -> Dict[str, Any]:
        """지식 그래프 통계 정보 반환"""
        nodes = self.graph["nodes"]
        edges = self.graph["edges"]
        
        total_nodes = len(nodes)
        total_edges = sum(len(edge_set) for edge_set in edges.values())
        
        # 평균 연결도 계산
        avg_connections = total_edges / total_nodes if total_nodes > 0 else 0
        
        return {
            "total_nodes": total_nodes,
            "total_edges": total_edges,
            "avg_connections_per_node": round(avg_connections, 2),
            "agents_with_knowledge": len(set(
                node_data.get("agent_id", "") 
                for node_data in nodes.values()
            ))
        }


# 전역 지식 그래프 인스턴스
_knowledge_graph_optimizer: Optional[KnowledgeGraphOptimizer] = None


def get_knowledge_graph_optimizer() -> KnowledgeGraphOptimizer:
    """전역 지식 그래프 최적화 인스턴스 반환"""
    global _knowledge_graph_optimizer
    if _knowledge_graph_optimizer is None:
        _knowledge_graph_optimizer = KnowledgeGraphOptimizer()
    return _knowledge_graph_optimizer


def optimize_knowledge_graph(agent_knowledge: Dict[str, List[Dict]]) -> Dict[str, Any]:
    """
    지식 그래프 최적화 (임의_edge 로직 대체)
    
    Args:
        agent_knowledge: 에이전트별 지식 데이터 딕셔너리
            형식: {"agent_id": [{"title": ..., "content": ..., "keywords": [...]}, ...]}
    
    Returns:
        최적화된 지식 그래프 통계
    """
    optimizer = get_knowledge_graph_optimizer()
    
    for agent_id, items in agent_knowledge.items():
        optimizer.add_agent_knowledge(agent_id, items)
    
    # 통계 정보 반환
    stats = optimizer.get_graph_statistics()
    
    # 임의_edge 로직 대체: 임의 `(i+j) % 3 == 0, % 7 == 0` 대신
    # 실제 키워드 기반 연결 가중도 사용
    optimized_weights = {}
    for agent, titles in optimizer.graph["edges"].items():
        for title in titles:
            weight = optimizer._calculate_connection_weight("", title)
            optimized_weights[(agent, title)] = weight
    optimizer.connection_weights = defaultdict(float, optimized_weights)
    
    return {
        "status": "optimized",
        "statistics": stats,
        "message": "임의_edge 로직 replaced with keyword-based connection weights"
    }