import { useState, useEffect, useRef, useCallback } from 'react';

const BalancedPasswordInput = () => {
  // State variables
  const [password, setPassword] = useState("");
  const [barRotation, setBarRotation] = useState(0);
  const [ballPosition, setBallPosition] = useState(0.5);
  const [ballVelocity, setBallVelocity] = useState(0.01);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [keyboardLayout, setKeyboardLayout] = useState("US");
  const [showingLayoutSelector, setShowingLayoutSelector] = useState(false);
  const [audioContext, setAudioContext] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  
  // Refs
  const containerRef = useRef(null);
  const animationRef = useRef(null);
  const prevCharIndexRef = useRef(0);
  
  // Keyboard layouts
  const layouts = {
    "US": "abcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+[]{}|;:'\",.<>/?",
    "UK": "abcdefghijklmnopqrstuvwxyz0123456789!\"£$%^&*()-_=+[]{}~@#;:'<,>.?/\\",
    "German": "abcdefghijklmnopqrstuvwxyzäöüß0123456789!\"§$%&/()=?`´+#-.,;:_'*°²³{[]}\\",
    "French": "abcdefghijklmnopqrstuvwxyzéèêëàâäôöùûüÿç0123456789!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~",
    "Spanish": "abcdefghijklmnopqrstuvwxyzáéíóúüñ0123456789!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~",
    "Dutch": "abcdefghijklmnopqrstuvwxyzàáèéëêïìóòöôùúüû0123456789!@#$%^&*()-_=+[]{};:'\",.<>/?"
  };
  
  const characters = layouts[keyboardLayout];
  
  // Physics constants
  const gravity = 0.0015;
  const damping = 0.985;
  const charWidth = 1 / characters.length;
  
  // Note mapping for characters - memoized to avoid recreating on each render
  const getNoteFrequency = useCallback((char) => {
    // Base frequencies for musical notes (C4 to B4)
    const baseNotes = {
      'C': 261.63, 'C#': 277.18, 'D': 293.66, 'D#': 311.13, 'E': 329.63,
      'F': 349.23, 'F#': 369.99, 'G': 392.00, 'G#': 415.30, 'A': 440.00,
      'A#': 466.16, 'B': 493.88
    };
    
    // Map characters to notes based on position in alphabet
    const charCode = char.toLowerCase().charCodeAt(0);
    
    if (charCode >= 97 && charCode <= 122) {
      // Map a-z to different notes
      const noteNames = Object.keys(baseNotes);
      const noteIndex = (charCode - 97) % noteNames.length;
      const octaveShift = Math.floor((charCode - 97) / noteNames.length);
      return baseNotes[noteNames[noteIndex]] * Math.pow(2, octaveShift);
    } else if (charCode >= 48 && charCode <= 57) {
      // Map 0-9 to pentatonic scale
      const pentatonic = [261.63, 293.66, 329.63, 392.00, 440.00];
      return pentatonic[(charCode - 48) % pentatonic.length];
    } else {
      // Map special characters to higher octave notes
      return 523.25 + (char.charCodeAt(0) % 12) * 50;
    }
  }, []);
  
  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        // Select the current character
        const charIndex = Math.floor(ballPosition * characters.length);
        const char = characters.charAt(Math.min(charIndex, characters.length - 1));
        setPassword(prev => prev + char);
      } else if (e.code === 'Backspace') {
        // Remove last character
        setPassword(prev => prev.slice(0, -1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [ballPosition, characters]);

  // Ball physics animation
  useEffect(() => {
    let prevPosition = ballPosition;
    
    const updateBallPosition = () => {
      // Convert rotation to radians for physics calculation
      const rotationRad = (barRotation * Math.PI) / 180;
      
      // Apply gravity based on the tilt
      const gravityForce = Math.sin(rotationRad) * gravity;
      
      // Update velocity with gravity and damping
      const newVelocity = (ballVelocity + gravityForce) * damping;
      
      // Update position
      let newPosition = ballPosition + newVelocity;
      
      // Boundary check with bounce
      if (newPosition < 0) {
        newPosition = 0;
        setBallVelocity(-newVelocity * 0.7); // Bounce with energy loss
      } else if (newPosition > 1) {
        newPosition = 1;
        setBallVelocity(-newVelocity * 0.7); // Bounce with energy loss
      } else {
        setBallVelocity(newVelocity);
      }
      
      setBallPosition(newPosition);
      
      // Play sound based on current character if audio is enabled
      if (audioEnabled && audioContext && audioContext.state === 'running') {
        const charIndex = Math.floor(newPosition * characters.length);
        
        // Only play sound if we've moved to a new character
        if (charIndex !== prevCharIndexRef.current) {
          try {
            const newChar = characters.charAt(Math.min(charIndex, characters.length - 1));
            
            // Create oscillator for the note
            const oscillator = audioContext.createOscillator();
            oscillator.type = 'sine';
            
            // Get frequency based on character
            const frequency = getNoteFrequency(newChar);
            oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
            
            // Create gain node for volume control
            const gainNode = audioContext.createGain();
            
            // Set volume based on velocity (faster = louder)
            const velocityVolume = Math.min(0.3, Math.abs(newVelocity) * 10);
            gainNode.gain.setValueAtTime(velocityVolume, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
            
            // Connect nodes
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Start and stop
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.2);
            
            // Update previous char index
            prevCharIndexRef.current = charIndex;
          } catch (e) {
            console.error("Error playing sound:", e);
          }
        }
      }
      
      // Store previous position for next frame
      prevPosition = newPosition;
      
      // Update animation frame
      animationRef.current = requestAnimationFrame(updateBallPosition);
    };
    
    animationRef.current = requestAnimationFrame(updateBallPosition);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [ballPosition, ballVelocity, barRotation, audioEnabled, audioContext, characters, getNoteFrequency]);
  
  // Mouse movement handler
  const handleMouseMove = useCallback((e) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    
    // Calculate mouse position relative to container center
    const centerX = rect.width / 2;
    const mouseOffset = e.clientX - rect.left - centerX;
    
    // Map the mouse position to rotation (-maxRotation to maxRotation)
    const maxRotation = 15; // Maximum rotation in degrees
    const newRotation = (mouseOffset / centerX) * maxRotation;
    setBarRotation(newRotation);
  }, []);

  // Mouse leave handler
  const handleMouseLeave = useCallback(() => {
    // Gradually return to flat position when mouse leaves
    setBarRotation(prev => prev * 0.8);
  }, []);

  // Form submission
  const handleSubmit = useCallback(() => {
    setIsSubmitting(true);
    // Simulate API call or validation
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 1000);
  }, []);
  
  // Toggle audio
  const toggleAudio = useCallback(() => {
    try {
      // Initialize audio context if not already done
      if (!audioContext) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const newAudioContext = new AudioContext();
        
        // Need to immediately create and play a silent sound 
        // to unblock the audio context
        const oscillator = newAudioContext.createOscillator();
        const gainNode = newAudioContext.createGain();
        gainNode.gain.setValueAtTime(0.01, newAudioContext.currentTime);
        oscillator.connect(gainNode);
        gainNode.connect(newAudioContext.destination);
        oscillator.start();
        oscillator.stop(newAudioContext.currentTime + 0.1);
        
        setAudioContext(newAudioContext);
      } else if (audioContext.state === 'suspended') {
        // Resume context if suspended
        audioContext.resume();
      }
      
      // Toggle audio
      setAudioEnabled(!audioEnabled);
      
      // Debug
      console.log("Audio context state:", audioContext ? audioContext.state : "not created");
      console.log("Audio enabled:", !audioEnabled);
    } catch (e) {
      console.error("Your browser doesn't support the Web Audio API:", e);
    }
  }, [audioContext, audioEnabled]);
  
  // Switch keyboard layout
  const switchLayout = useCallback((layout) => {
    setKeyboardLayout(layout);
    setShowingLayoutSelector(false);
    // Reset ball position when changing layout
    setBallPosition(0.5);
    setBallVelocity(0.01);
  }, []);
  
  // Current character index
  const currentCharIndex = Math.floor(ballPosition * characters.length);
  
  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto bg-gray-100 p-6 rounded-lg shadow-md">
      {!submitted ? (
        <>
          <h2 className="text-xl font-bold mb-4 text-gray-800">Enter Password</h2>
          <p className="mb-6 text-sm text-gray-600">
            Tilt the bar with your mouse to control the ball. Press SPACE to select the character.
            Press BACKSPACE to delete a character. Click "Sound Torture" to make things even worse.
          </p>
          
          {/* Audio Context for Keyboard Music */}
          <div className="w-full flex justify-center mb-4">
            <div 
              className="px-4 py-2 bg-purple-500 text-white rounded-md cursor-pointer hover:bg-purple-600 transition-colors text-sm"
              onClick={toggleAudio}
            >
              {audioEnabled ? "Disable Sound Torture" : "Enable Sound Torture"}
            </div>
          </div>
          
          <div className="w-full mb-4 bg-white p-3 rounded-md border border-gray-300">
            <div className="text-2xl font-mono h-8">
              {password ? password.split('').map((char, i) => 
                <span key={i} className="text-gray-800">*</span>
              ) : <span className="text-gray-400">Password</span>}
            </div>
          </div>
          
          <div 
            ref={containerRef}
            className="relative w-full h-32 bg-gray-200 mb-6 rounded-md overflow-hidden cursor-move perspective"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {/* Tilting bar with ball and characters */}
            <div 
              className="absolute w-full flex justify-between transform-gpu transition-transform ease-out duration-100"
              style={{ 
                bottom: '0',
                transform: `rotateZ(${barRotation}deg)`,
                transformOrigin: 'center bottom',
                height: '100%'
              }}
            >
              {/* Character markers */}
              {characters.split('').map((char, index) => {
                const isCurrentChar = index === currentCharIndex;
                const position = index / characters.length;
                
                return (
                  <div 
                    key={index} 
                    className={`absolute bottom-0 flex flex-col items-center ${isCurrentChar ? 'text-blue-600 font-bold' : 'text-gray-700'}`}
                    style={{ 
                      left: `${position * 100}%`, 
                      width: `${100/characters.length}%`,
                      height: '100%'
                    }}
                  >
                    <div 
                      className={`w-full h-6 ${isCurrentChar ? 'bg-blue-300' : 'bg-gray-300'}`}
                    ></div>
                    <span className="text-xs" style={{ fontSize: characters.length > 40 ? '0.5rem' : '0.75rem' }}>{char}</span>
                  </div>
                );
              })}
              
              {/* The horizontal bar */}
              <div 
                className="absolute bottom-6 w-full h-2 bg-gray-600"
              ></div>
              
              {/* The ball */}
              <div 
                className="absolute w-6 h-6 bg-red-500 rounded-full shadow-md transform -translate-x-1/2 transition-transform duration-50"
                style={{ 
                  left: `${ballPosition * 100}%`, 
                  bottom: '8px'
                }}
              ></div>
            </div>
            
            {/* Indicator for current character */}
            <div 
              className="absolute bottom-0 w-px h-12 bg-blue-500"
              style={{ 
                left: `${(currentCharIndex + 0.5) / characters.length * 100}%`
              }}
            ></div>
          </div>
          
          <div className="w-full flex justify-between mb-4">
            <div 
              className="px-4 py-2 bg-green-500 text-white rounded-md cursor-pointer hover:bg-green-600 transition-colors"
              onMouseOver={password.length > 0 ? handleSubmit : undefined}
            >
              {isSubmitting ? "Processing..." : "Hover here to submit"}
            </div>
            
            <div 
              className="px-4 py-2 bg-blue-500 text-white rounded-md cursor-pointer hover:bg-blue-600 transition-colors"
              onClick={() => setShowingLayoutSelector(!showingLayoutSelector)}
            >
              {keyboardLayout} Layout
            </div>
          </div>
          
          {/* Keyboard layout selector - appears when layout button is clicked */}
          {showingLayoutSelector && (
            <div className="w-full mb-4 bg-white p-3 rounded-md border border-gray-300 flex flex-wrap justify-center">
              {Object.keys(layouts).map(layout => (
                <div 
                  key={layout}
                  className={`m-1 px-3 py-1 rounded-md cursor-pointer ${layout === keyboardLayout ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
                  onClick={() => switchLayout(layout)}
                >
                  {layout}
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8">
          <div className="text-3xl text-green-500 mb-4">✓</div>
          <h2 className="text-xl font-bold mb-2">Password Accepted</h2>
          <p className="text-gray-600">
            Congratulations on having the patience to use this ridiculous input method.
          </p>
        </div>
      )}
    </div>
  );
};

export default BalancedPasswordInput;