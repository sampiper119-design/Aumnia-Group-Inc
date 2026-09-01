// Supabase client config — safe to expose client-side.
// The anon key is public by design; Row Level Security (see supabase/schema.sql)
// is what actually protects the data, not secrecy of this key.
//
// Loaded via CDN (no build step): include this AFTER the Supabase JS CDN
// script tag on any page that needs it, e.g.:
//   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
//   <script src="javascript/supabase-client.js"></script>

const SUPABASE_URL = "https://yxbmogimmvqczqufgqzy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4Ym1vZ2ltbXZxY3pxdWZncXp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4MzMxOTAsImV4cCI6MjEwMzQwOTE5MH0.s1Oce1-EPT2U9iAm5p4Yf6ofxCl6y6G8TFmViMtN_q8";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
