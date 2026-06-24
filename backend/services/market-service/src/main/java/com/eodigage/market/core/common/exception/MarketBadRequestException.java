package com.eodigage.market.core.common.exception;

/**
 * 요청 파라미터 조합이 유효하지 않을 때 발생하는 도메인 예외(HTTP 400).
 *
 * <p>단일 파라미터의 형식 검증은 bean validation이 담당하고, 이 예외는
 * "여러 파라미터 간 조합 규칙"처럼 application 레이어에서만 판단 가능한 경우에 사용한다.
 * HTTP 변환은 {@code GlobalExceptionHandler}가 담당한다.
 */
public class MarketBadRequestException extends RuntimeException {

    private final String code;

    public MarketBadRequestException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
