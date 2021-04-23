
let connected = false;
let messages = [];

const dataChannelOptions = { ordered: true };
const connection = new RTCPeerConnection();
connection.addEventListener('icecandidate', onIceCandidate);

function onIceCandidate(event) {
	console.log('onIceCandidate', event.candidate);
	// send to remote
}

function onRemoteIceCandidate(message) {
	connection.addIceCandidate(message.candidate).then(_ => {
		console.log('onRemoteIceCandidate', message.candidate);
	});
}

function connect(remoteId) {
	const offer = connection.createOffer().then(offer => {
		connection.setLocalDescription(offer).then(description => {
			// send offer to remote
		});
	});
}

function onRemoteOffer(message) {
	connection.setRemoteDescription(message.offer).then(_ => {
		console.log('onRemoteOffer', message);
		connection.createAnswer().then(answer => {
			connection.setLocalDescription(answer).then(description => {
				// send answer to remote
			});
		});
	});
}

function onRemoteAnswer(message) {
	connection.setRemoteDescription(message.answer).then(_ => {
		console.log('onRemoteAnswer', message);
	});
}

const channel = connection.createDataChannel('messaging-channel', dataChannelOptions);
channel.binaryType = 'arraybuffer';
channel.addEventListener('open', onOpen);
channel.addEventListener('close', onClose);
channel.addEventListener('message', onMessage);

function onOpen(event) {
	connected = true;
}

function onClose(event) {
	connected = false;
}

function onMessage(event) {
	messages.push(event.data);
}

function sendMessage(channel) {
	channel.send('hello');
}

connect('remoteId');
