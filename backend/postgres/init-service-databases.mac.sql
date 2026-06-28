-- mac-dev 전용 초기화 파일이다.
-- 기존 init-service-databases.sh는 수정하지 않고, Apple Silicon bind mount 실행 권한 이슈만 우회한다.

-- market 서비스 계정과 데이터베이스를 준비한다.
DO
$$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'market') THEN
        CREATE ROLE market LOGIN PASSWORD 'market';
    END IF;
END
$$;

SELECT 'CREATE DATABASE market OWNER market'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'market')\gexec

-- franchise 서비스 계정과 데이터베이스를 준비한다.
DO
$$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'franchise') THEN
        CREATE ROLE franchise LOGIN PASSWORD 'franchise';
    END IF;
END
$$;

SELECT 'CREATE DATABASE franchise OWNER franchise'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'franchise')\gexec

-- market DB에는 PostGIS 확장을 미리 생성한다.
\connect market

CREATE EXTENSION IF NOT EXISTS postgis;
