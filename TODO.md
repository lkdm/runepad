# Runepad TODO

TODO:

- [x] Spellcheck
- [x] Favicon
- [x] Key shortcuts
- [x] Basic print; remove UI elements
- [x] Deploy
- [ ] Dark/light mode
- [ ] Toggle on/off persist storage in indexdb
- [ ] Add YAML markdown to be added to each document
- [ ] Customisable key shortcuts
- [ ] Proper icons

New goals

- [ ] PWA setup (manifest.json, service worker)
- [ ] Drag and drop support
- [ ] Support editing different documents in multiple windows - On load, route to /hash of file; on save, navigate to new hash; indexdb caches contents of file against hash. new contents overwrite old contents

Stetch goals

- [ ] Dynamically change favicon depending on state
- [ ] Export/share/print
- [ ] Set document width
- [ ] Drag and drop support
- [ ] Togglable markdown toolbar
- [ ] Toggleable Stats bar
- [ ] Webauthn Encryption/decryption https://www.npmjs.com/package/age-encryption https://words.filippo.io/passkey-encryption/
- [ ] ~~First-line par indentation (for writing fiction)~~ (not achievable in
      textarea)
- [ ] Break markdown document into sections, to allow editing
- [ ] Live preview pane
- [ ] URL support and therefore persisting multiple unsaved documents (challenging, requires syncronising state)
