// Time, Clocks, and the Ordering of Events in a Distributed System
// Leslie Lamport

class MessageQueue {
  queue: any[] = [];
  enqueue(el) {
    return this.queue.push(el);
  }
  dequeue() {
    return this.queue.shift();
  }
  peekFrontOfQueue() {
    return this.queue[0];
  }
  length() {
    return this.queue.length;
  }
}

let verboseLogging = false;

const oldConsoleLog = console.log;
console.log = (...args) => {
  verboseLogging && oldConsoleLog("\n", ...args, "\n");
};

type Message = {
  timestamp: number;
  processId: number;
  message: string;
  type: "request" | "release" | "ack";
};

class Process {
  #processId = 0;
  #messageQueue = new MessageQueue();
  #timestamp = 0;

  constructor() {
    this.#processId = Process.processCount;
    Process.processCount++;
    Process.processes.push(this);
  }

  static processCount = 0;
  static processes: Process[] = [];

  handleAck(message: Message, sender: Process) {
    console.log(
      `Process ${this.#processId} receiving acknowledgement ${JSON.stringify(message, null, 2)}`,
    );
    this.#timestamp += 1;
    //besides updating timestamp, not sure what we are supposed to do here ...
    if (message.timestamp > this.#timestamp) {
      this.#timestamp = message.timestamp + 1;
    }

    this.#messageQueue.enqueue(message);
  }

  handleRequest(message: Message, sender: Process) {
    // When process Pj receives the message
    // T,~:P~ re- quests resource, it places it on its request queue
    // and sends a (timestamped) acknowledgment message to P~.'~
    console.log(
      `Process ${this.#processId} receiving request ${JSON.stringify(message, null, 2)}`,
    );
    this.#timestamp += 1;
    if (message.timestamp > this.#timestamp) {
      /* 
      IR2. 
      (a) If event a is the sending of a message m by process P~,
      then the message m contains a timestamp Tm= Ci(a). 
      (b) Upon receiving a message m, 
      process Pi sets Ci greater than or equal to its present value and greater than Tm.
    */
      this.#timestamp = message.timestamp + 1;
    }
    this.#messageQueue.enqueue(message);
    sender.receiveMessage(
      {
        timestamp: this.#timestamp,
        processId: this.#processId,
        message: "received request",
        type: "ack",
      },
      this,
    );
  }

  handleRelease(message: Message, sender: Process) {
    // When process Pj receives a Pi releases resource message,
    // it removes any Tm:P~requests resource message from its request queue.
    // note --- it's unclear HOW exactly to implement that this release is in reference to a specific time stamped request...
    // I think We'd have to store requests made and then reference a specific request we want to release when we release
    // but i'll leave that as a todo and for now just kill all requests for that process

    //filter out messages from that process
    console.log(`-----P${this.#processId} handling release-----`);
    console.log("before message queue", this.#messageQueue);
    this.#messageQueue.queue = this.#messageQueue.queue.filter(
      (m) => m.processId !== message.processId || m.type !== "request",
    );
    console.log("before message queue", this.#messageQueue);
    console.log("-------");
  }
  receiveMessage(message: Message, sender: Process) {
    // todo make these individual handlers
    if (message.type === "ack") {
      this.handleAck(message, sender);
    } else if (message.type === "request") {
      this.handleRequest(message, sender);
    } else if (message.type === "release") {
      this.handleRelease(message, sender);
    }
  }

  sendMessageToAllProcesses(req: Message) {
    Process.processes.forEach((p) => {
      if (p.#processId !== this.#processId) {
        p.receiveMessage(req, this);
      }
    });
  }

  releaseResource() {
    console.log(`P${this.#processId} releasing resource `);
    // 3. To release the resource,
    // process P~ removes any Tm:Pi requests resource message from its request queue
    // and sends a (timestamped) Pi releases resource message to every other process.

    console.log(this.#messageQueue);
    // --- I'm just assuming the front of the queue is my own request resource call ... idk if that is right
    const poppedMessage = this.#messageQueue.dequeue();
    console.log("popped message ", poppedMessage);
    //todo make this just a generic message with a type, instead of release / request / acknowledgement etc
    const message: Message = {
      timestamp: this.#timestamp,
      processId: this.#processId,
      message: `${this.#processId} releasing resource`,
      type: "release",
    };
    this.sendMessageToAllProcesses(message);
  }

  requestResource() {
    console.log(`-----  P${this.#processId} requesting resource -------`);
    // To request the resource,
    // process Pi sends the mes- sage TIn:P/requests resource to every other process,
    // and puts that message on its request queue, where T,~ is the timestamp of the message.

    const request: Message = {
      timestamp: this.#timestamp,
      processId: this.#processId,
      message: "request resource",
      type: "request",
    };
    this.#messageQueue.enqueue(request);
    this.sendMessageToAllProcesses(request);

    // I'm not actually sure when we are suppposed to increment this timestamp, I am just guessing its here?
    this.#timestamp += 1;
  }

  attemptToAccessResource() {
    console.log(
      `--------P${this.#processId} attempting to access resource---- ----`,
    );
    // Process P/is granted the resource when the following two conditions are satisfied:

    const earliestRequest = this.#messageQueue.peekFrontOfQueue();

    // (i) There is a Tm:Pi requests resource message in its request queue which is ordered before any other request in its queue by the relation ~.
    console.log(earliestRequest);
    console.log(this.#messageQueue);
    if (
      earliestRequest &&
      earliestRequest.processId === this.#processId &&
      earliestRequest.type === "request"
    ) {
      // (ii) P~has received a message from every other process time- stamped later than Tin.~ (nick: I assume this is an ack request??)
      // todo - I do think we need to trace all request / release / ack calls by the original timestamp maybe?
      const everyOtherProcessAcked = Process.processes.every((p) => {
        if (p.#processId === this.#processId) return true;
        return this.#messageQueue.queue.find((message) => {
          return message.type === "ack" && message.processId === p.#processId;
        });
      });
      if (everyOtherProcessAcked) {
        return console.log(`Access granted for process ${this.#processId}!!`);
      }
    }
    return console.log(`Access denied for process ${this.#processId}!!`);
  }
}

const processZero = new Process();
const processOne = new Process();
const processTwo = new Process();

verboseLogging = true;
processZero.attemptToAccessResource(); //should fail
processZero.requestResource();
processZero.attemptToAccessResource(); //should succeed
processOne.requestResource();
processOne.attemptToAccessResource(); //should fail
processZero.releaseResource();
processOne.attemptToAccessResource(); // should succeed

// I think when processX succesfully accesses resource, all the other processes need to clear the request resource from their queue
