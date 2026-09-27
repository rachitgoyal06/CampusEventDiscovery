package model;

public class Student extends User {

    private String studentId;
    private String course;

    // Constructor
    public Student(int userId,
                   String name,
                   String email,
                   String password,
                   String studentId,
                   String course) {

        super(userId, name, email, password, "STUDENT");

        this.studentId = studentId;
        this.course = course;
    }

    // Getter
    public String getStudentId() {
        return studentId;
    }

    // Setter
    public void setStudentId(String studentId) {
        this.studentId = studentId;
    }

    // Getter
    public String getCourse() {
        return course;
    }

    // Setter
    public void setCourse(String course) {
        this.course = course;
    }

    // Method Overriding
    @Override
    public void displayUser() {

        System.out.println("Student ID: " + studentId);
        System.out.println("Name: " + getName());
        System.out.println("Email: " + getEmail());
        System.out.println("Course: " + course);
    }
}