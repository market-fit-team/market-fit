package com.marketfit.post.infrastructure.llm;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.time.Duration;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.marketfit.post.core.llm.LlmSummaryResult;
import com.marketfit.post.core.llm.LlmReportRequest;
import com.marketfit.post.core.llm.PostLlmProvider;
import com.marketfit.post.infrastructure.config.PostLlmProperties;

import lombok.extern.slf4j.Slf4j;

@Slf4j
public class OpenAiLlmReportSummarizer implements PostLlmProvider {

    private static final URI RESPONSES_URI = URI.create("https://api.openai.com/v1/responses");
    private static final int MAX_INPUT_CHARACTERS = 40_000;

    private final ObjectMapper objectMapper;
    private final PostLlmProperties properties;
    private final HttpClient httpClient;

    public OpenAiLlmReportSummarizer(
            ObjectMapper objectMapper,
            PostLlmProperties properties
    ) {
        this(
                objectMapper,
                properties,
                HttpClient.newBuilder()
                        .connectTimeout(Duration.ofSeconds(Math.min(properties.timeoutSeconds(), 10)))
                        .build()
        );
    }

    OpenAiLlmReportSummarizer(
            ObjectMapper objectMapper,
            PostLlmProperties properties,
            HttpClient httpClient
    ) {
        this.objectMapper = objectMapper;
        this.properties = properties;
        this.httpClient = httpClient;
    }

    @Override
    public LlmSummaryResult summarize(LlmReportRequest request, String prompt) {
        if (!properties.hasUsableOpenAiApiKey()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "OPENAI_API_KEY가 설정되지 않았습니다."
            );
        }

        try {
            log.info(
                    "[PostLLM] OpenAI request start. model={}, inputLength={}, timeoutSeconds={}",
                    properties.model(),
                    request.document().rawContent().length(),
                    properties.timeoutSeconds()
            );
            String requestBody = objectMapper.writeValueAsString(buildRequest(request, prompt));
            HttpRequest httpRequest = HttpRequest.newBuilder(RESPONSES_URI)
                    .timeout(Duration.ofSeconds(properties.timeoutSeconds()))
                    .header("Authorization", "Bearer " + properties.apiKey())
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();
            HttpResponse<String> response = httpClient.send(
                    httpRequest,
                    HttpResponse.BodyHandlers.ofString()
            );
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.warn("[PostLLM] OpenAI response failed. status={}", response.statusCode());
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "OpenAI API가 성공 응답을 반환하지 않았습니다. status=" + response.statusCode()
                );
            }
            log.info("[PostLLM] OpenAI response success. status={}", response.statusCode());
            return parseResponse(response.body());
        } catch (HttpTimeoutException exception) {
            throw new ResponseStatusException(
                    HttpStatus.GATEWAY_TIMEOUT,
                    "OpenAI API 응답 시간이 초과되었습니다.",
                    exception
            );
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "OpenAI API 요청이 중단되었습니다.",
                    exception
            );
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "OpenAI API 응답을 처리하지 못했습니다.",
                    exception
            );
        }
    }

    private ObjectNode buildRequest(LlmReportRequest request, String prompt) {
        ObjectNode root = objectMapper.createObjectNode();
        root.put("model", properties.model());
        root.put("instructions", prompt);
        root.put("input", buildInput(request));
        root.put("max_output_tokens", 1_200);

        ObjectNode format = root.putObject("text").putObject("format");
        format.put("type", "json_schema");
        format.put("name", "post_report");
        format.put("strict", true);
        ObjectNode schema = format.putObject("schema");
        schema.put("type", "object");
        schema.put("additionalProperties", false);
        ObjectNode propertiesNode = schema.putObject("properties");
        propertiesNode.putObject("title").put("type", "string");
        propertiesNode.putObject("summary").put("type", "string");
        propertiesNode.putObject("content").put("type", "string");
        schema.putArray("required")
                .add("title")
                .add("summary")
                .add("content");
        return root;
    }

    private String buildInput(LlmReportRequest request) {
        String category = request.requestedCategory() == null
                ? "본문을 보고 결정"
                : request.requestedCategory().name();
        String content = request.document().rawContent();
        if (content.length() > MAX_INPUT_CHARACTERS) {
            content = content.substring(0, MAX_INPUT_CHARACTERS);
        }
        return """
                출처 제목: %s
                메타 설명: %s
                출처 URL: %s
                요청 카테고리: %s

                수집 본문:
                %s
                """.formatted(
                nullableText(request.document().title()),
                nullableText(request.document().metaDescription()),
                nullableText(request.document().sourceUrl()),
                category,
                content
        );
    }

    private LlmSummaryResult parseResponse(String responseBody) throws Exception {
        JsonNode response = objectMapper.readTree(responseBody);
        String outputText = response.path("output_text").asText();
        if (outputText.isBlank()) {
            outputText = findOutputText(response);
        }
        if (outputText.isBlank()) {
            throw new IllegalStateException("OpenAI response output_text is empty");
        }

        try {
            JsonNode report = objectMapper.readTree(outputText);
            LlmSummaryResult result = new LlmSummaryResult(
                    limit(requiredText(report, "title"), 30),
                    requiredText(report, "summary"),
                    requiredText(report, "content"),
                    "OPENAI",
                    properties.model(),
                    tokenUsage(response)
            );
            log.info("[PostLLM] JSON parsing success. fallback=false");
            return result;
        } catch (Exception parseException) {
            log.warn("[PostLLM] JSON parsing failed. fallback=true");
            return fallbackResult(outputText, response);
        }
    }

    private String findOutputText(JsonNode response) {
        for (JsonNode output : response.path("output")) {
            for (JsonNode content : output.path("content")) {
                if ("output_text".equals(content.path("type").asText())) {
                    String text = content.path("text").asText();
                    if (!text.isBlank()) {
                        return text;
                    }
                }
            }
        }
        return "";
    }

    private String requiredText(JsonNode node, String field) {
        String value = node.path(field).asText();
        if (value.isBlank()) {
            throw new IllegalStateException("OpenAI response field is empty: " + field);
        }
        return value;
    }

    private LlmSummaryResult fallbackResult(String plainText, JsonNode response) {
        String normalized = plainText.replaceAll("\\s+", " ").trim();
        String title = limit(
                hasText(normalized) ? normalized : "LLM 요약 리포트",
                50
        );
        String summary = summaryFromPlainText(normalized);
        return new LlmSummaryResult(
                title,
                summary,
                plainText.trim(),
                "OPENAI",
                properties.model(),
                tokenUsage(response)
        );
    }

    private String summaryFromPlainText(String text) {
        String[] sentences = text.split("(?<=[.!?。])\\s+");
        if (sentences.length >= 3) {
            return limit(String.join(" ", java.util.Arrays.copyOfRange(sentences, 0, 3)), 500);
        }
        return limit(text, 300)
                + " 상권과 상가 조건을 함께 검토할 필요가 있습니다."
                + " 창업 또는 프랜차이즈 운영비와 지속 수요의 위험도 확인해야 합니다.";
    }

    private java.util.Map<String, Integer> tokenUsage(JsonNode response) {
        JsonNode usage = response.path("usage");
        java.util.Map<String, Integer> result = new java.util.LinkedHashMap<>();
        putUsage(result, "inputTokens", usage.path("input_tokens"));
        putUsage(result, "outputTokens", usage.path("output_tokens"));
        putUsage(result, "totalTokens", usage.path("total_tokens"));
        return result;
    }

    private void putUsage(
            java.util.Map<String, Integer> target,
            String key,
            JsonNode value
    ) {
        if (value.canConvertToInt()) {
            target.put(key, value.asInt());
        }
    }

    private String limit(String value, int maxLength) {
        return value.length() <= maxLength
                ? value
                : value.substring(0, maxLength).trim();
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String nullableText(String value) {
        return value == null || value.isBlank() ? "(없음)" : value;
    }
}
