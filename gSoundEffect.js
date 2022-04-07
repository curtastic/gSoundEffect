var gSoundEffect = {
	context: new (window.AudioContext || webkitAudioContext)(),
	//Pass in an array with [[starting frequency, ending frequency, duration (seconds), fade in (seconds), fade out (seconds)]]
	//fade in + fade out must be less than duration. Adding fade doesn't make the note longer.
	//Example major C note for 1 second: gSound.make([440,440,1,.1,.1])
	make: function(notes) {
		// Calculate total duration, adding up duration of each note.
		var seconds = 0
		for(var i=0; i<notes.length; i+=5) {
			seconds += notes[i+2]
		}
		
		// Make the array buffer.
		var bytesPerSecond = this.context.sampleRate;
		var songLength = Math.round(bytesPerSecond * seconds)
		var audioBuffer = this.context.createBuffer(1, songLength, bytesPerSecond)
		
		// Make 2 buffers so that notes can overlap a bit without overwriting part of eachother.
		var bytes = audioBuffer.getChannelData(0)
		var bytes2 = new Float32Array(songLength)
		
		var songByteI = 0
		var fadeIn = 0, fadeOut = 0
		var pi2 = Math.PI*2
		
		// Each note uses 5 slots in the passed in array.
		for(var i=0; i<notes.length; i+=5) {
			// Calculate how many buffer array slots will be used for fade in / fade out of this note.
			fadeIn = bytesPerSecond * notes[i+3] | 0
			// Overlap the fades of the notes.
			songByteI -= Math.min(fadeOut, fadeIn)
			fadeOut = bytesPerSecond * notes[i+4] | 0
			
			// Calculate sine wave multiplier for start/end frequency.
			var multiplier = pi2 * notes[i] / bytesPerSecond
			var multiplier2 = pi2 * notes[i+1] / bytesPerSecond
			
			var noteLen = bytesPerSecond * notes[i+2] | 0
			
			// Alternate which buffer we are writing to.
			var bytesForNote = i/5%2 ? bytes2 : bytes
			
			for(var byteI=0; byteI<noteLen; byteI++) {
				// Smoothly transition from start frequency to end frequency of this note.
				var far = byteI/noteLen
				var angle = byteI * (multiplier2*far + multiplier*(1-far))
				var v = Math.sin(angle)
				
				// Apply fade in / fade out by adjusting the volume.
				if(byteI < fadeIn) {
					v *= byteI / fadeIn
				} else if(byteI > noteLen-fadeOut) {
					v *= (noteLen-byteI) / fadeOut
				}
				
				bytesForNote[songByteI++] = v
			}
		}
		
		// Combine the 2 channels into 1. Average them together for when note's fades slightly overlap.
		for(var i=0; i<songLength; i++) {
			bytes[i] = (bytes[i]+bytes2[i])/2
		}
		
		return audioBuffer
	},
	// This is a generic function for playing JS audioBuffers.
	play: function(audioBuffer) {
		var source = this.context.createBufferSource()
		if(!source) {
			return false
		}
		
		source.buffer = audioBuffer
		
		if(!source.start) {
			source.start = source.noteOn
			if(!source.start) {
				return false
			}
		}
		
		var gainNode = this.context.createGain()
		source.connect(gainNode)
		gainNode.connect(this.context.destination)
		
		source.start(0)
		return source
	}
}
