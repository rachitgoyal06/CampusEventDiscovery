package dao;

import model.User;
import util.DBConnection;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

public class UserDAO {

    // Add a new user
    public void addUser(User user) {

        String sql =
                "INSERT INTO users " +
                "(name, email, password, role) " +
                "VALUES (?, ?, ?, ?)";

        try (
            Connection con = DBConnection.getConnection();
            PreparedStatement ps = con.prepareStatement(sql)
        ) {

            ps.setString(1, user.getName());
            ps.setString(2, user.getEmail());
            ps.setString(3, user.getPassword());
            ps.setString(4, user.getRole());

            ps.executeUpdate();

            System.out.println("User added successfully!");

        } catch (SQLException e) {

            System.out.println("Error adding user!");
            e.printStackTrace();
        }
    }

    // Find user by email and password
    public User login(String email, String password) {

        String sql =
                "SELECT * FROM users " +
                "WHERE email = ? AND password = ?";

        try (
            Connection con = DBConnection.getConnection();
            PreparedStatement ps = con.prepareStatement(sql)
        ) {

            ps.setString(1, email);
            ps.setString(2, password);

            ResultSet rs = ps.executeQuery();

            if (rs.next()) {

                User user = new User(
                    rs.getInt("user_id"),
                    rs.getString("name"),
                    rs.getString("email"),
                    rs.getString("password"),
                    rs.getString("role")
                );

                return user;
            }

        } catch (SQLException e) {

            System.out.println("Login error!");
            e.printStackTrace();
        }

        return null;
    }

    // Find user by ID
    public User getUserById(int userId) {

        String sql =
                "SELECT * FROM users WHERE user_id = ?";

        try (
            Connection con = DBConnection.getConnection();
            PreparedStatement ps = con.prepareStatement(sql)
        ) {

            ps.setInt(1, userId);

            ResultSet rs = ps.executeQuery();

            if (rs.next()) {

                return new User(
                    rs.getInt("user_id"),
                    rs.getString("name"),
                    rs.getString("email"),
                    rs.getString("password"),
                    rs.getString("role")
                );
            }

        } catch (SQLException e) {

            System.out.println("Error finding user!");
            e.printStackTrace();
        }

        return null;
    }
}   