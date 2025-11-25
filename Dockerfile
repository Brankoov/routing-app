FROM gradle:8.5-jdk17 AS builder
WORKDIR /app
COPY . .
# Bygg appen och hoppa över tester för att spara tid
RUN ./gradlew clean build -x test --no-daemon

FROM eclipse-temurin:17-jdk-alpine
WORKDIR /app
COPY --from=builder /app/build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]