/* LOCAL QA ONLY. This file is never referenced by a production lesson. */
(() => {
  const originalFetch = window.fetch.bind(window);
  const endpoint = 'https://kawfqlohguwvmmplvrny.supabase.co/functions/v1/gostudy-jaas-token';
  window.fetch = (input, options) => String(input) === endpoint
    ? Promise.resolve(new Response(JSON.stringify({appId:'vpaas-magic-cookie-synthetic',room:'gostudy-finance-e4f319166d4c49c89b800e2a233fc6c6',jwt:'synthetic-video-jwt'}),{headers:{'Content-Type':'application/json'}}))
    : originalFetch(input, options);
  let starts = 0, disposals = 0;
  window.JitsiMeetExternalAPI = class {
    constructor(domain, options) {
      this.events = {}; this.audioMuted = true; this.videoMuted = false;
      this.iframe = document.createElement('iframe');
      this.iframe.id = 'fixture-jitsi-' + (++starts);
      this.iframe.title = 'Jitsi simulation — not a real call';
      this.iframe.srcdoc = '<html><body style="margin:0;background:#202a2b;color:#eedfc4;font:16px system-ui;display:grid;place-items:center;height:100vh"><p>Jitsi simulation<br><small>No real camera or microphone</small></p></body></html>';
      options.parentNode.append(this.iframe);
      document.body.dataset.fixtureJitsiStarts = String(starts);
      document.body.dataset.fixtureJitsiRoom = options.roomName;
      setTimeout(() => this.events.videoConferenceJoined?.({id:'fixture-self'}),50);
    }
    addEventListener(event, callback) { this.events[event] = callback; }
    getParticipantsInfo() { return [{participantId:'fixture-other',displayName:'QA participant'}]; }
    pinParticipant() {}
    isAudioMuted() { return Promise.resolve(this.audioMuted); }
    isVideoMuted() { return Promise.resolve(this.videoMuted); }
    executeCommand(command) {
      if (command === 'toggleAudio') { this.audioMuted = !this.audioMuted; this.events.audioMuteStatusChanged?.({muted:this.audioMuted}); }
      if (command === 'toggleVideo') { this.videoMuted = !this.videoMuted; this.events.videoMuteStatusChanged?.({muted:this.videoMuted}); }
    }
    dispose() { this.iframe.remove(); document.body.dataset.fixtureJitsiDisposals = String(++disposals); }
  };
})();
