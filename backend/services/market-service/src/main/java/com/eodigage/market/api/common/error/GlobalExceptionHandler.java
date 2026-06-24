package com.eodigage.market.api.common.error;

import java.net.URI;
import java.time.OffsetDateTime;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import com.eodigage.market.core.common.exception.MarketBadRequestException;
import com.eodigage.market.core.common.exception.MarketResourceNotFoundException;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;

/**
 * market-service 전역 예외 처리기.
 *
 * <p>모든 오류 응답을 RFC 7807 {@link ProblemDetail}(application/problem+json) 형식으로 통일한다.
 * 성공 응답은 {@code ApiResponse} 래퍼를 유지하고, 오류는 community-service와 동일하게
 * ProblemDetail로 내보낸다. 공통 확장 필드로 {@code code}, {@code timestamp}를 추가한다.
 *
 * <p>{@link ResponseEntityExceptionHandler}를 상속해 Spring MVC 표준 예외(검증 실패,
 * 파라미터 누락, 타입 불일치 등)는 프레임워크 기본 ProblemDetail 처리를 그대로 활용하고,
 * 도메인 예외와 미처리 예외만 직접 매핑한다.
 */
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    private static final String CODE_PROPERTY = "code";
    private static final String TIMESTAMP_PROPERTY = "timestamp";

    @ExceptionHandler(MarketResourceNotFoundException.class)
    public ProblemDetail handleResourceNotFound(
            MarketResourceNotFoundException exception,
            HttpServletRequest request
    ) {
        log.info(
                "Resource not found. code={}, path={}, message={}",
                exception.getCode(),
                request.getRequestURI(),
                exception.getMessage()
        );
        return problemDetail(HttpStatus.NOT_FOUND, exception.getMessage(), exception.getCode(), request);
    }

    @ExceptionHandler(MarketBadRequestException.class)
    public ProblemDetail handleBadRequest(
            MarketBadRequestException exception,
            HttpServletRequest request
    ) {
        log.info("Bad request. code={}, path={}, message={}",
                exception.getCode(), request.getRequestURI(), exception.getMessage());
        return problemDetail(HttpStatus.BAD_REQUEST, exception.getMessage(), exception.getCode(), request);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ProblemDetail handleConstraintViolation(
            ConstraintViolationException exception,
            HttpServletRequest request
    ) {
        log.info("Request validation failed. path={}, message={}", request.getRequestURI(), exception.getMessage());
        return problemDetail(
                HttpStatus.BAD_REQUEST,
                exception.getMessage(),
                "MARKET_INVALID_REQUEST",
                request
        );
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail handleUnexpected(Exception exception, HttpServletRequest request) {
        log.error("Unhandled exception. path={}", request.getRequestURI(), exception);
        return problemDetail(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "서버 내부 오류가 발생했습니다.",
                "MARKET_INTERNAL_ERROR",
                request
        );
    }

    /**
     * {@link ResponseEntityExceptionHandler}가 처리하는 Spring MVC 표준 예외 응답에도
     * 공통 확장 필드({@code code}, {@code timestamp})를 채워 오류 포맷을 일관되게 유지한다.
     */
    @Override
    protected ResponseEntity<Object> handleExceptionInternal(
            Exception exception,
            Object body,
            HttpHeaders headers,
            HttpStatusCode statusCode,
            WebRequest request
    ) {
        ResponseEntity<Object> response = super.handleExceptionInternal(exception, body, headers, statusCode, request);
        if (response != null && response.getBody() instanceof ProblemDetail problem) {
            enrich(problem, defaultCode(statusCode), request);
        }
        return response;
    }

    private ProblemDetail problemDetail(
            HttpStatus status,
            String detail,
            String code,
            HttpServletRequest request
    ) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setTitle(status.getReasonPhrase());
        problem.setProperty(CODE_PROPERTY, code);
        problem.setProperty(TIMESTAMP_PROPERTY, OffsetDateTime.now().toString());
        problem.setInstance(URI.create(request.getRequestURI()));
        return problem;
    }

    private void enrich(ProblemDetail problem, String code, WebRequest request) {
        if (problem.getProperties() == null || !problem.getProperties().containsKey(CODE_PROPERTY)) {
            problem.setProperty(CODE_PROPERTY, code);
        }
        problem.setProperty(TIMESTAMP_PROPERTY, OffsetDateTime.now().toString());
        if (problem.getInstance() == null && request instanceof ServletWebRequest servletRequest) {
            problem.setInstance(URI.create(servletRequest.getRequest().getRequestURI()));
        }
    }

    private String defaultCode(HttpStatusCode statusCode) {
        if (statusCode.is4xxClientError()) {
            return "MARKET_INVALID_REQUEST";
        }
        return "MARKET_INTERNAL_ERROR";
    }
}
