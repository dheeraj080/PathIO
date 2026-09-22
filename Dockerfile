# Stage 1: Build stage
FROM eclipse-temurin:25-jdk-alpine AS builder
WORKDIR /app

# Install Maven
RUN apk add --no-cache maven

# Layer Caching: Download dependencies first
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source and build package
COPY src ./src
RUN mvn package -DskipTests -B

# Stage 2: Runtime stage
FROM eclipse-temurin:25-jre-alpine
WORKDIR /app

# Create non-root group and user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy build artifact with non-root ownership directly
COPY --chown=appuser:appgroup --from=builder /app/target/url-shortener-monolith-*.jar app.jar

USER appuser

EXPOSE 8080

ENTRYPOINT ["java", \
    "-XX:+UseG1GC", \
    "-XX:+UseStringDeduplication", \
    "-XX:MaxRAMPercentage=75.0", \
    "-jar", "app.jar"]