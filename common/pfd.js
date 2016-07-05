/**
 * Created by bogdi on 05.07.2016.
 */
'use strict';

const EventEmitter = require('events');
const _ = require('lodash');
const {NetworkProcess} = require('./process');

class PerfectFailureDetector extends NetworkProcess {
    static get HEARTBEAT_INTERVAL() {
        return (NetworkProcess.MAX_READ_DELAY * 2) * 2;
    }

    constructor(processes) {
        super();

        this.processes = processes;
        this.alive = [];
        this.detected = [];

        this.on('heartbeat', (process) => {
            setTimeout(() => {
                this.alive.push(process);
            }, NetworkProcess.READ_DELAY);
        });
    }

    start() {
        this.alive = this.processes.concat([]);
        setInterval(() => {
            let index = 0;
            while (index < this.processes.length) {
                const process = this.processes[index];
                if (this.alive.indexOf(process) < 0 && this.detected.indexOf(process) < 0) {
                    this.detected.push(process);
                    console.log(`PFD: ${process.id} crashed`);
                    _.remove(this.processes, process);

                    this.emit('crash', process);
                } else {
                    process.emit('heartbeat', this);
                    index++;
                }
            }

            this.alive = [];
        }, PerfectFailureDetector.HEARTBEAT_INTERVAL);
    }
}

module.exports = {PerfectFailureDetector};