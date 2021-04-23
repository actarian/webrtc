import { Component, getContext } from 'rxcomp';
import { filter, takeUntil, tap } from 'rxjs/operators';
import { SignalingService } from './webrtc/signaling.service';
import { UserMediaService } from './webrtc/user-media.service';
import { WebRTCClientService } from './webrtc/webrtc-client.service';
import { WebSocketService } from './webrtc/websocket.service';

export default class AppComponent extends Component {

	get remotePeers() {
		return (this.peers || []).filter(x => x !== this.uid);
	}

	onInit() {
		const { node } = getContext(this);
		node.classList.remove('hidden');
		// console.log('AppComponent');

		this.local = null;
		this.uid = null;
		this.peers = [];
		this.remotes = [];
		this.streams = [];

		SignalingService.in$.pipe(
			tap(message => {
				// console.log('AppComponent.SignalingService.in$', message);
				switch (message.type) {
					case 'socketConnected':
						this.onSocketConnected();
						break;
					case 'joined':
						this.onJoined(message.peerId);
						break;
					case 'leaved':
						break;
					case 'peers':
						this.onPeers(message.peers);
						break;
					case 'peerJoined':
						if (message.peerId !== this.uid) {
							this.onPeerJoined(message.peerId);
						}
						break;
					case 'peerLeaved':
						if (message.peerId !== this.uid) {
							this.onPeerLeaved(message.peerId);
						}
						break;
					case 'peerInfo':
						break;
					case 'peerInfos':
						break;
					case 'offer':
						this.onOffer(message);
						break;
					default:
				}
			}),
		).subscribe();

		// rewire messages to socket service
		SignalingService.out$.pipe(
			filter(message => {
				switch (message.type) {
					default:
						return true;
				}
			}),
			tap(message => WebSocketService.send(message)),
		).subscribe();

		WebRTCClientService.remotes$.pipe(
			takeUntil(this.unsubscribe$)
		).subscribe(remotes => {
			// console.log('AppComponent.remotes', remotes);
			this.remotes = remotes;
			this.pushChanges();
		});
	}

	onJoin(event) {
		if (this.uid) {
			return;
		}
		UserMediaService.getUserMedia().then(stream => {
			this.local = stream;
			this.pushChanges();
			WebSocketService.connect(null, (message) => SignalingService.in(message));
		});
	}

	onSocketConnected() {
		SignalingService.out({ type: 'join', uid: WebSocketService.uid, info: { firstName: 'Jhon', lastName: 'Appleseed' } });
	}

	onJoined(uid) {
		this.uid = WebSocketService.uid = uid;
		this.pushChanges();
		WebSocketService.send({ type: 'peers', uid: WebSocketService.uid });
	}

	onPeers(peers) {
		this.peers = peers;
		WebRTCClientService.addPeers(this.local, this.uid, this.remotePeers);
		this.pushChanges();
	}

	onPeerJoined(peerId) {
		const index = this.peers.indexOf(peerId);
		if (index === -1) {
			this.peers.push(peerId);
			this.pushChanges();
		}
	}

	onPeerLeaved(peerId) {
		const index = this.peers.indexOf(peerId);
		if (index !== -1) {
			this.peers.splice(index, 1);
			this.pushChanges();
		}
		WebRTCClientService.removePeer(peerId);
	}

	onCall(peerId) {
		return;
		/*
		console.log('AppComponent.onCall', peerId);
		const client = this.client = WebRTCClient.call(this.local, this.uid, peerId);
		client.streams$.pipe(
			takeUntil(this.unsubscribe$),
		).subscribe(streams => {
			this.streams = streams;
			this.pushChanges();
		});
		*/
	}

	onOffer(message) {
		// console.log('AppComponent.onOffer', message);
		const client = WebRTCClientService.addPeer(this.local, this.uid, message.uid);
		if (client != null) {
			client.onMessageOffer(message);
		}
		/*
		if (this.client) {
			return;
		}
		const client = this.client = WebRTCClient.answer(this.local, this.uid, message.uid);
		client.onMessageOffer(message);
		client.streams$.pipe(
			takeUntil(this.unsubscribe$),
		).subscribe(streams => {
			this.streams = streams;
			this.pushChanges();
		});
		*/
	}

}

AppComponent.meta = {
	selector: '[app-component]',
};
