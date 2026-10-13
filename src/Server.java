import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;
import dao.EventDAO;
import dao.RegistrationDAO;
import dao.UserDAO;
import model.Event;
import model.User;
import util.DBConnection;

import java.io.*;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.time.LocalDate;
import java.util.*;

public class Server {

    private static final int PORT = 8080;
    private static final EventDAO eventDAO = new EventDAO();
    private static final UserDAO userDAO = new UserDAO();
    private static final RegistrationDAO registrationDAO = new RegistrationDAO();

    public static void main(String[] args) throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress(PORT), 0);

        // API endpoints
        server.createContext("/api/events", new EventsHandler());
        server.createContext("/api/login", new LoginHandler());
        server.createContext("/api/signup", new SignUpHandler());
        server.createContext("/api/forgot-password", new ForgotPasswordHandler());
        server.createContext("/api/registrations", new RegistrationsHandler());

        // Static files (frontend)
        server.createContext("/", new StaticFileHandler());

        server.setExecutor(null); // default executor
        System.out.println("CampusEventDiscovery server running on http://localhost:" + PORT);
        server.start();
    }

    // CORS helper
    private static void setCorsHeaders(HttpExchange exchange) {
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }

    private static void sendJsonResponse(HttpExchange exchange, int statusCode, String json) throws IOException {
        setCorsHeaders(exchange);
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
        exchange.sendResponseHeaders(statusCode, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    private static String readRequestBody(HttpExchange exchange) throws IOException {
        try (InputStream is = exchange.getRequestBody();
             BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line);
            }
            return sb.toString();
        }
    }

    private static Map<String, String> parseSimpleJson(String json) {
        Map<String, String> map = new HashMap<>();
        if (json == null) return map;
        json = json.trim();
        if (json.startsWith("{") && json.endsWith("}")) {
            json = json.substring(1, json.length() - 1);
        }
        String[] pairs = json.split(",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)");
        for (String pair : pairs) {
            String[] kv = pair.split(":", 2);
            if (kv.length == 2) {
                String key = kv[0].trim().replaceAll("^\"|\"$", "");
                String val = kv[1].trim().replaceAll("^\"|\"$", "");
                map.put(key, val);
            }
        }
        return map;
    }

    // ==========================================
    // /api/events Handler
    // ==========================================
    static class EventsHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            setCorsHeaders(exchange);
            String method = exchange.getRequestMethod().toUpperCase();

            if ("OPTIONS".equals(method)) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            try {
                if ("GET".equals(method)) {
                    List<Event> events = eventDAO.getAllEvents();
                    StringBuilder sb = new StringBuilder("[");
                    for (int i = 0; i < events.size(); i++) {
                        Event e = events.get(i);
                        sb.append(String.format(
                                "{\"event_id\":%d,\"event_name\":\"%s\",\"description\":\"%s\",\"event_date\":\"%s\",\"venue\":\"%s\",\"organizer\":\"%s\",\"capacity\":%d}",
                                e.getEventId(),
                                escapeJson(e.getEventName()),
                                escapeJson(e.getDescription()),
                                e.getEventDate() != null ? e.getEventDate().toString() : "",
                                escapeJson(e.getVenue()),
                                escapeJson(e.getOrganizer()),
                                e.getCapacity()
                        ));
                        if (i < events.size() - 1) sb.append(",");
                    }
                    sb.append("]");
                    sendJsonResponse(exchange, 200, sb.toString());
                } else if ("POST".equals(method)) {
                    String body = readRequestBody(exchange);
                    Map<String, String> data = parseSimpleJson(body);
                    Event event = new Event(
                            0,
                            data.getOrDefault("event_name", ""),
                            data.getOrDefault("description", ""),
                            LocalDate.parse(data.get("event_date")),
                            data.getOrDefault("venue", ""),
                            data.getOrDefault("organizer", ""),
                            Integer.parseInt(data.getOrDefault("capacity", "100"))
                    );
                    eventDAO.addEvent(event);
                    sendJsonResponse(exchange, 201, "{\"message\":\"Event created successfully\"}");
                } else if ("DELETE".equals(method)) {
                    String query = exchange.getRequestURI().getQuery();
                    int id = -1;
                    if (query != null && query.contains("id=")) {
                        for (String param : query.split("&")) {
                            if (param.startsWith("id=")) {
                                id = Integer.parseInt(param.substring(3));
                            }
                        }
                    }
                    if (id != -1) {
                        eventDAO.deleteEvent(id);
                        sendJsonResponse(exchange, 200, "{\"message\":\"Event deleted successfully\"}");
                    } else {
                        sendJsonResponse(exchange, 400, "{\"error\":\"Missing id parameter\"}");
                    }
                } else {
                    sendJsonResponse(exchange, 405, "{\"error\":\"Method not allowed\"}");
                }
            } catch (Exception ex) {
                ex.printStackTrace();
                sendJsonResponse(exchange, 500, "{\"error\":\"" + escapeJson(ex.getMessage()) + "\"}");
            }
        }
    }

    // ==========================================
    // /api/login Handler
    // ==========================================
    static class LoginHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            setCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendJsonResponse(exchange, 405, "{\"error\":\"Method not allowed\"}");
                return;
            }

            try {
                String body = readRequestBody(exchange);
                System.out.println("Login Request Body: [" + body + "]");
                Map<String, String> creds = parseSimpleJson(body);
                String email = creds.get("email") != null ? creds.get("email").trim() : "";
                String password = creds.get("password") != null ? creds.get("password").trim() : "";
                System.out.println("Parsed email: [" + email + "] password: [" + password + "]");

                User user = userDAO.login(email, password);
                if (user != null) {
                    String json = String.format(
                            "{\"user_id\":%d,\"name\":\"%s\",\"email\":\"%s\",\"role\":\"%s\"}",
                            user.getUserId(),
                            escapeJson(user.getName()),
                            escapeJson(user.getEmail()),
                            escapeJson(user.getRole())
                    );
                    sendJsonResponse(exchange, 200, json);
                } else {
                    sendJsonResponse(exchange, 401, "{\"error\":\"Invalid email or password\"}");
                }
            } catch (Exception ex) {
                ex.printStackTrace();
                sendJsonResponse(exchange, 500, "{\"error\":\"" + escapeJson(ex.getMessage()) + "\"}");
            }
        }
    }

    // ==========================================
    // /api/signup Handler
    // ==========================================
    static class SignUpHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            setCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendJsonResponse(exchange, 405, "{\"error\":\"Method not allowed\"}");
                return;
            }

            try {
                String body = readRequestBody(exchange);
                Map<String, String> data = parseSimpleJson(body);
                String name = data.getOrDefault("name", "").trim();
                String email = data.getOrDefault("email", "").trim();
                String password = data.getOrDefault("password", "").trim();

                if (!email.toLowerCase().endsWith("@muj.manipal.edu")) {
                    sendJsonResponse(exchange, 400, "{\"error\":\"Please use your @muj.manipal.edu email\"}");
                    return;
                }

                User newUser = new User(0, name, email, password, "STUDENT");
                userDAO.addUser(newUser);
                sendJsonResponse(exchange, 201, "{\"message\":\"Account created successfully\"}");
            } catch (Exception ex) {
                ex.printStackTrace();
                sendJsonResponse(exchange, 500, "{\"error\":\"" + escapeJson(ex.getMessage()) + "\"}");
            }
        }
    }

    // ==========================================
    // /api/forgot-password Handler
    // ==========================================
    static class ForgotPasswordHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            setCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendJsonResponse(exchange, 405, "{\"error\":\"Method not allowed\"}");
                return;
            }

            try {
                String body = readRequestBody(exchange);
                Map<String, String> data = parseSimpleJson(body);
                String email = data.getOrDefault("email", "").trim();
                String newPassword = data.getOrDefault("new_password", "").trim();

                if (email.isEmpty() || newPassword.isEmpty()) {
                    sendJsonResponse(exchange, 400, "{\"error\":\"Email and new password are required\"}");
                    return;
                }

                User user = userDAO.getUserByEmail(email);
                if (user == null) {
                    sendJsonResponse(exchange, 404, "{\"error\":\"No account found with this email address\"}");
                    return;
                }

                boolean updated = userDAO.updatePassword(email, newPassword);
                if (updated) {
                    sendJsonResponse(exchange, 200, "{\"message\":\"Password updated successfully\"}");
                } else {
                    sendJsonResponse(exchange, 500, "{\"error\":\"Failed to update password\"}");
                }
            } catch (Exception ex) {
                ex.printStackTrace();
                sendJsonResponse(exchange, 500, "{\"error\":\"" + escapeJson(ex.getMessage()) + "\"}");
            }
        }
    }

    // ==========================================
    // /api/registrations Handler
    // ==========================================
    static class RegistrationsHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            setCorsHeaders(exchange);
            String method = exchange.getRequestMethod().toUpperCase();

            if ("OPTIONS".equals(method)) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            try {
                if ("GET".equals(method)) {
                    String query = exchange.getRequestURI().getQuery();
                    int userId = -1;
                    if (query != null && query.contains("userId=")) {
                        for (String param : query.split("&")) {
                            if (param.startsWith("userId=")) {
                                userId = Integer.parseInt(param.substring(7));
                            }
                        }
                    }

                    if (userId == -1) {
                        sendJsonResponse(exchange, 400, "{\"error\":\"Missing userId parameter\"}");
                        return;
                    }

                    // Query registrations joined with events
                    String sql = "SELECT r.registration_id, r.event_id, r.registration_date, e.event_name, e.event_date, e.venue " +
                            "FROM registrations r JOIN events e ON r.event_id = e.event_id " +
                            "WHERE r.user_id = ? ORDER BY r.registration_date DESC";

                    StringBuilder sb = new StringBuilder("[");
                    try (Connection con = DBConnection.getConnection();
                         PreparedStatement ps = con.prepareStatement(sql)) {
                        ps.setInt(1, userId);
                        ResultSet rs = ps.executeQuery();
                        boolean first = true;
                        while (rs.next()) {
                            if (!first) sb.append(",");
                            first = false;
                            sb.append(String.format(
                                    "{\"registration_id\":%d,\"event_id\":%d,\"registration_date\":\"%s\",\"event_name\":\"%s\",\"event_date\":\"%s\",\"venue\":\"%s\"}",
                                    rs.getInt("registration_id"),
                                    rs.getInt("event_id"),
                                    rs.getDate("registration_date"),
                                    escapeJson(rs.getString("event_name")),
                                    rs.getDate("event_date"),
                                    escapeJson(rs.getString("venue"))
                            ));
                        }
                    }
                    sb.append("]");
                    sendJsonResponse(exchange, 200, sb.toString());
                } else if ("POST".equals(method)) {
                    String body = readRequestBody(exchange);
                    Map<String, String> data = parseSimpleJson(body);
                    int userId = Integer.parseInt(data.get("user_id"));
                    int eventId = Integer.parseInt(data.get("event_id"));
                    registrationDAO.registerForEvent(userId, eventId);
                    sendJsonResponse(exchange, 201, "{\"message\":\"Registration successful\"}");
                } else if ("DELETE".equals(method)) {
                    String query = exchange.getRequestURI().getQuery();
                    int userId = -1;
                    int eventId = -1;
                    if (query != null) {
                        for (String param : query.split("&")) {
                            if (param.startsWith("userId=")) userId = Integer.parseInt(param.substring(7));
                            if (param.startsWith("eventId=")) eventId = Integer.parseInt(param.substring(8));
                        }
                    }
                    if (userId != -1 && eventId != -1) {
                        registrationDAO.cancelRegistration(userId, eventId);
                        sendJsonResponse(exchange, 200, "{\"message\":\"Registration cancelled\"}");
                    } else {
                        sendJsonResponse(exchange, 400, "{\"error\":\"Missing parameters\"}");
                    }
                }
            } catch (Exception ex) {
                ex.printStackTrace();
                sendJsonResponse(exchange, 500, "{\"error\":\"" + escapeJson(ex.getMessage()) + "\"}");
            }
        }
    }

    // ==========================================
    // Static File Server (frontend)
    // ==========================================
    static class StaticFileHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String path = exchange.getRequestURI().getPath();
            if (path.equals("/")) {
                path = "/index.html";
            }

            File file = new File("frontend" + path);
            if (!file.exists() || file.isDirectory()) {
                String response = "404 Not Found";
                exchange.sendResponseHeaders(404, response.length());
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(response.getBytes());
                }
                return;
            }

            String mime = "text/plain";
            if (path.endsWith(".html")) mime = "text/html; charset=UTF-8";
            else if (path.endsWith(".css")) mime = "text/css; charset=UTF-8";
            else if (path.endsWith(".js")) mime = "application/javascript; charset=UTF-8";
            else if (path.endsWith(".png")) mime = "image/png";
            else if (path.endsWith(".jpg") || path.endsWith(".jpeg")) mime = "image/jpeg";

            exchange.getResponseHeaders().set("Content-Type", mime);
            exchange.sendResponseHeaders(200, file.length());
            try (OutputStream os = exchange.getResponseBody()) {
                Files.copy(file.toPath(), os);
            }
        }
    }

    private static String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\b", "\\b")
                .replace("\f", "\\f")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }
}
