FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
COPY src ./src
COPY lib ./lib
RUN javac -cp "src:lib/postgresql-42.7.13.jar" src/Server.java src/util/*.java src/dao/*.java src/model/*.java src/interfaces/*.java

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/src ./src
COPY --from=build /app/lib ./lib
COPY frontend ./frontend
EXPOSE 8080
ENTRYPOINT ["java", "-cp", "src:lib/postgresql-42.7.13.jar", "Server"]
