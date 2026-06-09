네, 이게 원인 확정입니다.

```json
{
  "*/*": {
    "schema": {
      "$ref": "#/components/schemas/MediaAttachmentResponse"
    }
  }
}
```

OpenAPI 문서상 응답 content type이 `application/json`이 아니라 `*/*`로 나와서, Orval이 성공 응답을 JSON으로 파싱하지 않고 `text()` 그대로 생성하고 있습니다.

## 백엔드에서 고칠 부분

`POST /api/v1/media` controller에 `produces = MediaType.APPLICATION_JSON_VALUE`를 추가하세요.

```java
@PostMapping(
    value = "/api/v1/media",
    consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
    produces = MediaType.APPLICATION_JSON_VALUE
)
public ResponseEntity<MediaAttachmentResponse> uploadMediaAttachment(...) {
    ...
}
```

그리고 같은 문제가 `GET`, `PATCH`에도 이미 보입니다. 생성 코드에서 둘 다 이렇게 나오고 있었죠.

```ts
const data: getMediaAttachmentResponseSuccess["data"] =
  body !== null ? body : "";
```

그래서 이것들도 같이 고치는 게 좋습니다.

```java
@GetMapping(
    value = "/api/v1/media/{id}",
    produces = MediaType.APPLICATION_JSON_VALUE
)
public ResponseEntity<MediaAttachmentResponse> getMediaAttachment(...) {
    ...
}
```

```java
@PatchMapping(
    value = "/api/v1/media/{id}",
    consumes = MediaType.APPLICATION_JSON_VALUE,
    produces = MediaType.APPLICATION_JSON_VALUE
)
public ResponseEntity<MediaAttachmentResponse> updateMediaAttachment(...) {
    ...
}
```

삭제 API는 `204 void`라서 크게 문제 없습니다.

```java
@DeleteMapping("/api/v1/media/{id}")
public ResponseEntity<Void> deleteMediaAttachment(...) {
    ...
}
```

## 수정 후 확인

백엔드 다시 실행한 다음 다시 확인하세요.

```bash
curl http://localhost:8080/api/community/v3/api-docs \
  | jq '.paths["/api/v1/media"].post.responses["201"].content'
```

이렇게 나와야 합니다.

```json
{
  "application/json": {
    "schema": {
      "$ref": "#/components/schemas/MediaAttachmentResponse"
    }
  }
}
```

`GET`, `PATCH`도 확인하세요.

```bash
curl http://localhost:8080/api/community/v3/api-docs \
  | jq '.paths["/api/v1/media/{id}"].get.responses["200"].content'
```

```bash
curl http://localhost:8080/api/community/v3/api-docs \
  | jq '.paths["/api/v1/media/{id}"].patch.responses["200"].content'
```

## 그다음 프론트

```bash
npm run api:gen
npm run build
```

생성 코드가 더 이상 이렇게 나오면 안 됩니다.

```ts
const data = body !== null ? body : "";
```

대신 JSON parse 형태가 되어야 합니다.

```ts
const data = body ? JSON.parse(body) : undefined;
```

프론트 사용부는 현재 Orval 설정 기준으로 이게 맞습니다.

```ts
onSuccess: (response) => {
  const { id } = response.data;

  if (id) {
    onUploadSuccess(id);
  }
};
```

즉, 지금은 Orval 설정을 먼저 바꾸기보다 **Spring OpenAPI 문서의 `*/*`를 `application/json`으로 바꾸는 것**이 정답입니다.
