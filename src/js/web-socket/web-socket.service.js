import { ReplaySubject } from "rxjs";

export class WebSocketService {

	static message$ = new ReplaySubject(1);

	static connect(uid = null, onMessageCallback = null) {
		uid = uid || this.getUniqueUserId();
		this.uid = uid;
		this.onMessageCallback = onMessageCallback;
		this.onOpen = this.onOpen.bind(this);
		this.onClose = this.onClose.bind(this);
		this.onMessage = this.onMessage.bind(this);
		const host = location.origin.replace(/^https/, 'wss').replace(/^http/, 'ws');
		const socket = this.socket = new WebSocket(host);
		socket.addEventListener('open', this.onOpen);
		socket.addEventListener('close', this.onClose);
		socket.addEventListener('message', this.onMessage);
	}

	static disconnect() {
		const socket = this.socket;
		if (socket) {
			socket.close();
			this.socket = null;
		}
	}

	static onOpen(event) {
		// console.log('WebSocketService.onOpen');
		const message = { type: 'socketConnected' };
		this.message$.next(message);
		if (typeof this.onMessageCallback === 'function') {
			this.onMessageCallback(message);
		}
	}

	static onClose(event) {
		// console.log('WebSocketService.onClose');const message = { type: 'socketConnected' };
		const message = { type: 'socketDisconnected' };
		this.message$.next(message);
		if (typeof this.onMessageCallback === 'function') {
			this.onMessageCallback(message);
		}
	}

	static onMessage(event) {
		const message = JSON.parse(event.data);
		// console.log('WebSocketService.onMessage', message);
		if (message.remoteId) {
			message.sendBack = (response = {}) => {
				const backMessage = Object.assign({}, message, response, { uid: message.remoteId, remoteId: message.uid });
				WebSocketService.send(backMessage);
			};
		}
		if (typeof this.onMessageCallback === 'function') {
			this.onMessageCallback(message);
		}
		this.message$.next(message);
	}

	static send(message = {}, broadcast) {
		const socket = WebSocketService.socket;
		message.uid = this.uid;
		message.timeStamp = Date.now();
		if (broadcast) {
			message.broadcast = true;
		}
		// console.log('WebSocketService.send', message);
		socket.send(JSON.stringify(message));
	}

	static sendAll(message = {}) {
		WebSocketService.send(message, true);
	}

	static getUniqueUserId() {
		// max safe integer 9007199254740991 length 16
		// max allowed integer 4294967296 2^32
		const m = 9007199254740991;
		const mult = 10000000000000;
		const a = (1 + Math.floor(Math.random() * 8)) * 100;
		const b = (1 + Math.floor(Math.random() * 8)) * 10;
		const c = (1 + Math.floor(Math.random() * 8)) * 1;
		const combo = (a + b + c);
		const date = Date.now();
		const uid = combo * mult + date;
		// console.log(combo);
		// console.log(date);
		// console.log(m);
		// console.log('AgoraService.getUniqueUserId', uid);
		return uid.toString();
	}

}
