import { BehaviorSubject, combineLatest, of, ReplaySubject } from "rxjs";
import { filter, switchAll } from "rxjs/operators";
import { SignalingService } from "./signaling.service";

const SERVERS = null;

const OFFER_OPTIONS = {
	offerToReceiveAudio: true,
	offerToReceiveVideo: true
};

const state = {
	local: null,
};

export class WebRTCClient {

	remote$ = new BehaviorSubject(null);

	constructor(stream, uid = null, remoteId = null) {
		this.uid = uid || WebRTCClient.getUniqueUserId();
		this.remoteId = remoteId;
		this.stream = stream || new MediaStream();
		this.onIceCandidate = this.onIceCandidate.bind(this);
		this.onIceConnectionStateChange = this.onIceConnectionStateChange.bind(this);
		this.onIceGatheringStateChange = this.onIceGatheringStateChange.bind(this);
		this.onSignalingStateChange = this.onSignalingStateChange.bind(this);
		this.onNegotiationceNeeded = this.onNegotiationceNeeded.bind(this);
		this.onTrack = this.onTrack.bind(this);
		// Create an RTCPeerConnection via the polyfill.
		const connection = this.connection = new RTCPeerConnection(SERVERS);
		if (stream) {
			stream.getTracks().forEach(track => connection.addTrack(track, stream));
		}
		connection.addEventListener('icecandidate', this.onIceCandidate);
		connection.addEventListener('iceconnectionstatechange', this.onIceConnectionStateChange);
		connection.addEventListener('icegatheringstatechange', this.onIceGatheringStateChange);
		connection.addEventListener('signalingstatechange', this.onSignalingStateChange);
		connection.addEventListener('negotiationneeded', this.onNegotiationceNeeded);
		connection.addEventListener('track', this.onTrack);
		SignalingService.in$.pipe(
			// tap(event => console.log(event)),
			filter(event => event.uid !== this.uid),
		).subscribe(message => {
			// console.log('WebRTCClient.message', message);
			switch (message.type) {
				case 'candidate':
					this.onMessageCandidate(message);
					break;
				/*
			case 'offer':
				this.onMessageOffer(message);
				break;
				*/
				case 'answer':
					this.onMessageAnswer(message);
					break;
			}
		});
		// this.sendOffer();
	}

	dispose() {
		this.remote$.next(null);

		const connection = this.connection;
		connection.removeEventListener('icecandidate', this.onIceCandidate);
		connection.removeEventListener('iceconnectionstatechange', this.onIceConnectionStateChange);
		connection.removeEventListener('icegatheringstatechange', this.onIceGatheringStateChange);
		connection.removeEventListener('signalingstatechange', this.onSignalingStateChange);
		connection.removeEventListener('negotiationneeded', this.onNegotiationceNeeded);
		connection.removeEventListener('track', this.onTrack);
		/*
		connection.getTracks().forEach(track => {
			track.stop();
		});
		*/

		/*
		connection.getTransceivers().forEach(transceiver => {
			transceiver.stop();
		});
		*/

		/*
		if (localVideo.srcObject) {
			localVideo.pause();
			localVideo.srcObject.getTracks().forEach(track => {
				track.stop();
			});
		}
		*/

		// Close the peer connection

		connection.close();
		this.connection = null;
		// webcamStream = null;
	}

	onIceCandidate(event) {
		// console.log('WebRTCClient.onIceCandidate', event);
		const candidate = event.candidate;
		if (candidate) {
			SignalingService.send({ type: 'candidate', candidate, uid: this.uid, remoteId: this.remoteId });
		}
	}

	onIceConnectionStateChange(event) {
		// console.log('WebRTCClient.onIceConnectionStateChange', event);
		switch (this.iceConnectionState) {
			case 'closed':
			case 'failed':
			case 'disconnected':
				this.dispose();
				break;
		}
	}

	onIceGatheringStateChange(event) {
		console.log('WebRTCClient.onIceGatheringStateChange', this.connection.iceGatheringState);
	}

	onSignalingStateChange(event) {
		// console.log('WebRTCClient.onSignalingStateChange', this.connection.signalingState);
		switch (this.connection.signalingState) {
			case 'closed':
				this.dispose();
				break;
		}
	}

	onNegotiationceNeeded(event) {
		// console.log('WebRTCClient.onNegotiationceNeeded', event);
		this.connection.createOffer(OFFER_OPTIONS).then((offer) => {
			/*
			if (this.connection.signalingState != 'stable') {
				console.log('WebRTCClient.onNegotiationceNeeded', 'The connection isn\'t stable yet; postponing...');
				return;
			}
			*/
			this.connection.setLocalDescription(offer).then(_ => {
				SignalingService.send({ type: 'offer', description: this.connection.localDescription, uid: this.uid, remoteId: this.remoteId });
			});
		}, (x) => this.onCreateOfferReject(x));
	}

	onTrack(event) {
		const remote = event.streams[0];
		console.log('WebRTCClient.onTrack', remote);
		this.remote$.next(remote);
	}

	sendOffer() {
		this.connection.createOffer(OFFER_OPTIONS).then((offer) => {
			this.connection.setLocalDescription(offer).then(_ => {
				SignalingService.send({ type: 'offer', description: this.connection.localDescription, uid: this.uid, remoteId: this.remoteId });
			});
		}, (x) => this.onCreateOfferReject(x));
	}

	onMessageCandidate(message) {
		if (message.uid !== this.remoteId) {
			return;
		}
		// console.log('WebRTCClient.onMessageCandidate', 'uid', message.uid);
		this.connection.addIceCandidate(message.candidate).then(() => {
			// console.log('WebRTCService.onAddIceCandidateResolve', message.candidate.candidate);
		}, this.onAddIceCandidateReject);
	}

	onMessageOffer(message) {
		if (message.uid !== this.remoteId) {
			return;
		}
		// console.log('WebRTCClient.onMessageOffer', 'uid', message.uid);
		const description = new RTCSessionDescription(message.description);
		const onAnswer = () => {
			this.connection.createAnswer().then((answer) => {
				this.connection.setLocalDescription(answer).then(_ => {
					SignalingService.send({ type: 'answer', description: this.connection.localDescription, uid: this.uid, remoteId: this.remoteId });
				});
			}, (x) => this.onCreateAnswerReject(x));
		}
		if (this.connection.signalingState != 'stable') {
			Promise.all([
				this.connection.setLocalDescription({ type: "rollback" }),
				this.connection.setRemoteDescription(description).catch(error => {
					console.log('WebRTCClient.onMessageOffer.setRemoteDescription.error', error);
				}),
			]);
			return;
		} else {
			this.connection.setRemoteDescription(description).then(_ => {
				onAnswer();
			}).catch(error => {
				console.log('WebRTCClient.onMessageOffer.setRemoteDescription.error', error);
			});
		}
	}

	onMessageAnswer(message) {
		if (message.uid !== this.remoteId) {
			return;
		}
		// console.log('WebRTCClient.onMessageAnswer', 'uid', message.uid);
		// Since the 'remote' side has no media stream we need
		// to pass in the right constraints in order for it to
		// accept the incoming offer of audio and video.
		this.connection.setRemoteDescription(new RTCSessionDescription(message.description)).catch(error => {
			console.log('WebRTCClient.onMessageAnswer.setRemoteDescription.error', error);
		});
	}

	onAddIceCandidateReject(error) {
		console.log('WebRTCClient.onAddIceCandidateReject.error', error);
	}

	onCreateOfferReject(error) {
		console.log('WebRTCClient.onCreateOfferReject.error', error);
	}

	onCreateAnswerReject(error) {
		console.log('WebRTCClient.onCreateAnswerReject.error', error);
	}

	static call(stream, uid = null, remoteId = null) {
		// console.log('WebRTCClient.call', remoteId);
		const client = new WebRTCClient(stream, uid, remoteId);
		return client;
	}

	static answer(stream, uid = null, remoteId = null) {
		// console.log('WebRTCClient.answer', remoteId);
		const client = new WebRTCClient(stream, uid, remoteId);
		return client;
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
		// return Math.floor(Math.random() * 100000) + '-' + new Date().getTime();
	}
}

export class WebRTCClientService {

	static remotes$ = new ReplaySubject().pipe(
		switchAll(),
	);
	static peers$ = new BehaviorSubject([]);

	static addPeer(stream, uid, peerId) {
		const peers = this.peers$.getValue().slice();
		const index = peers.reduce((p, c, i) => {
			return c.remoteId === peerId ? i : p;
		}, -1);
		if (index !== -1) {
			return null;
		} else {
			const client = new WebRTCClient(stream, uid, peerId);
			peers.push(client);
			this.peers$.next(peers);
			this.switchRemotes();
			return client;
		}
	}

	static addPeers(stream, uid, peerIds) {
		const peers = this.peers$.getValue().slice();
		peerIds.forEach(peerId => {
			const client = new WebRTCClient(stream, uid, peerId);
			peers.push(client);
		})
		this.peers$.next(peers);
		this.switchRemotes();
	}

	static removePeer(peerId) {
		const peers = this.peers$.getValue().slice();
		const index = peers.reduce((p, c, i) => {
			return c.remoteId === peerId ? i : p;
		}, -1);
		if (index !== -1) {
			const client = peers[index];
			client.dispose();
			peers.splice(index, 1);
			this.peers$.next(peers);
			this.switchRemotes();
		}
	}

	static switchRemotes() {
		const peers = this.peers$.getValue().slice();
		const remotes = peers.map(client => client.remote$);
		const remotes$ = remotes.length ? combineLatest(remotes) : of([]);
		WebRTCClientService.remotes$.next(remotes$);
	}

}
