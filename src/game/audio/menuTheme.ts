type NoteEvent = {
    beat: number;
    duration: number;
    note: number;
    velocity: number;
};

type DrumEvent = {
    beat: number;
    kind: 'kick' | 'snare' | 'hat';
    velocity: number;
};

const BPM = 132;
const LOOP_BEATS = 32;
const BEAT_SECONDS = 60 / BPM;

const bassPattern = [40, 40, 47, 40, 43, 43, 50, 43, 45, 45, 52, 45, 38, 38, 45, 38];
const melodyPattern = [64, 67, 69, 71, 72, 71, 69, 67, 64, 67, 72, 74, 76, 74, 72, 69];
const harmonyPattern = [52, 55, 59, 55, 50, 53, 57, 53, 48, 52, 55, 52, 47, 50, 54, 50];
const arpeggioPattern = [76, 79, 83, 86, 84, 81, 79, 76, 74, 77, 81, 84, 83, 79, 76, 72];

const bassNotes: NoteEvent[] = bassPattern.map((note, index) => ({
    beat: index * 2,
    duration: 1.55,
    note,
    velocity: 0.72
}));

const melodyNotes: NoteEvent[] = melodyPattern.map((note, index) => ({
    beat: 8 + index * 1.5,
    duration: index % 4 === 3 ? 1.15 : 0.72,
    note,
    velocity: index % 4 === 0 ? 0.68 : 0.56
}));

const harmonyNotes: NoteEvent[] = harmonyPattern.map((note, index) => ({
    beat: index * 2,
    duration: 1.5,
    note,
    velocity: 0.32
}));

const arpeggioNotes: NoteEvent[] = arpeggioPattern.map((note, index) => ({
    beat: 16 + index * 0.5,
    duration: 0.28,
    note,
    velocity: index % 4 === 0 ? 0.36 : 0.26
}));

const drumNotes: DrumEvent[] = Array.from({ length: LOOP_BEATS * 2 }, (_, index) => ({
    beat: index * 0.5,
    kind: index % 4 === 0 || index % 8 === 7 ? 'kick' : index % 4 === 2 ? 'snare' : 'hat',
    velocity: index % 4 === 0 ? 0.54 : index % 4 === 2 ? 0.46 : index % 8 === 7 ? 0.34 : 0.22
}));

class MenuThemePlayer {
    private context?: AudioContext;
    private master?: GainNode;
    private timer?: number;
    private loopStartedAt = 0;
    private scheduledUntilBeat = 0;
    private playing = false;

    start(): void {
        if (this.playing) {
            return;
        }

        const AudioCtor = window.AudioContext ?? window.webkitAudioContext;
        if (!AudioCtor) {
            return;
        }

        this.context ??= new AudioCtor();
        this.master ??= this.createMaster(this.context);
        this.playing = true;
        this.loopStartedAt = this.context.currentTime + 0.08;
        this.scheduledUntilBeat = 0;

        void this.context.resume();
        this.scheduleAhead();
        this.timer = window.setInterval(() => this.scheduleAhead(), 250);
    }

    stop(): void {
        if (!this.playing) {
            return;
        }

        this.playing = false;
        if (this.timer) {
            window.clearInterval(this.timer);
            this.timer = undefined;
        }

        this.master?.gain.cancelScheduledValues(this.context?.currentTime ?? 0);
        if (this.context && this.master) {
            this.master.gain.setTargetAtTime(0, this.context.currentTime, 0.08);
        }
    }

    private createMaster(context: AudioContext): GainNode {
        const master = context.createGain();
        master.gain.value = 0.23;
        master.connect(context.destination);
        return master;
    }

    private scheduleAhead(): void {
        if (!this.context || !this.master || !this.playing) {
            return;
        }

        const currentBeat = Math.max(0, (this.context.currentTime - this.loopStartedAt) / BEAT_SECONDS);
        const scheduleUntilBeat = currentBeat + 8;

        while (this.scheduledUntilBeat < scheduleUntilBeat) {
            const loopOffset = Math.floor(this.scheduledUntilBeat / LOOP_BEATS) * LOOP_BEATS;
            this.scheduleLoop(loopOffset);
            this.scheduledUntilBeat = loopOffset + LOOP_BEATS;
        }
    }

    private scheduleLoop(loopOffset: number): void {
        for (const event of bassNotes) {
            this.playTone(loopOffset + event.beat, event.duration, event.note, event.velocity, 'sawtooth', 0.045, 0.14);
        }
        for (const event of harmonyNotes) {
            this.playTone(loopOffset + event.beat, event.duration, event.note, event.velocity, 'triangle', 0.09, 0.22);
        }
        for (const event of melodyNotes) {
            this.playTone(loopOffset + event.beat, event.duration, event.note, event.velocity, 'square', 0.025, 0.12);
        }
        for (const event of arpeggioNotes) {
            this.playTone(loopOffset + event.beat, event.duration, event.note, event.velocity, 'triangle', 0.012, 0.05);
        }
        for (const event of drumNotes) {
            this.playDrum(loopOffset + event.beat, event.kind, event.velocity);
        }
    }

    private playTone(beat: number, duration: number, note: number, velocity: number, type: OscillatorType, attack: number, release: number): void {
        if (!this.context || !this.master) {
            return;
        }

        const start = this.loopStartedAt + beat * BEAT_SECONDS;
        const end = start + duration * BEAT_SECONDS;
        if (end < this.context.currentTime) {
            return;
        }

        const oscillator = this.context.createOscillator();
        const gain = this.context.createGain();
        oscillator.type = type;
        oscillator.frequency.value = midiToFrequency(note);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(velocity, start + attack);
        gain.gain.setTargetAtTime(0, Math.max(start + attack, end - release), release);
        oscillator.connect(gain);
        gain.connect(this.master);
        oscillator.start(start);
        oscillator.stop(end + release * 2);
    }

    private playDrum(beat: number, kind: DrumEvent['kind'], velocity: number): void {
        if (!this.context || !this.master) {
            return;
        }

        const start = this.loopStartedAt + beat * BEAT_SECONDS;
        if (start < this.context.currentTime) {
            return;
        }

        const oscillator = this.context.createOscillator();
        const gain = this.context.createGain();
        oscillator.type = kind === 'hat' ? 'square' : 'triangle';
        oscillator.frequency.value = kind === 'kick' ? 72 : kind === 'snare' ? 180 : 520;
        gain.gain.setValueAtTime(velocity, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + (kind === 'hat' ? 0.04 : 0.11));
        oscillator.connect(gain);
        gain.connect(this.master);
        oscillator.start(start);
        oscillator.stop(start + 0.13);
    }
}

function midiToFrequency(note: number): number {
    return 440 * 2 ** ((note - 69) / 12);
}

declare global {
    interface Window {
        webkitAudioContext?: typeof AudioContext;
    }
}

export const menuThemePlayer = new MenuThemePlayer();
