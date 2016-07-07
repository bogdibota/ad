/**
 * Created by bogdi on 05.07.2016.
 */
'use strict';

const EventEmitter = require('events');

class NetworkProcess extends EventEmitter {
    static get READ_DELAY() {
        return Math.random() * Process.MAX_READ_DELAY;
    }

    static get MAX_READ_DELAY() {
        return 40;
    }
    
    constructor() {
        super();

        this.on('heartbeat', (pfd) => {
            setTimeout(() => {
                pfd.emit('heartbeat', this);
            }, NetworkProcess.READ_DELAY);
        });
    }

    willFail(timeout) {
        setTimeout(() => {
            this.hasFailed = true;
            this.removeAllListeners();
        }, timeout);
    }
}

class Process extends NetworkProcess {

    constructor(id) {
        super();

        this.id = id;

        this.on('message', (message, pl) => {
            setTimeout(() => {
                if (this.verbose) {
                    console.log(`${id}: received`, message.m || message.value);
                }
                pl.emit('deliver', this, message);
            }, NetworkProcess.READ_DELAY);
        });
    }
}

module.exports = {Process, NetworkProcess};
