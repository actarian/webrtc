const https = require('https');
const fs = require('fs');
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const WebSocket = require('ws');
const path = require('path');
const { staticMiddleware } = require('./static/static.js');
// const { apiMiddleware, useApi, uuid, setSessionUser, RoleType } = require('./api/api.js');
const multipart = require('connect-multiparty');
const multipartMiddleware = multipart({ uploadDir: path.join(__dirname, '../docs/temp/') });
const BASE_HREF = '/webrtc/';
const ASSETS = `assets/`;
const ROOT = `../docs/`;
const PORT = process.env.PORT || 5000;
const PORT_HTTPS = 6443;

const Vars = {
	port: PORT,
	portHttps: PORT_HTTPS,
	host: `http://localhost:${PORT}`,
	hostHttps: `https://localhost:${PORT_HTTPS}`,
	charset: 'utf8',
	assets: ASSETS,
	baseHref: BASE_HREF,
	cacheMode: 'file',
	cache: path.join(__dirname, `../cache/`),
	root: ROOT,
	template: path.join(__dirname, `${ROOT}index.html`),
	accessControlAllowOrigin: true,
};

const staticMiddleware_ = staticMiddleware(Vars);
// const apiMiddleware_ = apiMiddleware(Vars);

const app = express();
app.use(session({
	secret: 'webrtc-secret-keyword',
	saveUninitialized: true,
	resave: true
}));
app.disable('x-powered-by');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.raw());
app.use('*', staticMiddleware_);
// app.use('*', apiMiddleware_);

app.post('/api/upload', multipartMiddleware, function(request, response) {
	if (Vars.accessControlAllowOrigin) {
		response.header('Access-Control-Allow-Origin', '*');
	}
	console.log(request.body, request.files);
	const file = request.files.file;
	const id = uuid();
	const fileName = `${id}_${file.name}`;
	const folder = `/uploads/`;
	const input = file.path;
	const output = path.join(__dirname, Vars.root, folder, fileName);
	const upload = {
		id,
		fileName,
		type: file.type,
		originalFileName: file.name,
		url: `${folder}${fileName}`,
	};
	const uploads = [upload];
	fs.copyFile(input, output, (error) => {
		fs.unlink(input, () => { });
		if (error) {
			throw error;
		} else {
			response.status(200).send(JSON.stringify(uploads));
		}
	});
});
app.options('/api/upload', function(request, response) {
	console.log('OPTIONS');
	if (Vars.accessControlAllowOrigin) {
		response.header('Access-Control-Allow-Origin', '*');
	}
	response.status(200).send();
});

app.get('/', function(request, response) {
	response.sendFile(path.join(__dirname, '../docs/index.html'));
});
app.get('/webrtc', function(request, response) {
	response.sendFile(path.join(__dirname, '../docs/index.html'));
});

const server = app.listen(Vars.port, () => {
	console.log(`NodeJs Running server at ${Vars.host}`);
});

const webSocketOptions = { server };

/*
{
	port: 8080,
	perMessageDeflate: {
		zlibDeflateOptions: {
			// See zlib defaults.
			chunkSize: 1024,
			memLevel: 7,
			level: 3
		},
		zlibInflateOptions: {
			chunkSize: 10 * 1024
		},
		// Other options settable:
		clientNoContextTakeover: true, // Defaults to negotiated value.
		serverNoContextTakeover: true, // Defaults to negotiated value.
		serverMaxWindowBits: 10, // Defaults to negotiated value.
		// Below options specified as default values.
		concurrencyLimit: 10, // Limits zlib concurrency for perf.
		threshold: 1024 // Size (in bytes) below which messages
		// should not be compressed.
	}
};
*/

const heroku = (process.env._ && process.env._.indexOf('heroku'));
if (!heroku) {
	const privateKey = fs.readFileSync('certs/server.key', 'utf8');
	const certificate = fs.readFileSync('certs/server.crt', 'utf8');
	const credentials = { key: privateKey, cert: certificate };
	const serverHttps = https.createServer(credentials, app);
	serverHttps.listen(Vars.portHttps, () => {
		console.log(`NodeJs Running server at ${Vars.hostHttps}`);
	});
	// webSocketOptions.port = Vars.portHttps;
	webSocketOptions.server = serverHttps;
}

const socketServer = new WebSocket.Server(webSocketOptions);

const peerIdMap = new Map();
const peerInfoMap = new Map();

function getUniqueUserId() {
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

function sendMessage(message = {}, receiver, sender) {
	const senderId = sender ? peerIdMap.get(sender) : -1;
	message.uid = message.uid || senderId;
	message.timeStamp = Date.now();
	// console.log('NodeJs.WebSocket.sendMessage', message);
	receiver.send(JSON.stringify(message));
}

function broadCastMessage(message = {}, socket) {
	delete message.broadcast;
	const clients = socketServer.clients;
	clients.forEach(client => {
		if (client != socket && client.readyState === WebSocket.OPEN) {
			sendMessage(message, client, socket);
		}
	});
}

function forwardMessage(message = {}, socket) {
	const clients = socketServer.clients;
	clients.forEach(client => {
		const clientId = peerIdMap.get(client);
		if (clientId === message.remoteId && client.readyState === WebSocket.OPEN) {
			sendMessage(message, client, socket);
		}
	});
}

socketServer.on('connection', (socket) => {

	let peerId = getUniqueUserId();

	peerIdMap.set(socket, peerId);

	// console.log(socket);
	// console.log(socketServer.clients);

	function onSocketMessage(event) {
		const message = JSON.parse(event);
		// console.log('WebSocket.onSocketMessage', message);
		if (message.broadcast) {
			broadCastMessage(message, socket);
		} else if (message.remoteId) {
			forwardMessage(message);
		} else {
			switch (message.type) {
				case 'join':
					if (message.uid) {
						peerIdMap.set(socket, message.uid);
						peerId = message.uid;
					}
					if (message.info) {
						peerInfoMap.set(socket, message.info);
					}
					sendMessage({ type: 'joined', peerId }, socket);
					broadCastMessage({ type: 'peerJoined', peerId });
					break;
				case 'leave':
					peerId = peerIdMap.get(socket);
					sendMessage({ type: 'leaved', peerId }, socket);
					break;
				case 'peers':
					sendMessage({ type: 'peers', peers: Array.from(peerIdMap.values()) }, socket);
					break;
				case 'peerInfo':
					let peerInfo = null;
					socketServer.clients.forEach(client => {
						if (peerIdMap.get(client) === message.peerId) {
							peerInfo = peerInfoMap.get(client);
						}
					});
					sendMessage({ type: 'peerInfo', peerInfo }, socket);
					break;
				case 'peerInfos':
					const peerInfos = peerInfoMap.keys.map(x => peerInfos.get(x));
					sendMessage({ type: 'peerInfos', peerInfos }, socket);
					break;
				case 'text':
					// sendMessage({ type: 'text', text: `Hello, you sent -> ${message.text}` }, socket);
					break;
			}
		}
	}

	const si = setInterval(() => {
		socketServer.clients.forEach((socket) => {
			if (!socket.isAlive) {
				return socket.terminate();
			}
			socket.isAlive = false;
			socket.ping(null, false, true);
		});
	}, 10000);

	function onSocketClose(event) {
		clearInterval(si);
		peerId = peerIdMap.get(socket);
		broadCastMessage({ type: 'peerLeaved', peerId });
		peerIdMap.delete(socket);
		peerInfoMap.delete(socket);
	}

	socket.isAlive = true;
	socket.on('pong', () => {
		socket.isAlive = true;
		// sendMessage({ type: 'peerStatus', peer: 123456, isAlive: socket.isAlive, broadcast: true });
	});
	socket.on('message', onSocketMessage);
	socket.on('close', onSocketClose);

	// broadCastMessage({ type: 'peerJoined', peerId });
});
