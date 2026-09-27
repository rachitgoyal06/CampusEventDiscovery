package model;

public class Admin extends User {

    private String department;

    // Constructor
    public Admin(int userId,
                 String name,
                 String email,
                 String password,
                 String department) {

        super(userId, name, email, password, "ADMIN");

        this.department = department;
    }

    // Getter
    public String getDepartment() {
        return department;
    }

    // Setter
    public void setDepartment(String department) {
        this.department = department;
    }

    // Method Overriding
    @Override
    public void displayUser() {

        System.out.println("Admin Name: " + getName());
        System.out.println("Email: " + getEmail());
        System.out.println("Department: " + department);
    }
}