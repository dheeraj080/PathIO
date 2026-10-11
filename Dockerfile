# syntax=docker/dockerfile:1

# ==============================================================================
# Build stage - compiles the Spring Boot fat jar with the Maven wrapper.
# ==============================================================================
FROM eclipse-temurin:27-jdk AS build

WORKDIR /workspace

# Warm the Maven cache from the POM alone so the dependency layer survives source edits.
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw \
    && ./mvnw -B --no-transfer-progress -DskipTests dependency:go-offline

# Compile and package the application (tests run in CI, not in the image build).
COPY src/ src/
RUN ./mvnw -B --no-transfer-progress -DskipTests package

# ==============================================================================
# Runtime stage - minimal JRE image running as an unprivileged user.
# ==============================================================================
FROM eclipse-temurin:27-jre AS runtime

WORKDIR /app

RUN groupadd --system pathio && useradd --system --gid pathio --home-dir /app pathio

COPY --from=build /workspace/target/*.jar app.jar

USER pathio

EXPOSE 8080

# Liveness probe: the HTTP port accepts connections. Readiness should be delegated to the
# orchestrator probing GET /actuator/health.
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD bash -c 'exec 3<>/dev/tcp/127.0.0.1/8080' || exit 1

ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "/app/app.jar"]
