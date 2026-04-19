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

const requestTimestamp = processZero.requestResource();
expect(
  processZero.attemptToAccessResource(requestTimestamp),
  true,
  "P0 should succeed after requesting access",
);
// expect(
//   processOne.attemptToAccessResource(),
//   false,
//   "P1 should fail without requesting access",
// );
// processOne.requestResource();
// processOne.attemptToAccessResource(); //should fail
// processZero.releaseResource();
// processOne.attemptToAccessResource(); // should succeed
