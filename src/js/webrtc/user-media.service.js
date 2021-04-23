
export class UserMediaService {

	static stream = null;

	static getUserMedia() {
		return new Promise((resolve, reject) => {
			const options = {
				audio: true,
				video: {
					width: { min: 320, ideal: 640, max: 640 },
					height: { min: 240, ideal: 480, max: 480 }
				}
			};
			navigator.mediaDevices.getUserMedia(options).then((stream) => {
				console.log('UserMediaService.getUserMedia', stream);
				UserMediaService.stream = stream;
				//
				const audioTracks = stream.getAudioTracks();
				if (audioTracks.length > 0) {
					console.log('UserMediaService.audioTracks', audioTracks[0].label);
				}
				const videoTracks = stream.getVideoTracks();
				if (videoTracks.length > 0) {
					console.log('UserMediaService.videoTracks', videoTracks[0].label);
				}
				//
				resolve(stream);

			}).catch(error => {
				console.log('UserMediaService.getUserMedia.error', error);
				reject(error);

			});
		});
	}

}
