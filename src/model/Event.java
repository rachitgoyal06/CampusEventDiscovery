package model;

import java.time.LocalDate;

public class Event {

    // Encapsulation
    private int eventId;
    private String eventName;
    private String description;
    private LocalDate eventDate;
    private String venue;
    private String organizer;
    private int capacity;

    // Default constructor
    public Event() {
    }

    // Parameterized constructor
    public Event(int eventId,
                 String eventName,
                 String description,
                 LocalDate eventDate,
                 String venue,
                 String organizer,
                 int capacity) {

        this.eventId = eventId;
        this.eventName = eventName;
        this.description = description;
        this.eventDate = eventDate;
        this.venue = venue;
        this.organizer = organizer;
        this.capacity = capacity;
    }

    // Getters and Setters

    public int getEventId() {
        return eventId;
    }

    public void setEventId(int eventId) {
        this.eventId = eventId;
    }

    public String getEventName() {
        return eventName;
    }

    public void setEventName(String eventName) {
        this.eventName = eventName;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public LocalDate getEventDate() {
        return eventDate;
    }

    public void setEventDate(LocalDate eventDate) {
        this.eventDate = eventDate;
    }

    public String getVenue() {
        return venue;
    }

    public void setVenue(String venue) {
        this.venue = venue;
    }

    public String getOrganizer() {
        return organizer;
    }

    public void setOrganizer(String organizer) {
        this.organizer = organizer;
    }

    public int getCapacity() {
        return capacity;
    }

    public void setCapacity(int capacity) {
        this.capacity = capacity;
    }

    // Method to display event
    public void displayEvent() {

        System.out.println("--------------------------------");
        System.out.println("Event ID: " + eventId);
        System.out.println("Event: " + eventName);
        System.out.println("Description: " + description);
        System.out.println("Date: " + eventDate);
        System.out.println("Venue: " + venue);
        System.out.println("Organizer: " + organizer);
        System.out.println("Capacity: " + capacity);
        System.out.println("--------------------------------");
    }
}