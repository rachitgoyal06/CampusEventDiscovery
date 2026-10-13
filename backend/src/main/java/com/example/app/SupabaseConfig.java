package com.example.app;

import io.supabase.SupabaseClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SupabaseConfig {
    @Bean
    public SupabaseClient supabaseClient(org.springframework.core.env.Environment env) {
        String url = env.getRequiredProperty("supabase.url");
        String key = env.getRequiredProperty("supabase.service-key");
        return SupabaseClient.builder()
                .url(url)
                .key(key)
                .build();
    }
}
