/**
 * Created by bogdi on 06.07.2016.
 */
'use strict';

const EventEmitter = require('events');
const _ = require('lodash');

const {PerfectFailureDetector} = require('./common/pfd');
const {NetworkProcess} = require('./common/process');
const {BestEffortBroadcast} = require('./common/beb');

class Data {
    constructor(type, round, proposals) {
        this.type = type;
        if (proposals) {
            this.round = round;
            this.proposals = proposals;
        } else {
            this.value = round;
        }
    }
}

class Decider extends NetworkProcess {

    constructor(id) {
        super();

        this.id = id;

        this.on('message', (message, pl) => {
            setTimeout(() => {
                if (this.verbose) {
                    console.log(`${id}: received ${message.type}`, message.proposals || message.value);
                }

                if (message.type === 'proposal') {
                    this.decision = this.decision || Math.floor(Math.sqrt(message.proposals[0]));
                    message.proposal = this.decision;
                    // message.proposal = Math.max(...message.proposals) + 1;
                    // message.proposal = Math.floor(Math.random() * 100);

                    if (this.verbose) {
                        console.log(`${id}:${message.round}: decided ${message.proposal}`);
                    }
                    pl.emit('deliver', this, message);
                } else {
                    this.decision = undefined;
                }
            }, NetworkProcess.READ_DELAY);
        });
    }
}

class FloodingConsensus extends EventEmitter {
    constructor(beb, pfd, processes) {
        super();

        this.beb = beb;
        this.pfd = pfd;

        this.correct = processes; //all processes

        this.round = 1;

        this.decision = undefined;

        this.receivedFrom = [processes.concat()];
        this.proposals = [];

        this.on('propose', (v) => {
            if (!this.proposals[1]) {
                this.proposals[1] = [];
            }

            this.proposals[1].push(v);
            this.beb.emit('broadcast', new Data('proposal', 1, this.proposals[1]));
        });

        this.beb.on('deliver', (p, data) => {
            if (data.type === 'proposal') {
                if (!this.receivedFrom[data.round]) {
                    this.receivedFrom[data.round] = [];
                }
                this.receivedFrom[data.round].push(p);

                if (!this.proposals[data.round]) {
                    this.proposals[data.round] = [];
                }
                this.proposals[data.round].push(data.proposal);
            } else if (data.type === 'decided' && this.correct.indexOf(p) > -1 && this.decision === undefined) {
                this.decision = data.value;
                this.beb.emit('broadcast', new Data('decided', data.value));
                this.emit('decide', this.decision);
            }

            this.isDecided();
        });

        this.pfd.on('crash', () => {
            this.isDecided();
        });
    }

    isDecided() {
        if (_.isEqual(_.intersection(this.correct, this.receivedFrom[this.round]), this.correct) && !this.decision) {
            if (_.isEqual(this.receivedFromIds(this.round), this.receivedFromIds(this.round - 1))) {
                this.decision = Math.min(...this.proposals[this.round]);
                this.beb.emit('broadcast', new Data('decided', this.decision));
                this.emit('decide', this.decision);
            } else {
                this.round++;
                this.beb.emit('broadcast', new Data('proposal', this.round, this.proposals[this.round - 1].concat()));
            }
        }
    }

    receivedFromIds(round) {
        return this.receivedFrom[round].map(it => it.id).sort();
    }

}


const processes = [];
const bestEffortBroadcast = new BestEffortBroadcast(processes);
const pfd = new PerfectFailureDetector(processes);
const c = new FloodingConsensus(bestEffortBroadcast, pfd, processes);

_.times(10, (i) => {
    const proc = new Decider(i);
    proc.verbose = true;
    processes.push(proc);
});

pfd.start();

processes[1].willFail(500);
processes[3].willFail(380);
processes[6].willFail(530);
processes[2].willFail(540);
processes[0].willFail(600);

setTimeout(() => {
    c.emit('propose', 125);
}, 500);

c.on('decide', (data) => {
    console.log('c: decided value: ', data);
});
