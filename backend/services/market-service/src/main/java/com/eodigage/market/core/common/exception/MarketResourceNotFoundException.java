package com.eodigage.market.core.common.exception;

/**
 * 조회 대상(행정동, 기준 분기 등)이 존재하지 않을 때 발생하는 도메인 예외.
 *
 * <p>application/core 레이어가 웹 계층 타입({@code ResponseStatusException})에 의존하지 않도록
 * 도메인 예외로 분리한다. HTTP 변환은 {@code GlobalExceptionHandler}가 담당한다.
 */
public class MarketResourceNotFoundException extends RuntimeException {

    private final String code;

    public MarketResourceNotFoundException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
