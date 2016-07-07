/**
 * Created by bogdi on 05.07.2016.
 */
'use strict';

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

class ReadImposeWriteAll extends EventEmitter {
    constructor(beb, pfd, processes) {
        super();

        this.beb = beb;
        this.pfd = pfd;

        this.ts = 0;
        this.val = undefined;

        this.correct = processes; //all processes

        this.writeSet = [];
        this.readVal = undefined;

        this.reading = false;

        this.pfd.on('crash', () => {
            this.isDone();
        });

        this.on('read', () => {
            this.reading = true;
            this.readVal = !this.val ? undefined : JSON.parse(JSON.stringify(this.val));
            this.beb.emit('broadcast', new Data('WRITE', this.ts, this.val));
        });

        this.on('write', (val) => {
            this.beb.emit('broadcast', new Data('WRITE', this.ts + 1, val));
        });

        this.beb.on('deliver', (p, data) => {
            if (data.timestamp > this.ts) {
                this.ts = data.timestamp;
                this.val = data.value;
                console.log('write deliver:', this.val);
            }
            p.emit('message', {m: 'ack'}, this);
        });

        this.on('deliver', (p) => {
            this.writeSet.push(p);
            this.isDone();
        });

        this.on('readReturn', (val) => {
            console.log('onar: read complete', val);
        });

        this.on('writeReturn', () => {
            console.log('onar: write complete');
        });
    }

    isDone() {
        if (_.isEqual(_.intersection(this.correct, this.writeSet), this.correct)) {
            this.writeSet = [];
            if (this.reading) {
                this.reading = false;
                this.emit('readReturn', this.readVal);
            } else {
                this.emit('writeReturn');
            }
        }
    }

}


const processes = [];
const bestEffortBroadcast = new BestEffortBroadcast(processes);
const pfd = new PerfectFailureDetector(processes);
const onar = new ReadImposeWriteAll(bestEffortBroadcast, pfd, processes);

_.times(10, (i) => {
    const proc =new Process(i);
    proc.verbose = true;
    processes.push(proc);
});

pfd.start();

processes[1].willFail(500);
processes[3].willFail(380);
processes[6].willFail(530);
processes[2].willFail(540);
processes[0].willFail(600);

onar.emit('read');

// onar.once('writeReturn', () => {
//     onar.emit('read');
// });
//
// onar.once('readReturn', () => {
//     onar.emit('write', 'Căluț');
// });

onar.emit('write', 'Căluț');
onar.emit('read');
setTimeout(() => {
    onar.emit('read');


    onar.emit('write', 'Căluț');
}, 530);

