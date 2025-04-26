
import { calculateNewBucket } from './learningLogic'; 
describe("calculateNewBucket", () => {
    /*
     * Testing strategy
     *
     * Partitions:
     * - difficulty: "Easy", "Hard", "Wrong"
     * - currentBucket: 0, positive number
     */
  
    test("Easy should increment the bucket by 1", () => {
      expect(calculateNewBucket(2, "Easy")).toBe(3);
      expect(calculateNewBucket(0, "Easy")).toBe(1);
    });
  
    test("Hard should decrement the bucket by 1 but not below 0", () => {
      expect(calculateNewBucket(5, "Hard")).toBe(4);
      expect(calculateNewBucket(0, "Hard")).toBe(0);
    });
  
    test("Wrong should reset the bucket to 0", () => {
      expect(calculateNewBucket(3, "Wrong")).toBe(0);
      expect(calculateNewBucket(0, "Wrong")).toBe(0);
    });
  });