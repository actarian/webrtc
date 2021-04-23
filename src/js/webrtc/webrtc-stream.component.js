import { Component, getContext } from 'rxcomp';

export default class WebRTCStreamComponent extends Component {

	onInit() {
		this.muted = true;
	}

	onChanges() {
		const { node } = getContext(this);
		const video = node.querySelector('video');
		if (video.srcObject !== this.stream) {
			video.srcObject = this.stream;
			// console.log('WebRTCStreamComponent', video, this.stream);
		}
	}

	onMuteToggle() {
		this.muted = !this.muted;
		const { node } = getContext(this);
		const video = node.querySelector('video');
		video.muted = this.muted;
		this.pushChanges();
	}

}

WebRTCStreamComponent.meta = {
	selector: '[webrtc-stream]',
	inputs: ['stream'],
	template: /* html */ `
		<div class="webrtc-stream">
			<video playsinline autoplay muted></video>
			<button type="button" class="btn--muted" (click)="onMuteToggle()">
				<svg class="mic-muted" width="24" height="24" viewBox="0 0 24 24" *if="muted"><use xlink:href="#mic-muted"></use></svg>
				<svg class="mic" width="24" height="24" viewBox="0 0 24 24" *if="!muted"><use xlink:href="#mic"></use></svg>
			</button>
		</div>
	`
};
