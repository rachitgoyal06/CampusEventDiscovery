package util;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public class DBConnection {

    private static final String HOST =
            System.getenv("DB_HOST") != null ? System.getenv("DB_HOST") : "aws-0-ap-northeast-1.pooler.supabase.com";

    private static final String PORT =
            System.getenv("DB_PORT") != null ? System.getenv("DB_PORT") : "5432";

    private static final String DATABASE =
            System.getenv("DB_NAME") != null ? System.getenv("DB_NAME") : "postgres";

    private static final String USER =
            System.getenv("DB_USER") != null ? System.getenv("DB_USER") : "postgres.ueaxokgriaobucaafuyi";

    private static final String PASSWORD =
            System.getenv("DB_PASSWORD") != null ? System.getenv("DB_PASSWORD") : "Rachit@0612";

    public static Connection getConnection() {

        String url =
                "jdbc:postgresql://" +
                HOST + ":" +
                PORT + "/" +
                DATABASE +
                "?sslmode=require";

        try {

            Connection connection =
                    DriverManager.getConnection(
                            url,
                            USER,
                            PASSWORD
                    );

            System.out.println(
                    "Supabase connected successfully!"
            );

            return connection;

        } catch (SQLException e) {

            System.out.println(
                    "Supabase connection failed!"
            );

            e.printStackTrace();

            return null;
        }
    }
}