# 미디어 스토리지

```text
src/main/java/com/example/server/
├── api/media/
│   ├── MediaAttachmentController.java
│   └── dto/
├── core/media/
│   ├── MediaAttachment.java
│   ├── MediaCommandService.java
│   └── MediaStoragePort.java
└── infrastructure/storage/
    ├── config/
    │   ├── S3Config.java
    │   └── S3StorageProperties.java
    └── media/
        ├── MediaObjectKeyGenerator.java
        ├── MediaUploadValidator.java
        └── S3StorageService.java
```

## 멀티파트 업로드 (Multipart Upload)

`/api/v1/media` 엔드포인트에서 `multipart/form-data`로 미디어 파일을 업로드한다. 
업로드 가능한 파일 크기는 최대 10MB이며 지원하는 형식은 JPEG, PNG, WEBP, GIF다. `MediaUploadValidator`를 통해 확장자와 `ImageIO` 이미지 읽기를 검증한다.

```java
@PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
public MediaAttachmentResponse upload(
        @RequestPart("file") MultipartFile file,
        @RequestParam(value = "altText", required = false) String altText
)
```

```text
POST /api/v1/media (multipart/form-data)
-> MediaAttachmentController.upload()
-> MediaCommandService.upload()
-> S3StorageService.uploadImage() (S3 Client PutObjectRequest)
-> DB 저장 (MediaAttachmentStatus.UPLOADED)
-> 응답 반환
```

## S3 저장 및 설정

S3Client 설정은 `application.yml`의 `storage.s3` 프로퍼티를 받아 구성한다. `pathStyleAccess`를 지원하여 로컬에서 MinIO 같은 호환 스토리지도 사용할 수 있다.

```java
@ConfigurationProperties(prefix = "storage.s3")
public record S3StorageProperties(
        String endpoint,
        String region,
        String bucket,
        String accessKey,
        String secretKey,
        boolean pathStyleAccess,
        long presignedUrlExpirationSeconds
) {}
```

업로드 시 S3 Object Key는 `MediaObjectKeyGenerator`를 통해 `posts/{년}/{월}/{일}/{userId}/{UUID}.{확장자}` 형태로 생성된다.

## Presigned GET URL

프론트엔드에서 S3의 비공개 이미지에 접근할 수 있도록 만료 시간이 있는 Presigned URL을 생성해 응답에 포함한다. 조립 시점에 `S3Presigner`를 사용한다.

```java
public URL presignGetUrl(String objectKey) {
    GetObjectRequest getObjectRequest = GetObjectRequest.builder()
            .bucket(properties.bucket())
            .key(objectKey)
            .build();

    GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
            .signatureDuration(Duration.ofSeconds(properties.presignedUrlExpirationSeconds()))
            .getObjectRequest(getObjectRequest)
            .build();

    return s3Presigner.presignGetObject(presignRequest).url();
}
```

## Attachment 상태 (MediaAttachmentStatus)

DB에 저장되는 첨부파일 메타데이터(`post_media_attachments` 테이블)는 생명주기를 관리하기 위해 세 가지 상태를 가진다.

1. `UPLOADED`: S3에 업로드되었지만 아직 게시글에 첨부되지 않은 상태 (고립된 상태)
2. `ATTACHED`: 게시글(`posts`)에 정상적으로 연결된 상태
3. `DELETED`: 삭제된 상태 (소프트 딜리트)

```sql
CREATE TABLE post_media_attachments (
    id BIGSERIAL PRIMARY KEY,
    owner_user_id BIGINT NOT NULL,
    post_id BIGINT NULL,
    object_key VARCHAR(1024) NOT NULL UNIQUE,
    status VARCHAR(30) NOT NULL DEFAULT 'UPLOADED', -- UPLOADED, ATTACHED, DELETED
    -- ...
);
```

새 게시글 작성 시 `mediaAttachmentIds` 배열을 넘기면, 본인이 업로드한 `UPLOADED` 상태인 파일들만 대상 게시글로 `ATTACHED` 시킨다.

```json
{
  "content": "게시글 내용입니다.",
  "mediaAttachmentIds": [101, 102]
}
```

## 주요 파일

- `src/main/java/com/example/server/api/media/MediaAttachmentController.java`
- `src/main/java/com/example/server/core/media/MediaCommandService.java`
- `src/main/java/com/example/server/infrastructure/storage/config/S3Config.java`
- `src/main/java/com/example/server/infrastructure/storage/media/S3StorageService.java`
- `src/main/java/com/example/server/infrastructure/storage/media/MediaUploadValidator.java`

## 참고 문서

- Spring Web MVC Multipart: `https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-methods/multipart-forms.html`
- AWS SDK for Java 2.x S3: `https://docs.aws.amazon.com/sdk-for-java/latest/developer-guide/examples-s3.html`
- S3 Presigned URL: `https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html`
