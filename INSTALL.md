# Installing FFmcp

FFmcp is currently distributed **unsigned**, so macOS Gatekeeper and Windows SmartScreen will warn you the first time you open it. This is normal for new open-source apps — code-signing certificates are paid services we haven't enrolled in yet. The app is safe; the source code is right here in this repository.

This guide walks you through opening FFmcp the first time on each platform. After the first launch, the OS remembers your choice and won't ask again.

---

## macOS

When you double-click FFmcp for the first time, you'll see:

> **"FFmcp" Not Opened**
> Apple could not verify "FFmcp" is free of malware that may harm your Mac or compromise your privacy.

Click **Done**. Don't click "Move to Bin." Then:

### macOS 15 (Sequoia) and newer

1. Open **System Settings** (Apple menu → System Settings).
2. Go to **Privacy & Security** in the sidebar.
3. Scroll down to the **Security** section.
4. You'll see a message like *"FFmcp was blocked to protect your Mac."*
5. Click **Open Anyway** next to it.
6. Enter your Mac password / Touch ID when prompted.
7. A new dialog appears — click **Open**.

FFmcp will now launch, and macOS will remember the exception.

### macOS 14 (Sonoma) and older

1. Open **Finder** and go to your Applications folder (or wherever you put FFmcp).
2. **Right-click** (or Control-click) the FFmcp app icon.
3. Choose **Open** from the menu.
4. In the dialog, click **Open** again to confirm.

### Still won't open?

If macOS keeps blocking the app, open Terminal and run:

```bash
xattr -cr /Applications/FFmcp.app
```

This removes the quarantine flag the browser added when you downloaded it. Then try opening normally.

---

## Windows

When you run the FFmcp installer, you'll see a blue **Windows protected your PC** dialog from SmartScreen:

> **Microsoft Defender SmartScreen prevented an unrecognized app from starting.**
> Publisher: Unknown publisher

To proceed:

1. Click **More info** (the small link in the dialog).
2. A **Run anyway** button appears at the bottom — click it.
3. The installer launches normally. Follow the prompts.

If your browser also warns you when downloading the `.exe` (Edge / Chrome may say "this file isn't commonly downloaded"), click **Keep** or **Keep anyway**.

---

## Linux

No warnings to bypass. Make the AppImage executable and run it:

```bash
chmod +x FFmcp-*.AppImage
./FFmcp-*.AppImage
```

Or extract the `.tar.gz` and run the binary inside.

---

## Why these warnings appear

- **macOS** requires apps to be signed with an Apple Developer ID ($99/year) and notarized through Apple's notary service. Until FFmcp is enrolled, every Mac treats it as unverified.
- **Windows** requires a code-signing certificate from a recognized CA (~$200–600/year, or Azure Trusted Signing at ~$10/month). SmartScreen also waits for download "reputation" to build before clearing newly-signed apps.

We plan to add proper code signing in a future release. Until then, the steps above are the official way to install.

If you're uncomfortable bypassing these warnings, you can build FFmcp yourself from source — see the repository README.
