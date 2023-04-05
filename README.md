# NodeJS Input Research

This documents collects research about how to integrate different input variants (like gamepads or MIDI-controllers) into a NodeJS, more specifically an Electron, application.

## Research on how to implement input variants

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

* [Using the Gamepad API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API)

## References

* <a name="ref-noble-documentation">noble Documentation - GitHub</a> - <https://github.com/abandonware/noble>
* <a name="ref-noble-issue-comment">Issue comment about noble with Electron - GitHub</a> - <https://github.com/noble/bleno/issues/282#issuecomment-341364657>