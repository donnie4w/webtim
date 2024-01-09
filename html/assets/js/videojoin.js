'use strict';
// Copyright (c) 2023, donnie <donnie4w@gmail.com>
// All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.
//
// github.com/donnie4w/videojoin


const crc32table = [];

for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
        if ((c & 1) === 1) {
            c = 0xEDB88320 ^ (c >>> 1);
        } else {
            c = c >>> 1;
        }
    }
    crc32table[i] = c;
}

const VJUtil = {
    go: () => new Promise(r => r),
    sleep(ms) {
        return new Promise(function (resolve, reject) {
            setTimeout(resolve, ms);
        })
    },

    isEmpty(obj) {
        if (typeof obj == "undefined" || obj == null || obj == "") {
            return true;
        } else {
            return false;
        }
    },

    blobToUint8Array(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function () {
                resolve(new Uint8Array(reader.result));
            };
            reader.onerror = function () {
                reject(reader.error);
            };
            reader.readAsArrayBuffer(blob);
        });
    },

    filterAudio(stream) {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const compressor = audioCtx.createDynamicsCompressor();
        compressor.threshold.value = -24;
        compressor.knee.value = 12;
        compressor.ratio.value = 4;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.5;
        const audioStream = stream.getAudioTracks()[0];
        const source = audioCtx.createMediaStreamSource(new MediaStream([audioStream]));
        const destination = audioCtx.createMediaStreamDestination();
        const highPassFilter = audioCtx.createBiquadFilter();
        highPassFilter.type = 'highpass';
        highPassFilter.frequency.value = 200;

        const lowPassFilter = audioCtx.createBiquadFilter();
        lowPassFilter.type = 'lowpass';
        lowPassFilter.frequency.value = 4000;

        const bandPassFilter = audioCtx.createBiquadFilter();
        bandPassFilter.type = 'bandpass';
        bandPassFilter.Q.value = 8.30;
        bandPassFilter.frequency.value = 500;
        bandPassFilter.gain.value = 1;


        let analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048;
        let bufferLength = analyser.frequencyBinCount;
        let dataArray = new Uint8Array(bufferLength);

        let minFreq = 1000;
        let maxFreq = 2000;

        analyser.getByteFrequencyData(dataArray);
        for (let i = 0; i < bufferLength; i++) {
            if (dataArray[i] > minFreq && dataArray[i] < maxFreq) {
                dataArray[i] = 0;
            }
        }
        analyser.getByteFrequencyData(dataArray);


        source.connect(analyser)
        analyser.connect(compressor)
        compressor.connect(highPassFilter);
        highPassFilter.connect(lowPassFilter);
        lowPassFilter.connect(destination);
        // bandPassFilter.connect(destination);
        return destination.stream;
    },

    filterVideo(stream) {
        let stream2 = this.filterAudio(stream);
        const combinedStream = new MediaStream();
        combinedStream.addTrack(stream.getVideoTracks()[0]);
        combinedStream.addTrack(stream2.getAudioTracks()[0]);
        return combinedStream
    }

}

/************************************************* */

class Media {
    mediaRecorder = null;
    pushon = true;
    mediavideo = null;
    constraints = null;
    audioBitsPerSecond = 320000;
    videoBitsPerSecond = 500000;
    sendStream = null;
    recorderHz = 300;
    constructor(video, constraints) {
        this.mediavideo = video;
        this.constraints = constraints;
    }
    MediaDevices() {
        if (!VJUtil.isEmpty(navigator.mediaDevices) && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia(this.constraints)
                .then(stream => this.parseStream(stream)).catch(err => { console.error(`mediaDevices failed: ${err}`) });
        } else if (navigator.webkitGetUserMedia) {
            navigator.webkitGetUserMedia(this.constraints)
                .then(stream => this.parseStream(stream)).catch(err => { console.error(`mediaDevices failed: ${err}`) });
        } else if (navigator.mozGetUserMedia) {
            navigator.mozGetUserMedia(this.constraints)
                .then(stream => this.parseStream(stream)).catch(err => { console.error(`mediaDevices failed: ${err}`) });
        } else if (navigator.getUserMedia) {
            navigator.getUserMedia(this.constraints)
                .then(stream => this.parseStream(stream)).catch(err => { console.error(`mediaDevices failed: ${err}`) });
        } else {
            throw new Error("MediaDevice data unavailable")
        }
    }

    parseStream(stream) {
        this.mediavideo.srcObject = stream;

        let data = null;
        try {
            data = this.mediavideo.captureStream();
        } catch (err) {
            data = this.mediavideo.mozCaptureStream();
        }
        this.mediaRecorder = new MediaRecorder(data, {
            audioBitsPerSecond: this.audioBitsPerSecond,
            videoBitsPerSecond: this.videoBitsPerSecond,
        });
        this.mediaRecorder.ondataavailable = (event) => {
            if (!VJUtil.isEmpty(this.sendStream)) {
                if (event.data.size > 0) {
                    event.data.arrayBuffer().then(buffer => {
                        this.sendStream(buffer)
                    })
                }
            }
        };
        this.mediaRecorder.onstop = () => {
        };
    }


    MediaRecorderStop() {
        this.pushon = false;
        try {
            if (this.mediaRecorder.state == 'active') {
                this.mediaRecorder.stop();
            }
            this.mediavideo.srcObject.getTracks().forEach((track) => track.stop());
        } catch (err) {
            console.log(err);
        }
    }

    Pushstream(on) {
        if (!this.pushon) {
            return
        }
        if (on) {
            if (VJUtil.isEmpty(this.mediaRecorder)) {
                VJUtil.sleep(this.recorderHz).then(() => this.Pushstream(on))
                return
            }
            try {
                this.mediaRecorder.start();
            } catch (err) {
                console.error(err);
            }
            VJUtil.sleep(this.recorderHz).then(() => this.Pushstream(!on));
        } else {
            try {
                this.mediaRecorder.stop();
            } catch (err) {
                console.error(err);
            }
            this.Pushstream(!on);
        }
    }
}

class VideoJoin {
    vppre = this.crc32(this.stringToUint8Array(new Date().getTime().toString()));
    videoType = "audio/mp3;video/mp4";
    playEvent = "canplay"
    addcount = 1;
    currentnum = 0;
    loadnum = 1;
    delnum = 1;
    data_setup = "";
    style = null;
    parentNode = null;
    datamap = new Map();
    videoOn = false;
    turnOn = true;
    modeRealtime = true;
    modeSpeedRateup = true;

    constructor(parentNode) {
        this.parentNode = parentNode;
        if (VJUtil.isEmpty(this.parentNode)) {
            throw new Error("parent node not exist");
        }
    }

    AddVideoSrc(videoSrc) {
        this._addvideo(videoSrc, false)
    }

    AddVideoBuffer(buffer) {
        this.AddVideoUint8Array(new Uint8Array(buffer))
    }

    AddVideoUint8Array(data) {
        this._addvideo(new Blob([data], { type: this.videoType }), true);
    }

    AddVideoBlob(data) {
        this._addvideo(data, true);
    }

    _addvideo(data, isStream) {
        const count = this.addcount++;
        this.datamap.set(count, this.createvideo(count, data, isStream))
        if (!this.videoOn) {
            if (this.modeRealtime) {
                this.callvideo(count)
            } else {
                if (this.currentnum <= count) {
                    this.callvideo(this.currentnum++);
                }
            }
        }
    }

    Clear() {
        this.turnOn = false;
        if (!VJUtil.isEmpty(this.parentNode)) {
            while (this.parentNode.firstChild) {
                this.parentNode.removeChild(this.parentNode.firstChild);
            }
        }
    }

    vname(count) {
        return this.vppre + "_" + count;
    }

    createvideo(count, data, isBlob) {
        const video = document.createElement("video");
        if (!VJUtil.isEmpty(this.data_setup)) {
            video.setAttribute("data-setup", this.data_setup);
        }
        if (!VJUtil.isEmpty(this.style)) {
            video.setAttribute("style", this.style);
        }
        video.setAttribute("id", this.vname(count));
        video.setAttribute("preload", "auto");
        if (isBlob) {
            try {
                video.srcObject = data;
            } catch (err) {
                video.src = URL.createObjectURL(data);
            }
        } else {
            video.src = data;
        }
        video.playbackRate = 1;
        video.className = ""
        video.style.display = "none";
        video.addEventListener("ended", (e) => {
            video.pause()
            this.callvideo(count + 1);
        });
        video.addEventListener("error", (e) => {
            if (VJUtil.isEmpty(video.className)) {
                video.load();
                video.className = "vj_0";
            } else {
                this.rmvideo(count, true);
                if (this.currentnum == count) {
                    this.callvideo(count + 1);
                }
            }
        });
        video.addEventListener(this.playEvent, (e) => {
            video.name = this.vname(count);
        })
        return video;
    }

    async rmvideo(count, isone) {
        if (isone) {
            const bf = document.getElementById(this.vname(count));
            this.datamap.delete(count);
            if (!VJUtil.isEmpty(bf)) {
                try {
                    URL.revokeObjectURL(bf.src)
                    this.parentNode.removeChild(bf);
                } catch (err) {
                }
            }
        } else if (count >= this.delnum) {
            for (let i = this.delnum; i <= count; i++) {
                const u = document.getElementById(this.vname(i));
                this.datamap.delete(i);
                if (!VJUtil.isEmpty(u)) {
                    try {
                        URL.revokeObjectURL(u.src)
                        this.parentNode.removeChild(u);
                    } catch (err) {
                    }
                }
            }
            this.delnum = count;
        }
    }

    async loadvideo(num) {
        let len = this.parentNode.children.length;
        if (num > 0) {
            let v = this.datamap.get(num);
            if (!VJUtil.isEmpty(v)) {
                this.parentNode.appendChild(v);
                this.datamap.delete(num);
            }
        } else if (len < 10 && this.loadnum <= this.addcount) {
            let c = 1;
            let id = this.loadnum
            while (id <= this.addcount) {
                let v = this.datamap.get(id);
                if (!VJUtil.isEmpty(v)) {
                    this.parentNode.appendChild(v);
                    this.datamap.delete(id);
                    if (c++ > 10) {
                        break
                    }
                }
                this.loadnum = id;
                id++
            }
        }
    }

    callvideo(count) {
        if (!this.turnOn) {
            return
        }
        this.loadvideo();
        if (count > this.currentnum) {
            this.currentnum = count;
        }
        const v = document.getElementById(this.vname(count));
        if (!VJUtil.isEmpty(v)) {
            if (this.modeSpeedRateup) {
                if (this.datamap.size > 16) {
                    let rate = 1 + this.datamap.size * 0.5;
                    if (rate > 16) {
                        rate = 16;
                    }
                    v.playbackRate = rate;
                    console.info("playbackRate:", v.playbackRate)
                }
            }
            this.mvplay(v, count, 1);
        } else if (!VJUtil.isEmpty(this.datamap.get(count))) {
            this.loadvideo(count);
            return this.callvideo(count);
        } else if (this.currentnum < this.loadnum) {
            for (let i = this.currentnum + 1; i <= this.loadnum; i++) {
                if (!VJUtil.isEmpty(document.getElementById(this.vname(i)))) {
                    return this.callvideo(i)
                }
            }
        } else {
            this.videoOn = false;
        }
    }

    mvplay(mv, count, playcount) {
        const play = mv.play();
        if (play) {
            play.then(() => {
                if (this._mvplay(count)) {
                    this.videoOn = false;
                    return
                }
                if (!this.turnOn) {
                    return
                }
                mv.style.display = "inline";
                this.rmvideo(count - 1, false);
            }).catch(error => {
                if (playcount > 0) {
                    mv.load();
                    this.mvplay(mv, count, 0)
                } else {
                    console.log("play failed >>", count, error)
                    this.rmvideo(count, true);
                    this.videoOn = false;
                }
            });
        } else {
            console.log("play not exist >>", count)
            this.videoOn = false;
        }
    }

    _mvplay(count) {
        if (!this.turnOn) {
            return false;
        }
        const mv = document.getElementById(this.vname(count))
        if (VJUtil.isEmpty(mv)) {
            return true;
        }
        if (VJUtil.isEmpty(mv.name)) {
            VJUtil.go().then(() => this._mvplay(count));
        }
        return false;
    }

    crc32(data) {
        let crc = 0xFFFFFFFF;
        for (let i = 0; i < data.length; i++) {
            crc = crc32table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
        }
        return (~crc >>> 0);
    }

    stringToUint8Array(text) {
        const encoder = new TextEncoder("ISO-8859-1");
        return encoder.encode(text);
    }
}




class VideoPlayer {
    mediaRecorder1 = null;
    mediaRecorder2 = null;
    pushon = true;
    mediavideo = null;
    sendStream = null;
    recorderHz = 300;
    audioBitsPerSecond = 320000;
    videoBitsPerSecond = 500000;
    sampleRate = 44100;
    constructor(video, videofile) {
        this.mediavideo = video;
        if (!window.FileReader) {
            throw new Error("the browser does not support this feature");
        }
        let reader = new FileReader();
        reader.readAsArrayBuffer(videofile);
        reader.onload = () => {
            this.mediavideo.src = URL.createObjectURL(new Blob([new Uint8Array(reader.result)]));
        };
        reader.onerror = () => {
            console.error(reader.error);
        }
    }

    Play() {
        let data = null;
        try {
            data = this.mediavideo.captureStream();
        } catch (err) {
            data = this.mediavideo.mozCaptureStream();
        }
        this.mediaRecorder1 = new MediaRecorder(data, {
            audioBitsPerSecond: this.audioBitsPerSecond,
            videoBitsPerSecond: this.videoBitsPerSecond,

        });
        this.mediaRecorder1.ondataavailable = event => {
            if (!VJUtil.isEmpty(this.sendStream)) {
                if (event.data.size > 0) {
                    event.data.arrayBuffer().then(buffer => {
                        this.sendStream(buffer)
                    })
                }
            }
        };
        this.mediaRecorder2 = new MediaRecorder(data, {
            audioBitsPerSecond: this.audioBitsPerSecond,
            videoBitsPerSecond: this.videoBitsPerSecond,
        });
        this.mediaRecorder2.ondataavailable = event => {
            if (!VJUtil.isEmpty(this.sendStream)) {
                if (event.data.size > 0) {
                    event.data.arrayBuffer().then(buffer => {
                        this.sendStream(buffer)
                    })
                }
            }
        };
    }

    MediaRecorderStop() {
        this.pushon = false;
        try {
            if (this.mediaRecorder1.state == 'active') {
                this.mediaRecorder1.stop();
            }
            if (this.mediaRecorder2.state == 'active') {
                this.mediaRecorder2.stop();
            }
        } catch (err) {
            console.log(err);
        }
    }

    Pushstream(on) {
        this.push1(on)
    }

    async push1(on) {
        if (!this.pushon) {
            return
        }
        if (on) {
            if (VJUtil.isEmpty(this.mediaRecorder1)) {
                VJUtil.sleep(this.recorderHz).then(() => this.push1(on))
                return
            }
            try {
                this.mediaRecorder1.start();
            } catch (err) {
                console.error(err);
            }
            VJUtil.sleep(this.recorderHz).then(() => this.push1(false));
        } else {
            try {
                this.push2(true)
                this.mediaRecorder1.stop()
            } catch (err) {
                console.error(err);
            }
        }
    }

    async push2(on) {
        if (!this.pushon) {
            return
        }
        if (on) {
            if (VJUtil.isEmpty(this.mediaRecorder2)) {
                VJUtil.sleep(this.recorderHz).then(() => this.push2(on))
                return
            }
            try {
                this.mediaRecorder2.start();
            } catch (err) {
                console.error(err);
            }
            VJUtil.sleep(this.recorderHz).then(() => this.push2(false));
        } else {
            try {
                this.push1(true)
                this.mediaRecorder2.stop()
            } catch (err) {
                console.error(err);
            }
        }
    }
}


class MediaRTC {
    mediaRecorder1 = null;
    mediaRecorder2 = null;
    pushon = true;
    mediavideo = null;
    constraints = null;
    audioBitsPerSecond = 320000;
    videoBitsPerSecond = 500000;
    bitsPerSecond = 320000;
    sendStream = null;
    recorderHz = 300;
    error = null;
    constructor(video, constraints) {
        this.mediavideo = video;
        this.constraints = constraints;
    }
    MediaDevices() {
        return new Promise((resolve, reject) => {
            if (!VJUtil.isEmpty(navigator.mediaDevices) && navigator.mediaDevices.getUserMedia) {
                navigator.mediaDevices.getUserMedia(this.constraints)
                    .then(stream => { this.parseStream(stream); resolve(true) }).catch(err => { this.error = err; reject(err) });
            } else if (navigator.webkitGetUserMedia) {
                navigator.webkitGetUserMedia(this.constraints)
                    .then(stream => { this.parseStream(stream); resolve(true) }).catch(err => { this.error = err; reject(err) });
            } else if (navigator.mozGetUserMedia) {
                navigator.mozGetUserMedia(this.constraints)
                    .then(stream => { this.parseStream(stream); resolve(true) }).catch(err => { this.error = err; reject(err) });
            } else if (navigator.getUserMedia) {
                navigator.getUserMedia(this.constraints)
                    .then(stream => { this.parseStream(stream); resolve(true) }).catch(err => { this.error = err; reject(err) });
            } else {
                throw new Error("MediaDevice data unavailable")
            }
        })
    }

    parseStream(stream) {
        if (VJUtil.isEmpty(stream)) {
            throw new Error("MediaDevice data unavailable")
        }
        this.mediavideo.srcObject = stream;
        const combinedStream = VJUtil.filterVideo(stream)
        this.mediaRecorder1 = new RecordRTC(combinedStream, {
            type: 'video', mimeType: 'video/mp4',
            disableLogs: true,
            bitsPerSecond: this.bitsPerSecond,
            audioBitsPerSecond: this.audioBitsPerSecond,
            videoBitsPerSecond: this.videoBitsPerSecond,
        })
        this.mediaRecorder2 = new RecordRTC(combinedStream, {
            type: 'video', mimeType: 'video/mp4',
            disableLogs: true,
            bitsPerSecond: this.bitsPerSecond,
            audioBitsPerSecond: this.audioBitsPerSecond,
            videoBitsPerSecond: this.videoBitsPerSecond,
        })
    }


    MediaRecorderStop() {
        this.pushon = false;
        try {
            if (this.mediaRecorder2) {
                this.mediaRecorder2.stopRecording();
            }
            if (this.mediaRecorder1) {
                this.mediaRecorder1.stopRecording();
            }
            this.mediavideo.srcObject.getTracks().forEach((track) => track.stop());
        } catch (err) { }
    }

    Pushstream(on) {
        this.push1(on)
    }

    async push1(on) {
        if (!this.pushon || !VJUtil.isEmpty(this.error)) {
            return
        }
        if (on) {
            if (VJUtil.isEmpty(this.mediaRecorder1)) {
                VJUtil.sleep(this.recorderHz).then(() => this.push1(on))
                return
            }
            try {
                this.mediaRecorder1.startRecording();
            } catch (err) {
                console.error(err);
            }
            VJUtil.sleep(this.recorderHz).then(() => this.push1(false));
            VJUtil.sleep(this.recorderHz - 10).then(() => this.push2(true));
        } else {
            try {
                this.mediaRecorder1.stopRecording(() => {
                    let blob = this.mediaRecorder1.getBlob();
                    VJUtil.blobToUint8Array(blob).then((ua) => {
                        if (ua.length > 0) {
                            this.sendStream(ua)
                        }
                    })
                });
            } catch (err) {
                console.error(err);
            }
        }
    }

    async push2(on) {
        if (!this.pushon || !VJUtil.isEmpty(this.error)) {
            return
        }
        if (on) {
            if (VJUtil.isEmpty(this.mediaRecorder2)) {
                VJUtil.sleep(this.recorderHz).then(() => this.push2(on))
                return
            }
            try {
                this.mediaRecorder2.startRecording();
            } catch (err) {
                console.error(err);
            }
            VJUtil.sleep(this.recorderHz).then(() => this.push2(false));
            VJUtil.sleep(this.recorderHz - 10).then(() => this.push1(true));
        } else {
            try {
                this.mediaRecorder2.stopRecording(() => {
                    let blob = this.mediaRecorder2.getBlob();
                    VJUtil.blobToUint8Array(blob).then((ua) => {
                        if (ua.length > 0) {
                            this.sendStream(ua)
                        }
                    })
                });
            } catch (err) {
                console.error(err);
            }
        }
    }
}



class AudioRTC {
    mediaRecorder1 = null;
    mediaRecorder2 = null;
    pushon = true;
    mediastream = null;
    constraints = null;
    audioBitsPerSecond = 320000;
    sendStream = null;
    recorderHz = 300;
    error = null;
    constructor(constraints) {
        this.constraints = constraints;
    }
    MediaDevices() {
        return new Promise((resolve, reject) => {
            if (!VJUtil.isEmpty(navigator.mediaDevices) && navigator.mediaDevices.getUserMedia) {
                navigator.mediaDevices.getUserMedia(this.constraints)
                    .then(stream => { this.parseStream(stream); resolve(true) }).catch(err => { this.error = err; reject(err) });
            } else if (navigator.webkitGetUserMedia) {
                navigator.webkitGetUserMedia(this.constraints)
                    .then(stream => { this.parseStream(stream); resolve(true) }).catch(err => { this.error = err; reject(err) });
            } else if (navigator.mozGetUserMedia) {
                navigator.mozGetUserMedia(this.constraints)
                    .then(stream => { this.parseStream(stream); resolve(true) }).catch(err => { this.error = err; reject(err) });
            } else if (navigator.getUserMedia) {
                navigator.getUserMedia(this.constraints)
                    .then(stream => { this.parseStream(stream); resolve(true) }).catch(err => { this.error = err; reject(err) });
            } else {
                throw new Error("MediaDevice data unavailable")
            }
        })
    }

    parseStream(stream) {
        this.mediastream = stream;
        const combinedStream = VJUtil.filterAudio(stream)
        this.mediaRecorder1 = new RecordRTC(combinedStream, {
            type: 'audio', mimeType: 'audio/wav',
            disableLogs: true,
            audioBitsPerSecond: this.audioBitsPerSecond,
        })
        this.mediaRecorder2 = new RecordRTC(combinedStream, {
            type: 'audio', mimeType: 'audio/wav',
            disableLogs: true,
            audioBitsPerSecond: this.audioBitsPerSecond,
        })
    }


    MediaRecorderStop() {
        this.pushon = false;
        try {
            if (this.mediaRecorder2) {
                this.mediaRecorder2.stopRecording();
            }
            if (this.mediaRecorder1) {
                this.mediaRecorder1.stopRecording();
            }
            this.mediastream.getTracks().forEach((track) => track.stop());
        } catch (err) { }
    }

    Pushstream(on) {
        this.push1(on)
    }

    async push1(on) {
        if (!this.pushon || !VJUtil.isEmpty(this.error)) {
            return
        }
        if (on) {
            if (VJUtil.isEmpty(this.mediaRecorder1)) {
                VJUtil.sleep(this.recorderHz).then(() => this.push1(on))
                return
            }
            try {
                this.mediaRecorder1.startRecording();
            } catch (err) {
                console.error(err);
            }
            VJUtil.sleep(this.recorderHz).then(() => this.push1(false));
            VJUtil.sleep(this.recorderHz - 1).then(() => this.push2(true));
        } else {
            try {
                this.mediaRecorder1.stopRecording(() => {
                    let blob = this.mediaRecorder1.getBlob();
                    VJUtil.blobToUint8Array(blob).then((ua) => {
                        if (ua.length > 0) {
                            this.sendStream(ua)
                        }
                    })
                });
            } catch (err) {
                console.error(err);
            }
        }
    }

    async push2(on) {
        if (!this.pushon || !VJUtil.isEmpty(this.error)) {
            return
        }
        if (on) {
            if (VJUtil.isEmpty(this.mediaRecorder2)) {
                VJUtil.sleep(this.recorderHz).then(() => this.push2(on))
                return
            }
            try {
                this.mediaRecorder2.startRecording();
            } catch (err) {
                console.error(err);
            }
            VJUtil.sleep(this.recorderHz).then(() => this.push2(false));
            VJUtil.sleep(this.recorderHz - 1).then(() => this.push1(true));
        } else {
            try {
                this.mediaRecorder2.stopRecording(() => {
                    let blob = this.mediaRecorder2.getBlob();
                    VJUtil.blobToUint8Array(blob).then((ua) => {
                        if (ua.length > 0) {
                            this.sendStream(ua)
                        }
                    })
                });
            } catch (err) {
                console.error(err);
            }
        }
    }
}


class VideoPlayerRTC {
    mediaRecorder1 = null;
    mediaRecorder2 = null;
    pushon = true;
    mediavideo = null;
    sendStream = null;
    recorderHz = 300;
    audioBitsPerSecond = 320000;
    videoBitsPerSecond = 500000;
    sampleRate = 44100;
    constructor(video, videofile) {
        this.mediavideo = video;
        if (!window.FileReader) {
            throw new Error("the browser does not support this feature");
        }
        let reader = new FileReader();
        reader.readAsArrayBuffer(videofile);
        reader.onload = () => {
            this.mediavideo.src = URL.createObjectURL(new Blob([new Uint8Array(reader.result)]));
            this.mediavideo.load();
        };
        reader.onerror = () => {
            console.error(reader.error);
        }
    }

    Play() {
        let data = null;
        try {
            data = this.mediavideo.captureStream();
        } catch (err) {
            data = this.mediavideo.mozCaptureStream();
        }
        this.mediaRecorder1 = new RecordRTC(data, {
            type: 'video',
            disableLogs: true,
        })
        this.mediaRecorder2 = new RecordRTC(data, {
            type: 'video',
            disableLogs: true,
        })
    }


    MediaRecorderStop() {
        this.pushon = false;
        try {
            this.mediaRecorder1.stopRecording();
            this.mediaRecorder2.stopRecording();
        } catch (err) {
            console.log(err);
        }
    }

    Pushstream(on) {
        this.push1(on)
    }

    async push1(on) {
        if (!this.pushon) {
            return
        }
        if (on) {
            if (VJUtil.isEmpty(this.mediaRecorder1)) {
                VJUtil.sleep(this.recorderHz).then(() => this.push1(on))
                return
            }
            try {
                this.mediaRecorder1.startRecording();
            } catch (err) {
                console.error(err);
            }
            VJUtil.sleep(this.recorderHz).then(() => this.push1(false));
            VJUtil.sleep(this.recorderHz - 10).then(() => this.push2(true));
        } else {
            try {
                this.mediaRecorder1.stopRecording(() => {
                    let blob = this.mediaRecorder1.getBlob();
                    VJUtil.blobToUint8Array(blob).then((ua) => {
                        if (ua.length > 0) {
                            this.sendStream(ua)
                        }
                    })
                });
            } catch (err) {
                console.error(err);
            }
        }
    }

    async push2(on) {
        if (!this.pushon) {
            return
        }
        if (on) {
            if (VJUtil.isEmpty(this.mediaRecorder2)) {
                VJUtil.sleep(this.recorderHz).then(() => this.push2(on))
                return
            }
            try {
                this.mediaRecorder2.startRecording();
            } catch (err) {
                console.error(err);
            }
            VJUtil.sleep(this.recorderHz).then(() => this.push2(false));
            VJUtil.sleep(this.recorderHz - 10).then(() => this.push1(true));
        } else {
            try {
                this.mediaRecorder2.stopRecording(() => {
                    let blob = this.mediaRecorder2.getBlob();
                    VJUtil.blobToUint8Array(blob).then((ua) => {
                        if (ua.length > 0) {
                            this.sendStream(ua)
                        }
                    })
                });
            } catch (err) {
                console.error(err);
            }
        }
    }
}

class AudioJoin {
    audioOn = true;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    sourcemap = new Map();
    number = 0;
    playNumber = 0;

    AddAudioBuffer(buffer) {
        this.createAudioBuffer(buffer)
        if (this.number == 0) {
            this.playsource(1)
        }
    }

    AddAudioUint8Array(ua) {
        this.AddAudioBuffer(ua.buffer)
    }

    async createAudioBuffer(buffer) {
        let source = this.audioCtx.createBufferSource();
        try {
            source.buffer = await this.audioCtx.decodeAudioData(buffer);
            let n = ++this.number;
            source.onended = () => {
                source.disconnect();
                this.sourcemap.delete(n)
                this.playsource(n + 1)
            };
            this.sourcemap.set(n, source)
        } catch (error) {
            console.error('decodeAudioData error:', error);
        }
    }

    Clear() {
        this.audioOn = false;
    }

    playsource(num) {
        let source = this.sourcemap.get(num);
        if (!VJUtil.isEmpty(source)) {
            this.playNumber = num;
            source.connect(this.audioCtx.destination);
            source.start(0);
        } else {
            if (this.audioOn) {
                if (this.number > this.playNumber) {
                    this.playsource(num + 1)
                } else {
                    VJUtil.sleep(200).then(() => this.playsource(num))
                }
            }
        }
    }
}

