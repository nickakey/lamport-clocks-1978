const resource = (caller: string) => {
  console.log(`resource is being called by ${caller}`);
};

type RequestType = {
  timestamp: number;
  processId: number;
  message: string;
};

class Process {
  #processId = 0;
  #messageQueue: RequestType[] = [];
  #timestamp = 0;

  constructor() {
    this.#processId = Process.processCount;
    Process.processCount++;
    Process.processes.push(this);
  }

  static processCount = 0;
  static processes: Process[] = [];

  receiveAcknowledgement(req: RequestType, sender: Process) {
    console.log(
      `Process ${this.#processId} receiving acknowledgement ${JSON.stringify(req, null, 2)}`,
    );
    this.#timestamp += 1;
    //besides updating timestamp, not sure what we are supposed to do here ...
    if (req.timestamp > this.#timestamp) {
      this.#timestamp = req.timestamp + 1;
    }
  }

  receiveRequest(req: RequestType, sender: Process) {
    // When process Pj receives the message
    // T,~:P~ re- quests resource, it places it on its request queue
    // and sends a (timestamped) acknowledgment message to P~.'~
    console.log(
      `Process ${this.#processId} receiving request ${JSON.stringify(req, null, 2)}`,
    );
    this.#timestamp += 1;
    if (req.timestamp > this.#timestamp) {
      /* 
      IR2. 
      (a) If event a is the sending of a message m by process P~,
      then the message m contains a timestamp Tm= Ci(a). 
      (b) Upon receiving a message m, 
      process Pi sets Ci greater than or equal to its present value and greater than Tm.
    */
      this.#timestamp = req.timestamp + 1;
    }
    this.#messageQueue.push(req);
    sender.receiveAcknowledgement(
      {
        timestamp: this.#timestamp,
        processId: this.#processId,
        message: "received request",
      },
      this,
    );
  }

  sendRequestToAllProcesses(req: RequestType) {
    Process.processes.forEach((p) => {
      if (p.#processId !== this.#processId) {
        p.receiveRequest(req, this);
      }
    });
  }

  releaseResource() {
    // 3. To release the resource,
    // process P~ removes any Tm:Pi requests resource message from its request queue
    // and sends a (timestamped) Pi releases resource message to every other process.
    //do I just assume the front of the queue is my own request resource call?
  }

  requestResource() {
    // To request the resource,
    // process Pi sends the mes- sage TIn:P/requests resource to every other process,
    // and puts that message on its request queue, where T,~ is the timestamp of the message.

    const request: RequestType = {
      timestamp: this.#timestamp,
      processId: this.#processId,
      message: "request resource",
    };
    this.sendRequestToAllProcesses(request);

    // I'm not actually sure when we are suppposed to increment this timestamp, I am just guessing its here?
    this.#timestamp += 1;
  }
}

const processOne = new Process();
const processTwo = new Process();
const processThree = new Process();

processOne.requestResource();
