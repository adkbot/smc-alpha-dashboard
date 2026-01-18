import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://zfefnlibzgkfbgdtagho.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmZWZubGliemdrZmJnZHRhZ2hvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNzYyMzgsImV4cCI6MjA3Nzc1MjIzOH0.HXuS3QTggHlSsTh0XQtaNC_Q20xiY9X3WHcwukHRg6A';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('Checking if Vision Agent tables exist...\n');
  
  const tables = ['vision_agent_videos', 'vision_agent_settings', 'vision_agent_signals'];
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    
    if (error) {
      console.log(`❌ Table ${table}: NOT FOUND or ERROR - ${error.message}`);
    } else {
      console.log(`✅ Table ${table}: EXISTS`);
    }
  }
}

checkTables();
