import { CoreModule, Module } from 'rxcomp';
import AppComponent from './app.component';
import FlagPipe from './flag/flag.pipe';
import WebRTCStreamComponent from './webrtc/webrtc-stream.component';

export class AppModule extends Module { }

AppModule.meta = {
	imports: [
		CoreModule,
	],
	declarations: [
		FlagPipe,
		WebRTCStreamComponent,
	],
	bootstrap: AppComponent,
};
