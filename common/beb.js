/**
 * Created by bogdi on 05.07.2016.
 */
'use strict';

const EventEmitter = require('events');

class BestEffortBroadcast extends EventEmitter {
    static get READ_DELAY() {
        return 30;
    }

    constructor(processes) {
        super();

        this.processes = processes;

        this.on('broadcast', (message) => {
            this.processes.forEach((process) => {
                process.emit('message', message, this);
            });
        });
    }
}

module.exports = {BestEffortBroadcast};
