// Time, Clocks, and the Ordering of Events in a Distributed System
// Leslie Lamport

// ------- START Utils etc --------- //
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

export let verboseLogging = true;

const oldConsoleLog = console.log;
const log = (...args) => {
  verboseLogging && oldConsoleLog("\n", ...args, "\n");
};
// ------- END of Utils etc --------- //

type Message = {
  originalRequestTimestamp?: number;
  timestamp: number;
  processId: number;
  message: string;
  type: "request" | "release" | "ack";
};
class MessageStorage {
  #storage = {};
  save(message: Message) {
    this.#storage[
      `ProcessId:${message.processId}:OriginalRequestTimestamp:${message.originalRequestTimestamp}`
    ] = message;
  }
  get(processId: number, timestamp: number) {
    console.log(this.#storage);
    return this.#storage[
      `ProcessId:${processId}:OriginalRequestTimestamp:${timestamp}`
    ];
  }
}

export class Process {
  //when we request access, we save the timestamp of our request for use in future access attempts etc
  #currentRequestTimestamp: null | number = null;

  #processId = 0;

  //queue used for handling ordering of requests
  #requestQueue = new MessageQueue();

  //general store used for other types of messages (release&ack)
  #messageStore = new MessageStorage();

  #timestamp = 0;

  constructor() {
    this.#processId = Process.processCount;
    Process.processCount++;
    Process.processes.push(this);
  }

  static processCount = 0;
  static processes: Process[] = [];

  handleAck(message: Message, sender: Process) {
    log(
      `Process ${this.#processId} receiving acknowledgement ${JSON.stringify(message, null, 2)}`,
    );
    this.#timestamp += 1;
    if (message.timestamp > this.#timestamp) {
      this.#timestamp = message.timestamp + 1;
    }
    this.#messageStore.save(message);
  }

  handleRequest(message: Message, sender: Process) {
    // When process Pj receives the message
    // T,~:P~ re- quests resource, it places it on its request queue
    // and sends a (timestamped) acknowledgment message to P~.'~
    log(
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
    this.#requestQueue.enqueue(message);
    sender.receiveMessage(
      {
        originalRequestTimestamp: message.timestamp,
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
    log(`-----P${this.#processId} handling release-----`);
    log("before message queue", this.#requestQueue);
    this.#messageStore.save(message);
    this.#requestQueue.queue = this.#requestQueue.queue.filter(
      (m) => m.processId !== message.processId || m.type !== "request",
    );
    log("before message queue", this.#requestQueue);
    log("-------");
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
    log(`P${this.#processId} releasing resource `);
    // 3. To release the resource,
    // process P~ removes any Tm:Pi requests resource message from its request queue
    // and sends a (timestamped) Pi releases resource message to every other process.

    log(this.#requestQueue);
    // --- I'm just assuming the front of the queue is my own request resource call ... idk if that is right
    const poppedMessage = this.#requestQueue.dequeue();
    log("popped message ", poppedMessage);
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
    log(`-----  P${this.#processId} requesting resource -------`);
    // To request the resource,
    // process Pi sends the mes- sage TIn:P/requests resource to every other process,
    // and puts that message on its request queue, where T,~ is the timestamp of the message.

    const request: Message = {
      timestamp: this.#timestamp,
      processId: this.#processId,
      message: "request resource",
      type: "request",
    };
    this.#currentRequestTimestamp = request.timestamp;
    this.#requestQueue.enqueue(request);
    this.sendMessageToAllProcesses(request);

    this.#timestamp += 1;
    return request.timestamp;
  }

  attemptToAccessResource(): boolean {
    const timestamp = this.#currentRequestTimestamp;
    if (timestamp === null) {
      log("missing request timestamp");
      return false;
    } else {
      log(`accessing in relation to request ${timestamp}`);
    }
    log(`--------P${this.#processId} attempting to access resource---- ----`);
    // Process P/is granted the resource when the following two conditions are satisfied:

    const earliestRequest = this.#requestQueue.peekFrontOfQueue();

    // (i) There is a Tm:Pi requests resource message in its request queue which is ordered before any other request in its queue by the relation ~.
    log("earliest request ", earliestRequest);
    if (
      earliestRequest &&
      earliestRequest.processId === this.#processId &&
      earliestRequest.type === "request"
    ) {
      // (ii) P~has received a message from every other process time- stamped later than Tin.~ (nick: I assume this is an ack request??)
      const everyOtherProcessAcked = Process.processes.every((p) => {
        if (p.#processId === this.#processId) return true;
        return this.#messageStore.get(p.#processId, timestamp);
      });
      if (everyOtherProcessAcked) {
        log(`Access granted for process ${this.#processId}!!`);
        return true;
      }
    }
    log(`Access denied for process ${this.#processId}!!`);
    return false;
  }
}
