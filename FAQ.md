# Chirp — common questions and answers

Short answers for a judge visiting the table. These describe the current prototype.

## The idea

### 1. What is Chirp?
Chirp sends small information cards from one device to nearby listening phones using sound. The phones save them locally, so people can search for locations, supply details, contacts and instructions later.

### 2. Why not just announce the information through a speaker?
People can forget an announcement or miss a detail. Chirp turns it into a saved record with exact coordinates, hours and clickable actions. A later broadcast updates that same record.

### 3. What is the strongest example?
Broadcast “Water point — North gate” with its location and collection hours. It appears on the receiving phone. Change the hours or mark it Closed, broadcast again, and the same card updates.

### 4. Why use sound instead of a QR code?
One sound broadcast can reach multiple listening phones without each person aiming a camera. QR codes are a good alternative when scanning is convenient; sound is useful when people can hear a shared speaker.

### 5. Why not WhatsApp, Bluetooth or SMS?
Chirp transfers the cards without internet, cellular service or Bluetooth pairing. It uses the speaker and microphone already on the devices. The website still needs to be loaded and cached beforehand.

## How it works

### 6. How does sound become information?
We encode a compact card into bytes. The open-source ggwave modem turns those bytes into tones, and the receiving phone decodes them back into a saved card.

### 7. What did you build yourselves?
ggwave provides the sound modem. We built the card workflow, compact record encoding, framing and chunking, versioned updates, local storage, search and interface around it.

### 8. Does it really work without internet?
Card transmission uses sound, so it does not need a network. The production website also includes offline caching after its initial online load. Wait for “Available offline” before disconnecting; phone offline reload is still awaiting confirmation in our recorded checks.

### 9. Do people need to install an Android app?
No. They open the website, allow microphone access and tap Start listening. Keep the receiving page open while listening; background or locked-screen reception is not guaranteed.

### 10. How do updates avoid creating duplicates?
Each card has a source ID, permanent card ID and increasing version number. A receiver replaces the matching card only when the incoming version is newer. Repeated or older versions do not replace newer saved data.

### 11. What if someone misses an update?
Their phone keeps the last version it received. The coordinator can rebroadcast the complete current card, so the phone does not need every earlier update. “Broadcast finished” means playback ended, not that every phone received it.

### 12. How does a phone send an answer back to the loudspeaker?
The main information-card flow is one-way and does not need an answer from the phones. The older forms feature supports a separate return transmission, but we do not depend on a distant loudspeaker hearing replies for this demo.

### 13. How far does it work, and how many phones can receive it?
Multiple listening phones can receive the same broadcast without sending individual acknowledgements. We have not established a maximum range or device count. Distance, speaker volume, microphone hardware and background noise affect reception.

### 14. Can you send images or long documents?
The current app sends short text cards and optional coordinates, hours and phone numbers. Each information payload is capped at 268 bytes, split across at most two frames. The sender shows estimated airtime before broadcasting.

### 15. Do Maps and Call work offline too?
The saved details and coordinates remain readable in Chirp. Opening Maps may need connectivity or previously downloaded maps; placing a call needs phone service. Those actions are separate from receiving and saving the card.

## Security and reliability

### 16. Can anyone nearby read the broadcast?
Yes. Current broadcasts are public and unencrypted. This version is intended for public information, not private messages or confidential personal data.

### 17. Can a malicious person broadcast false information?
That is a current limitation: broadcasts are unsigned, so the receiver cannot verify the coordinator's identity. Our proposed next step is signed cards with a trusted coordinator key set up in advance. That verification is not implemented yet.

### 18. Do CRC checks and version numbers make it secure?
No. CRC checks help detect transmission corruption, and versions prevent older records from replacing newer ones. Neither proves who sent a message or prevents a forged newer record.

### 19. Can you send something only one person can read?
Not in the current version. Private delivery would require encryption and a way to establish the intended recipient's key. We kept this demo focused on public broadcasts.

### 20. Where is the data stored?
Cards are stored in that browser's localStorage, with no application backend receiving them. Clearing browser data can remove them. A different website address has separate storage, so changing the hosting URL does not automatically move saved cards.

## Demo and next steps

### 21. What have you actually tested?
The participant confirmed real-phone reception of broadcasts, two different cards, and updating the first card after sending the second, with correct received data. The production build passed. Offline phone reload, closure/old-version replay and measured noise/range checks are not yet recorded as passed.

### 22. Is this ready for real disaster deployment?
It is a working hackathon prototype. Before real deployment, we need coordinator verification, broader device and noisy-environment testing, and clearer handling of missed or stale information. It should not be presented as a guaranteed emergency communication channel.

### 23. What would you build next?
First confirm production offline reload and the remaining update/replay cases on phones. Then add coordinator signature verification. Broader field testing comes before adding more features.

### 24. What is the one-line pitch?
“Chirp turns a public sound broadcast into searchable information saved on your phone, and updates it when the situation changes.”
