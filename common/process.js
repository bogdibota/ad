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
        this.lastAlive = new Date().getTime();

        this.on('heartbeat', (pfd) => {
            setTimeout(() => {
                pfd.emit('heartbeat', this);
            }, NetworkProcess.READ_DELAY);
        });

        this.on('message', (message, beb) => {
            setTimeout(() => {
                console.log(`${id}: received`, message.m);
                beb.emit('deliver', this, message);
            }, NetworkProcess.READ_DELAY);
        });
    }
}

module.exports = {Process, NetworkProcess};
