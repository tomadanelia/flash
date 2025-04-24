// tests/integration/day.test.ts
 /// <reference types="jest" />
 import 'tsconfig-paths/register';
import request from 'supertest';
import { app } from '../../src/server'; 
import supabase  from '../../src/db/supabaseClient';
import { SupabaseClient } from '@supabase/supabase-js'; 


if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_KEY in .env.test file');
 }
describe('POST /api/day/next Integration Tests', () => {
  beforeEach(async () => {
    console.log("Before each test, ensure the DB connection is valid and the current_day is 0")
    // Check for successful initial database connection for testing and setup testing environment properly.
    try {
        const { data, error } = await supabase
        .from('system_state')
        .select('current_day')
        .eq('id', 1)               
        .single();     
        if (error) {
            console.error('Error connecting or selecting during beforeEach:', error);
            throw new Error(`Database error during select: ${error.message}`);
        }
          console.log("Succesful connection setup.Starting with deletion")
      } catch (error) {
        console.error('BeforeEach: Test database could not be reached.', error);
        throw error; // Abort all tests if setup fails
      }
    // Crucial: Reset the system_state.current_day to 0 before each test
    try {
        const { error: updateError } = await supabase
        .from('system_state')
        .update({ current_day: 0 })
        .eq('id', 1);

        if (updateError) {
            console.error('Error resetting current_day in beforeEach:', updateError);
            throw new Error(`Database error resetting current_day: ${updateError.message}`);
        }
        console.log("Succesfully deleted and reset the database")
    } catch (error) {
        console.error('BeforeEach: Test database could not be reached to update', error);
        throw error; 
    }
  });



     test('POST /api/day/next should increment day and return 200', async () => { 
     const response=await request(app).post('/api/day/next');
     expect(response.statusCode).toBe(200);
     expect(response.body).toEqual({ message: 'Day incremented successfully', currentDay: 1 })
     const { data } = await supabase.from('system_state').select('current_day').eq('id', 1).single();
     expect(data?.current_day).toBe(1);
    });

});