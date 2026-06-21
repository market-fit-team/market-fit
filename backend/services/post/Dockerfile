FROM gradle:8.14-jdk21 AS build
WORKDIR /workspace
COPY backend/services/post/build.gradle backend/services/post/settings.gradle ./
COPY backend/services/post/src ./src
RUN gradle bootJar --no-daemon

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /workspace/build/libs/*.jar app.jar
COPY db/post /db/post
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
