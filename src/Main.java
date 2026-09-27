import dao.EventDAO;
import dao.RegistrationDAO;
import dao.UserDAO;
import model.Event;
import model.User;

import java.time.LocalDate;
import java.util.List;
import java.util.Scanner;

public class Main {

    static Scanner scanner = new Scanner(System.in);

    static UserDAO userDAO = new UserDAO();
    static EventDAO eventDAO = new EventDAO();
    static RegistrationDAO registrationDAO = new RegistrationDAO();

    public static void main(String[] args) {

        System.out.println("=================================");
        System.out.println(" CAMPUS EVENT DISCOVERY SYSTEM");
        System.out.println("=================================");

        boolean running = true;

        while (running) {

            System.out.println("\n===== MAIN MENU =====");
            System.out.println("1. Login");
            System.out.println("2. Sign Up");
            System.out.println("3. View All Events");
            System.out.println("4. Exit");

            System.out.print("Enter choice: ");

            int choice = scanner.nextInt();
            scanner.nextLine();

            switch (choice) {

                case 1:
                    login();
                    break;

                case 2:
                    signUp();
                    break;

                case 3:
                    viewEvents();
                    break;

                case 4:
                    running = false;
                    System.out.println("Thank you!");
                    break;

                default:
                    System.out.println("Invalid choice!");
            }
        }

        scanner.close();
    }

    // =========================
    // SIGN UP
    // =========================

    public static void signUp() {

    System.out.println("\n===== SIGN UP =====");

    System.out.print("Enter your name: ");
    String name = scanner.nextLine();

    System.out.print("Enter your MUJ email: ");
    String email = scanner.nextLine();

    System.out.print("Create password: ");
    String password = scanner.nextLine();

    System.out.print("Confirm password: ");
    String confirmPassword = scanner.nextLine();

    // Remove accidental spaces
    email = email.trim();

    // Check password
    if (!password.equals(confirmPassword)) {

        System.out.println("Passwords do not match!");
        return;
    }

    // Check MUJ email
    if (!email.toLowerCase().endsWith("@muj.manipal.edu")) {

        System.out.println(
                "Please use your MUJ email."
        );

        return;
    }

    // Create User object
    User user = new User(
            0,
            name,
            email,
            password,
            "STUDENT"
    );

    // Save user to Supabase
    userDAO.addUser(user);

    System.out.println(
            "Account created successfully!"
    );

    System.out.println(
            "You can now login."
    );
}
    // =========================
    // LOGIN
    // =========================

    public static void login() {

        System.out.println("\n===== LOGIN =====");

        System.out.print("Email: ");
        String email = scanner.nextLine();

        System.out.print("Password: ");
        String password = scanner.nextLine();

        User user = userDAO.login(email, password);

        if (user == null) {

            System.out.println(
                    "Invalid email or password!"
            );

            return;
        }

        System.out.println("\nLogin successful!");
        System.out.println(
                "Welcome, " + user.getName()
        );

        if (user.getRole().equalsIgnoreCase("ADMIN")) {

            adminMenu();

        } else {

            studentMenu(user);
        }
    }

    // =========================
    // STUDENT MENU
    // =========================

    public static void studentMenu(User user) {

        boolean loggedIn = true;

        while (loggedIn) {

            System.out.println("\n===== STUDENT MENU =====");
            System.out.println("1. View Events");
            System.out.println("2. Register for Event");
            System.out.println("3. Cancel Registration");
            System.out.println("4. Logout");

            System.out.print("Enter choice: ");

            int choice = scanner.nextInt();
            scanner.nextLine();

            switch (choice) {

                case 1:
                    viewEvents();
                    break;

                case 2:
                    registerForEvent(user);
                    break;

                case 3:
                    cancelRegistration(user);
                    break;

                case 4:
                    loggedIn = false;
                    System.out.println("Logged out.");
                    break;

                default:
                    System.out.println("Invalid choice!");
            }
        }
    }

    // =========================
    // ADMIN MENU
    // =========================

    public static void adminMenu() {

        boolean loggedIn = true;

        while (loggedIn) {

            System.out.println("\n===== ADMIN MENU =====");
            System.out.println("1. View Events");
            System.out.println("2. Add Event");
            System.out.println("3. Delete Event");
            System.out.println("4. Logout");

            System.out.print("Enter choice: ");

            int choice = scanner.nextInt();
            scanner.nextLine();

            switch (choice) {

                case 1:
                    viewEvents();
                    break;

                case 2:
                    addEvent();
                    break;

                case 3:
                    deleteEvent();
                    break;

                case 4:
                    loggedIn = false;
                    System.out.println("Logged out.");
                    break;

                default:
                    System.out.println("Invalid choice!");
            }
        }
    }

    // =========================
    // VIEW EVENTS
    // =========================

    public static void viewEvents() {

        System.out.println("\n===== AVAILABLE EVENTS =====");

        List<Event> events = eventDAO.getAllEvents();

        if (events.isEmpty()) {

            System.out.println(
                    "No events available."
            );

        } else {

            for (Event event : events) {

                event.displayEvent();
            }
        }
    }

    // =========================
    // ADD EVENT
    // =========================

    public static void addEvent() {

        System.out.println("\n===== ADD EVENT =====");

        System.out.print("Event name: ");
        String name = scanner.nextLine();

        System.out.print("Description: ");
        String description = scanner.nextLine();

        System.out.print(
                "Event date (YYYY-MM-DD): "
        );

        String dateInput = scanner.nextLine();

        LocalDate eventDate =
                LocalDate.parse(dateInput);

        System.out.print("Venue: ");
        String venue = scanner.nextLine();

        System.out.print("Organizer: ");
        String organizer = scanner.nextLine();

        System.out.print("Capacity: ");
        int capacity = scanner.nextInt();
        scanner.nextLine();

        Event event = new Event(
                0,
                name,
                description,
                eventDate,
                venue,
                organizer,
                capacity
        );

        eventDAO.addEvent(event);
    }

    // =========================
    // DELETE EVENT
    // =========================

    public static void deleteEvent() {

        System.out.println("\n===== DELETE EVENT =====");

        viewEvents();

        System.out.print(
                "Enter Event ID to delete: "
        );

        int eventId = scanner.nextInt();
        scanner.nextLine();

        eventDAO.deleteEvent(eventId);
    }

    // =========================
    // REGISTER FOR EVENT
    // =========================

    public static void registerForEvent(User user) {

        System.out.println(
                "\n===== REGISTER FOR EVENT ====="
        );

        viewEvents();

        System.out.print(
                "Enter Event ID: "
        );

        int eventId = scanner.nextInt();
        scanner.nextLine();

        registrationDAO.registerForEvent(
                user.getUserId(),
                eventId
        );
    }

    // =========================
    // CANCEL REGISTRATION
    // =========================

    public static void cancelRegistration(User user) {

        System.out.println(
                "\n===== CANCEL REGISTRATION ====="
        );

        System.out.print(
                "Enter Event ID: "
        );

        int eventId = scanner.nextInt();
        scanner.nextLine();

        registrationDAO.cancelRegistration(
                user.getUserId(),
                eventId
        );
    }
}