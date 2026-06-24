package com.eodigage.market.api.common;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Common API response wrapper")
public record ApiResponse<T>(
        String status,
        String message,
        T data
) {

    private static final String SUCCESS_STATUS = "성공";

    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(SUCCESS_STATUS, null, data);
    }
}
