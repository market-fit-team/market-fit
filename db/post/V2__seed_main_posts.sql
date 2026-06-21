INSERT INTO posts (
    id, author_id, author_name, title, summary, content, category,
    read_time_minutes, published_at, created_at, updated_at
) VALUES
('00000000-0000-0000-0000-000000000101', 'seed', 'Market Fit', '2026 서울시 신규 자영업 트렌드', '소자본 창업과 대형 오프라인 매장의 흐름을 비교합니다.', '상권별 신규 자영업 흐름과 손익 기준을 정리한 리포트입니다.', 'TREND', 5, NOW() - INTERVAL '1 day', NOW(), NOW()),
('00000000-0000-0000-0000-000000000102', 'seed', 'Market Fit', '첫 매장 계약 전 확인할 항목', '권리금, 보증금, 원상복구 특약을 정리합니다.', '계약서에 서명하기 전에 확인해야 할 실무 항목입니다.', 'GUIDE', 7, NOW() - INTERVAL '2 days', NOW(), NOW()),
('00000000-0000-0000-0000-000000000103', 'seed', 'Market Fit', '상가 임대차 보호법 핵심 가이드', '환산보증금과 권리금 보호 범위를 설명합니다.', '예비 창업자가 알아야 할 상가 임대차 기준을 정리합니다.', 'POLICY', 6, NOW() - INTERVAL '3 days', NOW(), NOW());
