# BalancedPasswordInput

![PasswordGif](https://github.com/user-attachments/assets/170b0a75-5261-42d8-b31f-28ffaa7725a8)

Balanced Password Input: A Monument to UI Sadism
An exercise in how far we can push the boundaries of user hostility while still technically calling it "functional." This component forces users to enter passwords by balancing a virtual ball on a tilting bar of characters, because apparently standard password fields weren't frustrating enough.
Features (or "Ways to Make Users Question Their Life Choices")

Physics-based character selection: A virtual ball that responds to gravity on a tilting bar
Multi-layout keyboard support: Six different keyboard layouts (US, UK, German, French, Spanish, Dutch) for international users to suffer equally
Audio feedback: Optional "Sound Torture" mode that plays a unique note for each character the ball rolls over
Hover-to-submit: Because clicking buttons is so 2023
Microscopic character display: Special characters rendered at eye-straining font sizes

# Technical Details
Built using React with zero consideration for user experience. Implements Web Audio API for sound generation and requestAnimationFrame for the physics simulation. Uses refs to track state between animation frames without triggering unnecessary re-renders.

# Use Cases

Ensuring your application has a 100% abandonment rate
Testing the outer limits of human patience

Making standard CAPTCHA systems seem user-friendly by comparison
Demonstrating to UX design students what NOT to do
Passive-aggressive revenge on users who complained about your previous designs

# Installation
Copynpm install balanced-password-input
Then seek professional help, because anyone who would willingly use this component clearly needs it.
# License
MIT, because even we're not cruel enough to use a proprietary license and prevent you from fixing this abomination.RetryClaude can make mistakes. Please double-check responses.
