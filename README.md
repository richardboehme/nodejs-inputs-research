# NodeJS Input Research

This documents collects research about how to integrate different input variants (like gamepads or MIDI-controllers) into a NodeJS, more specifically an Electron, application.

## Research on how to implement input variants

### Gamepads

The web specification (W3C) defines a spec to interact with Gamepads. The Gamepad interface is exposed via the Gamepad Javascript API. The Gamepad API adds events to the Window object to read from several gamepads. Additionally, it intoduces a Gamepad object, which allows to read the state of a Gamepad (for example pressed buttons). In contrast to the keyboard events that are exposed via events, reading the state of a Gamepad needs the be done manually in a "game loop". The API limits its scope to gamepads only, meaning it only knows simple button presses and axes movements.

The Gamepad API exposes two events on the Window object: `gamepadconnected` and `gamepaddisconnected`. Those events are fired if a new gamepad is connected to or disconnected from the computer. 

Note: If a gamepad is already connected when visiting a page, the `gamepadconnected` event will be dispatched, if the user presses a button or moves an axis.

All currently connected gamepads can be read using the `Navigator.getGamepads()` function, that returns an array of Gamepad objects. Each Gamepad object has the following properties:

* id: A not strictly defined identifier that can be used to detect the device (for example the USB vendor and device id).
* index: Unique index in the array of gamepads.
* mapping: A string telling the developer, if the gamepads conforms to a known mapping. Right now there is only one standard mapping. This means if the browser can man the gamepad to the standard mapping, the string will be "standard".
* connected: A boolean indicitating if the controller is still connected.
* buttons: An array of buttons that the controller has. Each entry of the list is a javascript object, containing the `pressed` property and the `value` property. The `pressed` property is a boolean that is true if the button is pressed by the user and false otherwise. The `value` property is a float between 0 and 1 which allows the API to support analog buttons.
* axes: An array of axes present on the device. Each entry is a float from -1 to 1.
* timestamp: A timestamp representing the last time, the data from the gamepad was updated.

To sample data from the Gamepad object, the `requestAnimationFrame()` method should be used to allow sampling gamepad inputs at the same sampling rate as animations on the page.

Which gamepads are supported could not be found (yet). However, we can assume that the chromium browser that powers Electron should support all major gamepads.

For reference see:
* [Gamepad API](#ref-gamepad-api)
* [Gamepad Specification](#ref-gamepad-spec)

### Other inputs

As mentioned above, the Gamepad API deliberately limits itself to gamepads with buttons and axes. To make access to other devices possible the W3C designed the WebHID API which can be used to access Human Interface Devices other than gamepads. 

With this API one can request a specific device from the browser. If the device is connected one can add an event listener to the device object, which fires everytime data was send from the device. This way it's possible to implement drivers for all devices that implement the HID protocol. 

Additionally it might be possible to handle inputs from devices that do not support the HID protocol by using either the Web Bluetooth API, the Web Serial API or the WebUSB API.

All those APIs are supported by Electron. To use those APIs it's necessary to implement special events on the main process in Electron.

For reference see:
* [Accessing HID Devices on the Web With the WebHID API](#ref-webhid-paper)
* [Device Access - Electron](#ref-electron-device-access)

## Research on the current state of the TactileCollab project

### Installing TactileCollab on Ubuntu

#### Bluetooth

According to the [noble documentation](https://github.com/abandonware/noble#running-on-linux) we need to install some libraries related to bluetooth.

Also noble needs priviliges that it can get by running the application with `sudo` or by setting the capabilities of the binary. In the documentation they advise to use `setcap` to set the capabilities of the `node` binary. However in the case of Electron apps this won't work, because Electron runs from its own binary (located in `node_modules/electron/dist/electron`). So we have to grant the capabilities to this binary instead:

```sh
sudo setcap cap_net_raw+eip <PATH_TO_REPO>/frontend/node_modules/electron/dist/electron
```

However, this messes up linking with shared libraries (this seems to be a Linux security feature). We can fix this by adding a custom config file to `/etc/ld.so.conf.d`. For example the file could be named `electron-node.conf` and has to contain the absolute path to the `dist` directory in which the Electron binary is located.

Afterwards, one has to reload the linker using

```sh
sudo ldconfig
```

Note: We will see how this works in the future but I imagine that one has to set the capabilities again, once we update the electron binary.

For reference see:
* [Noble documentation](#ref-noble-documentation)
* [Issue about Noble with Electron](#ref-noble-issue-comment)

## PoC: Implementing the Gamepad API in NodeJS

## Further Reading

* [Ha Dou Ken Music: Different mappings to play music with joysticks](https://www.researchgate.net/profile/Flavio-Schiavoni/publication/343797776_Ha_Dou_Ken_Music_Different_mappings_to_play_music_with_joysticks/links/5f403ad1a6fdcccc43e3e3ab/Ha-Dou-Ken-Music-Different-mappings-to-play-music-with-joysticks.pdf)
* [Web MIDI API](https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API)

## References

* <a name="ref-gamepad-api">Using the Gamepad API - MDN</a> - <https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API>
* <a name="ref-gamepad-spec">Gamepad - World Wide Web Consortium (W3C)</a> - <https://w3c.github.io/gamepad>
* <a name="ref-webhid-api">Accessing HID Devices on the Web With the WebHID API - Thomas Steiner and François Beaufort</a> - <https://arxiv.org/pdf/2104.02392.pdf>
* <a name="ref-electron-device-access">Device Access - Electron</a> - <https://www.electronjs.org/de/docs/latest/tutorial/devices>
* <a name="ref-noble-documentation">noble Documentation - GitHub</a> - <https://github.com/abandonware/noble>
* <a name="ref-noble-issue-comment">Issue comment about noble with Electron - GitHub</a> - <https://github.com/noble/bleno/issues/282#issuecomment-341364657>