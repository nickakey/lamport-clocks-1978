const resource = (caller: string) => {
  console.log(`resource is being called by ${caller}`);
};

type Message = {
  timestamp: number;
  processId: number;
  message: string;
  type: "request" | "release" | "ack";
};

class Process {
  #processId = 0;
  #messageQueue: Message[] = [];
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
    this.#messageQueue.push(message);
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
    this.#messageQueue = this.#messageQueue.filter((m) => {
      m.processId !== message.processId;
    });
  }
  receiveMessage(message: Message, sender: Process) {
    // todo make these individual handlers
    if (message.type === "ack") {
      this.handleAck(message, sender);
    } else if (message.type === "request") {
      this.handleRequest(message, sender);
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
    // 3. To release the resource,
    // process P~ removes any Tm:Pi requests resource message from its request queue
    // and sends a (timestamped) Pi releases resource message to every other process.

    // --- I'm just assuming the front of the queue is my own request resource call ... idk if that is right
    this.#messageQueue.shift();
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
    // To request the resource,
    // process Pi sends the mes- sage TIn:P/requests resource to every other process,
    // and puts that message on its request queue, where T,~ is the timestamp of the message.

    const request: Message = {
      timestamp: this.#timestamp,
      processId: this.#processId,
      message: "request resource",
      type: "request",
    };
    this.sendMessageToAllProcesses(request);

    // I'm not actually sure when we are suppposed to increment this timestamp, I am just guessing its here?
    this.#timestamp += 1;
  }
}

const processOne = new Process();
const processTwo = new Process();
const processThree = new Process();

processOne.requestResource();
