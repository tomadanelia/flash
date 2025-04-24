import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from the .env file in the project root
dotenv.config();
// Retrieve the Supabase URL and Anon Key from environment variables
const supabaseUrl: string | undefined = process.env.SUPABASE_URL;
const supabaseKey: string | undefined = process.env.SUPABASE_KEY;

// Validate that the environment variables are set
if (!supabaseUrl) {
  throw new Error("Supabase URL is not defined. Make sure SUPABASE_URL is set in your .env file.");
}
if (!supabaseKey) {
  throw new Error("Supabase Anon Key is not defined. Make sure SUPABASE_KEY is set in your .env file.");
}

// Create the Supabase client instance
// We assert non-null with ! because we checked for existence above.
// Specify the generic type arguments for better type safety if needed, though often inferred.
const supabase: SupabaseClient = createClient(supabaseUrl!, supabaseKey!);

// Export the initialized client so other modules can use it
export default supabase;

console.log('Supabase client initialized successfully.'); // Optional: Confirmation log