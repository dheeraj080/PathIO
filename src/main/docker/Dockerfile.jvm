# ==============================================================================
# Stage 1: Build the Quarkus Application
# ==============================================================================
FROM eclipse-temurin:25-jdk-alpine AS build
WORKDIR /code

# Copy Gradle wrapper & dependency definitions
COPY gradle /code/gradle
COPY gradlew build.gradle settings.gradle /code/

# Grant execute permissions to the wrapper
RUN chmod +x gradlew

# Download dependencies (cached layer unless build configurations change)
RUN ./gradlew dependencies --no-daemon || true

# Copy source code and build the Fast-JAR
COPY src /code/src
RUN ./gradlew build -x test --no-daemon

# ==============================================================================
# Stage 2: Minimal Java 25 Runtime Image
# ==============================================================================
FROM eclipse-temurin:25-jre-alpine
WORKDIR /deployments

# Configure Quarkus JVM parameters
ENV LANGUAGE='en_US:en'

# Create app directory and non-root system user
RUN mkdir -p /deployments \
    && addgroup -S quarkus && adduser -S quarkus -G quarkus \
    && chown -R quarkus:quarkus /deployments

# Copy Quarkus Fast-JAR artifacts from build stage
COPY --chown=quarkus:quarkus --from=build /code/build/quarkus-app/lib/ /deployments/lib/
COPY --chown=quarkus:quarkus --from=build /code/build/quarkus-app/*.jar /deployments/
COPY --chown=quarkus:quarkus --from=build /code/build/quarkus-app/app/ /deployments/app/
COPY --chown=quarkus:quarkus --from=build /code/build/quarkus-app/quarkus/ /deployments/quarkus/

USER quarkus

EXPOSE 8080

# Execute Quarkus directly to handle shutdown signals properly (PID 1)
ENTRYPOINT ["java", "-Dquarkus.http.host=0.0.0.0", "-Djava.util.logging.manager=org.jboss.logmanager.LogManager", "-jar", "/deployments/quarkus-run.jar"]