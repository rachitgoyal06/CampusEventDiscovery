package dao;

import interfaces.Registrable;
import util.DBConnection;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.time.LocalDate;

public class RegistrationDAO implements Registrable {

    // Register a user for an event
    @Override
    public void registerForEvent(int userId, int eventId) {

        String sql =
                "INSERT INTO registrations " +
                "(user_id, event_id, registration_date) " +
                "VALUES (?, ?, ?)";

        try (
            Connection con = DBConnection.getConnection();
            PreparedStatement ps = con.prepareStatement(sql)
        ) {

            ps.setInt(1, userId);
            ps.setInt(2, eventId);
            ps.setDate(3, java.sql.Date.valueOf(LocalDate.now()));

            ps.executeUpdate();

            System.out.println(
                    "Registration successful!"
            );

        } catch (SQLException e) {

            System.out.println(
                    "Registration failed!"
            );

            e.printStackTrace();
        }
    }

    // Cancel a registration
    @Override
    public void cancelRegistration(int userId, int eventId) {

        String sql =
                "DELETE FROM registrations " +
                "WHERE user_id = ? AND event_id = ?";

        try (
            Connection con = DBConnection.getConnection();
            PreparedStatement ps = con.prepareStatement(sql)
        ) {

            ps.setInt(1, userId);
            ps.setInt(2, eventId);

            int rows = ps.executeUpdate();

            if (rows > 0) {

                System.out.println(
                        "Registration cancelled successfully!"
                );

            } else {

                System.out.println(
                        "Registration not found!"
                );
            }

        } catch (SQLException e) {

            System.out.println(
                    "Error cancelling registration!"
            );

            e.printStackTrace();
        }
    }
}