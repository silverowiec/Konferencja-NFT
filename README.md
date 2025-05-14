# Konferencja SGH NFT

---

# SGH Konferencja NFT Platform – User & Admin Guide

Welcome to the SGH Konferencja NFT platform! This guide will help both **admins** (event organizers) and **users** (attendees) understand how to use the system to create lectures, generate QR codes, scan them, claim your POAP (Proof of Attendance Protocol) NFT, view your tokens, generate cryptographic proofs, and verify those proofs.

> **Important:** For the best experience, always use the MetaMask browser (MetaMask app's built-in browser) when scanning QR codes and interacting with the platform. Do **not** use your device's default mobile browser, as wallet connections may not work properly.

---

## For Admins: Creating Lectures & Generating QR Codes

### 1. Log in as Admin
- Go to the `/admin` page.
- Log in using your admin credentials.

### 2. Create a New Lecture
- Click on **"Create Lecture"**.
- Fill in the lecture details (title, description, date/time, etc.).
- Submit the form to create the lecture.

### 3. Generate QR Code for the Lecture
- After creating a lecture, it will appear in your lecture list.
- Select the lecture to view its details.
- Click **"Generate QR Code"**. This QR code is unique for the lecture and will be used by attendees to claim their POAP.
- Print or display the QR code at the event.

---

## For Users: Scanning QR Code & Claiming POAP

### 1. Scan the QR Code
- At the event, use your smartphone to scan the QR code displayed by the organizer.
- The QR code will direct you to the `/scan` page with the lecture ID pre-filled.

### 2. Connect Your Wallet
- On the scan page, connect your Ethereum wallet (e.g., MetaMask).
- Make sure you are on the correct network (Sepolia or as instructed).

### 3. Claim Your POAP
- After connecting your wallet, click **"Claim POAP"**.
- The system will check if you are eligible and if the claim period is still open.
- If eligible, your POAP NFT will be minted and sent to your wallet address.
- You will see a confirmation with the transaction hash.

---

## Viewing Your Tokens

1. Go to the **"My Tokens"** or **"Wallet"** section in the app (usually accessible from the main menu or after logging in).
2. Connect your Ethereum wallet if prompted.
3. You will see a list of all POAP NFTs you have claimed, including details such as lecture name, date, and token ID.
4. Click on a token to view more details or to access additional actions (like generating a proof).

---

## Generating a Proof of Ownership

1. In the token details view, look for the **"Generate Proof"** button.
2. Click the button to generate a cryptographic proof (e.g., a signed message) that you own the token.
3. The app will prompt your wallet to sign a message. Confirm the signature in your wallet.
4. The generated proof (signature) will be displayed. You can copy this proof to share with a verifier or use it for event access, rewards, etc.

---

## Verifying a Proof

1. Go to the **"Verify Proof"** section (this may be a dedicated page or part of the admin tools).
2. Enter the wallet address, token ID, and the proof (signature) provided by the user.
3. Click **"Verify"**.
4. The system will check the validity of the proof and confirm whether the user owns the token.
5. If valid, you will see a success message. If not, an error will be shown.

---

## Troubleshooting & FAQ

- **Already claimed?** Each wallet can claim a POAP for a lecture only once.
- **Claim period expired?** Claims are only possible before the lecture deadline.
- **Invalid address?** Make sure your wallet is connected and on the correct network.
- **Need help?** Contact the event organizer or admin for support.

---

## Security Notes
- Only admins can create lectures and generate QR codes.
- Claims are protected by wallet authentication and server-side checks.
- Never share your private key or sensitive wallet information.

---

Enjoy your event and your unique POAP NFT!