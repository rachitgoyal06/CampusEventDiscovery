package interfaces;

public interface Registrable {

    void registerForEvent(int userId, int eventId);

    void cancelRegistration(int userId, int eventId);
}