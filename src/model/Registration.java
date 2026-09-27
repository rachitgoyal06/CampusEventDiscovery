package model;

import java.time.LocalDate;

public class Registration {

    // Encapsulation
    private int registrationId;
    private int userId;
    private int eventId;
    private LocalDate registrationDate;

    // Default constructor
    public Registration() {
    }

    // Parameterized constructor
    public Registration(int registrationId,
                        int userId,
                        int eventId,
                        LocalDate registrationDate) {

        this.registrationId = registrationId;
        this.userId = userId;
        this.eventId = eventId;
        this.registrationDate = registrationDate;
    }

    // Getter and Setter for registrationId
    public int getRegistrationId() {
        return registrationId;
    }

    public void setRegistrationId(int registrationId) {
        this.registrationId = registrationId;
    }

    // Getter and Setter for userId
    public int getUserId() {
        return userId;
    }

    public void setUserId(int userId) {
        this.userId = userId;
    }

    // Getter and Setter for eventId
    public int getEventId() {
        return eventId;
    }

    public void setEventId(int eventId) {
        this.eventId = eventId;
    }

    // Getter and Setter for registrationDate
    public LocalDate getRegistrationDate() {
        return registrationDate;
    }

    public void setRegistrationDate(LocalDate registrationDate) {
        this.registrationDate = registrationDate;
    }
}