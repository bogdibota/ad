/**
 * Created by bogdi on 05.07.2016.
 */

const EventEmitter = require('events');
const _ = require('lodash');

const {PerfectFailureDetector} = require('./common/pfd');
const {Process} = require('./common/process');
const {BestEffortBroadcast} = require('./common/beb');

class Data {
    constructor(type, timestamp, value) {
        this.type = type;
        this.timestamp = timestamp;
        this.value = value;
    }
}

class OneNAtomicRegister extends EventEmitter {
    constructor() {
        super();
    }
}

class ReadImposeWriteAll extends OneNAtomicRegister {
    constructor(beb, pfd) {
        super();

        this.beb = beb;
        this.pfd = pfd;

        this.ts = 0;
        this.val = undefined;

        this.correct = processes; //all processes

        this.writeSet = [];
        this.readVal = undefined;

        this.reading = false;

        this.on('read', () => {
            this.reading = true;
            this.readVal = JSON.parse(JSON.stringify(this.val));
            this.beb.emit('broadcast', {type: 'WRITE', timestamp: this.ts, value: this.val});
        });

        this.on('write', (val) => {
            this.beb.emit('broadcast', 'WRITE', this.ts + 1, val);
        });

        this.beb.on('deliver', (p, ts, val) => {

        });
    }

}


const processes = [];
const bestEffortBroadcast = new BestEffortBroadcast(processes);
const pfd = new PerfectFailureDetector(processes);

_.times(10, (i) => {
    //const proc = new UniformReliableBroadcast(i, bestEffortBroadcast, pfd, processes);
    //processes.push(proc);
});

pfd.start();

processes[1].willFail(500);
processes[3].willFail(380);
processes[6].willFail(530);
processes[2].willFail(540);
processes[0].willFail(600);

setTimeout(() => {
    //stuff here
}, 530);

