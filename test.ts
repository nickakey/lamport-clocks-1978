import { Process } from "./distributed-events";
// Test Utils
const expect = <T>(actual: T, expected: T, testDescription: string) => {
  if (expected === actual) {
    console.log(`Test "${testDescription}" passed ✅`);
  } else {
    console.log(`-------------------------`);
    console.log(`${testDescription} failed ❌`);
    console.log(`Expecting ${expected} but got ${actual}`);
    console.log(`--------------------------`);
  }
};

// End Test Utils

const processZero = new Process();
const processOne = new Process();
const processTwo = new Process();

expect(
  processZero.attemptToAccessResource(),
  false,
  "P0 should fail without requesting access",
);
processZero.requestResource();
expect(
  processZero.attemptToAccessResource(),
  true,
  "P0 should succeed after requesting access",
);
expect(
  processOne.attemptToAccessResource(),
  false,
  "P1 should fail without requesting access",
);
processOne.requestResource();
expect(
  processOne.attemptToAccessResource(),
  false,
  "P1 should still fail since zero hasn't released",
);
processZero.releaseResource();
expect(
  processOne.attemptToAccessResource(),
  true,
  "P1 should now succeed since zero released",
);
