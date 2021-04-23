/**
 * @license webrtc v1.0.0
 * (c) 2021 Luca Zampetti <lzampetti@gmail.com>
 * License: MIT
 */

(function(g,f){typeof exports==='object'&&typeof module!=='undefined'?f(require('rxcomp'),require('rxjs/operators'),require('rxjs')):typeof define==='function'&&define.amd?define(['rxcomp','rxjs/operators','rxjs'],f):(g=typeof globalThis!=='undefined'?globalThis:g||self,f(g.rxcomp,g.rxjs.operators,g.rxjs));}(this,(function(rxcomp, operators, rxjs){'use strict';function _defineProperties(target, props) {
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i];
    descriptor.enumerable = descriptor.enumerable || false;
    descriptor.configurable = true;
    if ("value" in descriptor) descriptor.writable = true;
    Object.defineProperty(target, descriptor.key, descriptor);
  }
}

function _createClass(Constructor, protoProps, staticProps) {
  if (protoProps) _defineProperties(Constructor.prototype, protoProps);
  if (staticProps) _defineProperties(Constructor, staticProps);
  return Constructor;
}

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

function _inheritsLoose(subClass, superClass) {
  subClass.prototype = Object.create(superClass.prototype);
  subClass.prototype.constructor = subClass;

  _setPrototypeOf(subClass, superClass);
}

function _setPrototypeOf(o, p) {
  _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) {
    o.__proto__ = p;
    return o;
  };

  return _setPrototypeOf(o, p);
}var SignalingService = /*#__PURE__*/function () {
  function SignalingService() {}

  SignalingService.in = function _in(message) {
    SignalingService.in$.next(message);
  };

  SignalingService.out = function out(message) {
    SignalingService.out$.next(message);
  };

  SignalingService.send = function send(message) {
    SignalingService.out$.next(message);
  };

  SignalingService.sendBack = function sendBack(message) {
    message = Object.assign({}, message, {
      clientId: message.remoteId,
      remoteId: message.clientId
    });
    SignalingService.out$.next(message);
  };

  SignalingService.broadcast = function broadcast(message) {
    message.broadcast = true;
    SignalingService.out$.next(message);
  };

  return SignalingService;
}();

_defineProperty(SignalingService, "in$", new rxjs.ReplaySubject(1));

_defineProperty(SignalingService, "out$", new rxjs.ReplaySubject(1));var UserMediaService = /*#__PURE__*/function () {
  function UserMediaService() {}

  UserMediaService.getUserMedia = function getUserMedia() {
    return new Promise(function (resolve, reject) {
      var options = {
        audio: true,
        video: {
          width: {
            min: 320,
            ideal: 640,
            max: 640
          },
          height: {
            min: 240,
            ideal: 480,
            max: 480
          }
        }
      };
      navigator.mediaDevices.getUserMedia(options).then(function (stream) {
        // console.log('UserMediaService.getUserMedia', stream);
        UserMediaService.stream = stream;
        /*/
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length > 0) {
        	console.log('UserMediaService.audioTracks', audioTracks[0].label);
        }
        const videoTracks = stream.getVideoTracks();
        if (videoTracks.length > 0) {
        	console.log('UserMediaService.videoTracks', videoTracks[0].label);
        }
        /*/

        resolve(stream);
      }).catch(function (error) {
        console.log('UserMediaService.getUserMedia.error', error);
        reject(error);
      });
    });
  };

  return UserMediaService;
}();

_defineProperty(UserMediaService, "stream", null);var CONNECTION_OPTIONS = {
  iceServers: [{
    urls: 'stun:stunserver.org'
  }]
};
var OFFER_OPTIONS = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: true
};
var WebRTCClient = /*#__PURE__*/function () {
  function WebRTCClient(stream, uid, remoteId) {
    var _this = this;

    if (uid === void 0) {
      uid = null;
    }

    if (remoteId === void 0) {
      remoteId = null;
    }

    _defineProperty(this, "remote$", new rxjs.BehaviorSubject(null));

    this.uid = uid || WebRTCClient.getUniqueUserId();
    this.remoteId = remoteId;
    this.stream = stream || new MediaStream();
    this.onIceCandidate = this.onIceCandidate.bind(this);
    this.onIceConnectionStateChange = this.onIceConnectionStateChange.bind(this);
    this.onIceGatheringStateChange = this.onIceGatheringStateChange.bind(this);
    this.onSignalingStateChange = this.onSignalingStateChange.bind(this);
    this.onNegotiationceNeeded = this.onNegotiationceNeeded.bind(this);
    this.onTrack = this.onTrack.bind(this); // Create an RTCPeerConnection via the polyfill.

    var connection = this.connection = new RTCPeerConnection(CONNECTION_OPTIONS);

    if (stream) {
      stream.getTracks().forEach(function (track) {
        return connection.addTrack(track, stream);
      });
    }

    connection.addEventListener('icecandidate', this.onIceCandidate);
    connection.addEventListener('iceconnectionstatechange', this.onIceConnectionStateChange);
    connection.addEventListener('icegatheringstatechange', this.onIceGatheringStateChange);
    connection.addEventListener('signalingstatechange', this.onSignalingStateChange);
    connection.addEventListener('negotiationneeded', this.onNegotiationceNeeded);
    connection.addEventListener('track', this.onTrack); // !!! cancel on dispose

    SignalingService.in$.pipe( // tap(event => console.log(event)),
    operators.filter(function (event) {
      return event.uid !== _this.uid;
    })).subscribe(function (message) {
      // console.log('WebRTCClient.message', message);
      switch (message.type) {
        case 'candidate':
          _this.onMessageCandidate(message);

          break;

        /*
        case 'offer':
        this.onMessageOffer(message);
        break;
        */

        case 'answer':
          _this.onMessageAnswer(message);

          break;
      }
    }); // this.sendOffer();
  }

  var _proto = WebRTCClient.prototype;

  _proto.dispose = function dispose() {
    this.remote$.next(null);
    var connection = this.connection;
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
    this.connection = null; // webcamStream = null;
  };

  _proto.onIceCandidate = function onIceCandidate(event) {
    // console.log('WebRTCClient.onIceCandidate', event);
    var candidate = event.candidate;

    if (candidate) {
      SignalingService.send({
        type: 'candidate',
        candidate: candidate,
        uid: this.uid,
        remoteId: this.remoteId
      });
    }
  };

  _proto.onIceConnectionStateChange = function onIceConnectionStateChange(event) {
    console.log('WebRTCClient.onIceConnectionStateChange', this.connection.iceConnectionState);

    switch (this.connection.iceConnectionState) {
      case 'closed':
      case 'failed':
      case 'disconnected':
        this.dispose();
        break;
    }
  };

  _proto.onIceGatheringStateChange = function onIceGatheringStateChange(event) {
    console.log('WebRTCClient.onIceGatheringStateChange', this.connection.iceGatheringState);
  };

  _proto.onSignalingStateChange = function onSignalingStateChange(event) {
    // console.log('WebRTCClient.onSignalingStateChange', this.connection.signalingState);
    switch (this.connection.signalingState) {
      case 'closed':
        this.dispose();
        break;
    }
  };

  _proto.onNegotiationceNeeded = function onNegotiationceNeeded(event) {
    var _this2 = this;

    // console.log('WebRTCClient.onNegotiationceNeeded', event);
    this.connection.createOffer(OFFER_OPTIONS).then(function (offer) {
      /*
      if (this.connection.signalingState != 'stable') {
      	console.log('WebRTCClient.onNegotiationceNeeded', 'The connection isn\'t stable yet; postponing...');
      	return;
      }
      */
      _this2.connection.setLocalDescription(offer).then(function (_) {
        SignalingService.send({
          type: 'offer',
          description: _this2.connection.localDescription,
          uid: _this2.uid,
          remoteId: _this2.remoteId
        });
      });
    }, function (x) {
      return _this2.onCreateOfferReject(x);
    });
  };

  _proto.onTrack = function onTrack(event) {
    var remote = event.streams[0];
    console.log('WebRTCClient.onTrack', remote);
    this.remote$.next(remote);
  };

  _proto.sendOffer = function sendOffer() {
    var _this3 = this;

    this.connection.createOffer(OFFER_OPTIONS).then(function (offer) {
      _this3.connection.setLocalDescription(offer).then(function (_) {
        SignalingService.send({
          type: 'offer',
          description: _this3.connection.localDescription,
          uid: _this3.uid,
          remoteId: _this3.remoteId
        });
      });
    }, function (x) {
      return _this3.onCreateOfferReject(x);
    });
  };

  _proto.onMessageCandidate = function onMessageCandidate(message) {
    if (message.uid !== this.remoteId) {
      return;
    } // console.log('WebRTCClient.onMessageCandidate', 'uid', message.uid);


    this.connection.addIceCandidate(message.candidate).then(function () {// console.log('WebRTCService.onAddIceCandidateResolve', message.candidate.candidate);
    }, this.onAddIceCandidateReject);
  };

  _proto.onMessageOffer = function onMessageOffer(message) {
    var _this4 = this;

    if (message.uid !== this.remoteId) {
      return;
    } // console.log('WebRTCClient.onMessageOffer', 'uid', message.uid);


    var description = new RTCSessionDescription(message.description);

    var onAnswer = function onAnswer() {
      _this4.connection.createAnswer().then(function (answer) {
        _this4.connection.setLocalDescription(answer).then(function (_) {
          SignalingService.send({
            type: 'answer',
            description: _this4.connection.localDescription,
            uid: _this4.uid,
            remoteId: _this4.remoteId
          });
        });
      }, function (x) {
        return _this4.onCreateAnswerReject(x);
      });
    };

    if (this.connection.signalingState != 'stable') {
      Promise.all([this.connection.setLocalDescription({
        type: 'rollback'
      }), this.connection.setRemoteDescription(description).catch(function (error) {
        console.log('WebRTCClient.onMessageOffer.setRemoteDescription.error', error);
      })]);
      return;
    } else {
      this.connection.setRemoteDescription(description).then(function (_) {
        onAnswer();
      }).catch(function (error) {
        console.log('WebRTCClient.onMessageOffer.setRemoteDescription.error', error);
      });
    }
  };

  _proto.onMessageAnswer = function onMessageAnswer(message) {
    if (message.uid !== this.remoteId) {
      return;
    } // console.log('WebRTCClient.onMessageAnswer', 'uid', message.uid);
    // Since the 'remote' side has no media stream we need
    // to pass in the right constraints in order for it to
    // accept the incoming offer of audio and video.


    this.connection.setRemoteDescription(new RTCSessionDescription(message.description)).catch(function (error) {
      console.log('WebRTCClient.onMessageAnswer.setRemoteDescription.error', error);
    });
  };

  _proto.onAddIceCandidateReject = function onAddIceCandidateReject(error) {
    console.log('WebRTCClient.onAddIceCandidateReject.error', error);
  };

  _proto.onCreateOfferReject = function onCreateOfferReject(error) {
    console.log('WebRTCClient.onCreateOfferReject.error', error);
  };

  _proto.onCreateAnswerReject = function onCreateAnswerReject(error) {
    console.log('WebRTCClient.onCreateAnswerReject.error', error);
  };

  WebRTCClient.call = function call(stream, uid, remoteId) {
    if (uid === void 0) {
      uid = null;
    }

    if (remoteId === void 0) {
      remoteId = null;
    }

    // console.log('WebRTCClient.call', remoteId);
    var client = new WebRTCClient(stream, uid, remoteId);
    return client;
  };

  WebRTCClient.answer = function answer(stream, uid, remoteId) {
    if (uid === void 0) {
      uid = null;
    }

    if (remoteId === void 0) {
      remoteId = null;
    }

    // console.log('WebRTCClient.answer', remoteId);
    var client = new WebRTCClient(stream, uid, remoteId);
    return client;
  };

  WebRTCClient.getUniqueUserId = function getUniqueUserId() {
    var mult = 10000000000000;
    var a = (1 + Math.floor(Math.random() * 8)) * 100;
    var b = (1 + Math.floor(Math.random() * 8)) * 10;
    var c = (1 + Math.floor(Math.random() * 8)) * 1;
    var combo = a + b + c;
    var date = Date.now();
    var uid = combo * mult + date; // console.log(combo);
    // console.log(date);
    // console.log(m);
    // console.log('AgoraService.getUniqueUserId', uid);

    return uid.toString(); // return Math.floor(Math.random() * 100000) + '-' + new Date().getTime();
  };

  return WebRTCClient;
}();
var WebRTCClientService = /*#__PURE__*/function () {
  function WebRTCClientService() {}

  WebRTCClientService.addPeer = function addPeer(stream, uid, peerId) {
    var peers = this.peers$.getValue().slice();
    var index = peers.reduce(function (p, c, i) {
      return c.remoteId === peerId ? i : p;
    }, -1);

    if (index !== -1) {
      return null;
    } else {
      var client = new WebRTCClient(stream, uid, peerId);
      peers.push(client);
      this.peers$.next(peers);
      this.switchRemotes();
      return client;
    }
  };

  WebRTCClientService.addPeers = function addPeers(stream, uid, peerIds) {
    var peers = this.peers$.getValue().slice();
    peerIds.forEach(function (peerId) {
      var client = new WebRTCClient(stream, uid, peerId);
      peers.push(client);
    });
    this.peers$.next(peers);
    this.switchRemotes();
  };

  WebRTCClientService.removePeer = function removePeer(peerId) {
    var peers = this.peers$.getValue().slice();
    var index = peers.reduce(function (p, c, i) {
      return c.remoteId === peerId ? i : p;
    }, -1);

    if (index !== -1) {
      var client = peers[index];
      client.dispose();
      peers.splice(index, 1);
      this.peers$.next(peers);
      this.switchRemotes();
    }
  };

  WebRTCClientService.switchRemotes = function switchRemotes() {
    var peers = this.peers$.getValue().slice();
    var remotes = peers.map(function (client) {
      return client.remote$;
    });
    var remotes$ = remotes.length ? rxjs.combineLatest(remotes) : rxjs.of([]);
    WebRTCClientService.remotes$.next(remotes$);
  };

  return WebRTCClientService;
}();

_defineProperty(WebRTCClientService, "remotes$", new rxjs.ReplaySubject().pipe(operators.switchAll()));

_defineProperty(WebRTCClientService, "peers$", new rxjs.BehaviorSubject([]));var WebSocketService = /*#__PURE__*/function () {
  function WebSocketService() {}

  WebSocketService.connect = function connect(uid, onMessageCallback) {
    if (uid === void 0) {
      uid = null;
    }

    if (onMessageCallback === void 0) {
      onMessageCallback = null;
    }

    uid = uid || this.getUniqueUserId();
    this.uid = uid;
    this.onMessageCallback = onMessageCallback;
    this.onOpen = this.onOpen.bind(this);
    this.onClose = this.onClose.bind(this);
    this.onMessage = this.onMessage.bind(this);
    var host = location.origin.replace(/^https/, 'wss').replace(/^http/, 'ws');
    var socket = this.socket = new WebSocket(host);
    socket.addEventListener('open', this.onOpen);
    socket.addEventListener('close', this.onClose);
    socket.addEventListener('message', this.onMessage);
  };

  WebSocketService.disconnect = function disconnect() {
    var socket = this.socket;

    if (socket) {
      socket.close();
      this.socket = null;
    }
  };

  WebSocketService.onOpen = function onOpen(event) {
    // console.log('WebSocketService.onOpen');
    var message = {
      type: 'socketConnected'
    };
    this.message$.next(message);

    if (typeof this.onMessageCallback === 'function') {
      this.onMessageCallback(message);
    }
  };

  WebSocketService.onClose = function onClose(event) {
    // console.log('WebSocketService.onClose');const message = { type: 'socketConnected' };
    var message = {
      type: 'socketDisconnected'
    };
    this.message$.next(message);

    if (typeof this.onMessageCallback === 'function') {
      this.onMessageCallback(message);
    }
  };

  WebSocketService.onMessage = function onMessage(event) {
    var message = JSON.parse(event.data); // console.log('WebSocketService.onMessage', message);

    if (message.remoteId) {
      message.sendBack = function (response) {
        if (response === void 0) {
          response = {};
        }

        var backMessage = Object.assign({}, message, response, {
          uid: message.remoteId,
          remoteId: message.uid
        });
        WebSocketService.send(backMessage);
      };
    }

    if (typeof this.onMessageCallback === 'function') {
      this.onMessageCallback(message);
    }

    this.message$.next(message);
  };

  WebSocketService.send = function send(message, broadcast) {
    if (message === void 0) {
      message = {};
    }

    var socket = WebSocketService.socket;
    message.uid = this.uid;
    message.timeStamp = Date.now();

    if (broadcast) {
      message.broadcast = true;
    } // console.log('WebSocketService.send', message);


    socket.send(JSON.stringify(message));
  };

  WebSocketService.sendAll = function sendAll(message) {
    if (message === void 0) {
      message = {};
    }

    WebSocketService.send(message, true);
  };

  WebSocketService.getUniqueUserId = function getUniqueUserId() {
    var mult = 10000000000000;
    var a = (1 + Math.floor(Math.random() * 8)) * 100;
    var b = (1 + Math.floor(Math.random() * 8)) * 10;
    var c = (1 + Math.floor(Math.random() * 8)) * 1;
    var combo = a + b + c;
    var date = Date.now();
    var uid = combo * mult + date; // console.log(combo);
    // console.log(date);
    // console.log(m);
    // console.log('AgoraService.getUniqueUserId', uid);

    return uid.toString();
  };

  return WebSocketService;
}();

_defineProperty(WebSocketService, "message$", new rxjs.ReplaySubject(1));var AppComponent = /*#__PURE__*/function (_Component) {
  _inheritsLoose(AppComponent, _Component);

  function AppComponent() {
    return _Component.apply(this, arguments) || this;
  }

  var _proto = AppComponent.prototype;

  _proto.onInit = function onInit() {
    var _this = this;

    var _getContext = rxcomp.getContext(this),
        node = _getContext.node;

    node.classList.remove('hidden'); // console.log('AppComponent');

    this.local = null;
    this.uid = null;
    this.peers = [];
    this.remotes = [];
    this.streams = [];
    SignalingService.in$.pipe(operators.tap(function (message) {
      // console.log('AppComponent.SignalingService.in$', message);
      switch (message.type) {
        case 'socketConnected':
          _this.onSocketConnected();

          break;

        case 'joined':
          _this.onJoined(message.peerId);

          break;

        case 'leaved':
          break;

        case 'peers':
          _this.onPeers(message.peers);

          break;

        case 'peerJoined':
          if (message.peerId !== _this.uid) {
            _this.onPeerJoined(message.peerId);
          }

          break;

        case 'peerLeaved':
          if (message.peerId !== _this.uid) {
            _this.onPeerLeaved(message.peerId);
          }

          break;

        case 'peerInfo':
          break;

        case 'peerInfos':
          break;

        case 'offer':
          _this.onOffer(message);

          break;
      }
    })).subscribe(); // rewire messages to socket service

    SignalingService.out$.pipe(operators.filter(function (message) {
      switch (message.type) {
        default:
          return true;
      }
    }), operators.tap(function (message) {
      return WebSocketService.send(message);
    })).subscribe();
    WebRTCClientService.remotes$.pipe(operators.takeUntil(this.unsubscribe$)).subscribe(function (remotes) {
      // console.log('AppComponent.remotes', remotes);
      _this.remotes = remotes;

      _this.pushChanges();
    });
  };

  _proto.onJoin = function onJoin(event) {
    var _this2 = this;

    if (this.uid) {
      return;
    }

    UserMediaService.getUserMedia().then(function (stream) {
      _this2.local = stream;

      _this2.pushChanges();

      WebSocketService.connect(null, function (message) {
        return SignalingService.in(message);
      });
    });
  };

  _proto.onSocketConnected = function onSocketConnected() {
    SignalingService.out({
      type: 'join',
      uid: WebSocketService.uid,
      info: {
        firstName: 'Jhon',
        lastName: 'Appleseed'
      }
    });
  };

  _proto.onJoined = function onJoined(uid) {
    this.uid = WebSocketService.uid = uid;
    this.pushChanges();
    WebSocketService.send({
      type: 'peers',
      uid: WebSocketService.uid
    });
  };

  _proto.onPeers = function onPeers(peers) {
    this.peers = peers;
    WebRTCClientService.addPeers(this.local, this.uid, this.remotePeers);
    this.pushChanges();
  };

  _proto.onPeerJoined = function onPeerJoined(peerId) {
    var index = this.peers.indexOf(peerId);

    if (index === -1) {
      this.peers.push(peerId);
      this.pushChanges();
    }
  };

  _proto.onPeerLeaved = function onPeerLeaved(peerId) {
    var index = this.peers.indexOf(peerId);

    if (index !== -1) {
      this.peers.splice(index, 1);
      this.pushChanges();
    }

    WebRTCClientService.removePeer(peerId);
  };

  _proto.onCall = function onCall(peerId) {
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
  };

  _proto.onOffer = function onOffer(message) {
    // console.log('AppComponent.onOffer', message);
    var client = WebRTCClientService.addPeer(this.local, this.uid, message.uid);

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

  };

  _createClass(AppComponent, [{
    key: "remotePeers",
    get: function get() {
      var _this3 = this;

      return (this.peers || []).filter(function (x) {
        return x !== _this3.uid;
      });
    }
  }]);

  return AppComponent;
}(rxcomp.Component);
AppComponent.meta = {
  selector: '[app-component]'
};var environmentServed = {
  flags: {
    production: true
  },
  logo: null,
  background: {
    image: '/Client/docs/img/background.jpg',
    video: '/Client/docs/img/background.mp4'
  },
  colors: {
    menuBackground: '#000000',
    menuForeground: '#ffffff',
    menuOverBackground: '#0099ff',
    menuOverForeground: '#ffffff',
    menuBackBackground: '#0099ff',
    menuBackForeground: '#000000',
    menuBackOverBackground: '#0099ff',
    menuBackOverForeground: '#ffffff'
  },
  assets: '/Client/docs/',
  worker: '/Client/docs/js/workers/image.service.worker.js',
  githubDocs: 'https://raw.githubusercontent.com/actarian/terranova/main/docs/',
  url: {
    index: '/'
  },
  languages: ['en'],
  defaultLanguage: 'en'
};var environmentStatic = {
  flags: {
    production: false
  },
  logo: null,
  background: {
    image: '/terranova/img/background.jpg',
    video: '/terranova/img/background.mp4'
  },
  colors: {
    menuBackground: '#000000',
    menuForeground: '#ffffff',
    menuOverBackground: '#0099ff',
    menuOverForeground: '#ffffff',
    menuBackBackground: '#0099ff',
    menuBackForeground: '#000000',
    menuBackOverBackground: '#0099ff',
    menuBackOverForeground: '#ffffff'
  },
  assets: '/terranova/',
  worker: './js/workers/image.service.worker.js',
  githubDocs: 'https://raw.githubusercontent.com/actarian/terranova/main/docs/',
  url: {
    index: '/'
  },
  languages: ['en'],
  defaultLanguage: 'en'
};var Utils = /*#__PURE__*/function () {
  function Utils() {}

  Utils.merge = function merge(target, source) {
    var _this = this;

    if (typeof source === 'object') {
      Object.keys(source).forEach(function (key) {
        var value = source[key];

        if (typeof value === 'object' && !Array.isArray(value)) {
          target[key] = _this.merge(target[key], value);
        } else {
          target[key] = value;
        }
      });
    }

    return target;
  };

  return Utils;
}();var NODE = typeof module !== 'undefined' && module.exports;
var PARAMS = NODE ? {
  get: function get() {}
} : new URLSearchParams(window.location.search);
var DEBUG =  PARAMS.get('debug') != null;
var BASE_HREF = NODE ? null : document.querySelector('base').getAttribute('href');
var HEROKU = NODE ? false : window && window.location.host.indexOf('herokuapp') !== -1;
var STATIC = NODE ? false : HEROKU || window && (window.location.port === '41789' || window.location.port === '5000' || window.location.port === '6443' || window.location.host === 'actarian.github.io');
var DEVELOPMENT = NODE ? false : window && ['localhost', '127.0.0.1', '0.0.0.0'].indexOf(window.location.host.split(':')[0]) !== -1;
var PRODUCTION = !DEVELOPMENT;
var ENV = {
  STATIC: STATIC,
  DEVELOPMENT: DEVELOPMENT,
  PRODUCTION: PRODUCTION
};
var Environment = /*#__PURE__*/function () {
  var _proto = Environment.prototype;

  _proto.getAbsoluteUrl = function getAbsoluteUrl(path, params) {
    var url = "" + window.location.origin + path; // let url = `${window.location.protocol}//${window.location.host}${path}`;

    Object.keys(params).forEach(function (key) {
      url = url.replace("$" + key, params[key]);
    });
    return url;
  };

  _proto.getPath = function getPath(path) {
    return this.isLocal(path) ? this.href + path : path;
  };

  _proto.isLocal = function isLocal(path) {
    return path.indexOf('://') === -1;
  };

  function Environment(options) {
    if (options) {
      if (typeof options.url === 'object') {
        var language = options.language || '';
        var market = options.market || '';
        Object.keys(options.url).forEach(function (key) {
          options.url[key] = language + market + options.url[key];
        });
      }

      Object.assign(this, options);
    }
  }

  _createClass(Environment, [{
    key: "STATIC",
    get: function get() {
      return ENV.STATIC;
    },
    set: function set(STATIC) {
      ENV.STATIC = STATIC === true || STATIC === 'true'; // console.log('Environment.STATIC.set', ENV.STATIC);
    }
  }, {
    key: "href",
    get: function get() {
      if (HEROKU) {
        return this.githubDocs;
      } else {
        return BASE_HREF;
      }
    }
  }]);

  return Environment;
}();
var defaultOptions = {
  port: 5000,
  fontFamily: 'GT Walsheim, sans-serif',
  colors: {
    menuBackground: '#000000',
    menuForeground: '#ffffff',
    menuOverBackground: '#0099ff',
    menuOverForeground: '#ffffff',
    menuBackBackground: '#0099ff',
    menuBackForeground: '#000000',
    menuBackOverBackground: '#0099ff',
    menuBackOverForeground: '#ffffff'
  },
  editor: {
    disabledViewTypes: ['waiting-room', 'room-3d'],
    disabledViewItemTypes: ['texture']
  },
  renderOrder: {
    panorama: 0,
    model: 10,
    plane: 20,
    tile: 30,
    banner: 40,
    nav: 50,
    panel: 60,
    menu: 70,
    debug: 80,
    pointer: 90
  }
};
var defaultAppOptions = {
  channelName: 'BHere',
  flags: {
    production: false,
    useProxy: false,
    useToken: false,
    selfService: true,
    guidedTourRequest: true,
    editor: true,
    ar: true,
    menu: true,
    attendee: true,
    streamer: true,
    viewer: true,
    smartDevice: true,
    maxQuality: false,
    heroku: HEROKU
  }
};
var environmentOptions = window.STATIC ? environmentStatic : environmentServed;
var options = Object.assign(defaultOptions, defaultAppOptions, environmentOptions);
options = Utils.merge(options, window.bhere);
var environment = new Environment(options);
console.log('environment', environment);var FlagPipe = /*#__PURE__*/function (_Pipe) {
  _inheritsLoose(FlagPipe, _Pipe);

  function FlagPipe() {
    return _Pipe.apply(this, arguments) || this;
  }

  FlagPipe.transform = function transform(key) {
    var flags = environment.flags;
    return flags[key] || false;
  };

  return FlagPipe;
}(rxcomp.Pipe);
FlagPipe.meta = {
  name: 'flag'
};var WebRTCStreamComponent = /*#__PURE__*/function (_Component) {
  _inheritsLoose(WebRTCStreamComponent, _Component);

  function WebRTCStreamComponent() {
    return _Component.apply(this, arguments) || this;
  }

  var _proto = WebRTCStreamComponent.prototype;

  _proto.onChanges = function onChanges() {
    var _getContext = rxcomp.getContext(this),
        node = _getContext.node;

    var video = node.querySelector('video');

    if (video.srcObject !== this.stream) {
      video.srcObject = this.stream; // console.log('WebRTCStreamComponent', video, this.stream);
    }
  };

  return WebRTCStreamComponent;
}(rxcomp.Component);
WebRTCStreamComponent.meta = {
  selector: '[webrtc-stream]',
  inputs: ['stream'],
  template:
  /* html */
  "\n\t\t<div class=\"webrtc-stream\">\n\t\t\t<video playsinline autoplay muted></video>\n\t\t</div>\n\t"
};var AppModule = /*#__PURE__*/function (_Module) {
  _inheritsLoose(AppModule, _Module);

  function AppModule() {
    return _Module.apply(this, arguments) || this;
  }

  return AppModule;
}(rxcomp.Module);
AppModule.meta = {
  imports: [rxcomp.CoreModule],
  declarations: [FlagPipe, WebRTCStreamComponent],
  bootstrap: AppComponent
};rxcomp.Browser.bootstrap(AppModule);})));