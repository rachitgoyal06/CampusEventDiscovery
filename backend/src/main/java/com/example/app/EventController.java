package com.example.app;

import io.supabase.PostgrestResponse;
import io.supabase.SupabaseClient;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/events")
public class EventController {
    private final SupabaseClient supabase;

    public EventController(SupabaseClient supabase) {
        this.supabase = supabase;
    }

    @GetMapping
    public List<Event> getAll() {
        PostgrestResponse<Event> resp = supabase.from("events").select("*").execute(Event.class);
        return resp.getData();
    }

    @PostMapping
    public Event create(@RequestBody Event newEvent) {
        supabase.from("events").insert(newEvent).execute();
        return newEvent;
    }
}
