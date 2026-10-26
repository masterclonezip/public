/**
 * Yono Transparency - Proof-of-Work Utility
 * Handles the client-side solving of SHA-256 challenges.
 */

export const solveChallenge = async (
  nonce: string, 
  difficulty: string, 
  maxIterations: number = 5000000
): Promise<number> => {
  return new Promise((resolve, reject) => {
    let counter = 0;
    const encoder = new TextEncoder();
    
    // Fast path optimization
    const isDifficulty4 = difficulty === "0000";
    const isDifficulty3 = difficulty === "000";
    const isDifficulty2 = difficulty === "00";
    const isDifficulty1 = difficulty === "0";

    const processChunk = async () => {
      // Process 10000 hashes per chunk to finish instantly while still yielding
      const end = Math.min(counter + 10000, maxIterations);
      
      for (; counter < end; counter++) {
        const msg = encoder.encode(nonce + counter);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msg);
        const hashArray = new Uint8Array(hashBuffer);
        
        // Highly optimized byte checking (avoids slow hex string conversion)
        if (isDifficulty1) {
          if ((hashArray[0] >> 4) === 0) {
            return resolve(counter);
          }
        } else if (isDifficulty2) {
          if (hashArray[0] === 0) {
            return resolve(counter);
          }
        } else if (isDifficulty3) {
          if (hashArray[0] === 0 && (hashArray[1] >> 4) === 0) {
            return resolve(counter);
          }
        } else if (isDifficulty4) {
          if (hashArray[0] === 0 && hashArray[1] === 0) {
            return resolve(counter);
          }
        } else {
          // Fallback for custom difficulties
          const hashHex = Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');
          if (hashHex.startsWith(difficulty)) {
            return resolve(counter);
          }
        }
      }
      
      if (counter >= maxIterations) {
        reject(new Error('Mathematical limit exceeded: Challenge too difficult or timeout.'));
      } else {
        // Yield to the main browser thread to keep UI completely smooth
        setTimeout(processChunk, 0);
      }
    };
    
    processChunk();
  });
};

/**
 * Validates a solution locally before sending (optional optimization)
 */
export const verifySolutionLocally = async (
  nonce: string, 
  solution: number, 
  difficulty: string
): Promise<boolean> => {
  const encoder = new TextEncoder();
  const msg = encoder.encode(nonce + solution);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msg);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex.startsWith(difficulty);
};
