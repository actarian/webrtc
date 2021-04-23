import { Component, getContext } from 'rxcomp';

export default class WebRTCStreamComponent extends Component {

	onChanges() {
		const { node } = getContext(this);
		const video = node.querySelector('video');
		if (video.srcObject !== this.stream) {
			video.srcObject = this.stream;
			// console.log('WebRTCStreamComponent', video, this.stream);
		}
	}

}

WebRTCStreamComponent.meta = {
	selector: '[webrtc-stream]',
	inputs: ['stream'],
	template: /* html */ `
		<div class="webrtc-stream">
			<video playsinline autoplay muted></video>
		</div>
	`
};
