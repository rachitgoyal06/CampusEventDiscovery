package dao;

import model.Event;
import util.DBConnection;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Date;
import java.util.ArrayList;
import java.util.List;

public class EventDAO {

    // Add a new event
    public void addEvent(Event event) {

        String sql =
                "INSERT INTO events " +
                "(event_name, description, event_date, venue, organizer, capacity) " +
                "VALUES (?, ?, ?, ?, ?, ?)";

        try (
            Connection con = DBConnection.getConnection();
            PreparedStatement ps = con.prepareStatement(sql)
        ) {

            ps.setString(1, event.getEventName());
            ps.setString(2, event.getDescription());
            ps.setDate(3, event.getEventDate() != null ? Date.valueOf(event.getEventDate()) : null);
            ps.setString(4, event.getVenue());
            ps.setString(5, event.getOrganizer());
            ps.setInt(6, event.getCapacity());

            ps.executeUpdate();

            System.out.println("Event added successfully!");

        } catch (SQLException e) {

            System.out.println("Error adding event!");
            e.printStackTrace();
        }
    }

    // Get all events
    public List<Event> getAllEvents() {

        List<Event> events = new ArrayList<>();

        String sql = "SELECT * FROM events ORDER BY event_date";

        try (
            Connection con = DBConnection.getConnection();
            Statement st = con.createStatement();
            ResultSet rs = st.executeQuery(sql)
        ) {

            while (rs.next()) {

                    Date d = rs.getDate("event_date");
                    Event event = new Event(
                        rs.getInt("event_id"),
                        rs.getString("event_name"),
                        rs.getString("description"),
                        d != null ? d.toLocalDate() : null,
                        rs.getString("venue"),
                        rs.getString("organizer"),
                        rs.getInt("capacity")
                    );

                events.add(event);
            }

        } catch (SQLException e) {

            System.out.println("Error getting events!");
            e.printStackTrace();
        }

        return events;
    }

    // Delete an event
    public void deleteEvent(int eventId) {

        String sql =
                "DELETE FROM events WHERE event_id = ?";

        try (
            Connection con = DBConnection.getConnection();
            PreparedStatement ps = con.prepareStatement(sql)
        ) {

            ps.setInt(1, eventId);

            int rows = ps.executeUpdate();

            if (rows > 0) {

                System.out.println(
                        "Event deleted successfully!"
                );

            } else {

                System.out.println(
                        "Event not found!"
                );
            }

        } catch (SQLException e) {

            System.out.println("Error deleting event!");
            e.printStackTrace();
        }
    }
}