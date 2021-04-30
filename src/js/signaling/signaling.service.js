import { ReplaySubject } from 'rxjs';

export class SignalingService {

	static in$ = new ReplaySubject(1);
	static in(message) {
		SignalingService.in$.next(message);
	}

	static out$ = new ReplaySubject(1);
	static out(message) {
		SignalingService.out$.next(message);
	}
	static send(message) {
		SignalingService.out$.next(message);
	}
	static sendBack(message) {
		message = Object.assign({}, message, { clientId: message.remoteId, remoteId: message.clientId });
		SignalingService.out$.next(message);
	}
	static broadcast(message) {
		message.broadcast = true;
		SignalingService.out$.next(message);
	}

}
