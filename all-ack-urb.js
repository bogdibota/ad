'use strict';

const EventEmitter = require('events');
const _ = require('lodash');

const {PerfectFailureDetector} = require('./common/pfd');
const {Process} = require('./common/process');
const {BestEffortBroadcast} = require('./common/beb');

class UniformReliableBroadcast extends Process {
    constructor(id, beb, pfd, processes) {
        super(id);

        this.verbose = false;

        this.delivered = [];
        this.pending = [];
        this.correct = processes; // all processes here

        this.ack = {};

        this.beb = beb;
        this.pfd = pfd;

        this.beb.on('deliver', (p, message) => {
            if (this.hasFailed) {
                return;
            }
            setTimeout(() => {
                if (this.verbose) {
                    console.log(`BEB ${this.id}: deliver ${p.id}`);
                }

                if (!this.ack[message.m]) {
                    this.ack[message.m] = [];
                }
                this.ack[message.m].push(p);

                if (_.findIndex(this.pending, {s: message.s, m: message.m}) < 0) {
                    this.pending.push({s: message.s, m: message.m});
                    this.beb.emit('braodcast', message);
                }

                this.willDeliver(message.s, message.m);
            }, Process.READ_DELAY);
        });

        this.pfd.on('crash', () => {
            this.pending.forEach((message) => {
                this.willDeliver(message.s, message.m);
            });
        });

        this.on('deliver', (s, m) => {
            console.log(`all-ack urb ${this.id}: ${m} broadcasted by ${s.id} was delivered to`, this.ack[m].map(it => it.id));
        });
    }

    broadcast(message) {
        this.pending.push({s: this, m: message});
        this.beb.emit('broadcast', {DATA: null, s: this, m: message});
    }

    canDeliver(m) {
        return _.isEqual(_.intersection(this.correct, this.ack[m]), this.correct);
    }

    willDeliver(s, m) {
        if (_.findIndex(this.pending, {s: s, m: m}) > -1 &&
            this.canDeliver(m) &&
            this.delivered.indexOf(m) < 0
        ) {
            this.delivered.push(m);
            this.emit('deliver', s, m);
        }
    }
}


const processes = [];
const bestEffortBroadcast = new BestEffortBroadcast(processes);
const pfd = new PerfectFailureDetector(processes);

_.times(10, (i) => {
    const proc = new UniformReliableBroadcast(i, bestEffortBroadcast, pfd, processes);
    processes.push(proc);
});

pfd.start();

processes[1].willFail(500);
processes[3].willFail(380);
processes[6].willFail(530);
processes[2].willFail(540);
processes[0].willFail(600);
setTimeout(() => {
    processes[0].broadcast('penis');
}, 530);
